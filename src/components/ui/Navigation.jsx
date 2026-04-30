import { motion } from 'motion/react';
import './Navigation.css';

import { NAV_ITEMS, NAV_TITLE } from '../../data/siteData';

export function Navigation({ activeSection, onNavigate }) {
  const handleClick = (id) => {
    onNavigate(id);
  };

  const navContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.5
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.6, ease: "easeOut", delay: 0.3 }
    }
  };

  return (
    <motion.nav 
      className="hud-nav" 
      id="main-navigation"
      initial="hidden"
      animate="visible"
      variants={navContainerVariants}
    >
      <motion.div className="hud-nav__header" variants={headerVariants}>
        <span className="hud-nav__bracket">[</span>
        <span className="hud-nav__title">{NAV_TITLE}</span>
        <span className="hud-nav__bracket">]</span>
      </motion.div>
      <ul className="hud-nav__list">
        {NAV_ITEMS.map((item, index) => (
          <motion.li 
            key={item.id} 
            className="hud-nav__item"
            variants={itemVariants}
          >
            <button
              className={`hud-nav__link ${activeSection === item.id ? 'hud-nav__link--active' : ''}`}
              onClick={() => handleClick(item.id)}
              data-clickable
            >
              <span className="hud-nav__index">0{index + 1}</span>
              <span className="hud-nav__text">{item.label}</span>
            </button>
          </motion.li>
        ))}
      </ul>
    </motion.nav>
  );
}
