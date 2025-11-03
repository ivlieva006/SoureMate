const html = (s='') => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const trunc = (s, n=180) => (s && s.length>n ? s.slice(0,n-1)+'…' : s);
const hostOf = (url) => { try { return new URL(url).host.replace(/^www\./,''); } catch { return ''; } };

const norm = (s) => (s||'').toLowerCase().normalize('NFKD')
  .replace(/[^\p{L}\p{N}\s\-]/gu,' ')
  .replace(/\s+/g,' ').trim();

const toks = (s) => norm(s).split(' ').filter(w=>w&&w.length>2);

function cosine(a,b){
  const A=new Map(),B=new Map();
  a.forEach(w=>A.set(w,(A.get(w)||0)+1));
  b.forEach(w=>B.set(w,(B.get(w)||0)+1));
  let dot=0,na=0,nb=0;
  for(const w of new Set([...A.keys(),...B.keys()])){
    const av=A.get(w)||0,bv=B.get(w)||0;
    dot+=av*bv; na+=av*av; nb+=bv*bv;
  }
  return dot===0?0:dot/(Math.sqrt(na)*Math.sqrt(nb));
}

const dedup = (arr) => {
  const seen=new Set();
  return arr.filter(x=>{
    const k=(x.doi?.toLowerCase()||'')+'|'+(x.url?.toLowerCase()||'')+'|'+(x.title?.toLowerCase()||'');
    if(seen.has(k)) return false; seen.add(k); return true;
  });
};

const preferLang = (q) => /[А-Яа-яЁё]/.test(q) ? 'ru' : 'en';

module.exports = { html, trunc, hostOf, norm, toks, cosine, dedup, preferLang };