// src/pagination.js — CommonJS

const PAGE_SIZE = 10;                  // элементов на страницу
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 минут
const sessions = new Map();            // key: `${chatId}:${sessionId}` -> {query,pages,createdAt}

const html = (s='') => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const trunc = (s, n=180) => (s && s.length>n ? s.slice(0,n-1)+'…' : s);
const hostOf = (url) => { try { return new URL(url).host.replace(/^www\./,''); } catch { return ''; } };

function paginate(items, pageSize = PAGE_SIZE) {
  const pages = [];
  for (let i = 0; i < items.length; i += pageSize) pages.push(items.slice(i, i + pageSize));
  return pages;
}

function buildPageHtml(query, pageItems) {
  const head = `🔎 <b>Источники:</b> <i>${html(query)}</i>\n\n`;
  const body = pageItems.map(it => {
    const host = hostOf(it.url);
    const isDoi = host === 'doi.org';
    const badge = (typeof it._blend === 'number') ? ` <i>(${Math.round(it._blend)}/100)</i>` : (typeof it._lexRel === 'number' ? ` <i>(${Math.round(it._lexRel)}/100)</i>` : '');
    const src = isDoi ? `<i>${html(it.source)}</i>` : `<i>${html(it.source)} • ${html(host)}</i>`;
    const desc = it.description ? `\n${html(trunc(it.description))}` : '';
    const doi  = it.doi ? `\nDOI: <code>${html(it.doi)}</code>` : '';
    return `• <b>${html(it.title)}</b>${it.year ? ` (${it.year})` : ''}${badge}
Источник: ${src}
<a href="${it.url}">Открыть</a>${desc}${doi}`;
  }).join('\n\n');
  return head + body;
}

function keyboard(sessionId, pageIndex, pagesCount) {
  const prev = Math.max(0, pageIndex - 1);
  const next = Math.min(pagesCount - 1, pageIndex + 1);
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '⏮ 1', callback_data: `pg:${sessionId}:0` },
          { text: '◀️',   callback_data: `pg:${sessionId}:${prev}` },
          { text: `${pageIndex + 1} / ${pagesCount}`, callback_data: `pg:${sessionId}:${pageIndex}` },
          { text: '▶️',   callback_data: `pg:${sessionId}:${next}` },
          { text: `${pagesCount} ⏭`, callback_data: `pg:${sessionId}:${pagesCount - 1}` },
        ],
        [{ text: '⏹ Закрыть', callback_data: `pg:${sessionId}:close` }]
      ]
    },
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
}

function createSession(chatId, query, items) {
  const pages = paginate(items);
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const key = `${chatId}:${sessionId}`;
  sessions.set(key, { query, pages, createdAt: Date.now() });
  return { sessionId, pagesCount: pages.length };
}

async function sendFirstPage(ctx, query, items) {
  const { sessionId, pagesCount } = createSession(ctx.chat.id, query, items);
  const pageIndex = 0;
  const htmlText = buildPageHtml(query, sessions.get(`${ctx.chat.id}:${sessionId}`).pages[pageIndex]);
  return ctx.reply(htmlText, keyboard(sessionId, pageIndex, pagesCount));
}

async function handlePaginationCallback(ctx) {
  const data = ctx.callbackQuery?.data || '';
  if (!data.startsWith('pg:')) return;

  const [, sid, idxRaw] = data.split(':');
  const key = `${ctx.chat.id}:${sid}`;
  const sess = sessions.get(key);

  if (!sess || (Date.now() - sess.createdAt) > SESSION_TTL_MS) {
    await ctx.answerCbQuery('Сессия устарела. Отправь новый запрос.');
    return;
  }

  if (idxRaw === 'close') {
    await ctx.answerCbQuery('Закрыто');
    try { await ctx.deleteMessage(); } catch {}
    sessions.delete(key);
    return;
  }

  const pagesCount = sess.pages.length;
  const pageIndex = Math.max(0, Math.min(Number(idxRaw) || 0, pagesCount - 1));
  const htmlText = buildPageHtml(sess.query, sess.pages[pageIndex]);

  await ctx.editMessageText(htmlText, keyboard(sid, pageIndex, pagesCount));
  await ctx.answerCbQuery();
}

function cleanupSessions() {
  const now = Date.now();
  for (const [k, v] of sessions.entries()) {
    if (now - v.createdAt > SESSION_TTL_MS) sessions.delete(k);
  }
}

module.exports = { sendFirstPage, handlePaginationCallback, cleanupSessions };