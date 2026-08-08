// Named groups on MechModel3D (see game/mech/MechModel3D.jsx's `name="..."`
// props) that hangar callouts anchor to. Its own file since it's a plain
// constant shared between HangarCorridor.jsx and CircuitCallout.jsx — react
// Fast Refresh requires component files to only export components.
export const ANCHOR_PARTS = ['head', 'chest', 'rightArm', 'leftArm', 'waist'];
