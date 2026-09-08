'use strict';

const fs = require('fs');
const path = require('path');

async function sendTelegramMessage(text) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('Telegram notify: HTTP', res.status, await res.text());
  } catch (e) {
    console.error('Telegram notify failed:', e.message);
  }
}

/* Надсилає одне фото товару з підписом (повний текст замовлення вкладається у caption) */
async function sendTelegramPhoto(imagePath, caption) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const buffer = fs.readFileSync(imagePath);
    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHAT_ID);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('photo', new Blob([buffer]), path.basename(imagePath));
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: form });
    if (!res.ok) console.error('Telegram photo failed:', res.status, await res.text());
  } catch (e) {
    console.error('Telegram photo failed:', e.message);
  }
}

/* Надсилає кілька фото товарів одним альбомом; повний текст замовлення — підпис першого фото */
async function sendTelegramMediaGroup(photos) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHAT_ID);
    const media = photos.map((p, i) => {
      const attachName = `photo${i}`;
      const buffer = fs.readFileSync(p.path);
      form.append(attachName, new Blob([buffer]), path.basename(p.path));
      const item = { type: 'photo', media: `attach://${attachName}` };
      if (p.caption) { item.caption = p.caption; item.parse_mode = 'HTML'; }
      return item;
    });
    form.append('media', JSON.stringify(media));
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`, { method: 'POST', body: form });
    if (!res.ok) console.error('Telegram media group failed:', res.status, await res.text());
  } catch (e) {
    console.error('Telegram media group failed:', e.message);
  }
}

module.exports = { sendTelegramMessage, sendTelegramPhoto, sendTelegramMediaGroup };
