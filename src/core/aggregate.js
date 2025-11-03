// src/core/aggregate.js

const {
  MAX_RESULTS,
  MIN_AI_RELEVANCE_BASE,
  TIMEOUT_LLM_MS,
  TIMEOUT_SEARCH_MS,
  LLM_PARALLEL,
  DYNAMIC_THRESHOLD
} = require('../config/config.js');

const { llmExpandQuery, llmRelevance } = require('../llm/llm.js');
const { buildDomainProfile } = require('./domain_profile.js');
const { searchAll } = require('../data/sources/index.js');
const { dedup, preferLang, toks } = require('./utils.js');
const { scoreHeuristicWithProfile, roundRobinByVenue } = require('./ranking.js');
const { computeLexicalRelevance } = require('./lexical_relevance.js');

const pLimit = require('p-limit').default;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject)=>setTimeout(()=>reject(new Error(`Timeout ${ms}ms`)), ms))
  ]);
}

function median(nums){ if(!nums.length) return 0; const a=[...nums].sort((x,y)=>x-y); const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }

async function aggregate(query){
  // 1) Профиль темы
  const profile = await withTimeout(buildDomainProfile(query), 12000).catch(()=>null) || {};
  const lang = preferLang(query);
  const qTok = toks(query);

  // 2) Расширяем запрос через LLM
  const exp = await withTimeout(llmExpandQuery(query, profile), 12000).catch(()=>[]) || [];
  const variants = Array.from(new Set([query, ...exp]));

  // 3) Поиск по источникам
  const settled = await withTimeout(Promise.allSettled(variants.map(v=>searchAll(v))), TIMEOUT_SEARCH_MS).catch(()=>[]);
  let items = dedup((settled||[]).filter(r=>r.status==='fulfilled').flatMap(r=>r.value));
  if (!items.length) return [];

  // 4) Прескоринг (контекстный) + обрезка до разумного размера
  items = items
    .map(x => ({...x, _h: scoreHeuristicWithProfile(x, qTok, lang, profile)}))
    .sort((a,b)=>b._h-a._h)
    .slice(0, 40);

  // 5) Лексическая релевантность (всегда есть, быстро)
  for (const it of items) {
    it._lexRel = computeLexicalRelevance(query, it, profile); // 0..100
  }

  // 6) LLM-вердикты (ограниченная параллельность + таймауты)
  const limit = pLimit(LLM_PARALLEL);
  const judged = await Promise.all(items.map(it => limit(async ()=>{
    try {
      const r = await withTimeout(llmRelevance(query, it, profile), TIMEOUT_LLM_MS);
      return { ...it, _aiRel: Number(r?.relevance)||0, _aiVerdict: r?.verdict||'include' };
    } catch {
      return { ...it, _aiRel: 0, _aiVerdict: 'include' }; // не наказываем за таймаут
    }
  })));

  // 7) Динамический порог по состоянию LLM
  const rels = judged.map(j=>j._aiRel||0);
  const aliveShare = rels.filter(x=>x>0).length / Math.max(1, rels.length);
  const med = median(rels);
  let MIN_AI = MIN_AI_RELEVANCE_BASE;
  if (DYNAMIC_THRESHOLD) {
    if (aliveShare < 0.6 || med < 40) MIN_AI = Math.max(45, MIN_AI - 20);
  }

  // 8) Блендинг: 60% LLM, 40% лексика; если LLM=0, опираемся на лексику
  for (const it of judged) {
    const ai = it._aiRel || 0;
    const lx = it._lexRel || 0;
    it._blend = Math.round( (ai>0 ? 0.6*ai + 0.4*lx : lx) );
  }

  // 9) Фильтр + сортировка по бленду (и мягкая страховка по лексике)
  let filtered = judged
    .filter(it => (it._aiVerdict !== 'exclude'))
    .filter(it => (it._aiRel >= MIN_AI) || (it._blend >= Math.max(55, MIN_AI - 10)) || (it._lexRel >= 60))
    .sort((a,b)=> (b._blend||0) - (a._blend||0));

  if (!filtered.length) {
    // крайний фоллбэк — отдать лучшие по лексике
    filtered = judged.sort((a,b)=> (b._lexRel||0) - (a._lexRel||0)).slice(0, MAX_RESULTS);
  }

  // 10) Разнообразие по изданиям
  return roundRobinByVenue(filtered, MAX_RESULTS);
}

module.exports = { aggregate };