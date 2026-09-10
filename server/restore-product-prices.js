'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const sourcePath = process.argv[2];
const targetPath = path.join(__dirname, '..', 'data', 'wusashop.sqlite');

if (!sourcePath) {
  console.error('Usage: node server/restore-product-prices.js /path/to/recovered.sqlite');
  process.exit(1);
}

if (!fs.existsSync(sourcePath)) {
  console.error(`Source database not found: ${sourcePath}`);
  process.exit(1);
}

const source = new DatabaseSync(sourcePath, { readOnly: true });
const target = new DatabaseSync(targetPath);
const sourceProducts = source.prepare('SELECT name, price, old_price FROM products').all();
const updatePrice = target.prepare(
  'UPDATE products SET price = @price, old_price = @oldPrice WHERE name = @name'
);

target.exec('BEGIN');
try {
  let restored = 0;
  for (const product of sourceProducts) {
    const result = updatePrice.run({
      name: product.name,
      price: product.price,
      oldPrice: product.old_price
    });
    restored += result.changes;
  }
  target.exec('COMMIT');
  console.log(`Restored prices for ${restored} products.`);
} catch (error) {
  target.exec('ROLLBACK');
  throw error;
} finally {
  source.close();
  target.close();
}