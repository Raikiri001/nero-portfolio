import { motion } from 'motion/react';
import { SKILLS_ARRAY, PILOT_STATS, PILOT_BIO, SITE_TEXT } from '../../data/siteData';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { SectionHeader } from '../../components/ui/SectionHeader';
import './About.css';

export function About() {
  return (
    <section className="about-section" id="about">
      <SectionHeader code={SITE_TEXT.about.sectionCode} title={SITE_TEXT.about.title} />

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
              {PILOT_STATS.map((stat) => (
                <div key={stat.label} className="pilot-stat-box bevel">
                  <span className="pilot-stat-label">{stat.label}</span>
                  <span className={`pilot-stat-value pilot-stat-value--${stat.tone}`}>{stat.value}</span>
                </div>
              ))}
            </div>

            <div className="pilot-bio-container">
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
                      <span key={skill} className="skill-static-item bevel">{skill}</span>
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
