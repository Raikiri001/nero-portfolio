// Canon-informed combat archetype for each Gundam in GUNDAM_ROSTER (same
// index order). A handful of shared archetypes — rather than 22 fully
// bespoke fight choreographies — keeps this maintainable while still
// giving every unit a fighting style true to how it fights in-universe;
// per-unit color (from its own roster thruster color) and move label keep
// each encounter feeling distinct even when the archetype is shared.
//
// Archetypes:
//   full-burst      - deploys and fires a spray of thin beam shots that
//                      pick off incoming projectiles one by one
//   buster-rifle    - one or two massive charged beam blasts sweep the
//                      whole incoming volley at once
//   melee-deflect   - draws a blade and cuts through everything in a fast
//                      sweeping arc
//   shield-block    - raises a shield toward the heaviest incoming
//                      direction, blocking and sparking on impact
//   funnel-intercept- launches small remote funnels/binders that peel off
//                      and detonate each incoming projectile individually
//   newtype-dodge   - phases into afterimages, sidesteps the entire volley,
//                      then snipes the last stray with one precise shot
//   gn-burst        - a radial particle shockwave erupts outward, erasing
//                      everything within its expanding ring
export const COMBAT_STYLES = [
  { archetype: 'full-burst', label: 'FULL BURST' },                 // 0  Strike Freedom
  { archetype: 'funnel-intercept', label: 'DRAGOON BURST' },        // 1  Mighty Strike Freedom
  { archetype: 'full-burst', label: 'FULL BURST MODE' },            // 2  Rising Freedom
  { archetype: 'full-burst', label: 'BEAM RIFLE BARRAGE' },         // 3  Freedom Gundam
  { archetype: 'melee-deflect', label: 'ARONDIGHT SLASH' },         // 4  Destiny Gundam
  { archetype: 'full-burst', label: 'FATUM-00 BURST' },             // 5  Infinite Justice Gundam
  { archetype: 'buster-rifle', label: 'OVERLOAD BURST' },           // 6  Infinite Justice Type II
  { archetype: 'melee-deflect', label: 'SWORD CALIBUR SLASH' },     // 7  Justice Gundam
  { archetype: 'full-burst', label: 'FULL BLOOM BURST' },           // 8  Immortal Justice Gundam
  { archetype: 'shield-block', label: 'GUARD PROTOCOL' },           // 9  Eclipse Gundam
  { archetype: 'newtype-dodge', label: 'NT-D INTERCEPT' },          // 10 Unicorn Gundam
  { archetype: 'melee-deflect', label: 'BEAM MAGNUM SLASH' },       // 11 Unicorn Gundam Final Battle Ver
  { archetype: 'funnel-intercept', label: 'LIGHT WING INTERCEPT' }, // 12 Unicorn Gundam Perfectibility
  { archetype: 'shield-block', label: 'AILE STRIKER GUARD' },       // 13 Strike Gundam
  { archetype: 'melee-deflect', label: 'GN SWORD PARRY' },          // 14 Exia
  { archetype: 'buster-rifle', label: 'SPLENDID RIFLE BURST' },     // 15 Impulse Gundam
  { archetype: 'buster-rifle', label: 'TWIN BUSTER RIFLE' },        // 16 Wing Gundam Zero EW
  { archetype: 'melee-deflect', label: 'MACE CRUSHER' },            // 17 Gundam Barbatos
  { archetype: 'shield-block', label: 'BEAM RIFLE GUARD' },         // 18 RX-78-2 Gundam
  { archetype: 'melee-deflect', label: 'GERBERA STRAIGHT SLASH' },  // 19 Astray Gundam
  { archetype: 'gn-burst', label: 'GN SWORD III BURST' },           // 20 Gundam 00
  { archetype: 'funnel-intercept', label: 'DREI ZWERG INTERCEPT' }  // 21 Gundam Qan[T]
];
