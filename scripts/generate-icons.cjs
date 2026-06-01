const { createCanvas } = require('canvas');
const fs = require('fs');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = '#52E09C';
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = `900 ${size * 0.62}px Arial Black, Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const textY = size * 0.5 + size * 0.22;
  ctx.fillText('K', size / 2, textY);

  return canvas.toBuffer('image/png');
}

fs.writeFileSync('public/icon-192.png', generateIcon(192));
fs.writeFileSync('public/icon-512.png', generateIcon(512));
console.log('Icons generated!');
