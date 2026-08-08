import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'motion/react';
import './CircuitCallout.css';

function bendPoint(anchor, dx, dy) {
  return { x: anchor.x + dx * 0.4, y: anchor.y + dy };
}
function endPoint(anchor, dx, dy) {
  const bend = bendPoint(anchor, dx, dy);
  return { x: anchor.x + dx, y: bend.y };
}

// Shared SVG layer drawing every visible callout's angular circuit-trace
// connector (anchor -> diagonal bend -> horizontal run) plus small node
// dots at each joint, in one pass — the blue circuit-board look from the
// reference image, instead of a single plain line.
export function CircuitConnectors({ items }) {
  return (
    <svg className="circuit-callouts__lines">
      {items.map(({ id, anchor, dx, dy }) => {
        const bend = bendPoint(anchor, dx, dy);
        const end = endPoint(anchor, dx, dy);
        return (
          <g key={id}>
            <path
              d={`M ${anchor.x} ${anchor.y} L ${bend.x} ${bend.y} L ${end.x} ${end.y}`}
              className="circuit-callout__path"
            />
            <circle cx={anchor.x} cy={anchor.y} r="2.5" className="circuit-callout__node" />
            <circle cx={bend.x} cy={bend.y} r="1.8" className="circuit-callout__node" />
            <circle cx={end.x} cy={end.y} r="3" className="circuit-callout__node circuit-callout__node--end" />
          </g>
        );
      })}
    </svg>
  );
}

// One compact node by default (small glowing dot + short key) that expands
// on hover (or tap, for touch) into the full label + value. Boots in with
// a staggered `delay` once its bay settles — see HangarInfo.jsx/Projects.jsx
// for the settle-detection that gates when these mount at all.
export function CircuitCallout({ anchor, dx, dy, label, value, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [tapped, setTapped] = useState(false);
  const expanded = hovered || tapped;
  const end = endPoint(anchor, dx, dy);
  const side = dx < 0 ? 'left' : 'right';
  const shortKey = label.split('_')[0];

  return (
    <motion.div
      className={`circuit-callout circuit-callout--${side} ${expanded ? 'circuit-callout--expanded' : ''}`}
      style={{ left: end.x, top: end.y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.3, delay: delay / 1000, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setTapped((t) => !t)}
      data-clickable
    >
      {expanded ? (
        <>
          <span className="tac-label">{label}:</span>
          <span className="tac-val">{value}</span>
        </>
      ) : (
        <span className="circuit-callout__key">{shortKey}</span>
      )}
    </motion.div>
  );
}
