import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MechModel3D } from '../../game/mech/MechModel3D';
import { getHeroPalette } from '../../game/mech/palettes';
import { SITE_TEXT } from '../../data/siteData';

// Named groups exposed by MechModel3D (see its `name="..."` props) that
// callouts can anchor to, in the order tacticalData entries get assigned
// to them.
const ANCHOR_PARTS = ['head', 'chest', 'rightArm', 'leftArm'];

// Where each callout's label card sits relative to its anchor's projected
// screen position — alternating sides keeps a 4-entry tacticalData block
// from all piling up on one edge.
const LABEL_OFFSETS = [
  { dx: -150, dy: -30, side: 'left' },
  { dx: 190, dy: 0, side: 'right' },
  { dx: -150, dy: 40, side: 'left' },
  { dx: 190, dy: 70, side: 'right' },
];

const CAMERA_TARGET = [0, 0.9, 0];

// The hangar camera has no OrbitControls (fixed inspection framing, so
// callout anchors don't swing around), which means nothing else ever
// points it at the mech — R3F's `camera={{ position, fov }}` shorthand
// only sets position/fov, it doesn't aim the camera. Without this it keeps
// its default forward direction and every projected anchor lands miles
// off-screen.
function CameraAim() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(...CAMERA_TARGET);
  }, [camera]);
  return null;
}

// Lives inside the R3F <Canvas>: projects each named anchor's world
// position to 2D screen space every few frames (throttled — the docked
// mech only idle-bobs a couple millimeters, so this doesn't need to run at
// full framerate) and reports it up to the DOM-side overlay via onProject.
function CalloutProjector({ mechRef, onProject }) {
  const { camera, size } = useThree();
  const frame = useRef(0);

  useFrame(() => {
    frame.current += 1;
    if (frame.current % 4 !== 0) return;
    if (!mechRef.current) return;

    const v = new THREE.Vector3();
    const next = {};
    for (const part of ANCHOR_PARTS) {
      const obj = mechRef.current.getObjectByName(part);
      if (!obj) continue;
      obj.getWorldPosition(v);
      v.project(camera);
      next[part] = {
        x: (v.x * 0.5 + 0.5) * size.width,
        y: (1 - (v.y * 0.5 + 0.5)) * size.height,
      };
    }
    onProject(next);
  });

  return null;
}

function BayScene({ gundamId, mechRef, onProject }) {
  return (
    <>
      <CameraAim />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.5} />
      <directionalLight position={[-3, 1, -2]} intensity={0.4} color="#0090d9" />
      <MechModel3D ref={mechRef} palette={getHeroPalette(gundamId)} pose="idle" scale={1.15} />
      <CalloutProjector mechRef={mechRef} onProject={onProject} />
    </>
  );
}

export function HangarBay({ project, gundamId, isActive, onDeploy }) {
  const mechRef = useRef(null);
  const viewportRef = useRef(null);
  const [callouts, setCallouts] = useState({});
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setViewportSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const entries = Object.entries(project.tacticalData || {});

  return (
    <div className="hangar-bay">
      <div className="hangar-bay__viewport hud-panel" ref={viewportRef}>
        <div className="hangar-bay__gantry" />
        {isActive && viewportSize.width > 0 && (
          <Canvas camera={{ position: [1.7, 1.15, 2.5], fov: 36 }} dpr={[1, 1.5]}>
            <Suspense fallback={null}>
              <BayScene gundamId={gundamId} mechRef={mechRef} onProject={setCallouts} />
            </Suspense>
          </Canvas>
        )}

        <svg className="hangar-callouts__lines" width={viewportSize.width} height={viewportSize.height}>
          {entries.map(([key], i) => {
            const part = ANCHOR_PARTS[i % ANCHOR_PARTS.length];
            const pos = callouts[part];
            const off = LABEL_OFFSETS[i % LABEL_OFFSETS.length];
            if (!pos) return null;
            return (
              <line
                key={key}
                x1={pos.x} y1={pos.y}
                x2={pos.x + off.dx * 0.55} y2={pos.y + off.dy}
                stroke="var(--nerd-primary)" strokeWidth="1" opacity="0.65"
              />
            );
          })}
        </svg>

        {entries.map(([key, value], i) => {
          const part = ANCHOR_PARTS[i % ANCHOR_PARTS.length];
          const pos = callouts[part];
          const off = LABEL_OFFSETS[i % LABEL_OFFSETS.length];
          if (!pos) return null;
          return (
            <div
              key={key}
              className={`hangar-callout hangar-callout--${off.side}`}
              style={{ left: pos.x + off.dx, top: pos.y + off.dy }}
            >
              <span className="tac-label">{key}:</span>
              <span className="tac-val">{value}</span>
            </div>
          );
        })}

        <div className="hangar-bay__unit-id">[{project.id}]</div>
      </div>

      <div className="hangar-bay__info hud-panel">
        <h3 className="hangar-bay__title">{project.title}</h3>
        <div className="hangar-bay__status" data-status={project.status}>
          {SITE_TEXT.projects.statusLabel} {project.status.replace(/_/g, ' ')} | {project.date}
        </div>

        <div className="mission-detail__section">
          <div className="mission-detail__label">{SITE_TEXT.projects.tagsLabel}</div>
          <div className="armament-tags">
            {project.tags.map((tech) => (
              <span key={tech} className="armament-tag">{tech}</span>
            ))}
          </div>
        </div>

        <div className="mission-detail__section">
          <div className="mission-detail__label">{SITE_TEXT.projects.debriefLabel}</div>
          <div className="mission-debrief">{project.details}</div>
        </div>

        <div className="hangar-bay__meta">
          <span className="hangar-bay__repo-status">
            {project.repoUrl ? SITE_TEXT.projects.lockSuccess : SITE_TEXT.projects.lockFail}
          </span>
          {project.repoUrl && (
            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="mission-detail__access" data-clickable>
              {SITE_TEXT.projects.accessLabel}
            </a>
          )}
        </div>

        <button className="hangar-bay__deploy" onClick={() => onDeploy?.(gundamId)} data-clickable>
          {SITE_TEXT.projects.deployLabel}
        </button>
      </div>
    </div>
  );
}
