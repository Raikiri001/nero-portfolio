import { Suspense } from 'react';
import { useHeadSlots } from './headModel';
import { ST } from './dims';
import { HZ, HEAD } from './blueprint';
import { neckPost } from '../../frame/frame';

// ============================================================
// ZGMF-X20A STRIKE FREEDOM — ASSEMBLY
//
// BUILT ONE REGION AT A TIME, and only what is built renders. There is no
// placeholder body under this: a bay showing a head and nothing else is
// honest about where the work has got to, where a plausible wrong torso is
// not. `BUILT` in dims.js is the list.
//
// Nothing here computes a position. Every group sits on a station (`ST`) or a
// traced landmark, and the plates inside were already positioned against the
// same landmarks in `regions/head.js` — so re-measuring a landmark moves the
// group and its contents together.
//
// The named groups `head`, `chest`, `rightArm`, `leftArm` and `waist` are what
// hangar/anchorParts.js projects to screen space for the hover callouts. Only
// the ones that exist are anchored (anchorParts skips a missing group), so a
// callout never points at a region that has not been built.
//
// This file exports ONLY the component; React Fast Refresh errors otherwise.
// Animation handles arrive as INDIVIDUAL ref props, never as one refs bag:
// the react-hooks/refs lint rule reads a property access off a ref bag as a
// render-time ref read.
// ============================================================

function Slots({ set, m, fallback = 'white', skip }) {
  return Object.entries(set)
    .filter(([slot]) => slot !== skip)
    .map(([slot, geo]) => (
      <mesh key={slot} geometry={geo} material={m[slot] || m[fallback]} />
    ));
}

// The head, from its Blender-authored model (headModel.js). A component of
// its own so only IT suspends while the file loads — never the whole hangar.
function Head({ m, visorRef }) {
  const H = useHeadSlots();
  return (
    <>
      <Slots set={H} m={m} skip="eye" />
      {/* The eye slot is rendered here rather than inside Slots so the idle
          animation has a handle on it. The material is a shared singleton,
          so pulsing this one pulses every suit's eyes together — which is
          what we want. */}
      {H.eye && <mesh ref={visorRef} geometry={H.eye} material={m.eye} />}
    </>
  );
}

export function Assembly({ m, headRef, visorRef }) {
  return (
    <group name="strikeFreedom" dispose={null}>
      {/* The head's own origin is its CHIN on the neck axis — that is where
          its model is authored from — so the group sits on the head station
          with no offset of its own. */}
      <group ref={headRef} name="head" position={[0, ST.head, 0]}>
        <Suspense fallback={null}>
          <Head m={m} visorRef={visorRef} />
        </Suspense>

        {/* §2 the neck the head seats on — frame hardware, still built in
            code (frame/frame.js). */}
        <mesh
          geometry={neckPost(HEAD * 0.13, HEAD * 0.30)}
          material={m.gold}
          position={[0, -HEAD * 0.14, HZ.shellBack * 0.35]}
        />
      </group>
    </group>
  );
}
