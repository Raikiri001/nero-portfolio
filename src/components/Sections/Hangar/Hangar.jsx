import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { SKILLS_ARRAY } from '../../../data/siteData';
import { ScrambleText } from '../../HUD/ScrambleText';
import './Hangar.css';

export function Hangar() {
  const sectionRef = useRef(null);

  // New informative pilot stats
  const pilotStats = [
    { label: "PROJECTS_COMPLETED", value: "6", color: "var(--nerd-primary)" },
    { label: "SPECIALISATION", value: "AI | Data Analytics", color: "var(--nerd-accent-green)" },
    { label: "MODELS_TRAINED", value: "20", color: "var(--nerd-accent-red)" },
    { label: "PAPERS_READ", value: "100+", color: "var(--nerd-primary)" }
  ];

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
                <span>I’m currently a third-year Computer Science student specializing in AI and Data Analytics, but my fascination with complex systems goes way beyond the code I write on my screen. I’ve always been drawn to the intersection where clean aesthetics and high-end engineering meet, which is a passion rooted in my long-standing love for mecha. I’ve spent a lot of time exploring the intricate worlds of Gundam SEED and Macross Frontier, and I’ve always viewed the ZGMF-X20A Strike Freedom as the absolute gold standard for design. That appreciation eventually translated into a hands-on hobby of building Gunpla and other plastic models, where I’ve found that my academic and creative worlds overlap more than I ever expected. I’ve realized that the level of patience and precision needed to meticulously detail a Master Grade kit is almost identical to the mindset I need when I’m refining a neural network or debugging a difficult project. Both tasks require a deep curiosity for the under-the-hood mechanics that make a system work, and I truly enjoy the process of taking dozens of complex components and perfecting them into a functional whole, whether that’s inside a terminal or at my workbench.</span>
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
