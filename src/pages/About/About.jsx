import { useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { SKILLS_ARRAY, PILOT_STATS, PILOT_BIO, SITE_TEXT } from '../../data/siteData';
import { ScrambleText } from '../../components/ui/ScrambleText';
import './About.css';

export function About() {
  const sectionRef = useRef(null);

  return (
    <section className="eda-dashboard-section" id="about" ref={sectionRef}>
      <motion.div
        className="section-header"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{ marginLeft: 'var(--section-margin-x)' }}
      >
        <span className="section-header__code"><ScrambleText text={SITE_TEXT.about.sectionCode} /></span>
        <h2 className="section-header__title"><ScrambleText text={SITE_TEXT.about.title} delay={200} /></h2>
      </motion.div>

      <div className="eda-layout">

        <div className="eda-left-col">
          {/* PILOT_STATS Module */}
          <motion.div
            className="eda-panel pilot-stats-panel hud-panel"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="eda-panel__header"><ScrambleText text={SITE_TEXT.about.statsHeader} /></div>
            <div className="pilot-stats-grid">
              {PILOT_STATS.map((stat, i) => (
                <div key={i} className="pilot-stat-box">
                  <span className="pilot-stat-label">{stat.label}</span>
                  <span className="pilot-stat-value" style={{ color: stat.color }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="pilot-bio-container mt-4">
              <div className="eda-panel__header"><ScrambleText text={SITE_TEXT.about.bioHeader} /></div>
              <div className="pilot-bio">
                <span>{PILOT_BIO}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* SKILLS STATIC */}
        <div className="eda-right-col">
          <motion.div
            className="eda-panel skill-ribbon-panel hud-panel"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="eda-panel__header"><ScrambleText text={SITE_TEXT.about.skillsHeader} /></div>

            <div className="skills-static-container">
              {SKILLS_ARRAY.map((category) => (
                <div key={category.category} className="skill-static-category">
                  <div className="skill-static-label">[{category.category}]</div>
                  <div className="skill-static-items">
                    {category.items.map(skill => (
                      <span key={skill} className="skill-static-item">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
