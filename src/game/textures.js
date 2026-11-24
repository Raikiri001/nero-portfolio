import * as THREE from 'three';

// ============================================================
// Procedural surface textures — canvas-painted at load, converted to
// Three.js maps. Everything in the 3D scenes used to be flat solid-color
// MeshStandardMaterial, which is what made the mechs and hangar read as
// bland untextured blocks no matter how much geometry was added. These
// give every surface real panel lines, rivets, wear, grime and a matching
// normal/roughness response so light actually catches surface detail.
//
// Albedo maps are painted mostly-white: MeshStandardMaterial multiplies
// `map` by `color`, so one shared texture set tints correctly to every
// per-unit palette colour instead of needing a texture per Gundam.
//
// Every map here is generated ONCE (module-level memo) and shared across
// every material and every mech/bay instance on screen.
// ============================================================

const _cache = new Map();
function cached(key, factory) {
  if (!_cache.has(key)) _cache.set(key, factory());
  return _cache.get(key);
}

// Deterministic RNG so the panel layout is identical every reload —
// otherwise the armour re-scrambles its scratches on every refresh.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

// Sobel-style height -> tangent-space normal conversion. Painting a
// greyscale height pass alongside the albedo and deriving normals from it
// keeps grooves/rivets consistent between the two, which is what makes
// panel lines actually catch a highlight instead of looking printed on.
function heightToNormalCanvas(heightCanvas, strength = 2.2) {
  const size = heightCanvas.width;
  const src = heightCanvas.getContext('2d', { willReadFrequently: true })
    .getImageData(0, 0, size, size).data;
  const out = makeCanvas(size);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(size, size);

  const at = (x, y) => {
    const xi = ((x % size) + size) % size;
    const yi = ((y % size) + size) % size;
    return src[(yi * size + xi) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function toTexture(canvas, repeat = 1, srgb = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Recursively splits a rect into smaller panels, scribing a line at every
// division — the irregular plate layout of real mecha panelling rather
// than a uniform grid.
function subdivide(rand, x, y, w, h, depth, minSize, out) {
  const stop = depth <= 0 || (w < minSize * 2 && h < minSize * 2) || rand() < 0.18;
  if (stop) {
    out.push({ x, y, w, h });
    return;
  }
  const splitH = w < h * 0.75 ? true : h < w * 0.75 ? false : rand() < 0.5;
  const t = 0.3 + rand() * 0.4;
  if (splitH) {
    const hh = h * t;
    subdivide(rand, x, y, w, hh, depth - 1, minSize, out);
    subdivide(rand, x, y + hh, w, h - hh, depth - 1, minSize, out);
  } else {
    const ww = w * t;
    subdivide(rand, x, y, ww, h, depth - 1, minSize, out);
    subdivide(rand, x + ww, y, w - ww, h, depth - 1, minSize, out);
  }
}

function speckle(ctx, size, rand, count, maxR, color, alphaMax) {
  for (let i = 0; i < count; i++) {
    const r = 2 + rand() * maxR;
    ctx.globalAlpha = rand() * alphaMax;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Core panelled-surface generator. Paints albedo + height together, then
 * derives normal and roughness maps from them.
 *
 * @param {object} o
 * @param {number} o.size        texture resolution
 * @param {number} o.depth       subdivision depth (higher = more, smaller panels)
 * @param {number} o.minSize     smallest panel edge in px
 * @param {number} o.line        panel-line width in px
 * @param {number} o.rivets      rivet density multiplier (0 = none)
 * @param {number} o.wear        scratch/grime intensity 0..1
 * @param {number} o.vents       number of louvered vent clusters
 * @param {number} o.base        base albedo grey (255 = pure white/untinted)
 * @param {number} o.seed
 */
function panelSurface(o) {
  const {
    size = 1024, depth = 5, minSize = 42, line = 3, rivets = 1,
    wear = 0.5, vents = 3, base = 236, seed = 7,
  } = o;

  const rand = mulberry32(seed);
  const albedo = makeCanvas(size);
  const height = makeCanvas(size);
  const ac = albedo.getContext('2d');
  const hc = height.getContext('2d', { willReadFrequently: true });

  ac.fillStyle = `rgb(${base},${base},${base})`;
  ac.fillRect(0, 0, size, size);
  hc.fillStyle = '#808080';
  hc.fillRect(0, 0, size, size);

  // Broad tonal mottling so large flat areas aren't perfectly uniform.
  for (let i = 0; i < 40; i++) {
    const r = size * (0.05 + rand() * 0.18);
    const g = ac.createRadialGradient(rand() * size, rand() * size, 0, rand() * size, rand() * size, r);
    const shade = rand() < 0.5 ? 0 : 255;
    g.addColorStop(0, `rgba(${shade},${shade},${shade},${0.03 + rand() * 0.04})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ac.fillStyle = g;
    ac.fillRect(0, 0, size, size);
  }

  const panels = [];
  subdivide(rand, 0, 0, size, size, depth, minSize, panels);

  // Per-panel tone variation — adjacent plates read as separate pieces.
  panels.forEach((p) => {
    const d = (rand() - 0.5) * 26;
    ac.fillStyle = `rgba(${d > 0 ? 255 : 0},${d > 0 ? 255 : 0},${d > 0 ? 255 : 0},${Math.abs(d) / 255})`;
    ac.fillRect(p.x, p.y, p.w, p.h);
  });

  // Scribed panel lines: dark in albedo, recessed groove in height.
  ac.lineWidth = line;
  hc.lineWidth = line;
  panels.forEach((p) => {
    ac.strokeStyle = 'rgba(18,20,26,0.75)';
    ac.strokeRect(p.x + line / 2, p.y + line / 2, p.w - line, p.h - line);
    hc.strokeStyle = 'rgba(40,40,40,0.95)';
    hc.strokeRect(p.x + line / 2, p.y + line / 2, p.w - line, p.h - line);
  });

  // Highlight lip just inside each groove — sells the raised plate edge.
  ac.lineWidth = 1;
  panels.forEach((p) => {
    ac.strokeStyle = 'rgba(255,255,255,0.30)';
    ac.strokeRect(p.x + line + 1, p.y + line + 1, p.w - line * 2 - 2, p.h - line * 2 - 2);
  });

  // Rivets around the larger plates.
  if (rivets > 0) {
    panels.forEach((p) => {
      if (p.w < minSize * 1.6 || p.h < minSize * 1.6) return;
      if (rand() > 0.55 * rivets) return;
      const inset = line + 7;
      const step = 22 + rand() * 16;
      const place = (x, y) => {
        ac.fillStyle = 'rgba(30,33,40,0.7)';
        ac.beginPath();
        ac.arc(x, y, 2.6, 0, Math.PI * 2);
        ac.fill();
        ac.fillStyle = 'rgba(255,255,255,0.34)';
        ac.beginPath();
        ac.arc(x - 0.8, y - 0.8, 1.3, 0, Math.PI * 2);
        ac.fill();
        hc.fillStyle = '#c8c8c8';
        hc.beginPath();
        hc.arc(x, y, 2.6, 0, Math.PI * 2);
        hc.fill();
      };
      for (let x = p.x + inset; x < p.x + p.w - inset; x += step) {
        place(x, p.y + inset);
        place(x, p.y + p.h - inset);
      }
      for (let y = p.y + inset + step; y < p.y + p.h - inset; y += step) {
        place(p.x + inset, y);
        place(p.x + p.w - inset, y);
      }
    });
  }

  // Louvered vent clusters — parallel deep slats.
  for (let v = 0; v < vents; v++) {
    const p = panels[Math.floor(rand() * panels.length)];
    if (!p || p.w < minSize * 1.4 || p.h < minSize * 1.4) continue;
    const pad = line + 8;
    const x = p.x + pad;
    const y = p.y + pad;
    const w = p.w - pad * 2;
    const h = p.h - pad * 2;
    const slats = 3 + Math.floor(rand() * 4);
    const sh = h / slats;
    for (let i = 0; i < slats; i++) {
      const sy = y + i * sh;
      ac.fillStyle = 'rgba(14,16,20,0.82)';
      ac.fillRect(x, sy, w, sh * 0.55);
      hc.fillStyle = '#3a3a3a';
      hc.fillRect(x, sy, w, sh * 0.55);
      ac.fillStyle = 'rgba(255,255,255,0.22)';
      ac.fillRect(x, sy + sh * 0.55, w, 1.5);
    }
  }

  // Wear: edge scuffs, grime pooling, fine scratches.
  if (wear > 0) {
    speckle(ac, size, rand, Math.round(70 * wear), 26, '#1a1d24', 0.10 * wear);
    speckle(ac, size, rand, Math.round(35 * wear), 12, '#ffffff', 0.09 * wear);
    ac.lineCap = 'round';
    for (let i = 0; i < Math.round(70 * wear); i++) {
      const x = rand() * size;
      const y = rand() * size;
      const a = rand() * Math.PI * 2;
      const len = 8 + rand() * 60;
      ac.strokeStyle = rand() < 0.5 ? 'rgba(20,22,28,0.30)' : 'rgba(255,255,255,0.24)';
      ac.lineWidth = rand() < 0.8 ? 1 : 2;
      ac.beginPath();
      ac.moveTo(x, y);
      ac.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ac.stroke();
    }
  }

  // Roughness: inverse-ish of albedo brightness — grime/recesses read matte,
  // bare metal edges read glossier.
  const rough = makeCanvas(size);
  const rc = rough.getContext('2d');
  rc.drawImage(albedo, 0, 0);
  rc.globalCompositeOperation = 'difference';
  rc.fillStyle = '#ffffff';
  rc.fillRect(0, 0, size, size);
  rc.globalCompositeOperation = 'source-over';
  rc.globalAlpha = 0.55;
  rc.fillStyle = '#9a9a9a';
  rc.fillRect(0, 0, size, size);
  rc.globalAlpha = 1;

  return {
    albedo,
    normal: heightToNormalCanvas(height, o.normalStrength ?? 2.2),
    rough,
  };
}

function buildSet(key, opts, repeat) {
  return cached(key, () => {
    const { albedo, normal, rough } = panelSurface(opts);
    return {
      map: toTexture(albedo, repeat, true),
      normalMap: toTexture(normal, repeat),
      roughnessMap: toTexture(rough, repeat),
    };
  });
}

// ---- Public texture sets --------------------------------------

// Hero-unit armour: fine dense panelling, light wear, crisp edges.
export const armorMaps = () =>
  buildSet('armor', { size: 1024, depth: 6, minSize: 34, line: 3, rivets: 0.8, wear: 0.42, vents: 0, base: 240, seed: 11 }, 1);

// Inner frame / joints: darker, busier, more mechanical, heavier wear.
export const frameMaps = () =>
  buildSet('frame', { size: 512, depth: 5, minSize: 22, line: 2, rivets: 1.4, wear: 0.85, vents: 6, base: 190, seed: 23, normalStrength: 3 }, 2);

// Hangar walls: industrial plates. The tile repeat sets the apparent size
// of a wall plate, and therefore the apparent size of the whole bay — a
// coarse repeat made the hangar read as a giant's room with a small mech
// standing in it.
export const hangarWallMaps = () =>
  buildSet('hangarWall', { size: 1024, depth: 5, minSize: 70, line: 4, rivets: 1.6, wear: 0.95, vents: 5, base: 232, seed: 67, normalStrength: 2.6 }, 3.4);

// Structural steel for beams/catwalks.
export const steelMaps = () =>
  buildSet('steel', { size: 512, depth: 4, minSize: 40, line: 3, rivets: 1.8, wear: 0.8, vents: 0, base: 224, seed: 83 }, 4.5);

/**
 * Perforated/diamond-tread floor plating. Distinct enough from the panel
 * generator (regular repeating tread pattern rather than irregular plates)
 * to be worth its own painter.
 */
export const floorMaps = () =>
  cached('floor', () => {
    const size = 512;
    const albedo = makeCanvas(size);
    const height = makeCanvas(size);
    const ac = albedo.getContext('2d');
    const hc = height.getContext('2d', { willReadFrequently: true });
    const rand = mulberry32(97);

    ac.fillStyle = '#d8d8d8';
    ac.fillRect(0, 0, size, size);
    hc.fillStyle = '#707070';
    hc.fillRect(0, 0, size, size);

    // Plate seams
    const cells = 2;
    const cs = size / cells;
    ac.strokeStyle = 'rgba(20,22,28,0.8)';
    ac.lineWidth = 5;
    hc.strokeStyle = '#303030';
    hc.lineWidth = 5;
    for (let i = 0; i <= cells; i++) {
      ac.beginPath(); ac.moveTo(i * cs, 0); ac.lineTo(i * cs, size); ac.stroke();
      ac.beginPath(); ac.moveTo(0, i * cs); ac.lineTo(size, i * cs); ac.stroke();
      hc.beginPath(); hc.moveTo(i * cs, 0); hc.lineTo(i * cs, size); hc.stroke();
      hc.beginPath(); hc.moveTo(0, i * cs); hc.lineTo(size, i * cs); hc.stroke();
    }

    // Diamond tread
    const step = 34;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const ox = (y / step) % 2 === 0 ? 0 : step / 2;
        const cx = x + ox + step / 2;
        const cy = y + step / 2;
        const ang = ((x + y) / step) % 2 === 0 ? Math.PI / 4 : -Math.PI / 4;
        [ac, hc].forEach((c, idx) => {
          c.save();
          c.translate(cx, cy);
          c.rotate(ang);
          c.fillStyle = idx === 0 ? 'rgba(255,255,255,0.4)' : '#c0c0c0';
          c.fillRect(-11, -3.5, 22, 7);
          c.restore();
        });
        ac.save();
        ac.translate(cx + 1.5, cy + 1.5);
        ac.rotate(ang);
        ac.fillStyle = 'rgba(20,22,28,0.35)';
        ac.fillRect(-11, -3.5, 22, 7);
        ac.restore();
      }
    }

    speckle(ac, size, rand, 90, 30, '#12141a', 0.16);
    speckle(ac, size, rand, 40, 16, '#000000', 0.12);

    const rough = makeCanvas(size);
    const rc = rough.getContext('2d');
    rc.fillStyle = '#b4b4b4';
    rc.fillRect(0, 0, size, size);
    rc.globalAlpha = 0.4;
    rc.drawImage(albedo, 0, 0);

    return {
      map: toTexture(albedo, 3.4, true),
      normalMap: toTexture(heightToNormalCanvas(height, 3), 3.4),
      roughnessMap: toTexture(rough, 3.4),
    };
  });

/** Diagonal hazard stripes with chipped paint. */
export const hazardMap = () =>
  cached('hazard', () => {
    const size = 256;
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    const rand = mulberry32(131);
    ctx.fillStyle = '#f2c200';
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#15161a';
    for (let i = -size; i < size; i += 64) ctx.fillRect(i, -size, 32, size * 2);
    ctx.restore();
    speckle(ctx, size, rand, 120, 12, '#3a3a30', 0.35);
    speckle(ctx, size, rand, 60, 7, '#ffffff', 0.2);
    const t = toTexture(c, 1, true);
    return t;
  });

/**
 * Equirectangular environment used as `scene.environment` (see
 * SceneEnvironment.jsx). Metalness without an environment to reflect
 * renders as near-black, which is what was killing the gold trim, joints
 * and all the frame parts — image-based lighting is what makes metal read
 * as metal. Painted rather than loaded so the site stays self-contained
 * (no external HDR fetch).
 */
export const envCanvas = () =>
  cached('env', () => {
    const w = 1024;
    const h = 512;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');

    // Vertical gradient: dark deck below, cool lit volume above.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#243546');
    g.addColorStop(0.34, '#33526b');
    g.addColorStop(0.52, '#16222e');
    g.addColorStop(1.0, '#070a0e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Overhead strip lights — the bright bands metal picks up as highlights.
    for (let i = 0; i < 5; i++) {
      const y = h * (0.10 + i * 0.045);
      const lg = ctx.createLinearGradient(0, y - 12, 0, y + 12);
      lg.addColorStop(0, 'rgba(190,225,255,0)');
      lg.addColorStop(0.5, 'rgba(210,238,255,0.85)');
      lg.addColorStop(1, 'rgba(190,225,255,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, y - 12, w, 24);
    }

    // A few warm point sources so highlights aren't uniformly blue.
    const warm = [[0.18, 0.30], [0.62, 0.26], [0.85, 0.36]];
    warm.forEach(([x, y]) => {
      const r = 90;
      const rg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r);
      rg.addColorStop(0, 'rgba(255,190,120,0.7)');
      rg.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x * w - r, y * h - r, r * 2, r * 2);
    });

    // Cool key from one side for directional shape.
    const kg = ctx.createRadialGradient(w * 0.4, h * 0.18, 0, w * 0.4, h * 0.18, 260);
    kg.addColorStop(0, 'rgba(140,200,255,0.75)');
    kg.addColorStop(1, 'rgba(140,200,255,0)');
    ctx.fillStyle = kg;
    ctx.fillRect(0, 0, w, h);

    return c;
  });

/** Emissive readout screen — scanlines + fake data rows. */
export const screenMap = () =>
  cached('screen', () => {
    const size = 256;
    const c = makeCanvas(size);
    const ctx = c.getContext('2d');
    const rand = mulberry32(157);
    ctx.fillStyle = '#02121c';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#0090d9';
    for (let y = 14; y < size - 10; y += 15) {
      const rows = 3 + Math.floor(rand() * 5);
      let x = 12;
      for (let i = 0; i < rows; i++) {
        const w = 12 + rand() * 46;
        ctx.globalAlpha = 0.35 + rand() * 0.55;
        ctx.fillRect(x, y, w, 5);
        x += w + 8;
        if (x > size - 20) break;
      }
    }
    ctx.globalAlpha = 1;

    // A little waveform block so it doesn't read as pure text
    ctx.strokeStyle = '#00ff9d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 10; x < size - 10; x += 4) {
      const y = size * 0.75 + Math.sin(x * 0.15) * 14 * (0.4 + rand() * 0.6);
      x === 10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // CRT scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    for (let y = 0; y < size; y += 3) ctx.fillRect(0, y, size, 1.4);

    return toTexture(c, 1, true);
  });

// ============================================================
// Sortie FX sprites (hangar/SortieFX.jsx). Painted WHITE / greyscale:
// the FX materials tint them, so one sprite serves steam in red-alert
// light and sparks alike. Clamped, not repeated — a sprite that wraps
// bleeds its opposite edge into the corner of every particle.
// ============================================================

function spriteTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Paints alpha(nx, ny) (both −1…1, centre 0) into a white sprite.
function paintAlpha(size, alphaAt) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1;
      const ny = ((y + 0.5) / size) * 2 - 1;
      const a = Math.max(0, Math.min(1, alphaAt(nx, ny)));
      const i = (y * size + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Steam puff — a lumpy cloud, not a disc: a few offset lobes summed, so a
 *  cluster of puffs doesn't read as a stack of identical circles. */
export const puffSprite = () =>
  cached('puff', () => {
    const rand = mulberry32(911);
    const lobes = Array.from({ length: 6 }, () => ({
      x: (rand() - 0.5) * 0.7, y: (rand() - 0.5) * 0.7, r: 0.35 + rand() * 0.3,
    }));
    return spriteTexture(paintAlpha(64, (nx, ny) => {
      let a = 0;
      for (const l of lobes) {
        const d = Math.hypot(nx - l.x, ny - l.y) / l.r;
        a += Math.max(0, 1 - d) ** 2;
      }
      // fade to exactly zero before the square's edge
      const edge = Math.max(0, 1 - Math.hypot(nx, ny));
      return Math.min(1, a * 0.8) * edge;
    }));
  });

/** Spark — a hot point with a four-way glint. The glint is what makes a
 *  speck read as a spark rather than dust. */
export const sparkSprite = () =>
  cached('spark', () => spriteTexture(paintAlpha(32, (nx, ny) => {
    const r = Math.hypot(nx, ny);
    const core = Math.max(0, 1 - r * 2.2);
    const glint = Math.max(0, 1 - Math.abs(nx) * 9) * Math.max(0, 1 - Math.abs(ny))
      + Math.max(0, 1 - Math.abs(ny) * 9) * Math.max(0, 1 - Math.abs(nx));
    return core + glint * 0.6;
  })));

/** Thruster flare — a HEXAGONAL glow, so even the light reads in the
 *  site's straight-edged language instead of as a round bloom. */
export const glowSprite = () =>
  cached('glow', () => spriteTexture(paintAlpha(64, (nx, ny) => {
    // hexagon "radius": the max over three edge normals 60° apart
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const d = Math.max(ay, ax * 0.866 + ay * 0.5);
    return Math.max(0, 1 - d) ** 1.6;
  })));

/** Exhaust plume — a straight-edged kite, nozzle at v = 0 (canvas top),
 *  tip at v = 1. Drawn on two crossed planes it is a solid flame from
 *  any angle without a single curved edge. */
export const plumeSprite = () =>
  cached('plume', () => spriteTexture(paintAlpha(64, (nx, ny) => {
    const v = (ny + 1) / 2;
    const w = v < 0.15 ? 0.45 + (v / 0.15) * 0.55 : 1 - (v - 0.15) / 0.85;
    if (w <= 0) return 0;
    const across = Math.max(0, 1 - Math.abs(nx) / w);
    return across ** 1.4 * (1 - v) ** 0.7;
  })));
