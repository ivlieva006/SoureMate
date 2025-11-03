const pLimit = require('p-limit');
const { WIKI_LIMIT } = require('../../config/config.js');

async function searchWikipedia(q){
  const url=`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srsearch=${encodeURIComponent(q)}&srlimit=${WIKI_LIMIT}`;
  const js=await fetch(url).then(r=>r.json());
  const pages=js?.query?.search||[];
  const limit=pLimit(2);
  return Promise.all(pages.map(p=>limit(async()=>{
    const s=`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.title)}`;
    const d=await fetch(s).then(r=>r.json());
    return { source:'Wikipedia', title:d?.title||p.title, url:d?.content_urls?.desktop?.page||`https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`, description:d?.extract||'', year:undefined, doi:undefined, type:'reference' };
  })));
}
module.exports = { searchWikipedia };