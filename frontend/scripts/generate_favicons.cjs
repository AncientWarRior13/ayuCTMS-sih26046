const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
function makeCrcTable() {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function renderBrandBadge(width, height) {
  // Render circular emerald-gradient badge with leaf glyph
  const rgba = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const r = (width / 2) - 1.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        // Gradient from #2FB39A (top-left) to #0B1512 (bottom-right)
        const t = (x + y) / (width + height);
        // #2FB39A -> r: 47, g: 179, b: 154
        // #0B1512 -> r: 11, g: 21, b: 18
        let red = Math.round(47 * (1 - t) + 11 * t);
        let green = Math.round(179 * (1 - t) + 21 * t);
        let blue = Math.round(154 * (1 - t) + 18 * t);

        // Anti-aliased outer circle edge
        let alpha = 255;
        if (dist > r - 1) {
          alpha = Math.round(255 * (r - dist));
        }

        // Draw leaf glyph (normalized coords -1 to 1)
        const nx = (x - cx) / (r * 0.65);
        const ny = (y - cy) / (r * 0.65);

        // Leaf outline formula: roughly |nx| < (1 - ny*ny)*sqrt(1+ny) or similar
        // Or normalized distance from leaf shape:
        // Leaf extends from ny = -0.8 to ny = 0.8
        // Width at ny is roughly (1 - ny)*(ny + 0.9)*1.2
        let inLeafStroke = false;
        let inCircle = false;
        let inStem = false;

        // Leaf outer curve:
        if (ny >= -0.85 && ny <= 0.85) {
          const w = 0.8 * Math.sin(Math.acos(Math.max(-1, Math.min(1, ny / 0.9))));
          const distToEdge = Math.abs(Math.abs(nx) - w);
          if (distToEdge < 0.16 && Math.abs(nx) <= w + 0.08) {
            inLeafStroke = true;
          }
        }

        // Center stem:
        if (Math.abs(nx) < 0.12 && ny >= -0.85 && ny <= 0.85) {
          inStem = true;
        }

        // Center node/circle:
        const nodeDist = Math.sqrt(nx * nx + (ny - 0.15) * (ny - 0.15));
        if (nodeDist <= 0.22) {
          inCircle = true;
        }

        if (inLeafStroke || inStem || inCircle) {
          // Crisp white leaf
          red = 255;
          green = 255;
          blue = 255;
        }

        rgba[idx] = red;
        rgba[idx + 1] = green;
        rgba[idx + 2] = blue;
        rgba[idx + 3] = alpha;
      } else if (dist <= r + 1) {
        // Anti-aliased edge
        const alpha = Math.round(255 * (r + 1 - dist));
        rgba[idx] = 47;
        rgba[idx + 1] = 179;
        rgba[idx + 2] = 154;
        rgba[idx + 3] = Math.max(0, Math.min(255, alpha));
      } else {
        // Transparent
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
      }
    }
  }

  return rgba;
}

function generatePng(width, height) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw data with filter type 0 for each row
  const rawRgba = renderBrandBadge(width, height);
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (1 + width * 4);
    scanlines[scanlineOffset] = 0; // Filter None
    rawRgba.copy(scanlines, scanlineOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Generate ICO file containing 16x16 and 32x32 PNGs
function generateIco(png16, png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(2, 4); // 2 images

  const dirEntry1 = Buffer.alloc(16);
  dirEntry1[0] = 16; // width
  dirEntry1[1] = 16; // height
  dirEntry1[2] = 0;  // colors
  dirEntry1[3] = 0;  // reserved
  dirEntry1.writeUInt16LE(1, 4); // color planes
  dirEntry1.writeUInt16LE(32, 6); // bits per pixel
  dirEntry1.writeUInt32LE(png16.length, 8); // size
  dirEntry1.writeUInt32LE(6 + 32, 12); // offset (header + 2 entries = 38)

  const dirEntry2 = Buffer.alloc(16);
  dirEntry2[0] = 32;
  dirEntry2[1] = 32;
  dirEntry2[2] = 0;
  dirEntry2[3] = 0;
  dirEntry2.writeUInt16LE(1, 4);
  dirEntry2.writeUInt16LE(32, 6);
  dirEntry2.writeUInt32LE(png32.length, 8);
  dirEntry2.writeUInt32LE(6 + 32 + png16.length, 12);

  return Buffer.concat([header, dirEntry1, dirEntry2, png16, png32]);
}

const publicDir = path.resolve(__dirname, '../public');

// 1. Generate PNGs
const png16 = generatePng(16, 16);
const png32 = generatePng(32, 32);
const png180 = generatePng(180, 180);
const png192 = generatePng(192, 192);
const png512 = generatePng(512, 512);

fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), png16);
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), png32);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

// 2. Generate ICO
const ico = generateIco(png16, png32);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

// 3. Generate high-precision SVG favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
  <defs>
    <radialGradient id="bgGrad" cx="30%" cy="25%" r="85%">
      <stop offset="0%" stop-color="#39C8AD" />
      <stop offset="45%" stop-color="#2FB39A" />
      <stop offset="100%" stop-color="#0A1410" />
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#2FB39A" flood-opacity="0.45" />
    </filter>
  </defs>
  <!-- Circular badge with emerald gradient and border -->
  <circle cx="20" cy="20" r="18.5" fill="url(#bgGrad)" stroke="#39C8AD" stroke-width="1.2" stroke-opacity="0.6" filter="url(#glow)" />
  <!-- Botanical Leaf-Flame Glyph -->
  <path d="M20 31.5C20 31.5 9 23 9 14.5C9 8.5 14 3.5 20 3.5C26 3.5 31 8.5 31 14.5C31 23 20 31.5 20 31.5Z" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  <!-- Central Vein -->
  <path d="M20 3.5V31.5" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" />
  <!-- Central Flame / Seed Node -->
  <circle cx="20" cy="16" r="2.8" fill="#FFFFFF" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

// 4. Generate site.webmanifest
const manifest = {
  name: "AyuCTMS — Clinical Trial Management & Safety Command",
  short_name: "AyuCTMS",
  description: "Compliance-grade Ayurvedic Clinical Trial Management System for Ministry of Ayush & AIIA",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }
  ],
  theme_color: "#2FB39A",
  background_color: "#0A0F0D",
  display: "standalone"
};
fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));

console.log("All favicons and manifest generated successfully!");
