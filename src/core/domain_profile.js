// src/domain_profile.js
const { llmChat } = require('../llm/llm.js');

async function buildDomainProfile(userQuery) {
  const sys = `You are a domain profiler. Return STRICT JSON:
{
  "language":"ru|en|mixed",
  "topic":"short label",
  "include_terms":[string],
  "exclude_terms":[string],
  "must_have_concepts":[string],
  "synonyms":[string],
  "suggested_sources":["crossref","semanticscholar","wikipedia","rusneb","elib","cyberleninka"],
  "year_min": number,
  "doc_types":["journal-article","conference","book","thesis"],
  "disambiguation": {
    "ambiguous_terms": [string],
    "intended_meaning": "string",
    "reject_meanings": [string],
    "negative_domains": [string]   // hostnames that likely belong to the wrong field
  }
}
/* Notes:
- Disambiguate acronyms (e.g., "PR") using context. If user intent is "public relations",
  then reject meanings like 'proportional-resonant controller', 'protein families (PR-10)',
  'pattern recognition', 'Puerto Rico', 'probability', 'pressure'.
- negative_domains may include ieee.org, nature.com, iop.org, acs.org when intent is PR in communications.
*/`;

  const c = await llmChat([
    { role:'system', content: sys },
    { role:'user', content: userQuery }
  ]);

  try {
    const p = JSON.parse(c);

    // дефолты
    p.year_min ??= 2018;
    p.include_terms ??= [];
    p.exclude_terms ??= [];
    p.must_have_concepts ??= [];
    p.synonyms ??= [];
    p.doc_types ??= ["journal-article","conference","book"];
    p.suggested_sources ??= ["crossref","semanticscholar","wikipedia"];
    p.disambiguation ??= { ambiguous_terms:[], intended_meaning:"", reject_meanings:[], negative_domains:[] };
    return p;
  } catch {
    // безопасный фоллбэк
    return {
      language:/[А-Яа-яЁё]/.test(userQuery)?'ru':'en',
      topic:'general',
      include_terms:[],
      exclude_terms:[],
      must_have_concepts:[],
      synonyms:[],
      suggested_sources:["crossref","semanticscholar","wikipedia"],
      year_min:2018,
      doc_types:["journal-article","conference","book"],
      disambiguation: { ambiguous_terms:[], intended_meaning:"", reject_meanings:[], negative_domains:[] }
    };
  }
}

module.exports = { buildDomainProfile };