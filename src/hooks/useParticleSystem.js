import { useRef, useEffect, useCallback } from 'react';

/**
 * Canvas-based DRAGOON particle system.
 * Gold particles drifting opposite to mouse direction.
 */
export function useParticleSystem(canvasRef, options = {}) {
  const {
    count = 60,
    color = { r: 212, g: 175, b: 55 },
    maxSize = 3,
    speed = 0.3,
    mouseReactivity = 0.5,
    enabled = true,
  } = options;

  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef(null);

  const initParticles = useCallback((width, height) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * maxSize + 0.5,
        speedX: (Math.random() - 0.5) * speed,
        speedY: (Math.random() - 0.5) * speed,
        opacity: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }
    particlesRef.current = particles;
  }, [count, maxSize, speed]);

  useEffect(() => {
    if (!canvasRef.current || !enabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height);
      }
    };

    const handleMouse = (e) => {
      mouseRef.current.vx = e.clientX - prevMouseRef.current.x;
      mouseRef.current.vy = e.clientY - prevMouseRef.current.y;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      prevMouseRef.current.x = e.clientX;
      prevMouseRef.current.y = e.clientY;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach(p => {
        // Apply inverse mouse velocity
        p.x += p.speedX - mouseRef.current.vx * mouseReactivity * 0.02;
        p.y += p.speedY - mouseRef.current.vy * mouseReactivity * 0.02;

        // Pulse
        p.pulse += p.pulseSpeed;
        const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${currentOpacity * 0.2})`;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${currentOpacity})`;
        ctx.fill();
      });

      // Decay mouse velocity
      mouseRef.current.vx *= 0.95;
      mouseRef.current.vy *= 0.95;

      animFrameRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouse);
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvasRef, enabled, color, mouseReactivity, initParticles]);
}
