import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8deaff" stop-opacity="1"/>
      <stop offset="60%" stop-color="#39e4ff" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#39e4ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8deaff"/>
      <stop offset="100%" stop-color="#3bb0ff"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="256" cy="256" r="200" fill="url(#g1)"/>
    <g stroke="url(#g2)" stroke-width="14">
      <path d="M256 96 L392 176 L392 336 L256 416 L120 336 L120 176 Z"/>
      <path d="M256 96 L256 256 L392 336" stroke-width="10"/>
      <path d="M256 256 L120 336" stroke-width="10"/>
    </g>
    <g stroke="#39e4ff" stroke-opacity="0.7" stroke-width="6">
      <line x1="120" y1="176" x2="392" y2="176"/>
      <line x1="120" y1="256" x2="392" y2="256"/>
      <line x1="120" y1="336" x2="392" y2="336"/>
    </g>
    <circle cx="256" cy="256" r="36" fill="#8deaff"/>
  </g>
</svg>`;

async function main() {
  const base512 = await sharp(Buffer.from(svg)).png().resize(512, 512, { fit: 'cover' }).toBuffer();
  fs.writeFileSync(path.join(outDir, 'favicon-512.png'), base512);

  const png32 = await sharp(base512).resize(32, 32, { fit: 'cover' }).png().toBuffer();
  fs.writeFileSync(path.join(outDir, 'favicon-32.png'), png32);
  fs.writeFileSync(path.join(outDir, 'favicon.png'), png32);

  const png16 = await sharp(base512).resize(16, 16, { fit: 'cover' }).png().toBuffer();
  fs.writeFileSync(path.join(outDir, 'favicon-16.png'), png16);

  const ico = createIco([png32]);
  fs.writeFileSync(path.join(outDir, 'favicon.ico'), ico);
  console.log('Favicons gerados em', outDir);
}

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4); // count

  const entries = [];
  let offset = 6 + count * 16;
  for (const buf of pngBuffers) {
    const w = 32, h = 32; // assumindo 32x32 para o PNG fornecido
    const entry = Buffer.alloc(16);
    entry.writeUInt8(w === 256 ? 0 : w, 0); // width (0=256)
    entry.writeUInt8(h === 256 ? 0 : h, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(buf.length, 8); // bytes in res
    entry.writeUInt32LE(offset, 12); // image offset
    entries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

main().catch(err => { console.error(err); process.exit(1); });

