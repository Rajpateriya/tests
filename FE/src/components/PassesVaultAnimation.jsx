import React, { useEffect, useRef } from 'react';

/**
 * PassesVaultAnimation
 * A premium holographic VIP access pass & golden vault ambient background for Passes & Pricing.
 * 
 * Features:
 * - Floating Holographic VIP Pass Badges: [ ✦ 1-YEAR UNLIMITED ], [ 🛡️ PRO ACCESS ], [ ⚡ ALL-INDIA RANK ], [ 💎 99.98% SLA ].
 * - Prismatic laser facet rays and shimmering golden/emerald star particles.
 * - Geometric security vault shield arcs.
 * - Auto-pauses offscreen for zero CPU drain.
 */
export const PassesVaultAnimation = ({ className = '', opacity = 1 }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let isVisible = true;
    let isDark = document.documentElement.classList.contains('dark');

    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark');
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 500;

    const updateDimensions = () => {
      if (!container || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible && !animationFrameId) {
            lastTime = performance.now();
            animationFrameId = requestAnimationFrame(render);
          }
        });
      },
      { rootMargin: '100px' }
    );
    intersectionObserver.observe(container);

    // Pass Badges
    const PASS_BADGES = [
      { label: '✦ 1-YEAR UNLIMITED', tier: 'gold', w: 125 },
      { label: '🛡️ ALL EXAM ACCESS', tier: 'emerald', w: 120 },
      { label: '⚡ INSTANT AI DERIVATIONS', tier: 'sky', w: 140 },
      { label: '💎 99.98% CBT SLA', tier: 'purple', w: 115 },
      { label: '★ ALL-INDIA PERCENTILE', tier: 'gold', w: 130 },
    ];

    const badges = PASS_BADGES.map((b, i) => ({
      ...b,
      x: Math.random() * (width - 160) + 80,
      y: Math.random() * (height - 80) + 40,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.32 + 0.18),
      phase: i * 1.1,
      rot: (Math.random() - 0.5) * 0.15,
    }));

    // Shimmering star particles
    const stars = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 1.2,
      pulse: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
      color: Math.random() < 0.5 ? 'gold' : 'emerald',
    }));

    let lastTime = performance.now();

    const render = (time) => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const colors = isDark
        ? {
            gold: { border: '#fbbf24', bg: 'rgba(245, 158, 11, 0.16)', text: '#fef3c7', glow: 'rgba(251, 191, 36, 0.35)' },
            emerald: { border: '#34d399', bg: 'rgba(16, 185, 129, 0.16)', text: '#d1fae5', glow: 'rgba(52, 211, 153, 0.35)' },
            sky: { border: '#38bdf8', bg: 'rgba(14, 165, 233, 0.16)', text: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.35)' },
            purple: { border: '#c084fc', bg: 'rgba(168, 85, 247, 0.16)', text: '#f3e8ff', glow: 'rgba(192, 132, 252, 0.35)' },
            starGold: '#fbbf24',
            starEmerald: '#34d399',
            facetLine: 'rgba(251, 191, 36, 0.10)',
          }
        : {
            gold: { border: '#d97706', bg: 'rgba(254, 243, 199, 0.90)', text: '#92400e', glow: 'rgba(217, 119, 6, 0.25)' },
            emerald: { border: '#059669', bg: 'rgba(209, 250, 229, 0.90)', text: '#065f46', glow: 'rgba(5, 150, 105, 0.25)' },
            sky: { border: '#0284c7', bg: 'rgba(224, 242, 254, 0.90)', text: '#075985', glow: 'rgba(2, 132, 199, 0.25)' },
            purple: { border: '#7c3aed', bg: 'rgba(243, 232, 255, 0.90)', text: '#5b21b6', glow: 'rgba(124, 58, 237, 0.25)' },
            starGold: '#d97706',
            starEmerald: '#059669',
            facetLine: 'rgba(217, 119, 6, 0.08)',
          };

      ctx.globalAlpha = opacity;

      // 1. Shimmering Geometric Facet Lines
      ctx.strokeStyle = colors.facetLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.2);
      ctx.lineTo(width * 0.5, 0);
      ctx.lineTo(width, height * 0.3);
      ctx.lineTo(width * 0.7, height);
      ctx.lineTo(width * 0.2, height);
      ctx.closePath();
      ctx.stroke();

      // 2. Draw Radiant Shimmering Stars
      for (const s of stars) {
        s.pulse += s.speed * dt * 1000;
        const currentAlpha = (Math.sin(s.pulse) * 0.5 + 0.5) * 0.75;
        const starColor = s.color === 'gold' ? colors.starGold : colors.starEmerald;

        ctx.save();
        ctx.fillStyle = starColor;
        ctx.globalAlpha = currentAlpha * opacity;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Draw Floating Holographic Pass Badges
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const b of badges) {
        b.x += b.vx;
        b.y += b.vy;
        b.phase += dt * 1.4;
        b.x += Math.sin(b.phase) * 0.2;

        if (b.y < -40) {
          b.y = height + 30;
          b.x = Math.random() * (width - 160) + 80;
        }
        if (b.x < -50) b.x = width + 50;
        if (b.x > width + 50) b.x = -50;

        const palette = colors[b.tier] || colors.gold;
        const w = b.w;
        const h = 28;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);

        // Soft Hologram Glow
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 10;

        // Box
        ctx.fillStyle = palette.bg;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 7);
        ctx.fill();
        ctx.stroke();

        // Pass Label
        ctx.shadowBlur = 0;
        ctx.font = '800 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = palette.text;
        ctx.fillText(b.label, 0, 0);

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
    };
  }, [opacity]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
