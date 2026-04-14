import { useRef, useEffect } from 'react';

/**
 * Hi-MAT Full Burst beam animation — 8 gold + 4 cyan beams
 * shooting from center to browser corners/edges.
 */
export function BeamCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Define beam targets: 8 gold (corners + midpoints) + 4 cyan (quarter points)
    const beams = [
      // Magenta beams — corners
      { x: 0, y: 0, color: [255, 0, 127], width: 3 },
      { x: canvas.width, y: 0, color: [255, 0, 127], width: 3 },
      { x: 0, y: canvas.height, color: [255, 0, 127], width: 3 },
      { x: canvas.width, y: canvas.height, color: [255, 0, 127], width: 3 },
      // Magenta beams — midpoints
      { x: canvas.width / 2, y: 0, color: [255, 0, 127], width: 2 },
      { x: canvas.width, y: canvas.height / 2, color: [255, 0, 127], width: 2 },
      { x: canvas.width / 2, y: canvas.height, color: [255, 0, 127], width: 2 },
      { x: 0, y: canvas.height / 2, color: [255, 0, 127], width: 2 },
      // Cyan fold beams — quarter points
      { x: canvas.width * 0.25, y: 0, color: [0, 242, 255], width: 2.5 },
      { x: canvas.width * 0.75, y: 0, color: [0, 242, 255], width: 2.5 },
      { x: canvas.width * 0.25, y: canvas.height, color: [0, 242, 255], width: 2.5 },
      { x: canvas.width * 0.75, y: canvas.height, color: [0, 242, 255], width: 2.5 },
    ];

    const duration = 1500; // 1.5 seconds
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Easing function — explosive start, smooth end
      const ease = t => 1 - Math.pow(1 - t, 3);
      const beamProgress = ease(Math.min(progress * 2, 1)); // Beams reach targets in first half
      const fadeProgress = progress > 0.5 ? (progress - 0.5) * 2 : 0;

      // Central flash
      if (progress < 0.3) {
        const flashIntensity = 1 - progress / 0.3;
        const radius = 50 + progress * 200;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${flashIntensity * 0.8})`);
        gradient.addColorStop(0.3, `rgba(255, 0, 127, ${flashIntensity * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 0, 127, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw beams
      beams.forEach((beam, i) => {
        const delay = i * 0.02;
        const bp = Math.max(0, Math.min((beamProgress - delay) / (1 - delay), 1));
        if (bp <= 0) return;

        const endX = cx + (beam.x - cx) * bp;
        const endY = cy + (beam.y - cy) * bp;
        const [r, g, b] = beam.color;
        const alpha = (1 - fadeProgress) * 0.9;

        // Beam glow
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`;
        ctx.lineWidth = beam.width * 6;
        ctx.stroke();

        // Beam core
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = beam.width;
        ctx.stroke();

        // Beam bright core
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        ctx.lineWidth = beam.width * 0.5;
        ctx.stroke();

        // Impact flash at beam tip
        if (bp > 0.9) {
          const impactAlpha = (bp - 0.9) * 10 * (1 - fadeProgress);
          ctx.beginPath();
          ctx.arc(endX, endY, 15 + bp * 20, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${impactAlpha * 0.4})`;
          ctx.fill();
        }
      });

      // Screen-wide white flash at moment of impact
      if (progress > 0.3 && progress < 0.5) {
        const flashAlpha = Math.sin((progress - 0.3) / 0.2 * Math.PI) * 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  return <canvas ref={canvasRef} className="beam-canvas" />;
}
