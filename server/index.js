'use strict';

require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  const unsafeSecrets = new Set(['', 'change-me', 'change-me-too', 'admin123', 'local-dev-secret-please-change']);
  const invalid = ['ADMIN_PASSWORD', 'SESSION_SECRET'].filter((key) => unsafeSecrets.has(process.env[key] || ''));
  if (invalid.length) {
    throw new Error(`Production secrets must be changed: ${invalid.join(', ')}`);
  }
}

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const novaPoshtaRoutes = require('./routes/novaposhta');

const app = express();
const root = path.join(__dirname, '..');

const allowedOrigins = new Set([
  'https://wusashop.com.ua',
  'https://www.wusashop.com.ua',
  'https://api.wusashop.com.ua',
  process.env.ADMIN_ORIGIN,
].filter(Boolean));

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(authRoutes);
app.use(productsRoutes);
app.use(ordersRoutes);
app.use(novaPoshtaRoutes);

// Адмін-панель та статичні файли сайту
app.use('/admin', express.static(path.join(root, 'admin')));
app.use(express.static(root));

// Помилки multer/валідації API -> JSON замість HTML
app.use((err, req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(400).json({ error: err.message || 'Помилка запиту' });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WUSAshop server running: http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
