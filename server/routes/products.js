'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { requireAdmin } = require('../auth');

const router = require('express').Router();

const uploadDir = path.join(__dirname, '..', '..', 'assets', 'images', 'products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return cb(new Error('Непідтримуваний формат зображення'));
    cb(null, true);
  },
});

function serializeProduct(row) {
  let images = [];
  try { images = JSON.parse(row.images || '[]'); } catch { images = []; }
  if (!Array.isArray(images) || !images.length) images = row.image ? [row.image] : [];
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    price: row.price,
    oldPrice: row.old_price,
    image: row.image,
    images,
    status: row.status,
    craftTime: row.craft_time,
    isHit: !!row.is_hit,
    sortOrder: row.sort_order,
  };
}

/* ---- Публічні маршрути ---- */
router.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY sort_order ASC, id DESC').all();
  res.json(rows.map(serializeProduct));
});

router.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Товар не знайдено' });
  res.json(serializeProduct(row));
});

/* ---- Адмін-маршрути (потребують авторизації) ---- */
router.get('/api/admin/products', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY sort_order ASC, id DESC').all();
  res.json(rows.map(serializeProduct));
});

router.post('/api/admin/products', requireAdmin, upload.array('images', 6), (req, res) => {
  const b = req.body;
  const name = (b.name || '').trim();
  const price = Number(b.price);
  if (!name || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "Вкажіть назву та коректну ціну товару" });
  }
  const uploaded = (req.files || []).map((f) => `assets/images/products/${f.filename}`);
  const images = uploaded.length ? uploaded : (b.imageUrl ? [b.imageUrl] : []);
  const image = images[0] || '';
  const oldPrice = b.oldPrice ? Number(b.oldPrice) : null;
  const info = db.prepare(`
    INSERT INTO products (name, category, description, price, old_price, image, images, status, craft_time, is_hit, sort_order)
    VALUES (@name, @category, @description, @price, @old_price, @image, @images, @status, @craft_time, @is_hit, @sort_order)
  `).run({
    name,
    category: (b.category || '').trim(),
    description: (b.description || '').trim(),
    price,
    old_price: oldPrice,
    image,
    images: JSON.stringify(images),
    status: b.status || 'in_stock',
    craft_time: (b.craftTime || '').trim(),
    is_hit: b.isHit === 'true' || b.isHit === '1' || b.isHit === true ? 1 : 0,
    sort_order: b.sortOrder ? Number(b.sortOrder) : 0,
  });
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(serializeProduct(row));
});

router.put('/api/admin/products/:id', requireAdmin, upload.array('images', 6), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Товар не знайдено' });
  const b = req.body;
  const price = b.price !== undefined ? Number(b.price) : existing.price;
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'Некоректна ціна' });
  }
  let existingImages = [];
  try { existingImages = JSON.parse(existing.images || '[]'); } catch { existingImages = []; }
  if (!existingImages.length && existing.image) existingImages = [existing.image];

  // keepImages — JSON-масив шляхів наявних фото, які треба залишити (і в якому порядку)
  let keptImages = existingImages;
  if (b.keepImages !== undefined) {
    try {
      const kept = JSON.parse(b.keepImages);
      keptImages = Array.isArray(kept) ? kept.filter((p) => existingImages.includes(p)) : existingImages;
    } catch { keptImages = existingImages; }
  }
  const removedImages = existingImages.filter((p) => !keptImages.includes(p));
  removedImages.forEach((p) => {
    if (p && p.startsWith('assets/images/products/')) {
      fs.unlink(path.join(__dirname, '..', '..', p), () => {});
    }
  });

  const uploaded = (req.files || []).map((f) => `assets/images/products/${f.filename}`);
  let images = keptImages.concat(uploaded);
  if (!images.length && b.imageUrl !== undefined && b.imageUrl) images = [b.imageUrl];
  const image = images[0] || '';

  db.prepare(`
    UPDATE products SET name=@name, category=@category, description=@description, price=@price,
      old_price=@old_price, image=@image, images=@images, status=@status, craft_time=@craft_time, is_hit=@is_hit, sort_order=@sort_order
    WHERE id=@id
  `).run({
    id: req.params.id,
    name: (b.name ?? existing.name).trim(),
    category: (b.category ?? existing.category).trim(),
    description: (b.description ?? existing.description).trim(),
    price,
    old_price: b.oldPrice !== undefined ? (b.oldPrice ? Number(b.oldPrice) : null) : existing.old_price,
    image,
    images: JSON.stringify(images),
    status: b.status ?? existing.status,
    craft_time: (b.craftTime ?? existing.craft_time).trim(),
    is_hit: b.isHit !== undefined ? (b.isHit === 'true' || b.isHit === '1' || b.isHit === true ? 1 : 0) : existing.is_hit,
    sort_order: b.sortOrder !== undefined ? Number(b.sortOrder) : existing.sort_order,
  });
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(serializeProduct(row));
});

router.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Товар не знайдено' });
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  let images = [];
  try { images = JSON.parse(existing.images || '[]'); } catch { images = []; }
  if (!images.length && existing.image) images = [existing.image];
  images.forEach((p) => {
    if (p && p.startsWith('assets/images/products/')) {
      fs.unlink(path.join(__dirname, '..', '..', p), () => {});
    }
  });
  res.status(204).end();
});

module.exports = router;
