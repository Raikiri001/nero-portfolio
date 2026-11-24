// The mech kit: everything a mobile suit is built from, and the only part of
// the 3D stack with no unit identity in it. A unit folder may import from
// here and from `three`, and from nothing else with a shape in it.
export * from './outline';
export * from './trace';
export * from './poly';
export * from './laminate';
export * from './facet';
export * from './detail';
export * from './merge';
export * from './assemble';
