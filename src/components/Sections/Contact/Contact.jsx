import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSoundEngine } from '../../../hooks/useSoundEngine';
import { ScrambleText } from '../../HUD/ScrambleText';
import './Contact.css';

const commLinks = [
  { id: 'github', label: 'GITHUB.COM', type: 'REPOSITORY', value: 'Nero_G', url: 'https://github.com/', frequency: '144.75' },
  { id: 'linkedin', label: 'LINKEDIN', type: 'PROFESSIONAL_NET', value: 'Nero_G', url: 'https://linkedin.com/', frequency: '108.20' },
  { id: 'email', label: 'SECURE_EMAIL', type: 'DIRECT_COMM', value: 'nero@example.com', url: 'mailto:nero@example.com', frequency: '256.00' }
];

export function Contact() {
  const sound = useSoundEngine();
  const [dataSecured, setDataSecured] = useState(null);
  const sectionRef = useRef(null);

  const handleContactClick = (e, link) => {
    e.preventDefault();
    if (dataSecured) return;
    
    sound.ping();
    setDataSecured(link.id);

    setTimeout(() => {
      sound.beam();
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
        style={{ marginLeft: '120px' }}
      >
        <span className="section-header__code"><ScrambleText text="SEC_004" /></span>
        <h2 className="section-header__title"><ScrambleText text="COMMUNICATION // DATA NODES" /></h2>
        <div className="section-header__line" />
      </motion.div>

      <div className="contact-content">
        <div className="data-nodes-grid">
          {commLinks.map((link, idx) => (
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
                <span className="data-node__freq">FREQ: {link.frequency}</span>
                <span className="data-node__status blink-dot"></span>
              </div>
              
              <div className="data-node__body">
                <div className="data-node__label">{link.label}</div>
                <div className="data-node__type">[{link.type}]</div>
              </div>

              <div className="data-node__footer">
                ESTABLISH_LINK
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
