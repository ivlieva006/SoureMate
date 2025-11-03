const { MIN_AI_RELEVANCE } = require('../config/config.js');

function filterByRelevance(judged){
  const filtered = judged
    .filter(it => it._aiVerdict !== 'exclude' && (it._aiRel || 0) >= MIN_AI_RELEVANCE)
    .sort((a,b)=> (b._aiRel||0) - (a._aiRel||0));

  if (filtered.length) return filtered;
  return judged
    .filter(it => it._aiVerdict === 'include')
    .sort((a,b)=> (b._aiRel||0) - (a._aiRel||0));
}
module.exports = { filterByRelevance };