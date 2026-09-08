'use strict';

const router = require('express').Router();
const { issueAdminCookie, clearAdminCookie, requireAdmin } = require('../auth');

router.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(503).json({ error: 'Пароль адміна не налаштовано на сервері' });
  if (password !== expected) return res.status(401).json({ error: 'Невірний пароль' });
  issueAdminCookie(res);
  res.json({ ok: true });
});

router.post('/api/admin/logout', (req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

router.get('/api/admin/session', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
