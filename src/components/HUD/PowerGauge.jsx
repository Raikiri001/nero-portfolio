import { useScrollSpeed } from '../../hooks/useScrollSpeed';
import './PowerGauge.css';

export function PowerGauge() {
  const { speed } = useScrollSpeed();
  const percentage = Math.round(speed * 100);
  const isOverclocked = speed > 0.7;
  const isMid = speed > 0.3 && speed <= 0.7;

  return (
    <div className="power-gauge">
      <div className="power-gauge__label">REACTOR</div>
      <div className="power-gauge__track">
        <div
          className={`power-gauge__fill ${isOverclocked ? 'power-gauge__fill--crimson' : isMid ? 'power-gauge__fill--gold' : ''}`}
          style={{ height: `${Math.max(5, percentage)}%` }}
        />
        {/* Tick marks */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="power-gauge__tick" style={{ bottom: `${i * 10}%` }} />
        ))}
      </div>
      <div className={`power-gauge__value ${isOverclocked ? 'text-crimson' : ''}`}>
        {percentage}%
      </div>
      <div className="power-gauge__sublabel">
        {isOverclocked ? 'OVERCLK' : isMid ? 'NOMINAL' : 'IDLE'}
      </div>
    </div>
  );
}
