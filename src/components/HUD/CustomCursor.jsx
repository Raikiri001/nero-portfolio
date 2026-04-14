import { useState, useEffect, useRef, useCallback } from 'react';
import { useSoundEngine } from '../../hooks/useSoundEngine';
import './CustomCursor.css';

export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isLocked, setIsLocked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const targetPosRef = useRef({ x: -100, y: -100 });
  const currentPosRef = useRef({ x: -100, y: -100 });
  const animRef = useRef(null);
  const sound = useSoundEngine();
  const wasLockedRef = useRef(false);

  useEffect(() => {
    const handleMove = (e) => {
      targetPosRef.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const handleOver = (e) => {
      const target = e.target;
      const clickableElement = target.closest('a, button, [role="button"], .clickable, input, textarea, select, [data-clickable]');
      if (clickableElement && !wasLockedRef.current) {
        setIsLocked(true);
        wasLockedRef.current = true;
        sound.chirp();
      } else if (!clickableElement) {
        setIsLocked(false);
        wasLockedRef.current = false;
      }
    };

    const handleLeave = () => {
      setIsVisible(false);
    };

    // Smooth follow animation
    const animate = () => {
      const lerp = 0.15;
      currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * lerp;
      currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * lerp;
      setPos({ x: currentPosRef.current.x, y: currentPosRef.current.y });
      animRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseover', handleOver);
    document.addEventListener('mouseleave', handleLeave);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseover', handleOver);
      document.removeEventListener('mouseleave', handleLeave);
      cancelAnimationFrame(animRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isVisible) return null;

  return (
    <div
      className={`custom-cursor ${isLocked ? 'custom-cursor--locked' : ''}`}
      style={{ left: pos.x, top: pos.y }}
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
          <rect x="10" y="10" width="30" height="30" fill="none" strokeWidth="1.5"
                transform="rotate(45 25 25)" />
        </svg>
      )}
    </div>
  );
}
