import { useEffect, useRef } from 'react';

const KEY_MAP = {
  KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right',
  Space: 'up', ControlLeft: 'down', KeyC: 'down',
  ShiftLeft: 'boost', ShiftRight: 'boost', KeyF: 'melee',
};

// WASD thrust/strafe + vertical (Space/Ctrl) + Shift boost, mouse position
// as a steering-rate input (further from screen center = turns faster —
// classic arcade flight-stick feel, no Pointer Lock needed), LMB fire, RMB
// or F melee. Returns a ref (not state) — the physics loop in CombatScene
// reads it every frame without triggering React re-renders.
export function useFlightControls(enabled) {
  const stateRef = useRef({
    forward: false, backward: false, left: false, right: false,
    up: false, down: false, boost: false, fire: false, melee: false,
    mouseX: 0, mouseY: 0,
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (e) => {
      const key = KEY_MAP[e.code];
      if (key) {
        stateRef.current[key] = true;
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      const key = KEY_MAP[e.code];
      if (key) stateRef.current[key] = false;
    };
    const handleMouseMove = (e) => {
      stateRef.current.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      stateRef.current.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const handleMouseDown = (e) => {
      if (e.button === 0) stateRef.current.fire = true;
      if (e.button === 2) stateRef.current.melee = true;
    };
    const handleMouseUp = (e) => {
      if (e.button === 0) stateRef.current.fire = false;
      if (e.button === 2) stateRef.current.melee = false;
    };
    const preventContext = (e) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', preventContext);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', preventContext);
    };
  }, [enabled]);

  return stateRef;
}
