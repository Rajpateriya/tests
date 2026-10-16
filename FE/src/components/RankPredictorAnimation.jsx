import React, { useEffect, useRef } from 'react';

/**
 * RankPredictorAnimation
 * A statistical normal distribution bell curve & AIR percentile trajectory ambient background.
 * 
 * Features:
 * - Luminous Gaussian bell curve showing All-India score distribution.
 * - Sweeping radar percentile scan beam passing across cutoffs.
 * - Key percentile milestone nodes: [ AIR #1 (99.98%ile) ], [ AIR Top 50 ], [ 99.0% Cutoff ], [ Median (50%ile) ].
 * - Dynamic candidate score scatter dots that shimmer along the probability curve.
 * - Target crosshair reticles & percentile altitude grid.
 * - Fully reactive to Light / Dark mode with zero CPU overhead when off-screen.
 */
export const RankPredictorAnimation = ({ className = '', opacity = 1 }) => {
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

    // Scatter candidate score dots along Gaussian curve
    const DOT_COUNT = 45;
    const dots = Array.from({ length: DOT_COUNT }, () => {
      // Box-Muller transform for normal distribution
      const u = Math.random();
      const v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u || 0.001)) * Math.cos(2.0 * Math.PI * v);
      return {
        zScore: z, // mean 0, std dev 1
        speed: (Math.random() - 0.5) * 0.002,
        pulse: Math.random() * Math.PI * 2,
        size: Math.random() * 2 + 1.8,
      };
    });

    let scanX = 0;
    let scanDirection = 1;
    let lastTime = performance.now();

    const render = (time) => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Scan beam motion
      scanX += dt * 90 * scanDirection;
      if (scanX > width) {
        scanX = width;
        scanDirection = -1;
      } else if (scanX < 0) {
        scanX = 0;
        scanDirection = 1;
      }

      ctx.clearRect(0, 0, width, height);

      const colors = isDark
        ? {
            bellFill: 'rgba(56, 189, 248, 0.08)',
            bellStroke: '#38bdf8',
            bellGlow: 'rgba(56, 189, 248, 0.35)',
            grid: 'rgba(56, 189, 248, 0.05)',
            dot: '#34d399',
            dotGlow: 'rgba(52, 211, 153, 0.6)',
            scanLine: 'rgba(56, 189, 248, 0.35)',
            badgeBg: 'rgba(15, 23, 42, 0.85)',
            badgeBorder: '#38bdf8',
            badgeText: '#e0f2fe',
            badgeSub: '#94a3b8',
          }
        : {
            bellFill: 'rgba(2, 132, 199, 0.06)',
            bellStroke: '#0284c7',
            bellGlow: 'rgba(2, 132, 199, 0.25)',
            grid: 'rgba(2, 132, 199, 0.05)',
            dot: '#059669',
            dotGlow: 'rgba(5, 150, 105, 0.4)',
            scanLine: 'rgba(2, 132, 199, 0.30)',
            badgeBg: 'rgba(255, 255, 255, 0.92)',
            badgeBorder: '#0284c7',
            badgeText: '#0369a1',
            badgeSub: '#64748b',
          };

      ctx.globalAlpha = opacity;

      // 1. Draw Statistical Horizon & Reference Lines
      const baselineY = height * 0.84;
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = colors.grid;

      // Horizontal percentile lines
      const yStep = height * 0.16;
      for (let y = baselineY; y > height * 0.15; y -= yStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical standard deviation grid (μ, ±1σ, ±2σ, ±3σ)
      const meanX = width * 0.5;
      const sigma = width * 0.15;
      for (let s = -3; s <= 3; s++) {
        const sx = meanX + s * sigma;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
      }

      // 2. Compute and Draw Gaussian Bell Curve
      const getGaussianY = (x) => {
        const z = (x - meanX) / sigma;
        const amplitude = height * 0.58;
        return baselineY - amplitude * Math.exp(-0.5 * z * z);
      };

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      for (let x = 0; x <= width; x += 4) {
        ctx.lineTo(x, getGaussianY(x));
      }
      ctx.lineTo(width, baselineY);
      ctx.closePath();
      ctx.fillStyle = colors.bellFill;
      ctx.fill();

      // Glowing Curve Outline
      ctx.shadowColor = colors.bellGlow;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = colors.bellStroke;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const y = getGaussianY(x);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // 3. Draw Radar Vertical Scan Beam with Gradient
      ctx.save();
      const grad = ctx.createLinearGradient(scanX - 30, 0, scanX + 30, 0);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, colors.scanLine);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.fillRect(scanX - 30, 0, 60, baselineY);

      ctx.strokeStyle = colors.bellStroke;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, baselineY);
      ctx.stroke();

      // Point of intersection on bell curve
      const scanIntersectY = getGaussianY(scanX);
      ctx.fillStyle = colors.bellStroke;
      ctx.shadowColor = colors.bellGlow;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(scanX, scanIntersectY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4. Draw Shimmering Candidate Score Scatter Dots
      for (const dot of dots) {
        dot.zScore += dot.speed;
        if (dot.zScore > 3.2) dot.zScore = -3.2;
        if (dot.zScore < -3.2) dot.zScore = 3.2;

        dot.pulse += dt * 2.5;
        const dx = meanX + dot.zScore * sigma;
        const baseY = getGaussianY(dx);
        const dy = baseY + (Math.sin(dot.pulse) * 8);

        ctx.save();
        ctx.fillStyle = colors.dot;
        ctx.shadowColor = colors.dotGlow;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(dx, dy, dot.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Draw Key Percentile Milestone Badges
      const MILESTONES = [
        { label: '★ AIR #1', sub: '99.98%ile', x: meanX + 2.5 * sigma, y: getGaussianY(meanX + 2.5 * sigma) - 24 },
        { label: 'TOP 50', sub: '99.2%ile', x: meanX + 1.8 * sigma, y: getGaussianY(meanX + 1.8 * sigma) - 22 },
        { label: 'MEDIAN', sub: '50.0%ile', x: meanX, y: getGaussianY(meanX) - 26 },
        { label: 'QUALIFIED', sub: 'CUTOFF', x: meanX + 1.0 * sigma, y: getGaussianY(meanX + 1.0 * sigma) - 22 },
      ];

      for (const m of MILESTONES) {
        const mw = 74;
        const mh = 26;

        ctx.save();
        ctx.translate(m.x, m.y);

        // Leader hairline down to curve
        ctx.strokeStyle = colors.badgeBorder;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, mh / 2);
        ctx.lineTo(0, mh / 2 + 16);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge Box
        ctx.fillStyle = colors.badgeBg;
        ctx.strokeStyle = colors.badgeBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-mw / 2, -mh / 2, mw, mh, 5);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 8.5px ui-monospace, SFMono-Regular, monospace';
        ctx.fillStyle = colors.badgeText;
        ctx.fillText(m.label, 0, -3);

        ctx.font = '600 7px ui-sans-serif, system-ui, sans-serif';
        ctx.fillStyle = colors.badgeSub;
        ctx.fillText(m.sub, 0, 6);

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
