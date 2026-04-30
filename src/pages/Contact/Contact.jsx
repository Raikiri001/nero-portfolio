import { useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { COMM_LINKS, SITE_TEXT } from '../../data/siteData';
import './Contact.css';

export function Contact() {
  const sectionRef = useRef(null);

  return (
    <section className="contact-section" id="contact" ref={sectionRef}>

      <motion.div
        className="section-header"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginLeft: 'var(--section-margin-x)' }}
      >
        <span className="section-header__code"><ScrambleText text={SITE_TEXT.contact.sectionCode} /></span>
        <h2 className="section-header__title"><ScrambleText text={SITE_TEXT.contact.title} /></h2>
        <div className="section-header__line" />
      </motion.div>

      <div className="contact-content">
        <div className="data-nodes-grid">
          {COMM_LINKS.nodes.map((link, idx) => (
            <motion.a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
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

      <footer className="contact-footer">
        <div className="contact-footer__line" />
        <div className="contact-footer__content">
          <span>{SITE_TEXT.contact.footerCopyright}</span>
          <span className="contact-footer__timestamp">{SITE_TEXT.contact.footerEstDate}</span>
        </div>
      </footer>
    </section>
  );
}
