'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const novaPoshtaRoutes = require('./routes/novaposhta');

const app = express();
const root = path.join(__dirname, '..');

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
