'use strict';

const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'wusa_admin';
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 годин

function sign(payload) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function issueAdminCookie(res) {
  const token = sign({ role: 'admin', exp: Date.now() + MAX_AGE_MS });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
  });
}

function clearAdminCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAdmin(req, res, next) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  const payload = verify(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Потрібна авторизація' });
  }
  next();
}

module.exports = { COOKIE_NAME, issueAdminCookie, clearAdminCookie, requireAdmin };
