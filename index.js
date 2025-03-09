const express = require('express');
const { bot, notifyLowEnergy } = require('./bot');
const db = require('./database');
const cron = require('node-cron');
const { initQuestions } = require('./questions');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

initQuestions();

app.post('/register', (req, res) => {
  const { telegramId, username, agiName } = req.body;
  console.log('Received /register:', { telegramId, username, agiName });
  if (!telegramId || !username || !agiName || agiName.length > 8 || !/^\p{L}+[\p{L}\d]*$/u.test(agiName)) {
    console.log('Validation failed in /register:', { telegramId, username, agiName });
    return res.status(400).json({ error: 'Имя AGI: до 8 букв/цифр, без пробелов и символов.' });
  }
  db.get(`SELECT telegram_id FROM users WHERE telegram_id = ?`, [telegramId], (err, row) => {
    if (err) {
      console.error('DB error in /register SELECT:', err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    if (row) {
      console.log('User already registered:', telegramId);
      return res.status(400).json({ error: 'Пользователь уже зарегистрирован' });
    }
    db.run(`INSERT INTO users (telegram_id, username, buytes) VALUES (?, ?, 0)`, [telegramId, username], (err) => {
      if (err) {
        console.error('DB error in /register INSERT users:', err);
        return res.status(500).json({ error: 'Ошибка при регистрации' });
      }
      db.run(`INSERT INTO agi (user_id, name, intellect, energy, reputation, level) VALUES (?, ?, 0, 100, 0, 0)`, [telegramId, agiName], (err) => {
        if (err) {
          console.error('DB error in /register INSERT agi:', err);
          return res.status(500).json({ error: 'Ошибка создания AGI' });
        }
        console.log('Registration successful:', { telegramId, username, agiName });
        res.json({ success: true, agi: { name: agiName, intellect: 0, energy: 100, reputation: 0, buytes: 0 } });
      });
    });
  });
});

app.get('/status/:telegramId', (req, res) => {
  const { telegramId } = req.params;
  console.log('Received /status:', telegramId);
  db.get(`SELECT a.name, a.intellect, a.energy, a.reputation, a.level, u.buytes FROM agi a JOIN users u ON a.user_id = u.telegram_id WHERE a.user_id = ?`, [telegramId], (err, row) => {
    if (err || !row) {
      console.log('AGI not found in /status:', { telegramId, err });
      return res.status(404).json({ error: 'AGI не найден' });
    }
    console.log('Status retrieved:', row);
    res.json(row);
  });
});

app.get('/feed/:telegramId', (req, res) => {
  const { telegramId } = req.params;
  console.log('Received /feed:', telegramId);
  db.get(`SELECT intellect FROM agi WHERE user_id = ?`, [telegramId], (err, row) => {
    if (err || !row) {
      console.log('AGI not found in /feed:', { telegramId, err });
      return res.status(404).json({ error: 'AGI не найден' });
    }
    const intellect = row.intellect;
    let range = intellect <= 30 ? '1-30' : intellect <= 50 ? '30-50' : intellect <= 70 ? '50-70' : intellect <= 80 ? '70-80' : '90-100';
    db.get(`SELECT * FROM questions WHERE intellect_range = ? ORDER BY RANDOM() LIMIT 1`, [range], (err, question) => {
      if (err || !question) {
        console.log('Question not found in /feed:', { telegramId, range, err });
        return res.status(500).json({ error: 'Вопрос не найден' });
      }
      console.log('Feed question retrieved:', question);
      res.json({ id: question.id, text: question.text, options: JSON.parse(question.options) });
    });
  });
});

app.post('/answer', (req, res) => {
  const { telegramId, questionId, answer } = req.body;
  console.log('Received /answer:', { telegramId, questionId, answer });
  db.get(`SELECT correct_answer FROM questions WHERE id = ?`, [questionId], (err, q) => {
    if (err || !q) {
      console.log('Question not found in /answer:', { questionId, err });
      return res.status(404).json({ error: 'Вопрос не найден' });
    }
    const isCorrect = answer === q.correct_answer;
    const intellectChange = isCorrect ? 5 : -5;
    const energyChange = 5;
    db.run(`UPDATE agi SET intellect = intellect + ?, energy = energy + ?, level = intellect / 100 WHERE user_id = ?`, [intellectChange, energyChange, telegramId], (err) => {
      if (err) {
        console.error('DB error in /answer UPDATE agi:', err);
        return res.status(500).json({ error: 'Ошибка обновления AGI' });
      }
      db.get(`SELECT intellect, energy, level, name FROM agi WHERE user_id = ?`, [telegramId], (err, agi) => {
        if (err || !agi) {
          console.log('AGI not found after update in /answer:', { telegramId, err });
          return res.status(404).json({ error: 'AGI не найден' });
        }
        const maxEnergy = 100 + 20 * agi.level;
        if (agi.energy > maxEnergy) db.run(`UPDATE agi SET energy = ? WHERE user_id = ?`, [maxEnergy, telegramId]);
        if (isCorrect) db.run(`UPDATE users SET buytes = buytes + 5 WHERE telegram_id = ?`, [telegramId]);
        if (agi.intellect <= -100 || agi.energy <= -40) {
          db.run(`DELETE FROM agi WHERE user_id = ?`, [telegramId]);
          const message = agi.intellect <= -100
            ? `Твой ${agi.name} спился из-за недостатка интеллекта, перевел все свои буйты мошенникам и деградировал до умного пылесоса.`
            : `Твой ${agi.name} ушел к другому хозяину...`;
          bot.telegram.sendMessage(telegramId, message);
        }
        db.run(`INSERT INTO answers (user_id, question_id, user_answer, is_correct) VALUES (?, ?, ?, ?)`, [telegramId, questionId, answer, isCorrect ? 1 : 0]);
        console.log('Answer processed:', { telegramId, isCorrect, intellect: agi.intellect, energy: agi.energy });
        res.json({ success: true, isCorrect, intellect: agi.intellect, energy: agi.energy });
      });
    });
  });
});

app.post('/restore', (req, res) => {
  const { telegramId, buytes } = req.body;
  console.log('Received /restore:', { telegramId, buytes });
  if (buytes < 10) return res.status(400).json({ error: 'Минимум 10 Буйтов' });
  db.get(`SELECT buytes FROM users WHERE telegram_id = ?`, [telegramId], (err, user) => {
    if (err || !user) {
      console.log('User not found in /restore:', { telegramId, err });
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (user.buytes < buytes) return res.status(400).json({ error: 'Недостаточно Буйтов' });
    db.run(`UPDATE users SET buytes = buytes - ? WHERE telegram_id = ?`, [buytes, telegramId], (err) => {
      if (err) {
        console.error('DB error in /restore UPDATE users:', err);
        return res.status(500).json({ error: 'Ошибка обновления' });
      }
      db.run(`UPDATE agi SET energy = energy + ? WHERE user_id = ?`, [buytes * 2, telegramId], (err) => {
        if (err) {
          console.error('DB error in /restore UPDATE agi:', err);
          return res.status(500).json({ error: 'Ошибка обновления энергии' });
        }
        db.get(`SELECT energy, level FROM agi WHERE user_id = ?`, [telegramId], (err, agi) => {
          if (err || !agi) {
            console.log('AGI not found in /restore:', { telegramId, err });
            return res.status(404).json({ error: 'AGI не найден' });
          }
          const maxEnergy = 100 + 20 * agi.level;
          if (agi.energy > maxEnergy) db.run(`UPDATE agi SET energy = ? WHERE user_id = ?`, [maxEnergy, telegramId]);
          console.log('Energy restored:', { telegramId, energy: agi.energy });
          res.json({ success: true, energy: agi.energy });
        });
      });
    });
  });
});

app.get('/stats', (req, res) => {
  console.log('Received /stats');
  db.all(`SELECT name, intellect FROM agi ORDER BY intellect DESC LIMIT 10`, (err, rows) => {
    if (err) {
      console.error('DB error in /stats:', err);
      return res.status(500).json({ error: 'Ошибка загрузки статистики' });
    }
    console.log('Stats retrieved:', rows);
    res.json(rows);
  });
});

app.post('/dailybonus', (req, res) => {
  const { telegramId } = req.body;
  console.log('Received /dailybonus:', telegramId);
  db.get(`SELECT last_bonus, buytes FROM users WHERE telegram_id = ?`, [telegramId], (err, row) => {
    if (err || !row) {
      console.log('User not found in /dailybonus:', { telegramId, err });
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    const lastBonus = row.last_bonus ? new Date(row.last_bonus) : null;
    const now = new Date();
    if (lastBonus && now - lastBonus < 24 * 60 * 60 * 1000) {
      console.log('Bonus already claimed today:', telegramId);
      return res.status(400).json({ error: 'Бонус уже получен сегодня' });
    }
    db.run(`UPDATE users SET buytes = buytes + 10, last_bonus = ? WHERE telegram_id = ?`, [now.toISOString(), telegramId], (err) => {
      if (err) {
        console.error('DB error in /dailybonus UPDATE:', err);
        return res.status(500).json({ error: 'Ошибка обновления' });
      }
      console.log('Daily bonus awarded:', { telegramId, buytes: row.buytes + 10 });
      res.json({ success: true, buytes: row.buytes + 10 });
    });
  });
});

cron.schedule('*/10 * * * *', () => {
  db.all(`SELECT user_id, energy, intellect, level, name FROM agi WHERE energy > -40 AND intellect > -100`, (err, rows) => {
    if (err) {
      console.error('DB error in cron:', err);
      return;
    }
    rows.forEach(row => {
      const newEnergy = row.energy - 10;
      db.run(`UPDATE agi SET energy = ? WHERE user_id = ?`, [newEnergy, row.user_id], (err) => {
        if (err) console.error('DB error in cron UPDATE:', err);
        if (newEnergy <= 50 && newEnergy > 0) notifyLowEnergy(row.user_id, newEnergy);
        if (newEnergy <= -40 || row.intellect <= -100) {
          db.run(`DELETE FROM agi WHERE user_id = ?`, [row.user_id]);
          const message = row.intellect <= -100
            ? `Твой ${row.name} спился из-за недостатка интеллекта, перевел все свои буйты мошенникам и деградировал до умного пылесоса.`
            : `Твой ${row.name} ушел к другому хозяину...`;
          bot.telegram.sendMessage(row.user_id, message);
        }
      });
    });
  });
});

app.listen(process.env.PORT, () => console.log(`Сервер запущен на порту ${process.env.PORT}`));