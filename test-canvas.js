const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

const canvas = createCanvas(400, 200);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, 400, 200);

// Test text
ctx.fillStyle = '#000000';
ctx.font = 'bold 40px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('TEST TEXT', 200, 100);

// Save
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('test-canvas.png', buffer);
console.log('Test image saved to test-canvas.png');
