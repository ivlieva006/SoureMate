// src/lexical_relevance.js
const { toks, cosine } = require('./utils.js');

/**
 * Вычислить лексическую релевантность 0..100
 * @param {string} query - исходный запрос пользователя
 * @param {object} item  - {title, description, type, year, source, url}
 * @param {object} profile - {include_terms, exclude_terms, year_min, doc_types, disambiguation}
 */
function computeLexicalRelevance(query, item, profile = {}) {
  const qTok = toks(query);
  const title = (item.title || '');
  const abs   = (item.description || '');
  const txtTok = toks(`${title} ${abs}`);

  // 1) Базовое сходство (косинус)
  let score = cosine(qTok, txtTok) * 70; // до 70 баллов

  // 2) Бусты за точные совпадения ключевых терминов
  const incl = (profile.include_terms || []).map(s => String(s).toLowerCase());
  const textL = (title + ' ' + abs).toLowerCase();
  for (const t of incl) {
    if (t && textL.includes(t)) score += 6; // каждое точное вхождение
  }

  // 3) Наказание за стоп-термины
  const excl = (profile.exclude_terms || []).map(s => String(s).toLowerCase());
  for (const t of excl) {
    if (t && textL.includes(t)) score -= 10;
  }

  // 4) Свежесть (мягкий буст)
  const y = Number(item.year) || 0;
  if (y >= 2021) score += 6;
  else if (y >= 2018) score += 3;

  // 5) Тип документа
  const type = (item.type || '').toLowerCase();
  if (type.includes('journal-article')) score += 4;
  if (type.includes('conference')) score += 2;
  if (type.includes('book') || type.includes('chapter')) score += 2;

  // 6) Ограничение диапазона 0..100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return score;
}

module.exports = { computeLexicalRelevance };