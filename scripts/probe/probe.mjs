// Reference-photograph probe.
//
//   node probe.mjs sil   <img> [x0 x1 y0 y1 step]   per-row leftmost/rightmost non-background
//   node probe.mjs map   <img> [x0 x1 y0 y1 cols rows]  ascii hue map with a ruler
//   node probe.mjs col   <img> x y                   pixel colour
//   node probe.mjs row   <img> y [x0 x1]             one row's colour runs
//   node probe.mjs cls   <img> <class> y [x0 x1]     leftmost/rightmost pixel of a hue class in a row
import { readPNG } from './png.mjs';

const [, , cmd, file, ...rest] = process.argv;
const img = readPNG(file);
const n = (i, d) => (rest[i] === undefined ? d : Number(rest[i]));

// --- hue classification -------------------------------------------------
// Backgrounds in these shots are near-white studio sweeps, so "background"
// is bright AND desaturated AND in the outer margin — a white armour plate
// is bright and desaturated too, which is why the flood fill below matters.
function cls([r, g, b, a]) {
  if (a < 40) return '.';
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  const v = mx / 255;
  if (v < 0.16) return 'K';                       // black
  if (sat < 0.13) return v > 0.72 ? 'W' : v > 0.42 ? 'w' : 'k';   // white / grey / dark grey
  const h = (() => {
    const d = mx - mn;
    let hh;
    if (mx === r) hh = ((g - b) / d) % 6;
    else if (mx === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    return ((hh * 60) + 360) % 360;
  })();
  if (h < 18 || h >= 330) return 'R';             // red
  if (h < 45) return v > 0.5 ? 'G' : 'R';         // gold / orange
  if (h < 70) return 'Y';                         // yellow
  if (h < 165) return 'E';                        // green (emerald)
  if (h < 200) return 'C';                        // cyan
  if (h < 260) return v > 0.45 ? 'B' : 'N';       // blue / navy
  return 'P';                                     // purple/pink
}

// Background = the region connected to the image border that matches the
// CORNER colour within a tolerance. Adaptive, because these references have
// both white studio sweeps and near-black 3D-render backdrops, and a fixed
// "bright and desaturated" test calls white ARMOUR background on one and
// the whole suit background on the other.
let bgMask = null;
function background() {
  if (bgMask) return bgMask;
  const { w, h, px } = img;
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];
  const ref = [0, 1, 2].map((c) => corners.reduce((a, p) => a + p[c], 0) / 4);
  // A vignetted backdrop drifts a long way from its own corner, so the
  // tolerance is generous on VALUE and tight on HUE.
  const tol = Number(process.env.BGTOL || 46);
  const m = new Uint8Array(w * h);
  const near = (x, y) => {
    const [r, g, b, a] = px(x, y);
    if (a < 40) return true;
    const d = Math.abs(r - ref[0]) + Math.abs(g - ref[1]) + Math.abs(b - ref[2]);
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    return d < tol * 3 && sat < 34;
  };
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push([x, 0], [x, h - 1]); }
  for (let y = 0; y < h; y++) { stack.push([0, y], [w - 1, y]); }
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = y * w + x;
    if (m[i]) continue;
    if (!near(x, y)) continue;
    m[i] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  bgMask = m;
  return m;
}
const isFg = (x, y) => !background()[y * img.w + x];

if (cmd === 'sil') {
  const x0 = n(0, 0), x1 = n(1, img.w - 1), y0 = n(2, 0), y1 = n(3, img.h - 1), st = n(4, 4);
  console.log(`# ${file} ${img.w}x${img.h}  x[${x0},${x1}] y[${y0},${y1}]`);
  console.log('#    y     L     R   span   mid');
  for (let y = y0; y <= y1; y += st) {
    let L = -1, R = -1;
    for (let x = x0; x <= x1; x++) if (isFg(x, y)) { if (L < 0) L = x; R = x; }
    if (L < 0) { console.log(String(y).padStart(6) + '     -');  continue; }
    console.log([y, L, R, R - L + 1, ((L + R) / 2).toFixed(1)]
      .map((s) => String(s).padStart(6)).join(''));
  }
} else if (cmd === 'map') {
  const x0 = n(0, 0), x1 = n(1, img.w - 1), y0 = n(2, 0), y1 = n(3, img.h - 1);
  const cols = n(4, 100), rows = n(5, 60);
  const sx = (x1 - x0) / cols, sy = (y1 - y0) / rows;
  const hdr = [];
  for (let c = 0; c < cols; c += 10) hdr.push(String(Math.round(x0 + c * sx)).padEnd(10));
  console.log('       ' + hdr.join(''));
  for (let r = 0; r <= rows; r++) {
    const y = Math.round(y0 + r * sy);
    let line = '';
    for (let c = 0; c <= cols; c++) {
      const x = Math.round(x0 + c * sx);
      line += isFg(x, y) ? cls(img.px(x, y)) : ' ';
    }
    console.log(String(y).padStart(6) + ' ' + line);
  }
} else if (cmd === 'col') {
  const x = n(0, 0), y = n(1, 0);
  const p = img.px(x, y);
  console.log(`${x},${y}  rgb(${p[0]},${p[1]},${p[2]}) a${p[3]}  class ${cls(p)}  fg=${isFg(x, y)}`);
} else if (cmd === 'row') {
  const y = n(0, 0), x0 = n(1, 0), x1 = n(2, img.w - 1);
  let run = null; const out = [];
  for (let x = x0; x <= x1; x++) {
    const c = isFg(x, y) ? cls(img.px(x, y)) : ' ';
    if (!run || run.c !== c) { if (run) out.push(run); run = { c, a: x, b: x }; }
    else run.b = x;
  }
  if (run) out.push(run);
  console.log(`# row ${y}: ` + out.filter((r) => r.b - r.a >= 1)
    .map((r) => `${r.c}${r.a}-${r.b}`).join(' '));
} else if (cmd === 'cls') {
  const want = rest[0], y = n(1, 0), x0 = n(2, 0), x1 = n(3, img.w - 1);
  let L = -1, R = -1;
  for (let x = x0; x <= x1; x++) if (isFg(x, y) && cls(img.px(x, y)) === want) { if (L < 0) L = x; R = x; }
  console.log(`row ${y} class ${want}: L=${L} R=${R} span=${R - L + 1} mid=${((L + R) / 2).toFixed(1)}`);
} else {
  console.log('usage: sil|map|col|row|cls');
}
