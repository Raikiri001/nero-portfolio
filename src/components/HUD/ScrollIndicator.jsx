import { motion, AnimatePresence } from 'motion/react';
import './ScrollIndicator.css';

const ScrollWarning = ({ direction }) => {
  const isUp = direction === 'up';

  return (
    <svg viewBox="0 0 200 180" width="85" height="76" style={{ filter: 'drop-shadow(0 0 8px rgba(255,0,60,0.6))' }}>
      {!isUp ? (
        <>
          <polygon points="10,10 190,10 100,166" fill="rgba(255,0,60,0.1)" stroke="var(--nerd-accent-red)" strokeWidth="6" strokeLinejoin="round"/>
          <text x="100" y="21.7" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="3">SCROLL</text>
          <text x="65.1" y="82.1" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" transform="rotate(60 65.1 82.1)" letterSpacing="3">SCROLL</text>
          <text x="134.9" y="82.1" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" transform="rotate(-60 134.9 82.1)" letterSpacing="3">SCROLL</text>
          <polygon points="50.5,33.4 149.5,33.4 100,119.2" fill="var(--nerd-accent-red)" stroke="none"/>
          <text x="100" y="54" fill="#ffffff" fontFamily="var(--font-ui)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="1">SCROLL</text>
          <text x="100" y="74" fill="#ffffff" fontFamily="var(--font-ui)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="1">DOWN</text>
        </>
      ) : (
        <>
          <polygon points="10,166 190,166 100,10" fill="rgba(255,0,60,0.1)" stroke="var(--nerd-accent-red)" strokeWidth="6" strokeLinejoin="round"/>
          <text x="100" y="154.3" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="3">SCROLL</text>
          <text x="65.1" y="93.9" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" transform="rotate(-60 65.1 93.9)" letterSpacing="3">SCROLL</text>
          <text x="134.9" y="93.9" fill="var(--nerd-accent-red)" fontFamily="var(--font-ui)" fontSize="13" fontWeight="900" textAnchor="middle" dominantBaseline="central" transform="rotate(60 134.9 93.9)" letterSpacing="3">SCROLL</text>
          <polygon points="50.5,142.6 149.5,142.6 100,56.8" fill="var(--nerd-accent-red)" stroke="none"/>
          <text x="100" y="110" fill="#ffffff" fontFamily="var(--font-ui)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="1">SCROLL</text>
          <text x="100" y="130" fill="#ffffff" fontFamily="var(--font-ui)" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="central" letterSpacing="1">UP</text>
        </>
      )}
    </svg>
  );
};

export function ScrollIndicator({ direction, show }) {
  return (
    <AnimatePresence>
      {show && (
        <div className={`scroll-indicator-container scroll-${direction}`}>
          <motion.div 
            initial={{ opacity: 0, y: direction === 'up' ? -20 : 20 }}
            animate={{ 
              opacity: 0.85, 
              y: [0, direction === 'up' ? -15 : 15, 0],
            }}
            exit={{ opacity: 0, y: direction === 'up' ? -20 : 20 }}
            transition={{
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
