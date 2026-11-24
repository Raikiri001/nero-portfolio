// ============================================================
// CONVENTIONS GATE — the structural rules ESLint can't see.
//
//   node scripts/check-conventions.mjs        (part of `npm run check`)
//
// Every rule here exists because the codebase drifted on it once. If you
// genuinely need to break one, add an entry to ALLOW below WITH A REASON,
// in the same change. An exception is a visible decision, never drift.
// ============================================================
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const TOKENS_FILE = 'src/index.css';

// rule → { 'path/to/file': 'why this file is exempt' }
const ALLOW = {
  'section-header': {
    'src/pages/Home/Home.jsx': 'Home is the landing screen: the NERO title is its header.',
  },
};

const BREAKPOINTS = new Set([480, 768, 1024]);
// z-index above this must be a --z-* token: it is competing with another component
const LOCAL_Z_MAX = 100;
const ANIMATION_KEYWORDS = new Set([
  'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end',
  'infinite', 'normal', 'reverse', 'alternate', 'alternate-reverse',
  'none', 'forwards', 'backwards', 'both', 'running', 'paused', 'initial', 'inherit',
]);

// ------------------------------------------------------------
const failures = [];
const fail = (rule, file, line, msg) => {
  if (ALLOW[rule]?.[file]) return;
  failures.push(`${file}${line ? `:${line}` : ''}  [${rule}] ${msg}`);
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(SRC).map((p) => ({ abs: p, rel: relative(ROOT, p), text: readFileSync(p, 'utf8') }));
const css = files.filter((f) => f.rel.endsWith('.css'));
const code = files.filter((f) => /\.(jsx?|mjs)$/.test(f.rel));
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const stripCssComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

// ---- 1. colours: only index.css holds literals --------------------------
for (const f of css) {
  if (f.rel === TOKENS_FILE) continue;
  const t = stripCssComments(f.text);
  for (const m of t.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/g)) {
    fail('color-token', f.rel, lineOf(t, m.index), `colour literal "${m[0]}…" — use a token from index.css (rgba(var(--rgb-*), a))`);
  }
}

// ---- 2. z-index: global layers go through --z-* -------------------------
for (const f of css) {
  if (f.rel === TOKENS_FILE) continue;
  const t = stripCssComments(f.text);
  for (const m of t.matchAll(/z-index:\s*(-?\d+)/g)) {
    if (Number(m[1]) > LOCAL_Z_MAX) fail('z-token', f.rel, lineOf(t, m.index), `z-index ${m[1]} — use a var(--z-*) layer`);
  }
}
for (const f of code) {
  for (const m of f.text.matchAll(/zIndex:\s*(-?\d+)/g)) {
    if (Number(m[1]) > LOCAL_Z_MAX) fail('z-token', f.rel, lineOf(f.text, m.index), `zIndex ${m[1]} — use 'var(--z-*)'`);
  }
}

// ---- 3. every CSS variable used is defined -------------------------------
const defined = new Set();
for (const f of css) for (const m of stripCssComments(f.text).matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
for (const f of [...css, ...code]) {
  const t = f.rel.endsWith('.css') ? stripCssComments(f.text) : f.text;
  for (const m of t.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
    if (!defined.has(m[1])) fail('css-var', f.rel, lineOf(t, m.index), `${m[1]} is never defined`);
  }
}

// ---- 4. keyframes: each used name defined exactly once -------------------
const keyframes = new Map();
for (const f of css) {
  const t = stripCssComments(f.text);
  for (const m of t.matchAll(/@keyframes\s+([\w-]+)/g)) {
    const where = `${f.rel}:${lineOf(t, m.index)}`;
    if (keyframes.has(m[1])) fail('keyframes', f.rel, lineOf(t, m.index), `@keyframes ${m[1]} also defined at ${keyframes.get(m[1])}`);
    else keyframes.set(m[1], where);
  }
}
for (const f of css) {
  const t = stripCssComments(f.text);
  for (const m of t.matchAll(/animation(?:-name)?:\s*([^;}]+)/g)) {
    const value = m[1].replace(/[a-z-]+\([^)]*\)/g, ' '); // drop cubic-bezier(), steps(), var()
    for (const part of value.split(',')) {
      for (const tok of part.trim().split(/\s+/)) {
        if (!tok || ANIMATION_KEYWORDS.has(tok) || /^-?[\d.]/.test(tok)) continue;
        if (!keyframes.has(tok)) fail('keyframes', f.rel, lineOf(t, m.index), `animation "${tok}" has no @keyframes`);
      }
    }
  }
}

