const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/game.db', (err) => {
  if (err) console.error('Ошибка подключения к БД:', err);
  else console.log('Подключено к SQLite');
});

// Создание таблиц
db.serialize(() => {
  // Таблица пользователей с добавленным полем last_bonus
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      buytes INTEGER DEFAULT 0,
      last_bonus DATETIME
    )
  `);

  // Таблица AGI
  db.run(`
    CREATE TABLE IF NOT EXISTS agi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      intellect INTEGER DEFAULT 0,
      energy INTEGER DEFAULT 100,
      reputation INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id)
    )
  `);

  // Таблица вопросов
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      options TEXT NOT NULL,  -- JSON: ["a) ...", "b) ...", "c) ..."]
      correct_answer TEXT NOT NULL,
      intellect_range TEXT NOT NULL  -- Например, "1-30"
    )
  `);

  // Таблица истории ответов
  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      question_id INTEGER,
      user_answer TEXT,
      is_correct INTEGER,  -- 0 или 1
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);
});

module.exports = db;
