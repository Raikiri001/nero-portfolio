import { useState, useRef, useEffect } from 'react';

/**
 * Tracks scroll velocity and returns a normalized 0-1 value.
 */
export function useScrollSpeed() {
  const [speed, setSpeed] = useState(0);
  const [rawSpeed, setRawSpeed] = useState(0);
  const lastScrollRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const decayRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      const dt = now - lastTimeRef.current;
      if (dt === 0) return;

      const scrollY = window.scrollY || window.pageYOffset;
      const delta = Math.abs(scrollY - lastScrollRef.current);
      const velocity = delta / dt * 16; // Normalize to ~60fps

      lastScrollRef.current = scrollY;
      lastTimeRef.current = now;

      const normalized = Math.min(velocity / 15, 1); // Clamp to 0-1
      setRawSpeed(normalized);
      setSpeed(prev => prev + (normalized - prev) * 0.3); // Ease
    };

    const decay = () => {
      setSpeed(prev => {
        const next = prev * 0.95;
        return next < 0.01 ? 0 : next;
      });
      setRawSpeed(prev => {
        const next = prev * 0.92;
        return next < 0.01 ? 0 : next;
      });
      decayRef.current = requestAnimationFrame(decay);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    decayRef.current = requestAnimationFrame(decay);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(decayRef.current);
    };
  }, []);

  return { speed, rawSpeed };
}
