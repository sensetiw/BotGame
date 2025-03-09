const { Telegraf } = require('telegraf');
require('dotenv').config();
const db = require('./database');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Удаляем дублирующий вызов bot.launch()
bot.launch().then(() => {
  console.log('Бот запущен');
  bot.telegram.setChatMenuButton({
    menuButton: { type: 'web_app', text: 'Покормить AGI', web_app: { url: 'https://sensetiw.xyz/webapp.html' } }
  });
});

bot.command('start', (ctx) => {
  ctx.reply('Привет! Это твой AGI-компаньон. Нажми кнопку "Покормить AGI", чтобы начать!', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Покормить AGI', web_app: { url: 'https://sensetiw.xyz/webapp.html' } }]]
    }
  });
});

bot.command('addquestion', (ctx) => {
  const adminId = 547321; // Замени на свой Telegram ID
  if (ctx.from.id !== adminId) return ctx.reply('Только админ может добавлять вопросы!');
  const args = ctx.message.text.split('|');
  if (args.length !== 5) return ctx.reply('Формат: /addquestion|Вопрос|a) ...|b) ...|c) ...|правильный ответ (a/b/c)|диапазон (1-30)');
  const [_, text, a, b, c, correct, range] = args;
  const options = JSON.stringify([a, b, c]);
  db.run(`INSERT INTO questions (text, options, correct_answer, intellect_range) VALUES (?, ?, ?, ?)`, [text, options, correct, range], (err) => {
    if (err) ctx.reply('Ошибка при добавлении вопроса');
    else ctx.reply('Вопрос добавлен!');
  });
});

function notifyLowEnergy(userId, energy) {
  bot.telegram.sendMessage(userId, `Энергия твоего AGI упала до ${energy}%! Пора покормить его знаниями!`);
}

// Добавляем обработчик для graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { bot, notifyLowEnergy };
