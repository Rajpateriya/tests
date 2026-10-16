import React, { useEffect, useRef } from 'react';

/**
 * BlueprintSchematicAnimation
 * An architectural engineering blueprint animation tailored for the Exam Blueprints section.
 * 
 * Features:
 * - Technical CAD / architectural blueprint grid with coordinate crosshairs and millimeter tick marks.
 * - Examination blueprint workflow stages:
 *   [ Tier-I Prelims ] ──> [ Tier-II Mains ] ──> [ Skill & DEST ] ──> [ Merit Validation ]
 * - Glowing laser vector arcs between National Examination Boards (SSC, IBPS, RRB, PSC).
 * - Caliper measurement brackets, rotating drafting compass circles, and traveling data photons.
 * - Dynamic Light / Dark mode blueprint theme (cyan/cobalt/blueprint aesthetic).
 * - GPU-accelerated canvas with auto-pausing via IntersectionObserver.
 */
export const BlueprintSchematicAnimation = ({ className = '', opacity = 1 }) => {
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

    // Blueprint Nodes representing Exam Stages & Technical Calipers
    const BLUEPRINT_NODES = [
      { label: 'TIER-I CBT', sub: 'SPEED & ACCURACY', xRel: 0.14, yRel: 0.35, code: 'MOD-01' },
      { label: 'TIER-II CORE', sub: 'IN-DEPTH DOMAIN', xRel: 0.38, yRel: 0.65, code: 'MOD-02' },
      { label: 'TYPING & DEST', sub: 'MECHANICAL SPEED', xRel: 0.62, yRel: 0.32, code: 'MOD-03' },
      { label: 'ALL-INDIA MERIT', sub: 'PERCENTILE RANK', xRel: 0.86, yRel: 0.62, code: 'MOD-04' },
      { label: 'SSC CGL BLUEPRINT', sub: '100Q / 200M', xRel: 0.26, yRel: 0.18, code: 'SPEC-A' },
      { label: 'IBPS / SBI PO', sub: 'SECTIONAL CUTOFF', xRel: 0.50, yRel: 0.82, code: 'SPEC-B' },
      { label: 'RRB NTPC CBT-2', sub: '120Q / 90MIN', xRel: 0.74, yRel: 0.18, code: 'SPEC-C' },
    ];

    // Traveling photons along blueprint schematic routes
    const PHOTON_ROUTES = [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 4, to: 0 },
      { from: 1, to: 5 },
      { from: 2, to: 6 },
      { from: 6, to: 3 },
    ];

    const photons = PHOTON_ROUTES.map((route, i) => ({
      ...route,
      progress: (i / PHOTON_ROUTES.length),
      speed: Math.random() * 0.0035 + 0.002,
    }));

    // Drafting compass circles that slowly rotate
    let compassAngle = 0;
    let lastTime = performance.now();

    const render = (time) => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      compassAngle += dt * 0.15;

      ctx.clearRect(0, 0, width, height);

      const colors = isDark
        ? {
            grid: 'rgba(56, 189, 248, 0.06)',
            gridSub: 'rgba(56, 189, 248, 0.03)',
            line: 'rgba(56, 189, 248, 0.28)',
            nodeBorder: '#38bdf8',
            nodeBg: 'rgba(15, 23, 42, 0.80)',
            text: '#e0f2fe',
            subText: '#94a3b8',
            photon: '#38bdf8',
            photonGlow: 'rgba(56, 189, 248, 0.6)',
            compass: 'rgba(56, 189, 248, 0.12)',
          }
        : {
            grid: 'rgba(2, 132, 199, 0.07)',
            gridSub: 'rgba(2, 132, 199, 0.035)',
            line: 'rgba(2, 132, 199, 0.26)',
            nodeBorder: '#0284c7',
            nodeBg: 'rgba(255, 255, 255, 0.90)',
            text: '#0369a1',
            subText: '#64748b',
            photon: '#0284c7',
            photonGlow: 'rgba(2, 132, 199, 0.5)',
            compass: 'rgba(2, 132, 199, 0.10)',
          };

      ctx.globalAlpha = opacity;

      // 1. Draw Technical Drafting Grid
      const gridSize = 40;
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = colors.grid;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Millimeter Tick Marks along the top & bottom
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 10) {
        const tickH = x % 50 === 0 ? 8 : 4;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, tickH);
        ctx.moveTo(x, height);
        ctx.lineTo(x, height - tickH);
      }
      ctx.stroke();

      // 2. Rotating Drafting Compass Geometry at Center-Right
      const cx = width * 0.78;
      const cy = height * 0.5;
      const cr = Math.min(width, height) * 0.35;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(compassAngle);
      ctx.strokeStyle = colors.compass;
      ctx.lineWidth = 1.2;

      // Outer calibrated circle
      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, Math.PI * 2);
      ctx.stroke();

      // Inner concentric arc
      ctx.beginPath();
      ctx.arc(0, 0, cr * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // Compass Crosshairs
      ctx.beginPath();
      ctx.moveTo(-cr * 1.1, 0);
      ctx.lineTo(cr * 1.1, 0);
      ctx.moveTo(0, -cr * 1.1);
      ctx.lineTo(0, cr * 1.1);
      ctx.stroke();
      ctx.restore();

      // 3. Draw Blueprint Schematic Vector Connection Traces
      const nodeCoords = BLUEPRINT_NODES.map((n) => ({
        x: n.xRel * width,
        y: n.yRel * height,
        node: n,
      }));

      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      for (const route of PHOTON_ROUTES) {
        const from = nodeCoords[route.from];
        const to = nodeCoords[route.to];
        if (!from || !to) continue;

        ctx.strokeStyle = colors.line;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 4. Update & Draw Traveling Data Photons
      for (const p of photons) {
        p.progress += p.speed;
        if (p.progress >= 1) p.progress = 0;

        const from = nodeCoords[p.from];
        const to = nodeCoords[p.to];
        if (!from || !to) continue;

        const px = from.x + (to.x - from.x) * p.progress;
        const py = from.y + (to.y - from.y) * p.progress;

        ctx.save();
        ctx.fillStyle = colors.photon;
        ctx.shadowColor = colors.photonGlow;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Draw Blueprint Stage Nodes (Technical Pill Modules)
      for (const nc of nodeCoords) {
        const { x, y, node } = nc;
        const nw = 110;
        const nh = 32;

        ctx.save();
        ctx.translate(x, y);

        // Technical Reticle Crosshair Behind Node
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-nw / 2 - 12, 0);
        ctx.lineTo(-nw / 2, 0);
        ctx.moveTo(nw / 2, 0);
        ctx.lineTo(nw / 2 + 12, 0);
        ctx.stroke();

        // Node Box
        ctx.fillStyle = colors.nodeBg;
        ctx.strokeStyle = colors.nodeBorder;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-nw / 2, -nh / 2, nw, nh, 6);
        ctx.fill();
        ctx.stroke();

        // Corner Technical Calipers
        ctx.fillStyle = colors.nodeBorder;
        ctx.fillRect(-nw / 2, -nh / 2, 4, 1.5);
        ctx.fillRect(-nw / 2, -nh / 2, 1.5, 4);
        ctx.fillRect(nw / 2 - 4, nh / 2 - 1.5, 4, 1.5);
        ctx.fillRect(nw / 2 - 1.5, nh / 2 - 4, 1.5, 4);

        // Text Labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 9px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';
        ctx.fillStyle = colors.text;
        ctx.fillText(node.label, 0, -4);

        ctx.font = '600 7px ui-sans-serif, system-ui, sans-serif';
        ctx.fillStyle = colors.subText;
        ctx.fillText(node.sub, 0, 7);

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
