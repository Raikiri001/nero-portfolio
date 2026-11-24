import { useState } from 'react';
import { motion } from 'motion/react';
import { ScrambleText } from '../../components/ui/ScrambleText';
import { SITE_TEXT } from '../../data/siteData';
import './HangarInfo.css';

// The docked bay's readout: title, a compact status badge (hover or focus
// reveals the full status and date, the same way the mech's circuit
// callouts expand), the description, the repo link, and DEPLOY. The
// tactical data and tags live on the mech itself as circuit callouts.
export function HangarInfo({ project, onDeploy }) {
  const [statusExpanded, setStatusExpanded] = useState(false);
  const status = project.status.replace(/_/g, ' ');

  return (
    <motion.div
      className="hangar-info hud-panel"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <h3 className="hangar-info__title"><ScrambleText text={project.title} /></h3>

      <button
        type="button"
        className="hangar-info__status"
        data-status={project.status}
        aria-expanded={statusExpanded}
        onMouseEnter={() => setStatusExpanded(true)}
        onMouseLeave={() => setStatusExpanded(false)}
        onFocus={() => setStatusExpanded(true)}
        onBlur={() => setStatusExpanded(false)}
      >
        <span className="hangar-info__status-dot" />
        <span>
          {statusExpanded ? `${SITE_TEXT.projects.statusLabel} ${status} | ${project.date}` : status}
        </span>
      </button>

      <div className="hangar-info__debrief">{project.details}</div>

      <div className="hangar-info__meta">
        <span className="hangar-info__repo-status">
          {project.repoUrl ? SITE_TEXT.projects.lockSuccess : SITE_TEXT.projects.lockFail}
        </span>
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hangar-info__access"
            data-clickable
          >
            {SITE_TEXT.projects.accessLabel}
          </a>
        )}
      </div>

      <button type="button" className="hangar-info__deploy bevel" onClick={onDeploy} data-clickable>
        {SITE_TEXT.projects.deployLabel}
      </button>
    </motion.div>
  );
}
