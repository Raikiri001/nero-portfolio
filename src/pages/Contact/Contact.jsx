import { motion } from 'motion/react';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { COMM_LINKS, SITE_TEXT } from '../../data/siteData';
import './Contact.css';

export function Contact() {
  return (
    <section className="contact-section" id="contact">
      <SectionHeader code={SITE_TEXT.contact.sectionCode} title={SITE_TEXT.contact.title} />

      <div className="contact-content">
        <div className="data-nodes-grid">
          {COMM_LINKS.nodes.map((link, idx) => (
            <motion.a
              key={link.id}
              href={link.url}
              // a mailto: link must not open a blank tab
              {...(link.url.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
              className="data-node hud-panel"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.15 }}
              data-clickable
            >
              <div className="data-node__header">
                <span className="data-node__freq">
                  {COMM_LINKS.headers.status}: <span className="data-node__status">{link.active}</span>
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
