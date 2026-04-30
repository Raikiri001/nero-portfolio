import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'motion/react';
import './ScrollIndicator.css';

const ScrollWarning = ({ direction }) => {
  const isUpBase = direction === 'up' || direction === 'left' || direction === 'right';
  const rot = direction === 'left' ? -90 : direction === 'right' ? 90 : 0;
  const label = direction.toUpperCase();

  return (
    <svg viewBox="0 0 200 180" width="85" height="76" style={{ filter: 'drop-shadow(0 0 8px rgba(255,0,60,0.6))', transform: `rotate(${rot}deg)` }}>
      {!isUpBase ? (
        <>
          <polygon points="10,10 190,10 100,166" fill="rgba(255,0,60,0.1)" stroke="var(--nerd-accent-red)" strokeWidth="6" strokeLinejoin="round"/>
          <text x="100" y="21.7" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="3">SCROLL</text>
          <text x="65.1" y="82.1" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" transform="rotate(60 65.1 82.1)" letterSpacing="3">SCROLL</text>
          <text x="134.9" y="82.1" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" transform="rotate(-60 134.9 82.1)" letterSpacing="3">SCROLL</text>
          <polygon points="50.5,33.4 149.5,33.4 100,119.2" fill="var(--nerd-accent-red)" stroke="none"/>
          <text x="100" y="54" fill="#ffffff" fontFamily="var(--font-ui)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="1">SCROLL</text>
          <text x="100" y="74" fill="#ffffff" fontFamily="var(--font-ui)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="1">{label}</text>
        </>
      ) : (
        <>
          <polygon points="10,166 190,166 100,10" fill="rgba(255,0,60,0.1)" stroke="var(--nerd-accent-red)" strokeWidth="6" strokeLinejoin="round"/>
          <text x="100" y="154.3" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="3">SCROLL</text>
          <text x="65.1" y="93.9" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" transform="rotate(-60 65.1 93.9)" letterSpacing="3">SCROLL</text>
          <text x="134.9" y="93.9" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" transform="rotate(60 134.9 93.9)" letterSpacing="3">SCROLL</text>
          <polygon points="50.5,142.6 149.5,142.6 100,56.8" fill="var(--nerd-accent-red)" stroke="none"/>
          <text x="100" y="110" fill="#ffffff" fontFamily="var(--font-ui)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="1">SCROLL</text>
          <text x="100" y="130" fill="#ffffff" fontFamily="var(--font-ui)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="1">{label}</text>
        </>
      )}
    </svg>
  );
};

export function ScrollIndicator({ direction, show }) {
  // Start hidden for 'up' and 'down', visible for others
  const isVertical = direction === 'up' || direction === 'down';
  const [isTimerVisible, setIsTimerVisible] = useState(!isVertical);

  useEffect(() => {
    if (!isVertical) {
      return;
    }

    let timer;
    const runCycle = (currentlyVisible) => {
      // If visible, hide after 10s. If hidden, show after 20s.
      const delay = currentlyVisible ? 10000 : 20000;
      timer = setTimeout(() => {
        setIsTimerVisible(!currentlyVisible);
        runCycle(!currentlyVisible);
      }, delay);
    };

    // Start with currentlyVisible = false
    runCycle(false);

    return () => clearTimeout(timer);
  }, [direction, isVertical]);

  const getInitial = () => {
    switch (direction) {
      case 'up': return { opacity: 0, y: -20, x: 0 };
      case 'down': return { opacity: 0, y: 20, x: 0 };
      case 'left': return { opacity: 0, x: -20, y: 0 };
      case 'right': return { opacity: 0, x: 20, y: 0 };
      default: return { opacity: 0 };
    }
  };
  const getAnimate = () => {
    switch (direction) {
      case 'up': return { opacity: 0.85, y: [0, -15, 0], x: 0 };
      case 'down': return { opacity: 0.85, y: [0, 15, 0], x: 0 };
      case 'left': return { opacity: 0.85, x: [0, -15, 0], y: 0 };
      case 'right': return { opacity: 0.85, x: [0, 15, 0], y: 0 };
      default: return { opacity: 0.85 };
    }
  };

  return (
    <AnimatePresence>
      {(show && isTimerVisible) && (
        <div className={`scroll-indicator-container scroll-${direction}`}>
          <motion.div 
            initial={getInitial()}
            animate={getAnimate()}
            exit={getInitial()}
            transition={{
              x: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 0.4 }
            }}
          >
            <ScrollWarning direction={direction} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
