import { motion } from 'motion/react';
import { ScrambleText } from './ScrambleText';

/**
 * The header every section opens with: a small section code, the title, and
 * an underline. Styled by `.section-header*` in index.css. Pass `className`
 * for a section that needs to position it (Projects overlays it on the 3D
 * hangar).
 */
export function SectionHeader({ code, title, className = '' }) {
  return (
    <motion.header
      className={`section-header ${className}`.trim()}
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <span className="section-header__code"><ScrambleText text={code} /></span>
      <h2 className="section-header__title"><ScrambleText text={title} delay={200} /></h2>
      <div className="section-header__line" />
    </motion.header>
  );
}
