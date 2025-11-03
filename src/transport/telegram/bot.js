const { Telegraf } = require('telegraf');
const { BOT_TOKEN, LLM_ENABLED, LLM_REQUIRED } = require('../../config/config.js');
const { aggregate } = require('../../core/aggregate.js');
const { sendFirstPage, handlePaginationCallback, cleanupSessions } = require('./pagination.js');

if (!BOT_TOKEN) { console.error('❌ BOT_TOKEN отсутствует'); process.exit(1); }
if (LLM_REQUIRED && !LLM_ENABLED) { console.error('❌ Включи ИИ (Ollama) в .env'); process.exit(1); }

const bot = new Telegraf(BOT_TOKEN, { handlerTimeout: Infinity });

bot.start(ctx => ctx.reply(
  'Привет! Пришли тему — я подберу самые релевантные научные источники 📚\nНапример: <code>технологический PR</code>',
  { parse_mode:'HTML' }
));

bot.on('text', async (ctx)=>{
  const q = (ctx.message?.text||'').trim();
  const notice = await ctx.reply('🔎 Ищу источники…');

  try {
    const items = await aggregate(q);
    if (!items.length) return ctx.reply('Ничего релевантного не нашлось. Попробуй уточнить формулировку.');

    await sendFirstPage(ctx, q, items);
  } catch (e) {
    console.error('❌ Ошибка:', e);
    await ctx.reply('Произошла ошибка при поиске.');
  } finally {
    try { await ctx.deleteMessage(notice.message_id); } catch {}
  }
});

bot.on('callback_query', handlePaginationCallback);
bot.launch().then(()=>console.log('✅ Bot is running'));
setInterval(cleanupSessions, 5*60*1000);