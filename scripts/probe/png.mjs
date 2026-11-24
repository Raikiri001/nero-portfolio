// Minimal PNG reader: zlib inflate + the five scanline filters.
// Returns { w, h, px(x,y) -> [r,g,b] }.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export function readPNG(path) {
  const buf = readFileSync(path);
  let o = 8;
  let w = 0, h = 0, bitDepth = 8, colorType = 6;
  const idat = [];
  let palette = null, trns = null;

  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString('ascii', o + 4, o + 8);
    const data = buf.subarray(o + 8, o + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG not supported');
    } else if (type === 'PLTE') palette = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    o += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`bit depth ${bitDepth} not supported`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`color type ${colorType} not supported`);

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = channels;             // bytes per pixel at depth 8
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);

  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const x = line[i];
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`bad filter ${filter}`);
      }
      cur[i] = v & 0xff;
    }
  }

  const px = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return [255, 255, 255, 0];
    const i = y * stride + x * bpp;
    if (colorType === 3) {
      const idx = out[i];
      const al = trns && idx < trns.length ? trns[idx] : 255;
      return [palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2], al];
    }
    if (colorType === 0) return [out[i], out[i], out[i], 255];
    if (colorType === 4) return [out[i], out[i], out[i], out[i + 1]];
    if (colorType === 2) return [out[i], out[i + 1], out[i + 2], 255];
    return [out[i], out[i + 1], out[i + 2], out[i + 3]];
  };

  return { w, h, px };
}
