'use strict';

const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { requireAdmin } = require('../auth');
const { createCheckoutPayload, verifyCallbackSignature } = require('../liqpay');
const { sendTelegramMessage, sendTelegramPhoto, sendTelegramMediaGroup } = require('../telegram');

const receiptDir = path.join(__dirname, '..', '..', 'data', 'receipts');
if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });
const RECEIPT_ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf']);
const receiptUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, receiptDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `order${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!RECEIPT_ALLOWED_EXT.has(ext)) return cb(new Error('Непідтримуваний формат файлу'));
    cb(null, true);
  },
});

const PAYMENT_METHOD_LABELS = { prepay: 'Передоплата', full: 'Повна оплата переказом', cod: 'Оплата при отриманні', liqpay: 'LiqPay' };

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function getPrepaymentPercent() {
  const n = Number(process.env.PREPAYMENT_PERCENT);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 30;
}

function normalizeUkrainianPhone(value) {
  let phone = String(value || '').trim().replace(/[^\d+]/g, '');
  if (/^0\d{9}$/.test(phone)) phone = `+38${phone}`;
  if (/^380\d{9}$/.test(phone)) phone = `+${phone}`;
  return /^\+380\d{9}$/.test(phone) ? phone : '';
}

function serializeOrder(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    city: row.city,
    warehouse: row.warehouse,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    total: row.total,
    prepayAmount: row.prepay_amount,
    hasReceipt: !!row.receipt_path,
    items: JSON.parse(row.items_json || '[]'),
    createdAt: row.created_at,
  };
}

async function notifyNewOrder(order) {
  const deliveryLine = order.warehouse
    ? `${escapeHtml(order.city)}, ${escapeHtml(order.warehouse)}`
    : (order.city ? escapeHtml(order.city) : 'Самовивіз з магазину');
  const paymentLine = order.payment_method === 'prepay'
    ? `Передоплата (${order.prepay_amount} грн з ${order.total} грн) — клієнт підтвердив оплату`
    : `${PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method} — клієнт підтвердив оплату`;
  const items = JSON.parse(order.items_json || '[]');
  const itemsLines = items.map((it) => `• ${escapeHtml(it.name)} × ${it.qty} — ${it.price * it.qty} грн`).join('\n');
  const text = [
    `📦 <b>Нове замовлення №${order.id}</b>`,
    `👤 ${escapeHtml(order.customer_name)}, ${escapeHtml(order.customer_phone)}`,
    `🚚 ${deliveryLine}`,
    `💳 ${paymentLine}`,
    '',
    itemsLines,
    '',
    `Разом: <b>${order.total} грн</b>`,
  ].join('\n');

  // 1) Спочатку окреме повідомлення із замовленням (текст + фото товарів)
  const productPhotos = [];
  const imageStmt = db.prepare('SELECT image FROM products WHERE id = ?');
  for (const it of items) {
    const product = imageStmt.get(it.id);
    if (!product || !product.image) continue;
    const abs = path.join(__dirname, '..', '..', product.image);
    if (fs.existsSync(abs)) productPhotos.push({ path: abs, caption: `${escapeHtml(it.name)} × ${it.qty}` });
  }
  if (!productPhotos.length) {
    await sendTelegramMessage(text);
  } else if (productPhotos.length === 1) {
    await sendTelegramPhoto(productPhotos[0].path, text);
  } else {
    productPhotos[0].caption = text;
    await sendTelegramMediaGroup(productPhotos);
  }

  // 2) Потім окремим повідомленням — чек оплати (щоб збій одного не ламав інше)
  if (order.receipt_path) {
    const receiptAbs = path.join(__dirname, '..', '..', order.receipt_path);
    if (fs.existsSync(receiptAbs) && path.extname(receiptAbs).toLowerCase() !== '.pdf') {
      await sendTelegramPhoto(receiptAbs, `🧾 Чек оплати до замовлення №${order.id}`);
    }
  }
}

/* ---- Створення замовлення (публічно, з кошика на сайті) ---- */
router.post('/api/orders', (req, res) => {
  const b = req.body || {};
  const name = String(b.customerName || '').trim() || 'Не вказано';
  const phone = normalizeUkrainianPhone(b.customerPhone);
  const city = String(b.city || '').trim();
  const warehouse = String(b.warehouse || '').trim();
  const paymentMethod = ['prepay', 'full'].includes(b.paymentMethod) ? b.paymentMethod : 'prepay';
  const cartItems = Array.isArray(b.items) ? b.items : [];

  if (!phone) return res.status(400).json({ error: 'Вкажіть номер у форматі +380 XX XXX XX XX' });
  if (!city && !warehouse) return res.status(400).json({ error: 'Вкажіть місто доставки або самовивіз' });
  if (!cartItems.length) return res.status(400).json({ error: 'Кошик порожній' });

  // Ціни рахуємо на сервері з БД, клієнту не довіряємо
  const productStmt = db.prepare('SELECT id, name, price FROM products WHERE id = ?');
  let total = 0;
  const items = [];
  for (const it of cartItems) {
    const product = productStmt.get(it.id);
    if (!product) continue;
    const qty = Math.max(1, Math.min(50, Number(it.qty) || 1));
    total += product.price * qty;
    items.push({ id: product.id, name: product.name, price: product.price, qty });
  }
  if (!items.length) return res.status(400).json({ error: 'Товари не знайдено' });

  const prepayAmount = paymentMethod === 'prepay' ? Math.ceil(total * getPrepaymentPercent() / 100) : null;

  const info = db.prepare(`
    INSERT INTO orders (customer_name, customer_phone, city, warehouse, payment_method, total, prepay_amount, items_json)
    VALUES (@customer_name, @customer_phone, @city, @warehouse, @payment_method, @total, @prepay_amount, @items_json)
  `).run({
    customer_name: name,
    customer_phone: phone,
    city,
    warehouse,
    payment_method: paymentMethod,
    total,
    prepay_amount: prepayAmount,
    items_json: JSON.stringify(items),
  });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(serializeOrder(order));
});

/* ---- Клієнт підтверджує оплату: тільки після цього замовлення йде в Telegram ---- */
router.post('/api/orders/:id/confirm-payment', receiptUpload.single('receipt'), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Замовлення не знайдено' });

  // Уникаємо повторного сповіщення в Telegram, якщо оплату вже підтверджено раніше
  // (наприклад, подвійний клік або повторний запит з браузера)
  if (order.receipt_path) {
    if (req.file) fs.unlink(path.join(__dirname, '..', '..', 'data', 'receipts', req.file.filename), () => {});
    return res.json(serializeOrder(order));
  }
  if (!req.file) return res.status(400).json({ error: 'Додайте скріншот або фото чека' });

  const receiptPath = `data/receipts/${req.file.filename}`;
  db.prepare('UPDATE orders SET receipt_path = ? WHERE id = ?').run(receiptPath, order.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  notifyNewOrder(updated);
  res.json(serializeOrder(updated));
});

/* ---- Адмін: перегляд чека оплати конкретного замовлення ---- */
router.get('/api/admin/orders/:id/receipt', requireAdmin, (req, res) => {
  const order = db.prepare('SELECT receipt_path FROM orders WHERE id = ?').get(req.params.id);
  if (!order || !order.receipt_path) return res.status(404).json({ error: 'Чек відсутній' });
  const abs = path.join(__dirname, '..', '..', order.receipt_path);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Файл відсутній' });
  res.sendFile(abs);
});

/* ---- Публічні реквізити для оплати банківським переказом ---- */
router.get('/api/payment-requisites', (req, res) => {
  const {
    PAYMENT_RECEIVER_NAME, PAYMENT_IBAN, PAYMENT_TAX_ID,
    PAYMENT_BANK_NAME, PAYMENT_BANK_MFO, PAYMENT_BANK_EDRPOU,
  } = process.env;
  if (!PAYMENT_IBAN) return res.status(503).json({ error: 'Реквізити для оплати ще не налаштовані' });
  res.json({
    receiverName: PAYMENT_RECEIVER_NAME || '',
    iban: PAYMENT_IBAN,
    taxId: PAYMENT_TAX_ID || '',
    bankName: PAYMENT_BANK_NAME || '',
    bankMfo: PAYMENT_BANK_MFO || '',
    bankEdrpou: PAYMENT_BANK_EDRPOU || '',
    prepaymentPercent: getPrepaymentPercent(),
  });
});

/* ---- Ініціалізація оплати LiqPay для конкретного замовлення ---- */
router.post('/api/orders/:id/liqpay', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Замовлення не знайдено' });
  const { LIQPAY_PUBLIC_KEY, LIQPAY_PRIVATE_KEY, SITE_URL } = process.env;
  if (!LIQPAY_PUBLIC_KEY || !LIQPAY_PRIVATE_KEY) {
    return res.status(503).json({ error: 'LiqPay ще не налаштовано на сервері' });
  }
  const payload = createCheckoutPayload({
    amount: order.total,
    orderId: `wusa-${order.id}-${Date.now()}`,
    description: `Замовлення №${order.id} — WUSAshop`,
    publicKey: LIQPAY_PUBLIC_KEY,
    privateKey: LIQPAY_PRIVATE_KEY,
    resultUrl: `${SITE_URL || ''}/order-success.html?order=${order.id}`,
    serverUrl: `${SITE_URL || ''}/api/liqpay/callback`,
  });
  db.prepare('UPDATE orders SET liqpay_order_id = ? WHERE id = ?').run(payload.data.slice(0, 100), order.id);
  res.json({ ...payload, checkoutUrl: 'https://www.liqpay.ua/api/3/checkout' });
});

/* ---- Callback від LiqPay (server-to-server) ---- */
router.post('/api/liqpay/callback', (req, res) => {
  const { data, signature } = req.body || {};
  const { LIQPAY_PRIVATE_KEY } = process.env;
  if (!data || !signature || !LIQPAY_PRIVATE_KEY) return res.status(400).end();
  if (!verifyCallbackSignature(data, signature, LIQPAY_PRIVATE_KEY)) return res.status(400).end();

  let payload;
  try { payload = JSON.parse(Buffer.from(data, 'base64').toString('utf8')); } catch { return res.status(400).end(); }

  const orderIdMatch = /^wusa-(\d+)-/.exec(payload.order_id || '');
  if (!orderIdMatch) return res.status(200).end();
  const orderId = Number(orderIdMatch[1]);
  const paid = payload.status === 'success' || payload.status === 'sandbox';
  db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(paid ? 'paid' : 'failed', orderId);
  res.status(200).end();
});

/* ---- Адмін: перегляд і оновлення замовлень ---- */
router.get('/api/admin/orders', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  res.json(rows.map(serializeOrder));
});

router.put('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Замовлення не знайдено' });
  const { orderStatus, paymentStatus } = req.body || {};
  db.prepare('UPDATE orders SET order_status = COALESCE(?, order_status), payment_status = COALESCE(?, payment_status) WHERE id = ?')
    .run(orderStatus || null, paymentStatus || null, req.params.id);
  res.json(serializeOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
});

module.exports = router;
