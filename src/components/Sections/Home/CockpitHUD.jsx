import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import './CockpitHUD.css';

export function CockpitHUD() {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Materials
    const neonWhite = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    const cyanWire = new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.6 });
    const dimWire = new THREE.LineBasicMaterial({ color: 0x0088aa, transparent: true, opacity: 0.4 });
    const magentaWire = new THREE.LineBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.6 });

    const mechaGroup = new THREE.Group();

    // Torso — angular box
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.6, 0.8);
    const torso = new THREE.LineSegments(new THREE.EdgesGeometry(torsoGeo), neonWhite);
    mechaGroup.add(torso);

    // Head — angled pyramid (V-Fin shape)
    const headGeo = new THREE.ConeGeometry(0.3, 0.5, 4);
    const head = new THREE.LineSegments(new THREE.EdgesGeometry(headGeo), cyanWire);
    head.position.y = 1.2;
    head.rotation.y = Math.PI / 4;
    mechaGroup.add(head);

    // V-Fin
    const vfinMat = new THREE.LineBasicMaterial({ color: 0xf2ff00, transparent: true, opacity: 0.9 });
    const vfinGeo = new THREE.BufferGeometry();
    const vfinVerts = new Float32Array([
      0, 1.5, 0,   -0.6, 1.9, 0,
      0, 1.5, 0,    0.6, 1.9, 0,
      -0.6, 1.9, 0, -0.3, 1.55, 0,
       0.6, 1.9, 0,  0.3, 1.55, 0,
    ]);
    vfinGeo.setAttribute('position', new THREE.BufferAttribute(vfinVerts, 3));
    mechaGroup.add(new THREE.LineSegments(vfinGeo, vfinMat));

    // Shoulders
    const shoulderGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
    const leftShoulder = new THREE.LineSegments(new THREE.EdgesGeometry(shoulderGeo), neonWhite);
    leftShoulder.position.set(-1.0, 0.5, 0);
    mechaGroup.add(leftShoulder);
    const rightShoulder = new THREE.LineSegments(new THREE.EdgesGeometry(shoulderGeo), neonWhite);
    rightShoulder.position.set(1.0, 0.5, 0);
    mechaGroup.add(rightShoulder);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.25, 1.0, 0.25);
    const leftArm = new THREE.LineSegments(new THREE.EdgesGeometry(armGeo), dimWire);
    leftArm.position.set(-1.0, -0.3, 0);
    mechaGroup.add(leftArm);
    const rightArm = new THREE.LineSegments(new THREE.EdgesGeometry(armGeo), dimWire);
    rightArm.position.set(1.0, -0.3, 0);
    mechaGroup.add(rightArm);

    // Wings — Strike Freedom style DRAGOON wings
    const wingMat = new THREE.LineBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.6 });
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i++) {
        const wingGeo = new THREE.BufferGeometry();
        const baseX = side * 0.6;
        const tipX = side * (1.5 + i * 0.3);
        const yOff = 0.5 - i * 0.3;
        const wingVerts = new Float32Array([
          baseX, yOff, -0.4,
          tipX, yOff + 0.4, -0.6 - i * 0.15,
          tipX, yOff + 0.4, -0.6 - i * 0.15,
          tipX, yOff - 0.1, -0.5 - i * 0.15,
          tipX, yOff - 0.1, -0.5 - i * 0.15,
          baseX, yOff, -0.4,
        ]);
        wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
        mechaGroup.add(new THREE.LineSegments(wingGeo, wingMat));
      }
    }

    // Waist
    const waistGeo = new THREE.BoxGeometry(0.8, 0.3, 0.6);
    const waist = new THREE.LineSegments(new THREE.EdgesGeometry(waistGeo), dimWire);
    waist.position.y = -1.0;
    mechaGroup.add(waist);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.3, 1.2, 0.35);
    const leftLeg = new THREE.LineSegments(new THREE.EdgesGeometry(legGeo), dimWire);
    leftLeg.position.set(-0.3, -1.9, 0);
    mechaGroup.add(leftLeg);
    const rightLeg = new THREE.LineSegments(new THREE.EdgesGeometry(legGeo), dimWire);
    rightLeg.position.set(0.3, -1.9, 0);
    mechaGroup.add(rightLeg);

    // Feet
    const footGeo = new THREE.BoxGeometry(0.35, 0.15, 0.5);
    const leftFoot = new THREE.LineSegments(new THREE.EdgesGeometry(footGeo), dimWire);
    leftFoot.position.set(-0.3, -2.6, 0.1);
    mechaGroup.add(leftFoot);
    const rightFoot = new THREE.LineSegments(new THREE.EdgesGeometry(footGeo), dimWire);
    rightFoot.position.set(0.3, -2.6, 0.1);
    mechaGroup.add(rightFoot);

    scene.add(mechaGroup);

    // HUD rings
    const ringGeo1 = new THREE.RingGeometry(2.8, 2.85, 64);
    const ringMat1 = new THREE.LineBasicMaterial({ color: 0x00f2ff, transparent: true, opacity: 0.15 });
    const ring1 = new THREE.LineLoop(new THREE.EdgesGeometry(ringGeo1), ringMat1);
    scene.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(3.2, 3.22, 32);
    const ringMat2 = new THREE.LineBasicMaterial({ color: 0xff007f, transparent: true, opacity: 0.2 });
    const ring2 = new THREE.LineLoop(new THREE.EdgesGeometry(ringGeo2), ringMat2);
    ring2.rotation.x = 0.3;
    scene.add(ring2);

    // Animation
    let frameId;
    const animate = () => {
      mechaGroup.rotation.y += 0.005;
      ring1.rotation.z += 0.002;
      ring2.rotation.z -= 0.003;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="cockpit-hud">
      <div className="cockpit-hud__viewport" ref={mountRef} />

      {/* HUD Overlays */}
      <div className="cockpit-hud__label cockpit-hud__label--top">
        ◆ STRIKE-MESSIAH MK-II WIREFRAME
      </div>
      <div className="cockpit-hud__label cockpit-hud__label--bottom">
        UNIT_STATUS: NOMINAL // ROTATION: AUTO
      </div>

      {/* Floating Reticles */}
      <div className="cockpit-reticle cockpit-reticle--cyan">
        <div className="reticle-core" />
      </div>
      <div className="cockpit-reticle cockpit-reticle--magenta">
        <div className="reticle-core" />
      </div>

      {/* Corner brackets */}
      <div className="cockpit-corner cockpit-corner--tl" />
      <div className="cockpit-corner cockpit-corner--tr" />
      <div className="cockpit-corner cockpit-corner--bl" />
      <div className="cockpit-corner cockpit-corner--br" />
    </div>
  );
}
