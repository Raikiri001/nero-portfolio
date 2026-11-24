import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { NAV_ITEMS, NAV_TITLE } from '../../data/siteData';
import './Navigation.css';

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.5 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const HEADER_VARIANTS = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut', delay: 0.3 } },
};

const PING_MS = 650;

export function Navigation({ activeSection, onNavigate }) {
  // Brief glow pulse on the title badge, timed to a launched Gundam passing
  // overhead on its way off-screen (dispatched by Home.jsx's handleBoost).
  const [titlePing, setTitlePing] = useState(false);
  useEffect(() => {
    let timer;
    const handlePing = () => {
      setTitlePing(true);
      clearTimeout(timer);
      timer = setTimeout(() => setTitlePing(false), PING_MS);
    };
    window.addEventListener('gundam-title-ping', handlePing);
    return () => {
      window.removeEventListener('gundam-title-ping', handlePing);
      clearTimeout(timer);
    };
  }, []);

  return (
    <motion.nav
      className="hud-nav"
      id="main-navigation"
      aria-label="Sections"
      initial="hidden"
      animate="visible"
      variants={CONTAINER_VARIANTS}
    >
      <motion.div
        className={`hud-nav__header ${titlePing ? 'hud-nav__header--ping' : ''}`}
        variants={HEADER_VARIANTS}
      >
        <span className="hud-nav__bracket">[</span>
        <span className="hud-nav__title">{NAV_TITLE}</span>
        <span className="hud-nav__bracket">]</span>
      </motion.div>
      <ul className="hud-nav__list">
        {NAV_ITEMS.map((item, index) => {
          const active = activeSection === item.id;
          return (
            <motion.li key={item.id} className="hud-nav__item" variants={ITEM_VARIANTS}>
              <button
                type="button"
                className={`hud-nav__link bevel ${active ? 'hud-nav__link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                data-clickable
              >
                <span className="hud-nav__index">0{index + 1}</span>
                <span className="hud-nav__text">{item.label}</span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </motion.nav>
  );
}
