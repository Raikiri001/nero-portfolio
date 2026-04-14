import { useEffect } from 'react';
import { useSoundEngine } from '../../hooks/useSoundEngine';
import './TransitionOverlay.css';

export function TransitionOverlay({ isVisible, onComplete }) {
  const sound = useSoundEngine();

  useEffect(() => {
    if (isVisible) {
      sound.ping();
      const timer = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isVisible, sound, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="transition-overlay">
      <div className="transition-overlay__scanline" />
      <div className="transition-overlay__text">SYSTEM_CHECK: OK</div>
      <div className="transition-overlay__subtext">DOCKING COMPLETE</div>
    </div>
  );
}
