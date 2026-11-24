// Tile same-size PNG renders into one contact sheet:  node scripts/blender/tile.mjs out.png <cols> a.png b.png …
import { readPNG } from '../probe/png.mjs';
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const [out, cols, ...files] = process.argv.slice(2);
const imgs = files.map((f) => readPNG(f));
const w = imgs[0].w, h = imgs[0].h, C = Number(cols), Rr = Math.ceil(imgs.length / C);
const W = w * C, H = h * Rr;
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const im = imgs[Math.floor(y / h) * C + Math.floor(x / w)];
    const [r, g, b] = im ? im.px(x % w, y % h) : [0, 0, 0];
    const o = y * (W * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
  }
}
const crc = (b) => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('sheet', W, H);
