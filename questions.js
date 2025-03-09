const db = require('./database');

const initialQuestions = [
  { text: "Зачем людям вода?", options: JSON.stringify(["a) Для понтов", "b) Для жизни", "c) Чтобы поливать котов"]), correct_answer: "b", intellect_range: "1-30" },
  { text: "Что такое солнце?", options: JSON.stringify(["a) Большая лампочка", "b) Звезда", "c) Огненный кот"]), correct_answer: "b", intellect_range: "1-30" },
  { text: "Почему трава зеленая?", options: JSON.stringify(["a) Она завидует", "b) Хлорофилл", "c) Это магия"]), correct_answer: "b", intellect_range: "30-50" },
  { text: "Что такое фотосинтез?", options: JSON.stringify(["a) Магия растений", "b) Превращение света в энергию", "c) Растения хвастаются"]), correct_answer: "b", intellect_range: "50-70" },
  { text: "Что быстрее света?", options: JSON.stringify(["a) Кот на кухне", "b) Ничто", "c) Интернет"]), correct_answer: "b", intellect_range: "70-80" },
  { text: "Сколько ног у паука?", options: JSON.stringify(["a) 6", "b) 8", "c) 10"]), correct_answer: "b", intellect_range: "1-30" },
  { text: "Что такое Луна?", options: JSON.stringify(["a) Сыр", "b) Спутник Земли", "c) Лампа"]), correct_answer: "b", intellect_range: "1-30" },
  { text: "Почему небо голубое?", options: JSON.stringify(["a) Оно грустит", "b) Рассеяние света", "c) Кто-то покрасил"]), correct_answer: "b", intellect_range: "30-50" },
  { text: "Что такое гравитация?", options: JSON.stringify(["a) Магия", "b) Сила притяжения", "c) Клей"]), correct_answer: "b", intellect_range: "30-50" },
  { text: "Кто открыл Америку?", options: JSON.stringify(["a) Колумб", "b) Эйнштейн", "c) Кот Шредингера"]), correct_answer: "a", intellect_range: "50-70" },
  { text: "Что такое ДНК?", options: JSON.stringify(["a) Код жизни", "b) Новый напиток", "c) Танец"]), correct_answer: "a", intellect_range: "50-70" },
  { text: "Сколько планет в Солнечной системе?", options: JSON.stringify(["a) 7", "b) 8", "c) 9"]), correct_answer: "b", intellect_range: "70-80" },
  { text: "Что такое черная дыра?", options: JSON.stringify(["a) Дыра в кармане", "b) Объект с сильной гравитацией", "c) Темный кот"]), correct_answer: "b", intellect_range: "70-80" },
  { text: "Почему кошки мурлыкают?", options: JSON.stringify(["a) От скуки", "b) От удовольствия", "c) Это сигнал SOS"]), correct_answer: "b", intellect_range: "1-30" },
  { text: "Что такое атом?", options: JSON.stringify(["a) Маленький шарик", "b) Основа вещества", "c) Еда для AGI"]), correct_answer: "b", intellect_range: "30-50" },
  { text: "Сколько цветов в радуге?", options: JSON.stringify(["a) 5", "b) 7", "c) 9"]), correct_answer: "b", intellect_range: "1-30" },
  { text: "Что такое Wi-Fi?", options: JSON.stringify(["a) Волшебство", "b) Беспроводная сеть", "c) Еда для роутера"]), correct_answer: "b", intellect_range: "50-70" },
  { text: "Почему звезды светятся?", options: JSON.stringify(["a) Они горят", "b) Это фонарики", "c) Отражают свет"]), correct_answer: "a", intellect_range: "70-80" },
  { text: "Что такое время?", options: JSON.stringify(["a) Деньги", "b) Последовательность событий", "c) Иллюзия"]), correct_answer: "b", intellect_range: "90-100" },
  { text: "Что такое ИИ?", options: JSON.stringify(["a) Искры Интеллекта", "b) Искусственный Интеллект", "c) Игрушка"]), correct_answer: "b", intellect_range: "90-100" },
  { text: "Почему Земля круглая?", options: JSON.stringify(["a) Это шар", "b) Ее сплющили", "c) Магия"]), correct_answer: "a", intellect_range: "30-50" }
];

function initQuestions() {
  initialQuestions.forEach(q => {
    db.run(`INSERT OR IGNORE INTO questions (text, options, correct_answer, intellect_range) VALUES (?, ?, ?, ?)`, [q.text, q.options, q.correct_answer, q.intellect_range]);
  });
}

module.exports = { initQuestions };
