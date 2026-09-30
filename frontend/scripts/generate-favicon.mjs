/**
 * generate-favicon.mjs
 * Generates all AyuCTMS favicon assets from favicon.svg using the @resvg/resvg-js library.
 * Falls back to a pure-JS SVG-to-canvas approach if resvg is unavailable.
 *
 * Run: node scripts/generate-favicon.mjs
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const publicDir = join(root, "public");

// ── Install resvg-js if missing ──────────────────────────────────────────────
try {
  await import("@resvg/resvg-js");
} catch {
  console.log("Installing @resvg/resvg-js...");
  execSync("npm install --save-dev @resvg/resvg-js", { cwd: root, stdio: "inherit" });
}

const { Resvg } = await import("@resvg/resvg-js");
const svgContent = readFileSync(join(publicDir, "favicon.svg"));

/**
 * Render the lotus SVG at a given pixel size and return a PNG Buffer.
 */
function renderPng(size) {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: "width", value: size },
    background: "rgba(10, 15, 13, 1)",
  });
  return resvg.render().asPng();
}

// ── Sizes to generate ────────────────────────────────────────────────────────
const targets = [
  { file: "favicon-16x16.png",    size: 16  },
  { file: "favicon-32x32.png",    size: 32  },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png",         size: 192 },
  { file: "icon-512.png",         size: 512 },
];

for (const { file, size } of targets) {
  const png = renderPng(size);
  writeFileSync(join(publicDir, file), png);
  console.log(`✅  ${file}  (${size}×${size})`);
}

// ── Build a proper 16×16 + 32×32 multi-size .ico ────────────────────────────
// ICO format: ICONDIR + ICONDIRENTRY[] + raw image data
function buildIco(...sizes) {
  const pngs = sizes.map((s) => renderPng(s));
  const count = sizes.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = pngs.map((png, i) => {
    const s = sizes[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(s === 256 ? 0 : s, 0);  // width  (0 = 256)
    entry.writeUInt8(s === 256 ? 0 : s, 1);  // height
    entry.writeUInt8(0, 2);                  // colour count
    entry.writeUInt8(0, 3);                  // reserved
    entry.writeUInt16LE(1, 4);               // colour planes
    entry.writeUInt16LE(32, 6);              // bits per pixel
    entry.writeUInt32LE(png.length, 8);      // image size
    entry.writeUInt32LE(offset, 12);         // offset in file
    offset += png.length;
    return entry;
  });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: ICO
  header.writeUInt16LE(count, 4); // image count

  return Buffer.concat([header, ...entries, ...pngs]);
}

const ico = buildIco(16, 32);
writeFileSync(join(publicDir, "favicon.ico"), ico);
console.log("✅  favicon.ico  (16×16 + 32×32 multi-size ICO)");

console.log("\n🎉 All favicon assets generated from lotus SVG!");
