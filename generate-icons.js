// Run this script to generate PWA icons:
// node generate-icons.js
// Requires: npm install canvas

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const outDir = path.join(__dirname, 'assets', 'img');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background circle
  ctx.fillStyle = '#4E3470';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();

  // Letter Y
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.45}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Y', size/2, size/2);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buffer);
  console.log(`Created icon-${size}.png`);
});

console.log('Done! Update manifest.json to use these icons.');