// ---- 5. breakpoints ------------------------------------------------------
for (const f of css) {
  const t = stripCssComments(f.text);
  for (const m of t.matchAll(/@media[^{]*?(?:max|min)-width:\s*(\d+)px/g)) {
    if (!BREAKPOINTS.has(Number(m[1]))) fail('breakpoint', f.rel, lineOf(t, m.index), `${m[1]}px — breakpoints are ${[...BREAKPOINTS].join(' / ')}`);
  }
}

// ---- 6. lint suppressions carry a reason --------------------------------
for (const f of code) {
  for (const m of f.text.matchAll(/eslint-disable[^\n]*/g)) {
    if (!m[0].includes('--')) fail('eslint-disable', f.rel, lineOf(f.text, m.index), 'eslint-disable needs a "-- reason"');
  }
}

// ---- 7. sections: <SectionHeader> and a `<id>-section` root -------------
for (const dir of readdirSync(join(SRC, 'pages'))) {
  const rel = `src/pages/${dir}/${dir}.jsx`;
  if (!existsSync(join(ROOT, rel))) {
    fail('section-layout', rel, 0, 'every page folder holds a component of the same name');
    continue;
  }
  const t = readFileSync(join(ROOT, rel), 'utf8');
  const id = dir.toLowerCase();
  // className="x-section …" or className={`x-section …`}
  if (!new RegExp(`<section[^>]*className=(?:"|\\{\`)[^"\`]*\\b${id}-section\\b`).test(t)) {
    fail('section-layout', rel, 0, `root must be <section className="${id}-section …">`);
  }
  if (!t.includes('<SectionHeader')) fail('section-header', rel, 0, 'sections open with <SectionHeader>');
}

// ---- 8. mobile-suit units are complete -----------------------------------
const UNITS = join(SRC, 'game/mech/units');
const registry = readFileSync(join(UNITS, 'index.js'), 'utf8');
for (const [, unit] of registry.matchAll(/from '\.\/([\w]+)\/Assembly'/g)) {
  const dir = join(UNITS, unit);
  const relDir = relative(ROOT, dir);
  for (const need of ['blueprint.js', 'dims.js', 'colors.js', 'Assembly.jsx']) {
    if (!existsSync(join(dir, need))) fail('unit-layout', `${relDir}/${need}`, 0, 'missing — every unit has blueprint, dims, colors and Assembly');
  }
  const asm = join(dir, 'Assembly.jsx');
  if (existsSync(asm)) {
    const exports = readFileSync(asm, 'utf8').match(/^export\b/gm) ?? [];
    if (exports.length !== 1) fail('unit-layout', relative(ROOT, asm), 0, `exports ${exports.length} things — Assembly.jsx exports only the component (Fast Refresh)`);
  }
  const dimsSrc = existsSync(join(dir, 'dims.js')) ? readFileSync(join(dir, 'dims.js'), 'utf8') : '';
  const built = dimsSrc.match(/BUILT\s*=\s*\[([^\]]*)\]/);
  if (!built) {
    fail('unit-layout', `${relDir}/dims.js`, 0, 'must export BUILT = [ …regions ]');
    continue;
  }
  for (const [, region] of built[1].matchAll(/'([\w]+)'/g)) {
    // a region is a Blender model (models/<r>.glb) or procedural (regions/<r>.js)
    if (!existsSync(join(dir, 'models', `${region}.glb`)) && !existsSync(join(dir, 'regions', `${region}.js`))) {
      fail('unit-layout', `${relDir}/models/${region}.glb`, 0, `region "${region}" is in BUILT but has neither a model nor a procedural file`);
    }
    if (!existsSync(join(dir, 'regions', `${region}.spec.js`))) fail('unit-layout', `${relDir}/regions/${region}.spec.js`, 0, `region "${region}" is in BUILT but has no landmark spec`);
  }
}

