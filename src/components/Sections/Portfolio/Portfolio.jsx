import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSoundEngine } from '../../../hooks/useSoundEngine';
import { PROJECTS_ARRAY } from '../../../data/siteData';
import { MultiLockCanvas } from './MultiLockCanvas';
import { ScrambleText } from '../../HUD/ScrambleText';
import './Portfolio.css';

export function Portfolio() {
  const sound = useSoundEngine();
  const [selectedMission, setSelectedMission] = useState(null);
  const [lockTarget, setLockTarget] = useState(null);
  const containerRef = useRef(null);

  // Check for deep-linking from Home bounding box
  useEffect(() => {
    const openProjectId = window.sessionStorage.getItem('openProject');
    if (openProjectId) {
      const proj = PROJECTS_ARRAY.find(p => p.id === openProjectId);
      if (proj) {
        // slight delay to let user see the page before expanding
        setTimeout(() => {
           sound.ping();
           setSelectedMission(proj);
        }, 800);
      }
      window.sessionStorage.removeItem('openProject');
    }
  }, [sound]);

  const handleMissionClick = (project, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setLockTarget({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });

    // Missile Swarm locking sequence
    for (let i = 0; i < 12; i++) {
      sound.pip(i * 0.05);
    }
    setTimeout(() => sound.ping(), 700);

    setTimeout(() => {
      setSelectedMission(project);
      setLockTarget(null);
    }, 800);
  };

  const handleClose = () => {
    sound.hiss();
    setSelectedMission(null);
  };

  return (
    <section className="portfolio-section sorties-section" id="sorties" ref={containerRef}>
      {/* Multi-lock overlay */}
      {lockTarget && <MultiLockCanvas target={lockTarget} />}

      <motion.div
        className="section-header"
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{ marginLeft: '120px' }}
      >
        <span className="section-header__code">SEC_003</span>
        <h2 className="section-header__title"><ScrambleText text="TACTICAL SORTIES // OPERATIONAL LOGS" delay={200} /></h2>
        <div className="section-header__line" />
      </motion.div>

      {/* Mission Grid */}
      <div className="mission-grid">
        {PROJECTS_ARRAY.map((project, idx) => (
          <motion.div
            key={project.id}
            className="mission-folder"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 * idx }}
            onClick={(e) => handleMissionClick(project, e)}
            data-clickable
          >
            <div className="mission-folder__id">[{project.id}]</div>
            <h3 className="mission-folder__title">{project.title}</h3>
            
            {/* Tactical Graphics Inside Card */}
            <div className="mission-folder__tactical-data" style={{ margin: '15px 0', borderTop: '1px solid rgba(0, 144, 217, 0.3)', borderBottom: '1px solid rgba(0, 144, 217, 0.3)', padding: '10px 0', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="tac-label" style={{ color: 'var(--color-text-secondary)' }}>THREAT_STATUS:</span>
                <span className="tac-val" style={{ color: 'var(--nerd-accent-yellow)' }}>{project.tacticalData?.THREAT_STATUS}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="tac-label" style={{ color: 'var(--color-text-secondary)' }}>MODEL_USED:</span>
                <span className="tac-val" style={{ color: 'var(--nerd-primary)' }}>{project.tacticalData?.MODEL_USED}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className="tac-label" style={{ color: 'var(--color-text-secondary)' }}>DATASET_SIZE:</span>
                <span className="tac-val" style={{ color: 'var(--nerd-primary)' }}>{project.tacticalData?.DATASET_SIZE}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="tac-label" style={{ color: 'var(--color-text-secondary)' }}>KEY_METRIC:</span>
                <span className="tac-val" style={{ color: 'var(--nerd-accent-green)' }}>{project.tacticalData?.KEY_METRIC}</span>
              </div>
            </div>

            <div className="mission-folder__status">STATUS: {project.status}</div>
            
            <div className="mission-folder__footer">
              <div className="mission-folder__date">{project.date}</div>
              <div className="mission-folder__classification">CLASS: OMEGA</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expanded Mission Detail */}
      <AnimatePresence>
        {selectedMission && (
          <motion.div
            className="mission-detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          >
            <motion.div
              className="mission-detail"
              initial={{ scale: 0.8, opacity: 0, rotateX: 10 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mission-detail__header">
                <div className="mission-detail__id">[{selectedMission.id}]</div>
                <h3 className="mission-detail__title">
                  <ScrambleText text={selectedMission.title} duration={500} />
                </h3>
                <div className="mission-detail__status">STATUS: {selectedMission.status} | {selectedMission.date}</div>
                <button className="mission-detail__close" onClick={handleClose} data-clickable>
                  ✕ ABORT VISUALIZATION
                </button>
              </div>

              <div className="mission-detail__body" style={{ overflowY: 'auto' }}>
                
                {/* Tactical Schematic Large */}
                <div className="mission-detail__schematic" style={{ height: '150px' }}>
                  <div className="schematic-grid" style={{ height: '100%', background: 'rgba(0, 144, 217, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 3fr', gap: '40px', marginTop: '20px' }}>
                  {/* Left Col */}
                  <div>
                    <div className="mission-detail__section">
                      <div className="mission-detail__label">TECH_STACK</div>
                      <div className="armament-tags">
                        {selectedMission.tags.map(tech => (
                          <span key={tech} className="armament-tag">{tech}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Col */}
                  <div style={{ flex: 1 }}>
                    <div className="mission-detail__section">
                      <div className="mission-detail__label">DEBRIEFING_LOG</div>
                      <div className="mission-debrief">
                        {selectedMission.details}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mission-detail__meta">
                  <span style={{ color: 'var(--nerd-accent-red)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>[TARGET_LOCK_ACQUIRED] // ENHANCING ARCHIVAL DATA</span>
                  <a href={selectedMission.repoUrl} target="_blank" rel="noopener noreferrer" className="mission-detail__access" data-clickable>
                    <ScrambleText text="ACCESS_REPOSITORY" duration={400} />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
