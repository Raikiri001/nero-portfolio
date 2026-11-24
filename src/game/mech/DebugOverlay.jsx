import { useLayoutEffect, useMemo, useState } from 'react';
import { Canvas, useStore } from '@react-three/fiber';
import { DebugPump } from './debugPump';
import { SceneEnvironment } from '../SceneEnvironment';
import { MechModel3D } from './MechModel3D';
import { getHeroPalette } from './palettes';
import { REFERENCES, VIEWS } from './referenceViews';

// ============================================================
// THE OVERLAY ROUTE — the primary verification loop
//
//   ?debug=overlay&unit=strikeFreedom&view=front&op=0.5
//   &deploy=0|1   wing pack stowed → full HiMAT
//   &wire=1       wireframe
//
// Renders the model through an ORTHOGRAPHIC camera framed by the SAME
// crown/sole/midline calibration the blueprint was traced with, and puts
// the photograph behind it at exactly matching scale. If the geometry hit
// its landmarks the two silhouettes superimpose, so a mismatch on screen is
// a real measurement error rather than a framing artefact.
//
// This exists because the old loop — screenshot, squint, nudge a number,
// screenshot again — never converged: there was nothing to converge on.
//
// The photographs come from a DEV-ONLY glob (referenceViews.js). Nothing in
// references/ reaches a production build.
// ============================================================

const q = new URLSearchParams(window.location.search);
const UNIT = q.get('unit') || 'strikeFreedom';
const VIEW = q.get('view') || 'front';
const DEPLOY = q.has('deploy') ? parseFloat(q.get('deploy')) : null;

export function DebugOverlay() {
  const [op, setOp] = useState(parseFloat(q.get('op') ?? '0.5'));
  const [wire, setWire] = useState(q.get('wire') === '1');
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);

  const ref = REFERENCES[UNIT];
  const view = VIEWS[VIEW] || VIEWS.front;
  const shot = ref?.[VIEW];
  const H = ref?.H ?? 1.33;

  // The visible band, in model units: y0 → y0 + span, exactly 100vh tall.
  const band = useMemo(() => {
    const y0 = view.y0 * H;
    const span = view.span * H;
    return { y0, span, y1: y0 + span };
  }, [view, H]);

  // Place the photograph so ITS crown, sole and midline land where the
  // model's do. All in vh, since the canvas band is 100vh.
  const img = useMemo(() => {
    if (!shot) return null;
    // model rows, as fractions from the top of the band
    const at = (y) => (band.y1 - y) / band.span;
    const top = shot.band === 'head' ? at(view.headTop * H) : at(H);
    const bot = shot.band === 'head' ? at(view.headBot * H) : at(0);
    const hVh = ((bot - top) * 100) / (shot.soleV - shot.crownV);
    return {
      hVh,
      topVh: top * 100 - shot.crownV * hVh,
      leftVh: shot.midU * hVh * (shot.w / shot.h),
    };
  }, [shot, band, view, H]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#20242c', overflow: 'hidden' }}>
      {img && (
        <img
          alt=""
          src={shot.url}
          style={{
            position: 'absolute',
            height: `${img.hVh}vh`,
            top: `calc(${img.topVh}vh + ${dy}vh)`,
            left: `calc(50vw - ${img.leftVh}vh + ${dx}vh)`,
            opacity: 1 - op, pointerEvents: 'none',
          }}
        />
      )}
      <Canvas
        style={{ position: 'absolute', inset: 0, opacity: Math.min(1, op * 2) }}
        gl={{ antialias: true, alpha: true }}
        frameloop="demand"
        orthographic
        // `manual` is load-bearing: without it R3F recomputes the
        // orthographic frustum from the canvas size on every layout and
        // silently throws away the traced framing, so the model renders at
        // roughly twice the photograph's scale and every landmark looks
        // wrong. That cost a round of chasing proportions that were right.
        camera={{ position: view.pos, zoom: 1, near: -40, far: 40, manual: true }}
      >
        <Frustum band={band} view={view} />
        <DebugPump />
        <SceneEnvironment intensity={1.0} />
        <hemisphereLight args={['#9db2d0', '#101318', 0.8]} />
        <directionalLight position={[4, 8, 6]} intensity={1.9} />
        <directionalLight position={[-5, 3, -4]} intensity={0.8} color="#7fb0ff" />
        <Overlaid unit={UNIT} wire={wire} deploy={DEPLOY} />
      </Canvas>
      <div style={panel}>
        <b>{UNIT} · {VIEW}</b>
        {!shot && <div style={{ color: '#f88' }}>no reference registered for this view</div>}
        {/* op: 0 = photo only → 1 = model only. At the default 0.5 the model
            is opaque over a half-faded photo, which is the comparison view. */}
        <label style={row}>
          photo
          <input type="range" min="0" max="1" step="0.02" value={op}
            onChange={(e) => setOp(+e.target.value)} />
          model
        </label>
        <label style={row}>
          x
          <input type="range" min="-20" max="20" step="0.2" value={dx}
            onChange={(e) => setDx(+e.target.value)} />
          {dx}
        </label>
        <label style={row}>
          y
          <input type="range" min="-20" max="20" step="0.2" value={dy}
            onChange={(e) => setDy(+e.target.value)} />
          {dy}
        </label>
        <label style={row}>
          <input type="checkbox" checked={wire}
            onChange={(e) => setWire(e.target.checked)} />
          wireframe
        </label>
        <div style={{ opacity: 0.6, marginTop: 6 }}>
          views: {Object.keys(ref || {}).filter((k) => VIEWS[k]).join(' · ') || '—'}
        </div>
      </div>
    </div>
  );
}

