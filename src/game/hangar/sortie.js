import { TRANSFER_Z, CATAPULT_X, HATCH_Z } from './gantryShapes';

// ============================================================
// THE SORTIE — the DEPLOY → launch choreography, as pure functions of time.
//
// The owner's vision (CLAUDE.md PART 2, verbatim) as a timeline: ONE
// continuous shot in the hangar the user was already looking at —
// alert → ready → pull → slide → pan → arm → launch — out through the
// catapult tunnel's hatch, handing off to the game in mid-flight. No React,
// no three.js: `sampleSortie(t)` returns plain numbers, SortieDirector.jsx
// applies them, and scripts/check-sortie.mjs sweeps them against the
// enclosure (the camera may never see out of the hangar before the hatch).
// Every beat of the shot is tuned in the tables below, nowhere else.
//
// Coordinates are BAY-LOCAL (the deploying bay's origin at the dock pad
// centre, +Z out of the bay mouth, +X to the right). The catapult lane is
// x = CATAPULT_X; its tunnel runs +Z to the hatch at HATCH_Z.
// ============================================================

/** The beats, in order. Durations in seconds — retime the shot here. */
export const STAGES = [
  { id: 'alert', dur: 1.0 },  // condition red: lights, beacons, letterbox
  { id: 'ready', dur: 2.6 },  // clamps + umbilicals release, eyes flare
  { id: 'pull', dur: 2.4 },   // the pad carries the suit towards the screen
  { id: 'slide', dur: 1.8 },  // …then right, off-screen, onto the catapult
  { id: 'pan', dur: 3.0 },    // camera: front → round the LEFT → behind
  { id: 'arm', dur: 2.6 },    // deflector, hatch opens, lamps, countdown
  { id: 'launch', dur: 2.8 }, // catapult fires, through the tunnel, out
];
export const SORTIE_DURATION = STAGES.reduce((a, s) => a + s.dur, 0);

/** Start time of a beat. */
export const stageStart = (id) => {
  let t = 0;
  for (const s of STAGES) {
    if (s.id === id) return t;
    t += s.dur;
  }
  return t;
};
const dur = (id) => STAGES.find((s) => s.id === id).dur;

/** Skip = fast-forward (never a cut) at this rate, up to the launch. */
export const SKIP_TIME_SCALE = 8;
export const SKIP_UNTIL = stageStart('launch');

// ---- the launch run --------------------------------------------------
/** The hand-off happens this far past the hatch, out in space. */
export const HANDOFF_PAST_HATCH = 8;
const RUN = HATCH_Z + HANDOFF_PAST_HATCH - TRANSFER_Z;      // pad centre → hand-off
const LAUNCH_ACCEL = (2 * RUN) / dur('launch') ** 2;        // constant: s = ½aτ²
/** Speed at the hand-off, world units/s — the game starts at this speed. */
export const LAUNCH_SPEED = LAUNCH_ACCEL * dur('launch');
/** The shuttle brakes just short of the hatch; the suit flies on. */
const SHUTTLE_STOP = HATCH_Z - TRANSFER_Z - 1.5;

// ---- one-shot events (bursts of steam/sparks + camera kicks) ----------
// `at` is seconds into the beat. `side` -1/+1 picks the left/right clamp.
export const EVENTS = [
  { stage: 'ready', at: 0.45, kind: 'clamp', side: -1, kick: 0.035 },
  { stage: 'ready', at: 0.85, kind: 'clamp', side: 1, kick: 0.035 },
  { stage: 'ready', at: 1.25, kind: 'umbilical', side: -1, kick: 0.012 },
  { stage: 'ready', at: 1.35, kind: 'umbilical', side: 1, kick: 0.012 },
  { stage: 'launch', at: 0, kind: 'launch', side: 0, kick: 0.09 },
].map((e) => ({ ...e, t: stageStart(e.stage) + e.at }));

/** Events whose time falls in (t0, t1] — the director fires each once. */
export const eventsBetween = (t0, t1) => EVENTS.filter((e) => e.t > t0 && e.t <= t1);

