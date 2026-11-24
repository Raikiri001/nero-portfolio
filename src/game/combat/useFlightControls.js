import { useEffect, useRef } from 'react';

// No Ctrl binding: Ctrl+W closes the tab, Ctrl+S/D trigger browser actions,
// and none of them can be prevented reliably. C descends instead.
const KEY_MAP = {
  KeyW: 'forward', KeyS: 'backward', KeyA: 'left', KeyD: 'right',
  Space: 'up', KeyC: 'down',
  ShiftLeft: 'boost', ShiftRight: 'boost', KeyF: 'melee',
  KeyQ: 'special', KeyE: 'special',
};

const idle = () => ({
  forward: false, backward: false, left: false, right: false,
  up: false, down: false, boost: false, fire: false, melee: false,
  special: false,
  mouseX: 0, mouseY: 0,
});

// WASD thrust/strafe, Space/C vertical, Shift boost, mouse position as a
// steering-rate input (further from screen centre = turns faster — arcade
// flight-stick feel, no Pointer Lock needed), LMB fire, RMB or F melee,
// Q/E special. Returns a ref, not state: the physics loop in CombatScene
// reads it every frame without triggering React re-renders.
//
// Everything is released when the window loses focus or the pointer leaves
// it, and when the hook is disabled (pause) — otherwise a key held during
// alt-tab stays "down" forever.
export function useFlightControls(enabled) {
  const stateRef = useRef(idle());

  useEffect(() => {
    if (!enabled) return undefined;
    const state = stateRef.current;
    const releaseAll = () => Object.assign(state, idle());

    const handleKeyDown = (e) => {
      const key = KEY_MAP[e.code];
      if (key) {
        state[key] = true;
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      const key = KEY_MAP[e.code];
      if (key) state[key] = false;
    };
    const handleMouseMove = (e) => {
      state.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      state.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const handleMouseDown = (e) => {
      if (e.button === 0) state.fire = true;
      if (e.button === 2) state.melee = true;
    };
    const handleMouseUp = (e) => {
      if (e.button === 0) state.fire = false;
      if (e.button === 2) state.melee = false;
    };
    // Pointer left the window: stop steering rather than keep turning
    const handleMouseLeave = () => {
      state.mouseX = 0;
      state.mouseY = 0;
    };
    const handleVisibility = () => { if (document.hidden) releaseAll(); };
    const preventContext = (e) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', preventContext);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', preventContext);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
      releaseAll();
    };
  }, [enabled]);

  return stateRef;
}