// ---- 8b. a unit imports only its own folder, kit/, frame/ and the engine -
// "Each mobile suit gets its own armour … shapes are not shared either."
{
  const KIT = join(SRC, 'game/mech/kit');
  const FRAME = join(SRC, 'game/mech/frame');
  const BARE_OK = /^(three|react|@react-three\/fiber)(\/|$)/;
  for (const f of code.filter((c) => c.abs.startsWith(UNITS + '/') && c.abs !== join(UNITS, 'index.js'))) {
    const unitDir = join(UNITS, relative(UNITS, f.abs).split('/')[0]);
    for (const m of f.text.matchAll(/^import[^'"]*['"]([^'"]+)['"]/gm)) {
      const spec = m[1];
      const ok = spec.startsWith('.')
        ? [unitDir, KIT, FRAME].some((d) => {
          const target = join(dirname(f.abs), spec);
          return target === d || target.startsWith(d + '/');
        })
        : BARE_OK.test(spec);
      if (!ok) fail('unit-imports', f.rel, lineOf(f.text, m.index), `imports "${spec}" — a unit may import only its own folder, kit/, frame/, three and React`);
    }
  }
}

// ---- 9. roster tables line up (gundamId is the index into all three) -----
{
  const vis = readFileSync(join(SRC, 'data/gundamVisuals.jsx'), 'utf8');
  const body = vis.slice(vis.indexOf('export const GUNDAM_ROSTER = ['), vis.indexOf('\n];', vis.indexOf('export const GUNDAM_ROSTER = [')));
  const rosterLen = (body.match(/^ {2}\{/gm) ?? []).length;
  const { COMBAT_STYLES } = await import('../src/data/gundamCombatStyles.js');
  const { UNIT_SPECS } = await import('../src/game/mech/unitSpecs.js');
  if (COMBAT_STYLES.length !== rosterLen || UNIT_SPECS.length !== rosterLen) {
    fail('roster-parity', 'src/data/gundamVisuals.jsx', 0,
      `GUNDAM_ROSTER=${rosterLen}, COMBAT_STYLES=${COMBAT_STYLES.length}, UNIT_SPECS=${UNIT_SPECS.length} — all three are indexed by gundamId`);
  }
}

// ---- 10. the JS HUD palette mirrors the CSS tokens ----------------------
{
  const { HUD_RGB } = await import('../src/data/hudColors.js');
  const tokens = readFileSync(join(ROOT, TOKENS_FILE), 'utf8');
  for (const [name, rgb] of Object.entries(HUD_RGB)) {
    const m = tokens.match(new RegExp(`--rgb-${name}:\\s*([\\d,\\s]+);`));
    const cssRgb = m?.[1].split(',').map((n) => Number(n.trim()));
    if (!cssRgb || cssRgb.join() !== rgb.join()) {
      fail('palette-sync', 'src/data/hudColors.js', 0, `HUD_RGB.${name} = [${rgb}] but index.css --rgb-${name} = ${m ? m[1].trim() : 'missing'}`);
    }
  }
}

// ------------------------------------------------------------
if (failures.length) {
  console.error(`✖ conventions: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error('  ' + f);
  console.error('\nSee CLAUDE.md "Conventions". To exempt a file, add it to ALLOW in scripts/check-conventions.mjs with a reason.');
  process.exit(1);
}
console.log(`✓ conventions: ${css.length} stylesheets, ${code.length} modules — clean`);
