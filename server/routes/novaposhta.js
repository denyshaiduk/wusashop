'use strict';

const router = require('express').Router();
const { searchCities, searchWarehouses } = require('../novaposhta');

router.get('/api/novaposhta/cities', async (req, res) => {
  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  const query = String(req.query.q || '').trim();
  if (!apiKey) return res.status(503).json({ error: 'Нова Пошта API ще не налаштовано на сервері' });
  if (query.length < 2) return res.json([]);
  try {
    res.json(await searchCities(apiKey, query));
  } catch (e) {
    res.status(502).json({ error: 'Помилка звернення до Нової Пошти' });
  }
});

router.get('/api/novaposhta/warehouses', async (req, res) => {
  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  const cityRef = String(req.query.cityRef || '').trim();
  if (!apiKey) return res.status(503).json({ error: 'Нова Пошта API ще не налаштовано на сервері' });
  if (!cityRef) return res.json([]);
  try {
    res.json(await searchWarehouses(apiKey, cityRef));
  } catch (e) {
    res.status(502).json({ error: 'Помилка звернення до Нової Пошти' });
  }
});

module.exports = router;
