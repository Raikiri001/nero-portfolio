import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { SITE_TEXT } from '../../data/siteData';
import './HangarInfo.css';

// Restructured per your feedback: title, a compact status badge (hover
// reveals the full status+date the same way the mech's circuit callouts
// expand), the project description, and the repo link/access button — the
// tactical data + tags moved out to CircuitCallout on the mech itself, but
// description and repo access stay here.
export function HangarInfo({ project, onDeploy }) {
  const [statusExpanded, setStatusExpanded] = useState(false);

  return (
    <motion.div
      className="hangar-info hud-panel"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <h3 className="hangar-info__title"><ScrambleText text={project.title} /></h3>

      <div
        className={`hangar-info__status ${statusExpanded ? 'hangar-info__status--expanded' : ''}`}
        data-status={project.status}
        onMouseEnter={() => setStatusExpanded(true)}
        onMouseLeave={() => setStatusExpanded(false)}
      >
        <span className="hangar-info__status-dot" />
        <span className="hangar-info__status-text">
          {statusExpanded
            ? `${SITE_TEXT.projects.statusLabel} ${project.status.replace(/_/g, ' ')} | ${project.date}`
            : project.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mission-debrief hangar-info__debrief">{project.details}</div>

      <div className="hangar-info__meta">
        <span className="hangar-bay__repo-status">
          {project.repoUrl ? SITE_TEXT.projects.lockSuccess : SITE_TEXT.projects.lockFail}
        </span>
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mission-detail__access"
            data-clickable
          >
            {SITE_TEXT.projects.accessLabel}
          </a>
        )}
      </div>

      <button className="hangar-bay__deploy" onClick={onDeploy} data-clickable>
        {SITE_TEXT.projects.deployLabel}
      </button>
    </motion.div>
  );
}
