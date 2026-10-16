import React, { useEffect, useRef } from 'react';

/**
 * CbtSandboxMatrixAnimation
 * A futuristic CBT examination engine simulation grid for the Hero Sandbox section.
 * 
 * Features:
 * - Floating Question Palette Node Badges: [ 🟢 Q1 Answered ], [ 🟣 Q4 Review ], [ ⚪ Q7 Visited ],
 *   [ ⏱️ 48:15 CBT ], [ 🎯 +2.00 / -0.50 ], [ QUANT & REASONING ].
 * - Moving perspective cyber-horizon lines giving 3D depth to the live exam room.
 * - Dynamic test engine photon rays and mathematical derivation symbols (Σ, √x, π, Δ).
 * - Light / Dark theme reactivity with zero offscreen CPU usage.
 */
export const CbtSandboxMatrixAnimation = ({ className = '', opacity = 1 }) => {
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

    // Question Palette items and exam badges
    const CBT_ITEMS = [
      { label: '🟢 Q1 ANSWERED', type: 'answered', w: 105 },
      { label: '🟣 Q4 REVIEW', type: 'review', w: 95 },
      { label: '⚪ Q8 NOT VISITED', type: 'neutral', w: 110 },
      { label: '🎯 +2.00 / -0.50', type: 'score', w: 100 },
      { label: '⏱️ 48:15 REMAINING', type: 'timer', w: 120 },
      { label: 'Σ DERIVATION', type: 'math', w: 90 },
      { label: 'SECTION I: QUANT', type: 'neutral', w: 115 },
      { label: '√x SPEED SOLVE', type: 'math', w: 100 },
    ];

    const particles = CBT_ITEMS.map((item, i) => ({
      ...item,
      x: Math.random() * (width - 150) + 75,
      y: Math.random() * (height - 80) + 40,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(Math.random() * 0.35 + 0.2),
      phase: i * 0.8,
      alpha: Math.random() * 0.25 + 0.65,
    }));

    // Floating math symbols
    const MATH_SYMBOLS = ['Σ', '√', 'π', 'Δ', '∫', '≈', 'θ', 'λ', '±'];
    const mathParticles = Array.from({ length: 16 }, () => ({
      char: MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)],
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(Math.random() * 0.3 + 0.15),
      size: Math.random() * 10 + 14,
      alpha: Math.random() * 0.25 + 0.2,
    }));

    let gridOffset = 0;
    let lastTime = performance.now();

    const render = (time) => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      gridOffset = (gridOffset + dt * 14) % 40;

      ctx.clearRect(0, 0, width, height);

      const colors = isDark
        ? {
            grid: 'rgba(56, 189, 248, 0.05)',
            answered: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.16)', text: '#d1fae5' },
            review: { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.16)', text: '#f3e8ff' },
            timer: { border: '#0284c7', bg: 'rgba(14, 165, 233, 0.16)', text: '#e0f2fe' },
            score: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.16)', text: '#fef3c7' },
            math: { border: '#6366f1', bg: 'rgba(99, 102, 241, 0.16)', text: '#e0e7ff' },
            neutral: { border: '#64748b', bg: 'rgba(30, 41, 59, 0.7)', text: '#cbd5e1' },
            mathChar: 'rgba(56, 189, 248, 0.16)',
          }
        : {
            grid: 'rgba(2, 132, 199, 0.05)',
            answered: { border: '#059669', bg: 'rgba(209, 250, 229, 0.90)', text: '#065f46' },
            review: { border: '#7c3aed', bg: 'rgba(243, 232, 255, 0.90)', text: '#5b21b6' },
            timer: { border: '#0284c7', bg: 'rgba(224, 242, 254, 0.90)', text: '#075985' },
            score: { border: '#d97706', bg: 'rgba(254, 243, 199, 0.90)', text: '#92400e' },
            math: { border: '#4f46e5', bg: 'rgba(238, 242, 255, 0.90)', text: '#3730a3' },
            neutral: { border: '#94a3b8', bg: 'rgba(248, 250, 252, 0.90)', text: '#334155' },
            mathChar: 'rgba(2, 132, 199, 0.14)',
          };

      ctx.globalAlpha = opacity;

      // 1. Perspective Grid Lines (Lower third)
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      const horizonY = height * 0.45;

      // Horizontal moving grid lines
      for (let y = horizonY; y <= height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw Floating Mathematical Symbols
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const m of mathParticles) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -20) m.y = height + 20;
        if (m.x < -20) m.x = width + 20;
        if (m.x > width + 20) m.x = -20;

        ctx.save();
        ctx.font = `600 ${m.size}px serif`;
        ctx.fillStyle = colors.mathChar;
        ctx.fillText(m.char, m.x, m.y);
        ctx.restore();
      }

      // 3. Draw Floating Question Palette Nodes
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += dt * 1.5;
        p.x += Math.sin(p.phase) * 0.2;

        if (p.y < -40) {
          p.y = height + 30;
          p.x = Math.random() * (width - 150) + 75;
        }
        if (p.x < -50) p.x = width + 50;
        if (p.x > width + 50) p.x = -50;

        const palette = colors[p.type] || colors.neutral;
        const w = p.w;
        const h = 26;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Box
        ctx.fillStyle = palette.bg;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 6);
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.font = '700 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = palette.text;
        ctx.fillText(p.label, 0, 0);

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
