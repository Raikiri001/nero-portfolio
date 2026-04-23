import { useState, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'motion/react';
import { ScrambleText } from '../../HUD/ScrambleText';
import { COMM_LINKS } from '../../../data/siteData';
import './Contact.css';

export function Contact() {
  const [dataSecured, setDataSecured] = useState(null);
  const sectionRef = useRef(null);

  const handleContactClick = (e, link) => {
    e.preventDefault();
    if (dataSecured) return;

    setDataSecured(link.id);

    setTimeout(() => {
      window.open(link.url, '_blank', 'noopener,noreferrer');
      setDataSecured(null);
    }, 1500);
  };

  return (
    <section className="comms-section" id="comms" ref={sectionRef}>

      {/* DATA SECURED Overlay */}
      <AnimatePresence>
        {dataSecured && (
          <motion.div
            className="data-secured-overlay"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="data-secured-box">
              <span className="data-secured-text">DATA_SECURED</span>
              <span className="data-secured-sub">UPLOADING PROTOCOLS...</span>
              <div className="progress-bar"><div className="progress-fill" /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="section-header"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginLeft: 'var(--section-margin-x)' }}
      >
        <span className="section-header__code"><ScrambleText text="SEC_004" /></span>
        <h2 className="section-header__title"><ScrambleText text="COMMUNICATION // DATA NODES" /></h2>
        <div className="section-header__line" />
      </motion.div>

      <div className="contact-content">
        <div className="data-nodes-grid">
          {COMM_LINKS.nodes.map((link, idx) => (
            <motion.a
              key={link.id}
              href={link.url}
              onClick={(e) => handleContactClick(e, link)}
              className="data-node hud-panel"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.15 }}
              data-clickable
            >
              <div className="data-node__header">
                <span className="data-node__freq">
                  {COMM_LINKS.headers.status}: <span className="status-value">{link.active}</span>
                </span>
              </div>

              <div className="data-node__body">
                <div className="data-node__label">{link.label}</div>
                <div className="data-node__type">
                  <span className="data-node__type-header">{COMM_LINKS.headers.type}:</span> {link.type}
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
