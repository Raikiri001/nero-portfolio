import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { SKILLS_ARRAY } from '../../../data/siteData';
import { ScrambleText } from '../../HUD/ScrambleText';
import './Hangar.css';

export function Hangar() {
  const sectionRef = useRef(null);

  // New informative pilot stats
  const pilotStats = [
    { label: "PROJECTS_COMPLETED", value: "15", color: "var(--nerd-primary)" },
    { label: "YEARS_EXPERIENCE", value: "3", color: "var(--nerd-accent-green)" },
    { label: "MODELS_TRAINED", value: "42", color: "var(--nerd-accent-red)" },
    { label: "PAPERS_READ", value: "120+", color: "var(--nerd-primary)" }
  ];

  return (
    <section className="eda-dashboard-section" id="about" ref={sectionRef}>
      <motion.div
        className="section-header"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{ marginLeft: '120px' }}
      >
        <span className="section-header__code"><ScrambleText text="SEC_002" /></span>
        <h2 className="section-header__title"><ScrambleText text="PILOT DOSSIER // E.D.A DASHBOARD" delay={200} /></h2>
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
            <div className="eda-panel__header"><ScrambleText text="PILOT_STATS" /></div>
            <div className="pilot-stats-grid">
              {pilotStats.map((stat, i) => (
                <div key={i} className="pilot-stat-box">
                  <span className="pilot-stat-label">{stat.label}</span>
                  <span className="pilot-stat-value" style={{ color: stat.color }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="pilot-bio-container mt-4">
              <div className="eda-panel__header"><ScrambleText text="ABOUT_ME" /></div>
              <div className="pilot-bio">
                <span className="blink-dot" style={{ backgroundColor: 'var(--nerd-accent-red)' }}></span>
                <span> An aspiring Machine Learning Engineer and Data Analyst. Highly interested in mecha systems (Gundam, Macross) and merging tactical designs with advanced backend AI infrastructures. [PLACEHOLDER EXCERPT]: I am constantly pushing the boundaries of algorithmic performance, dissecting core neural pathways to enhance tactical OS integrations. My experience spans across rigorous data analysis and designing high-fidelity dashboards suitable for an Ace Pilot execution sequence. I maintain a strict adherence to elegant, scalable code structures, while actively integrating machine learning models into real-world simulations.</span>
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
            <div className="eda-panel__header"><ScrambleText text="SYSTEM_SKILLS_ACTIVE" /></div>

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
