import './MissionCard.css';

export function MissionCard({ project, onClick }) {
  return (
    <div className="mission-card panel" onClick={onClick} data-clickable>
      <div className="mission-card__header">
        <span className="mission-card__classification">[{project.classification}]</span>
        <span className="mission-card__status" data-status={project.status}>{project.status}</span>
      </div>

      <h3 className="mission-card__codename">{project.codename}</h3>
      <div className="mission-card__title">{project.title}</div>

      {/* Visual indicator */}
      <div className={`mission-card__visual mission-card__visual--${project.visualType}`}>
        {project.visualType === 'neural-face' && (
          <div className="visual-neural">
            <div className="visual-neural__nodes">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="neural-node" style={{
                  animationDelay: `${i * 0.2}s`,
                  left: `${15 + (i % 3) * 30}%`,
                  top: `${15 + Math.floor(i / 3) * 30}%`,
                }} />
              ))}
            </div>
            <div className="visual-neural__label">CNN INFERENCE</div>
          </div>
        )}
        {project.visualType === 'tactical-map' && (
          <div className="visual-tactical">
            <div className="tactical-road tactical-road--h" />
            <div className="tactical-road tactical-road--v" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="tactical-vehicle" style={{
                animationDelay: `${i * 0.5}s`,
                left: `${20 + i * 15}%`,
                top: `${25 + (i % 2) * 30}%`,
              }} />
            ))}
            <div className="visual-tactical__label">THREAT ANALYSIS</div>
          </div>
        )}
      </div>

      <div className="mission-card__armament">
        {project.armament.slice(0, 3).map(tech => (
          <span key={tech} className="mission-card__tech">{tech}</span>
        ))}
        {project.armament.length > 3 && (
          <span className="mission-card__tech mission-card__tech--more">
            +{project.armament.length - 3}
          </span>
        )}
      </div>

      <div className="mission-card__footer">
        <span>SORTIE: {project.sortie_date}</span>
        <span>THREAT: {project.threat_level}</span>
      </div>
    </div>
  );
}
