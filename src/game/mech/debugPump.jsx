import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Keeps an on-demand canvas rendering for the first second, then stops.
 *
 * The debug routes run `frameloop="demand"` for one reason: headless
 * verification. Under SwiftShader a continuous rAF loop renders a frame per
 * second of wall time, so a `--virtual-time-budget` of a few seconds asks
 * for hundreds of software frames and the screenshot takes tens of minutes.
 * On demand, the page settles in a handful of frames.
 *
 * A few frames are still needed rather than one: the PMREM environment,
 * fonts and the first material compile all land after mount.
 */
export function DebugPump({ frames = 24, every = 40 }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      invalidate();
      if (++n >= frames) clearInterval(id);
    }, every);
    return () => clearInterval(id);
  }, [invalidate, frames, every]);
  return null;
}

/**
 * Prints `renderer.info` once the scene has settled.
 *
 *   ?debug=hangar&perf=1
 *
 * CLAUDE.md's cost budget is stated in DRAW CALLS AND TRIANGLES, not FPS,
 * because the headless browser runs SwiftShader and its frame rate measures
 * the CPU rasterizer rather than the scene. This is how you read the numbers
 * the budget is actually written in. Dev-only and mounted only when asked.
 *
 * COUNTS FRAMES, NOT MILLISECONDS. A `setTimeout` here never fires under
 * `--virtual-time-budget`: the continuous rAF loop eats the whole budget
 * before the timer's virtual deadline arrives, and the readout simply never
 * prints — which looks exactly like the page having failed to load.
 */
export function PerfReadout({ after = 24, label = 'scene' }) {
  const done = useRef(false);
  const n = useRef(0);
  useFrame(({ gl, scene }) => {
    if (done.current || ++n.current < after) return;
    done.current = true;
    const i = gl.info;
    let lights = 0, meshes = 0;
    const geos = new Set();
    scene.traverse((o) => {
      if (o.isLight) lights++;
      if (o.isMesh) { meshes++; geos.add(o.geometry.uuid); }
    });
    console.log(
      `PERF ${label}  calls=${i.render.calls}  tris=${i.render.triangles}  ` +
      `meshes=${meshes}  distinctGeometries=${geos.size}  lights=${lights}  ` +
      `programs=${i.programs?.length ?? "?"}  ` +
      `geometriesLive=${i.memory.geometries}  texturesLive=${i.memory.textures}`,
    );
  });
  return null;
}
