// Simple PWA Icon Generator using SVG
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG for each size
sizes.forEach(size => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#13091f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a0b2e;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#grad)" />

  <!-- Border -->
  <rect x="${size * 0.05}" y="${size * 0.05}"
        width="${size * 0.9}" height="${size * 0.9}"
        fill="none" stroke="#ff00ff" stroke-width="${size * 0.03}"
        rx="${size * 0.08}" />

  <!-- Music note -->
  <text x="${size / 2}" y="${size / 2 + size * 0.1}"
        font-family="Arial, sans-serif"
        font-size="${size * 0.5}"
        font-weight="bold"
        fill="#ff00ff"
        text-anchor="middle"
        dominant-baseline="middle">♪</text>

  <!-- uRequest text -->
  <text x="${size / 2}" y="${size * 0.85}"
        font-family="Arial, sans-serif"
        font-size="${size * 0.12}"
        font-weight="bold"
        fill="#ff00ff"
        text-anchor="middle">uRequest</text>
</svg>`;

  // Save SVG file
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generated ${svgPath}`);

  // Create a simple PNG placeholder info file
  const infoPath = path.join(iconsDir, `icon-${size}x${size}.png.info`);
  fs.writeFileSync(infoPath, `This is a placeholder. Convert icon-${size}x${size}.svg to PNG using an online converter or image editor.
Recommended: https://cloudconvert.com/svg-to-png or use Inkscape/GIMP`);
});

console.log('\n✅ All SVG icons generated!');
console.log('📝 Next steps:');
console.log('1. Convert SVG files to PNG using an online converter');
console.log('2. Or open /public/icons/generate-icons.html in a browser');
console.log('3. Or use: npx @svgr/cli --icon --replace-attr-values "#000=currentColor" public/icons/*.svg');
