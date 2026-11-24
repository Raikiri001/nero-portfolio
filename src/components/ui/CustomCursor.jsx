import { useState, useEffect, useRef } from 'react';
import './CustomCursor.css';

const LERP = 0.15;
const CLICKABLE = 'a, button, [role="button"], input, textarea, select, [data-clickable]';

// The reticle only replaces a real mouse; index.css hides the system cursor
// under the same media query.
const FINE_POINTER = typeof window !== 'undefined'
  && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/**
 * Tactical reticle that eases after the mouse. Position is written straight
 * to the element's transform from a rAF loop that only runs while the
 * reticle is still catching up — React re-renders only when lock-on or
 * visibility changes, never per frame.
 */
export function CustomCursor() {
  const elRef = useRef(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!FINE_POINTER) return undefined;

    const target = { x: -100, y: -100 };
    const current = { x: -100, y: -100 };
    let raf = 0;

    const step = () => {
      current.x += (target.x - current.x) * LERP;
      current.y += (target.y - current.y) * LERP;
      if (elRef.current) {
        elRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }
      // Settled: stop until the mouse moves again
      raf = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.3
        ? requestAnimationFrame(step)
        : 0;
    };

    const handleMove = (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
      setIsVisible(true);
      if (!raf) raf = requestAnimationFrame(step);
    };

    const handleOver = (e) => {
      setIsLocked(!!e.target.closest?.(CLICKABLE));
    };

    const handleLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseover', handleOver, { passive: true });
    document.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseover', handleOver);
      document.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!FINE_POINTER) return null;

  return (
    <div
      ref={elRef}
      className={`custom-cursor ${isLocked ? 'custom-cursor--locked' : ''} ${isVisible ? '' : 'custom-cursor--hidden'}`}
      aria-hidden="true"
    >
      {/* Outer rotating ring */}
      <svg className="cursor-ring cursor-ring--outer" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="none" strokeWidth="1" strokeDasharray="4 8" />
        <line x1="20" y1="0" x2="20" y2="6" strokeWidth="1" />
        <line x1="20" y1="34" x2="20" y2="40" strokeWidth="1" />
        <line x1="0" y1="20" x2="6" y2="20" strokeWidth="1" />
        <line x1="34" y1="20" x2="40" y2="20" strokeWidth="1" />
      </svg>
      {/* Inner crosshair */}
      <svg className="cursor-ring cursor-ring--inner" width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="3" fill="none" strokeWidth="0.8" />
        <line x1="10" y1="0" x2="10" y2="7" strokeWidth="0.8" />
        <line x1="10" y1="13" x2="10" y2="20" strokeWidth="0.8" />
        <line x1="0" y1="10" x2="7" y2="10" strokeWidth="0.8" />
        <line x1="13" y1="10" x2="20" y2="10" strokeWidth="0.8" />
      </svg>
      {/* Lock-on diamond */}
      {isLocked && (
        <svg className="cursor-lock" width="50" height="50" viewBox="0 0 50 50">
          <rect x="10" y="10" width="30" height="30" fill="none" strokeWidth="1.5" transform="rotate(45 25 25)" />
        </svg>
      )}
    </div>
  );
}
