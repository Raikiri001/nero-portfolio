import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function MultiLockCanvas({ target }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const reticles = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 200 + Math.random() * 300;
      reticles.push({
        startX: target.x + Math.cos(angle) * dist,
        startY: target.y + Math.sin(angle) * dist,
        endX: target.x + (Math.random() - 0.5) * 40,
        endY: target.y + (Math.random() - 0.5) * 40,
        size: 10 + Math.random() * 10,
        delay: i * 0.04,
      });
    }

    const duration = 700;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      reticles.forEach((r) => {
        const p = Math.max(0, Math.min((progress - r.delay) / (1 - r.delay), 1));
        const ease = 1 - Math.pow(1 - p, 3);
        const x = r.startX + (r.endX - r.startX) * ease;
        const y = r.startY + (r.endY - r.startY) * ease;
        const s = r.size;

        // Reticle cross - NERO Primary Dark Skyblue
        ctx.strokeStyle = `rgba(0, 144, 217, ${0.8 * (1 - progress * 0.3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - s, y); ctx.lineTo(x - s * 0.3, y);
        ctx.moveTo(x + s * 0.3, y); ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s); ctx.lineTo(x, y - s * 0.3);
        ctx.moveTo(x, y + s * 0.3); ctx.lineTo(x, y + s);
        ctx.stroke();

        // Diamond bracket
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.6);
        ctx.lineTo(x + s * 0.6, y);
        ctx.lineTo(x, y + s * 0.6);
        ctx.lineTo(x - s * 0.6, y);
        ctx.closePath();
        ctx.strokeStyle = `rgba(0, 144, 217, ${0.4 * (1 - progress * 0.5)})`;
        ctx.stroke();
      });

      // Central lock confirmation ring - NERO Accent Red
      if (progress > 0.7) {
        const lockProgress = (progress - 0.7) / 0.3;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 30 + lockProgress * 10, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 23, 68, ${lockProgress * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target]);

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 5001, pointerEvents: 'none' }}
    />,
    document.body
  );
}
