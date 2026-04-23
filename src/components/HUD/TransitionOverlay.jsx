import { useEffect } from 'react';
import './TransitionOverlay.css';

export function TransitionOverlay({ isVisible, onComplete }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="transition-overlay">
      <div className="transition-overlay__scanline" />
      <div className="transition-overlay__text">SYSTEM_CHECK: OK</div>
      <div className="transition-overlay__subtext">DOCKING COMPLETE</div>
    </div>
  );
}
