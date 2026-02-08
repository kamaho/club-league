const COLORS = ['#a855f7', '#8b5cf6', '#7c3aed', '#c084fc', '#e879f9', '#f472b6', '#fb923c', '#fbbf24'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

export function fireConfetti(): void {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const particleCount = 80;
  const particles: Particle[] = [];
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
    const speed = 8 + Math.random() * 12;
    particles.push({
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
    });
  }

  const gravity = 0.25;
  const friction = 0.99;

  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let anyAlive = false;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravity;
      p.vx *= friction;
      p.vy *= friction;
      p.rotation += p.rotationSpeed;
      if (p.y < canvas.height + 50) anyAlive = true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    });

    if (anyAlive) {
      requestAnimationFrame(tick);
    } else {
      window.removeEventListener('resize', resize);
      canvas.remove();
    }
  };
  requestAnimationFrame(tick);
}
