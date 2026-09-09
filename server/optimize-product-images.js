'use strict';

const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const sourceDir = path.join(__dirname, '..', 'assets', 'images', 'products');
const targetDir = path.join(sourceDir, 'optimized');
const supportedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

async function optimize() {
  await fs.mkdir(targetDir, { recursive: true });
  const files = await fs.readdir(sourceDir, { withFileTypes: true });
  let sourceBytes = 0;
  let targetBytes = 0;
  let count = 0;

  for (const file of files) {
    if (!file.isFile() || !supportedExtensions.has(path.extname(file.name).toLowerCase())) continue;
    const sourcePath = path.join(sourceDir, file.name);
    const targetPath = path.join(targetDir, `${path.parse(file.name).name}.webp`);
    const sourceInfo = await fs.stat(sourcePath);
    await sharp(sourcePath)
      .rotate()
      .resize({ height: 1200, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(targetPath);
    const targetInfo = await fs.stat(targetPath);
    sourceBytes += sourceInfo.size;
    targetBytes += targetInfo.size;
    count += 1;
  }

  console.log(`Optimized ${count} images: ${(sourceBytes / 1024 / 1024).toFixed(1)} MB -> ${(targetBytes / 1024 / 1024).toFixed(1)} MB`);
}

optimize().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