// ---- camera framings (bay-local) --------------------------------------
const C = [CATAPULT_X, 0, TRANSFER_Z];                     // suit on the catapult
const READY_CAM = { pos: [0, 2.6, 5.4], look: [0, 2.7, -0.2] };      // pushed in on the face
const PULL_CAM = { pos: [0, 1.1, 10.2], look: [0, 2.6, TRANSFER_Z] }; // low, heroic, looking up
const SLIDE_CAM = { pos: [0.2, 1.1, 10.2], look: [0.4, 2.5, TRANSFER_Z] }; // follows, then lets go
const BEHIND = { rx: 3.4, rz: 2.4, y: 3.4 };                // pan's end, over the shoulder
const SHOULDER = { dx: -0.5, y: 3.2, z: C[2] - 2.0 };       // arm's tight push-in
const DOWN_RANGE = 10;                                      // how far ahead behind-shots look
const FOV = { home: 46, ready: 40, behind: 44, arm: 38, punch: 62 };
const DUTCH = 0.07;                                         // ~4°, peaks mid-pan

// ---- maths -------------------------------------------------------------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/** Smoothstep — no beat starts or stops with a jolt. */
const ease = (k) => { const x = clamp01(k); return x * x * (3 - 2 * x); };
const span = (k, a, b) => ease((k - a) / (b - a));

/** Which beat `t` falls in, and how far through it. */
export function stageAt(t) {
  let start = 0;
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    if (t < start + s.dur || i === STAGES.length - 1) {
      return { id: s.id, index: i, k: clamp01((t - start) / s.dur), local: Math.max(0, t - start) };
    }
    start += s.dur;
  }
  return null; // unreachable
}

/**
 * Handheld camera shake: deterministic (a sum of incommensurate sines, so
 * the gate can sweep it), as an offset vector scaled by `amp`.
 */
function shakeOffset(t, amp) {
  return [
    amp * (Math.sin(t * 13.1) + 0.6 * Math.sin(t * 27.7 + 1.3)) / 1.6,
    amp * (Math.sin(t * 11.3 + 0.7) + 0.5 * Math.sin(t * 31.9)) / 1.5,
    amp * 0.5 * Math.sin(t * 9.7 + 2.1),
  ];
}

/** Decaying camera kicks from the one-shot events. */
function kickAt(t) {
  let a = 0;
  for (const e of EVENTS) if (t >= e.t) a += e.kick * Math.exp(-(t - e.t) * 6);
  return a;
}

/**
 * Everything the scene needs at time `t`, given the camera pose the shot
 * started from (`cam0 = { pos, look }`, bay-local). Signals the set reads:
 *   alert      red-alert lighting 0 → 1        letterbox  0 → 1
 *   undock     clamps / umbilicals / crane     eyes       eye boost (flares >1)
 *   spot       suit spotlight 0 → 1            lamps      catapult lamps 0 → 1
 *   hatch      tunnel hatch doors 0 → 1        thrust     thruster glow 0 → 1
 *   tunnelRun  0 → 1 along the tunnel          countdown  3 | 2 | 1 | 0 | null
 * Motion: pad [x,z], suitZ, lean (forward pitch, rad), shuttleZ.
 * Camera: camPos, camLook, fov, roll (rad), shake (amplitude).
 * done: the suit is HANDOFF_PAST_HATCH beyond the hatch.
 */
