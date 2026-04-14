import React, { useEffect, useState } from 'react';
import './CockpitDataCore.css';

export function CockpitDataCore() {
  const [glitchTrigger, setGlitchTrigger] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchTrigger(true);
      setTimeout(() => setGlitchTrigger(false), 200);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="data-core-container">
      {/* Background Grid & Hexagons */}
      <div className="data-core-grid" />
      
      {/* Main Mecha Schematic Wireframe */}
      <div className={`schematic-wrapper ${glitchTrigger ? 'schematic-glitch' : ''}`}>
        <svg viewBox="0 0 500 600" className="mecha-svg">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="armorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(0, 242, 255, 0.4)" />
              <stop offset="100%" stopColor="rgba(0, 119, 190, 0.1)" />
            </linearGradient>
          </defs>

          <g filter="url(#glow)">
            {/* Structural Core & Shoulders */}
            <polygon points="250,50 300,100 350,120 350,150 150,150 150,120 200,100" fill="url(#armorGrad)" stroke="#00f2ff" strokeWidth="1.5" />
            {/* Center Node (Cockpit) */}
            <polygon points="250,160 280,240 250,280 220,240" fill="rgba(255, 0, 127, 0.2)" stroke="#ff007f" strokeWidth="2" />
            {/* Wings / Super Dragoons */}
            <path d="M 350 120 L 450 60 L 480 200 L 320 200 Z" fill="none" stroke="#00f2ff" strokeWidth="1" strokeDasharray="5,5" />
            <path d="M 150 120 L 50 60 L 20 200 L 180 200 Z" fill="none" stroke="#00f2ff" strokeWidth="1" strokeDasharray="5,5" />
            {/* Legs structure */}
            <polygon points="220,290 280,290 320,450 300,550 250,500 200,550 180,450" fill="none" stroke="#0077be" strokeWidth="2" />
            
            {/* Dynamic Reticles & Target Locks */}
            <circle cx="250" cy="220" r="40" fill="none" stroke="#ff007f" strokeWidth="0.5" strokeDasharray="4,6" />
            <circle cx="250" cy="220" r="10" fill="none" stroke="#00ff88" strokeWidth="1" />
            <line x1="250" y1="210" x2="250" y2="230" stroke="#00ff88" strokeWidth="1" />
            <line x1="240" y1="220" x2="260" y2="220" stroke="#00ff88" strokeWidth="1" />
            
            <circle cx="400" cy="130" r="25" fill="none" stroke="#00ff88" strokeWidth="1" />
            <circle cx="100" cy="130" r="25" fill="none" stroke="#00ff88" strokeWidth="1" />
          </g>

          {/* Microscopic Labels */}
          <g className="schematic-labels" fill="#00f2ff" fontSize="10" fontFamily="'Fira Code', monospace">
            <text x="360" y="100">DRAGOON SYSTEM :: ACTIVE</text>
            <text x="50" y="100">PHASE SHIFT :: 100%</text>
            <text x="210" y="150" fill="#ff007f">CORE REACTOR</text>
            <text x="280" y="350">THRUSTER N-JAMMER</text>
            <text x="120" y="450">GN DRIVE :: SYNCH</text>
          </g>

          {/* Targeting Lines */}
          <path d="M 250 220 L 350 300 L 450 300" fill="none" stroke="#ff007f" strokeWidth="1" />
          <text x="460" y="305" fill="#ff007f" fontSize="10" fontFamily="monospace">LOCK ON</text>
        </svg>
      </div>

      {/* Chaotic Data Readouts overlapping */}
      <div className="data-core-readouts">
        <div className="readout readout--top-left">
          <span>DEUTERION REACTOR: 98.7% <span className="text-lime">[OK]</span></span>
          <div className="scrolling-data">
            {[...Array(6)].map((_, i) => <div key={i}>OX_SYNC_{Math.random().toFixed(4)}</div>)}
          </div>
        </div>
        <div className="readout readout--bottom-right">
          <span className="text-magenta">ALERT: SENSOR INTERFERENCE</span>
          <div className="scrolling-data">
            {[...Array(4)].map((_, i) => <div key={i}>ERR_TGT_DROPPED_{Math.random().toFixed(4)}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
