import React from 'react';
import './VibrantGauge.css';

export function VibrantGauge({ 
  value = 0, 
  max = 100, 
  label = "SYSTEM", 
  segments = 12 
}) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  // Decide color based on logic: Lime Green -> Yellow -> Magenta
  let statusClass = "gauge--stable";
  if (percentage < 30) {
    statusClass = "gauge--critical";
  } else if (percentage < 60) {
    statusClass = "gauge--caution";
  }

  // Draw the segments
  const filledSegments = Math.ceil((percentage / 100) * segments);

  return (
    <div className={`vibrant-gauge ${statusClass}`}>
      <div className="gauge-header">
        <span className="gauge-label">{label}</span>
        <span className="gauge-value">{Math.round(percentage)}%</span>
      </div>
      <div className="gauge-wheel-container">
        <svg viewBox="0 0 100 100" className="gauge-svg">
          {/* Background Track */}
          <circle 
            cx="50" cy="50" r="40" 
            className="gauge-track" 
            strokeWidth="8" 
            fill="none" 
          />
          {/* Segments Loop */}
          {Array.from({ length: segments }).map((_, i) => {
            const angle = (360 / segments) * i;
            const isFilled = i < filledSegments;
            return (
              <g key={i} transform={`rotate(${angle - 90} 50 50)`}>
                <line 
                  x1="50" y1="10" x2="50" y2="18" 
                  className={`gauge-segment ${isFilled ? 'gauge-segment--filled' : ''}`}
                  strokeWidth="4" 
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
        <div className="gauge-center-node">
          {percentage < 30 ? 'WARN' : 'OK'}
        </div>
      </div>
    </div>
  );
}