export function sampleSortie(t, cam0) {
  const st = stageAt(t);
  const idx = st.index;
  const after = (id) => idx > STAGES.findIndex((s) => s.id === id);
  const at = (id) => st.id === id;
  const k = st.k;

  // ---- signals -------------------------------------------------------
  const alert = at('alert') ? ease(k) : 1;
  const letterbox = at('alert') ? ease(k / 0.6) : 1;
  const undock = at('ready') ? span(k, 0.12, 0.8) : after('ready') ? 1 : 0;
  // eyes flare past full, then settle — the suit "waking up"
  const eyes = at('alert') ? 0
    : at('ready') ? span(k, 0.5, 0.68) * (1 + 0.8 * (1 - span(k, 0.7, 1))) : 1;
  const spot = at('alert') ? 0 : at('ready') ? span(k, 0.3, 0.9)
    : at('launch') ? 1 - span(k, 0.4, 0.8) : 1;
  const lamps = at('arm') ? clamp01(k / 0.85) : after('arm') ? 1 : 0;
  const hatch = at('arm') ? span(k, 0.15, 0.85) : after('arm') ? 1 : 0;
  const thrust = at('arm') ? 0.45 * span(k, 0.4, 1) : at('launch') ? lerp(0.45, 1, span(k, 0, 0.15)) : 0;
  const countdown = at('arm') ? (k < 1 / 3 ? 3 : k < 2 / 3 ? 2 : 1) : at('launch') ? 0 : null;

  // ---- motion --------------------------------------------------------
  let pad = [0, 0];
  if (at('pull')) pad = [0, TRANSFER_Z * ease(k)];
  else if (at('slide')) pad = [CATAPULT_X * ease(k), TRANSFER_Z];
  else if (after('slide')) pad = [CATAPULT_X, TRANSFER_Z];

  let suitZ = pad[1];
  let speed = 0;
  let tunnelRun = 0;
  if (at('launch')) {
    const s = 0.5 * LAUNCH_ACCEL * st.local * st.local;
    pad = [CATAPULT_X, TRANSFER_Z + Math.min(s, SHUTTLE_STOP)];
    suitZ = TRANSFER_Z + s;
    speed = LAUNCH_ACCEL * st.local;
    tunnelRun = clamp01(s / (HATCH_Z - TRANSFER_Z));
  }
  // the brace: a forward lean on the catapult (never a dip into the pad)
  const lean = at('arm') ? 0.06 * span(k, 0.3, 0.8) : at('launch') ? 0.06 * (1 - span(k, 0.1, 0.4)) : 0;

  // ---- camera --------------------------------------------------------
  let camPos = cam0.pos;
  let camLook = cam0.look;
  let fov = FOV.home;
  let roll = 0;
  let amp = 0.004;

  if (at('alert')) {
    // a slow push-in as condition red comes up
    const e = ease(k);
    camPos = [cam0.pos[0], cam0.pos[1], lerp(cam0.pos[2], 6.0, e)];
    fov = lerp(FOV.home, 44, e);
  } else if (at('ready')) {
    const from = [cam0.pos[0], cam0.pos[1], 6.0];
    const e = ease(k);
    camPos = lerp3(from, [cam0.pos[0], READY_CAM.pos[1], READY_CAM.pos[2]], e);
    camLook = lerp3(cam0.look, [cam0.look[0], READY_CAM.look[1], READY_CAM.look[2]], e);
    fov = lerp(44, FOV.ready, e);
  } else if (at('pull')) {
    const from = { pos: [cam0.pos[0], READY_CAM.pos[1], READY_CAM.pos[2]], look: [cam0.look[0], READY_CAM.look[1], READY_CAM.look[2]] };
    const e = ease(k);
    camPos = lerp3(from.pos, [cam0.pos[0], PULL_CAM.pos[1], PULL_CAM.pos[2]], e);
    camLook = lerp3(from.look, [cam0.look[0], PULL_CAM.look[1], PULL_CAM.look[2]], e);
    fov = FOV.ready;
  } else if (at('slide')) {
    // Follow the first half, then let the suit run out of frame right.
    const e = span(k, 0, 0.55);
    camPos = lerp3([cam0.pos[0], PULL_CAM.pos[1], PULL_CAM.pos[2]],
      [cam0.pos[0] + SLIDE_CAM.pos[0], SLIDE_CAM.pos[1], SLIDE_CAM.pos[2]], e);
    camLook = lerp3([cam0.look[0], PULL_CAM.look[1], PULL_CAM.look[2]],
      [cam0.look[0] + SLIDE_CAM.look[0], SLIDE_CAM.look[1], SLIDE_CAM.look[2]], e);
    fov = FOV.ready;
  } else if (at('pan')) {
    // An ELLIPSE round the catapult, from the front, through the suit's
    // LEFT, to behind it, with a dutch roll that peaks mid-sweep. Its z
    // never drops below C.z − BEHIND.rz, which is inside the launch hall.
    const start = [cam0.pos[0] + SLIDE_CAM.pos[0], SLIDE_CAM.pos[1], SLIDE_CAM.pos[2]];
    const startLook = [cam0.look[0] + SLIDE_CAM.look[0], SLIDE_CAM.look[1], SLIDE_CAM.look[2]];
    const dx0 = start[0] - C[0];
    const dz0 = start[2] - C[2];
    const th0 = Math.atan2(dx0, dz0);
    const rx0 = Math.abs(dx0 / Math.sin(th0));
    const rz0 = Math.abs(dz0 / Math.cos(th0));
    const e = ease(k);
    const th = lerp(th0, -Math.PI, e);
    camPos = [
      C[0] + lerp(rx0, BEHIND.rx, e) * Math.sin(th),
      lerp(start[1], BEHIND.y, e),
      Math.max(C[2] - BEHIND.rz, C[2] + lerp(rz0, BEHIND.rz, e) * Math.cos(th)),
    ];
    // A true orbit: hold the suit centred while circling it, and only turn
    // the eye downrange over the last stretch, once the camera is behind.
    const suitPoint = [C[0], 2.8, C[2]];
    const downrange = [C[0], 2.2, C[2] + DOWN_RANGE];
    camLook = e < 0.8
      ? lerp3(startLook, suitPoint, span(e, 0, 0.35))
      : lerp3(suitPoint, downrange, span(e, 0.8, 1));
    fov = lerp(FOV.ready, FOV.behind, e);
    roll = DUTCH * Math.sin(Math.PI * e);
  } else if (at('arm')) {
    // tight over the left shoulder, pushing in as the hatch opens
    const e = ease(k);
    camPos = [C[0] + SHOULDER.dx * e, lerp(BEHIND.y, SHOULDER.y, e), lerp(C[2] - BEHIND.rz, SHOULDER.z, e)];
    camLook = [C[0], lerp(2.2, 2.4, e), C[2] + DOWN_RANGE];
    fov = lerp(FOV.behind, FOV.arm, e);
    amp = lerp(0.004, 0.018, k);
  } else if (at('launch')) {
    // The catapult fires: FOV punches wide, the camera lags then chases
    // down the tunnel centre-line, and everything settles to the combat
    // camera's FOV (46) with no roll and no shake by the hand-off.
    const tau = st.local;
    const T = dur('launch');
    // starts at the arm framing's distance behind the suit, stretches to 7
    const lag = lerp(C[2] - SHOULDER.z, 7, span(tau / T, 0, 0.7));
    camPos = [
      lerp(C[0] + SHOULDER.dx, C[0], span(k, 0, 0.3)),
      lerp(SHOULDER.y, 2.8, span(k, 0, 0.5)),
      Math.max(SHOULDER.z, suitZ - lag),
    ];
    camLook = [C[0], 2.3, suitZ + DOWN_RANGE];
    const PUNCH = 0.35;
    fov = tau < PUNCH ? lerp(FOV.arm, FOV.punch, ease(tau / PUNCH))
      : lerp(FOV.punch, FOV.home, ease((tau - PUNCH) / (T - PUNCH)));
    amp = lerp(0.03, 0.012, k) * (1 - span(k, 0.8, 1));
  }

  // handheld shake + event kicks; zero at the hand-off
  const shake = (amp + kickAt(t)) * (at('launch') ? 1 - span(k, 0.8, 1) : 1);
  const off = shakeOffset(t, shake);
  camPos = [camPos[0] + off[0], camPos[1] + off[1], camPos[2] + off[2]];

  return {
    stage: st.id,
    alert, letterbox, undock, eyes, spot, lamps, hatch, thrust, countdown, tunnelRun,
    pad, suitZ, lean, speed, shuttleZ: pad[1],
    camPos, camLook, fov, roll, shake,
    done: t >= SORTIE_DURATION,
  };
}
