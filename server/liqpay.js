'use strict';

const crypto = require('crypto');

function base64(str) { return Buffer.from(str, 'utf8').toString('base64'); }

function buildSignature(dataB64, privateKey) {
  const sha1 = crypto.createHash('sha1');
  sha1.update(privateKey + dataB64 + privateKey);
  return sha1.digest('base64');
}

/**
 * Формує data/signature для форми оплати LiqPay (checkout).
 * amount — сума в грн (число), orderId — унікальний ідентифікатор замовлення.
 */
function createCheckoutPayload({ amount, orderId, description, publicKey, privateKey, resultUrl, serverUrl }) {
  const payload = {
    public_key: publicKey,
    version: 3,
    action: 'pay',
    amount: Number(amount.toFixed(2)),
    currency: 'UAH',
    description,
    order_id: String(orderId),
    result_url: resultUrl,
    server_url: serverUrl,
    language: 'uk',
  };
  const dataB64 = base64(JSON.stringify(payload));
  const signature = buildSignature(dataB64, privateKey);
  return { data: dataB64, signature };
}

function verifyCallbackSignature(dataB64, signature, privateKey) {
  const expected = buildSignature(dataB64, privateKey);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

module.exports = { createCheckoutPayload, verifyCallbackSignature };