/**
 * Holds the orthographic frustum at the band the blueprint was traced in.
 *
 * The camera is pulled off the R3F store inside an effect rather than via
 * useThree(): writing frustum bounds is the required three.js API, but that
 * reads as mutating a hook's return value.
 */
function Frustum({ band, view }) {
  const store = useStore();
  useLayoutEffect(() => {
    const apply = () => {
      const { camera, size, invalidate } = store.getState();
      const mid = (band.y0 + band.y1) * 0.5;
      // Move the CAMERA to the middle of the band and keep the frustum
      // symmetric. Offsetting top/bottom *and* calling lookAt at the band
      // centre counts the offset twice, which drops the model half a body
      // down the frame — and then every landmark looks wrong for a reason
      // that has nothing to do with the geometry.
      camera.position.set(view.pos[0], mid + view.pos[1], view.pos[2]);
      camera.left = (-band.span * 0.5 * size.width) / size.height;
      camera.right = (band.span * 0.5 * size.width) / size.height;
      camera.top = band.span * 0.5;
      camera.bottom = -band.span * 0.5;
      camera.lookAt(0, mid, 0);
      camera.updateProjectionMatrix();
      invalidate();
    };
    apply();
    return store.subscribe(apply);
  }, [store, band, view]);
  return null;
}

/**
 * Opacity is applied to the PHOTOGRAPH, never to the model: a thin plate
 * faded to 50% disappears into the picture behind it, and then you are
 * debugging the overlay instead of the suit.
 */
function Overlaid({ unit, wire, deploy }) {
  const id = REFERENCES[unit]?.gundamId ?? 0;
  return (
    <group
      onUpdate={(g) => g.traverse((o) => { if (o.material) o.material.wireframe = wire; })}
    >
      <MechModel3D
        gundamId={id} palette={getHeroPalette(id)}
        animate={false} scale={1} wingDeploy={deploy}
      />
    </group>
  );
}

const panel = {
  position: 'absolute', left: 12, top: 12, padding: '10px 12px',
  font: '12px ui-monospace, monospace', color: '#dfe6f2',
  background: 'rgba(10,13,20,0.82)', border: '1px solid #2b3444', borderRadius: 6,
  display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10,
};
const row = { display: 'flex', gap: 6, alignItems: 'center' };
