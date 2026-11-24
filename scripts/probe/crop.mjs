// Gridded, upscaled crop of a reference — the instrument for TRACING CORNERS.
//
//   node crop.mjs <img> x0 y0 x1 y1 [zoom] [grid] [out.png]
//
// Draws a labelled grid in SOURCE-IMAGE coordinates over the crop, so a
// corner read off the picture converts to a pixel coordinate directly. Grid
// lines are drawn at `grid` source-pixel intervals; every other one is
// labelled. Corner tracing off an unlabelled magnified crop was reliably
// ~20% out — this is what makes it not be.
import { writeFileSync } from 'node:fs';
import { readPNG } from './png.mjs';
import { writePNG, drawText } from './pngw.mjs';

const [, , file, ...a] = process.argv;
const x0 = +a[0], y0 = +a[1], x1 = +a[2], y1 = +a[3];
const zoom = a[4] ? +a[4] : 4;
const grid = a[5] ? +a[5] : 10;
const out = a[6] || 'crop.png';

const img = readPNG(file);
const cw = x1 - x0, ch = y1 - y0;
const w = cw * zoom, h = ch * zoom;
const rgb = Buffer.alloc(w * h * 3);

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const [r, g, b] = img.px(x0 + Math.floor(x / zoom), y0 + Math.floor(y / zoom));
    const i = (y * w + x) * 3;
    rgb[i] = r; rgb[i + 1] = g; rgb[i + 2] = b;
  }
}

// Grid: magenta minor, cyan every 5th (labelled). Magenta and cyan appear
// nowhere in these references, so a line is never mistaken for the model.
const put = (x, y, c) => {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = (y * w + x) * 3;
  rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
};
const MINOR = [255, 0, 220], MAJOR = [0, 255, 255];
for (let sx = Math.ceil(x0 / grid) * grid; sx < x1; sx += grid) {
  const major = (sx / grid) % 5 === 0;
  const px = (sx - x0) * zoom;
  for (let y = 0; y < h; y++) if (major || y % 3 === 0) put(px, y, major ? MAJOR : MINOR);
  if (major) drawText(rgb, w, h, px + 2, 2, sx, MAJOR, 2);
}
for (let sy = Math.ceil(y0 / grid) * grid; sy < y1; sy += grid) {
  const major = (sy / grid) % 5 === 0;
  const py = (sy - y0) * zoom;
  for (let x = 0; x < w; x++) if (major || x % 3 === 0) put(x, py, major ? MAJOR : MINOR);
  if (major) drawText(rgb, w, h, 2, py + 2, sy, MAJOR, 2);
}

writeFileSync(out, writePNG(w, h, rgb));
console.log(`${out}  ${w}x${h}  src x[${x0},${x1}] y[${y0},${y1}] zoom ${zoom} grid ${grid}`);
