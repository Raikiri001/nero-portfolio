import { SETTEI_FRONT, SIDE } from '../blueprint';

// ============================================================
// §2 HEAD — the box the LANDMARKS say this region occupies.
//
// Checked by scripts/check-models.mjs against the exported head.glb. Every
// bound is a traced pixel on the official head settei
// (b40e6b36….jpg) — the same sheet the Blender build
// (models/strike_freedom_head.py) is traced from — never a number read back
// off the model, which would make the check meaningless.
// ============================================================
// SIDE.z(px) is + toward the BACK on this sheet (the face is to the left);
// the site's +z is forward.
const fwd = (px) => -SIDE.z(px);

export default {
  tris: 9000,
  tol: 0.004,
  box: {
    // x  the WIDE fin pair's tips — front view cols 8.5 / 316.5 (row 105),
    //    averaged left/right; the widest thing on the head
    // y  the chin (front row 284, the calibration's own chin row; the side
    //    view agrees at row 281) → the TALL fin pair's tips
    //    (front row 9), far above the crown
    // z  back of the helmet (side col 699) → the crest's front face (side
    //    col 549), just ahead of the brow beak (550)
    min: [SETTEI_FRONT.x(8.5), SETTEI_FRONT.y(284), fwd(699)],
    max: [SETTEI_FRONT.x(316.5), SETTEI_FRONT.y(9), fwd(549)],
  },
};
