import React, { useEffect, useRef } from 'react';

/**
 * TypingAlphabetsAnimation
 * An ultra-modern, high-fidelity mechanical keyboard & typing speed telemetry ambient background.
 * 
 * Visually features:
 * 1. 3D Mechanical Keycaps:
 *    - Chamfered keycap tiles with tactile depth, bevel borders, switch stems, and LED backlighting.
 *    - Relatable mechanical legends: [ESC], [TAB ⇥], [CAPS], [SHIFT ⇧], [CTRL], [SPACE ␣], [ENTER ↵],
 *      [DEL ⌫], [FN], Arrow keys [▲, ▼, ◄, ►], home-row tactile bar keys [F -] & [J -],
 *      gaming cluster [W, A, S, D], and code/exam syntax [{ }, </>, fn(), const, 99.8%].
 * 2. Live Speed Telemetry Capsules:
 *    - Floating illuminated metric badges: "⚡ 124 WPM", "🎯 99.8% ACC", "⏱️ 14ms LATENCY",
 *      "📊 480 CPM", "★ ALL-INDIA RANK #1", "CBT TIER-II QUALIFIED".
 * 3. PCB Keyboard Matrix Circuits:
 *    - High-tech glowing copper/neon circuit board trace lines connecting nearby keys with traveling electron packets.
 * 4. Rhythm Equalizer / Typing Cadence Soundwaves:
 *    - Subtle pulsing frequency bars along the bottom simulating rhythmic keystrokes.
 * 5. Interactive Keystroke Shockwaves:
 *    - Physical keyboard typing or mouse interaction releases luminous shockwaves and mechanical switch spark bursts.
 * 6. Responsive, retina-ready, GPU-accelerated canvas with auto-pausing via IntersectionObserver.
 */
export const TypingAlphabetsAnimation = ({
  className = '',
  variant = 'full', // 'full' | 'card' | 'dense'
  interactive = true,
  opacity = 1,
}) => {
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

    // Theme observer
    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark');
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;

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

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    // Pause when off-screen
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
      { rootMargin: '120px' }
    );
    intersectionObserver.observe(container);

    // -------------------------------------------------------------
    // Mechanical Keycap & Telemetry Definitions
    // -------------------------------------------------------------
    const KEY_ITEMS = [
      // Standard alphas & special keys
      { type: 'key', label: 'ESC', sub: 'exit', width: 44, color: 'sky' },
      { type: 'key', label: 'TAB', sub: '⇥', width: 48, color: 'indigo' },
      { type: 'key', label: 'CTRL', sub: 'cmd', width: 46, color: 'purple' },
      { type: 'key', label: 'SHIFT', sub: '⇧', width: 56, color: 'emerald' },
      { type: 'key', label: 'ENTER', sub: '↵', width: 54, color: 'amber' },
      { type: 'key', label: 'SPACE', sub: '␣', width: 72, color: 'sky' },
      { type: 'key', label: 'DEL', sub: '⌫', width: 44, color: 'purple' },
      { type: 'key', label: 'ALT', sub: 'opt', width: 42, color: 'indigo' },
      { type: 'key', label: 'W', sub: 'up', width: 36, color: 'sky' },
      { type: 'key', label: 'A', sub: 'left', width: 36, color: 'sky' },
      { type: 'key', label: 'S', sub: 'down', width: 36, color: 'sky' },
      { type: 'key', label: 'D', sub: 'right', width: 36, color: 'sky' },
      { type: 'key', label: 'F', sub: '— home', width: 38, color: 'emerald', isHomeRow: true },
      { type: 'key', label: 'J', sub: '— home', width: 38, color: 'emerald', isHomeRow: true },
      { type: 'key', label: 'K', sub: 'char', width: 36, color: 'indigo' },
      { type: 'key', label: 'P', sub: 'print', width: 36, color: 'purple' },
      { type: 'key', label: '▲', sub: 'nav', width: 34, color: 'emerald' },
      { type: 'key', label: '▼', sub: 'nav', width: 34, color: 'emerald' },
      { type: 'key', label: '◄', sub: 'nav', width: 34, color: 'emerald' },
      { type: 'key', label: '►', sub: 'nav', width: 34, color: 'emerald' },
      { type: 'key', label: '{ }', sub: 'code', width: 40, color: 'indigo' },
      { type: 'key', label: '</>', sub: 'xml', width: 40, color: 'sky' },
      { type: 'key', label: 'fn()', sub: 'call', width: 42, color: 'purple' },
      { type: 'key', label: 'const', sub: 'def', width: 46, color: 'amber' },
      // Telemetry Metric Badges
      { type: 'badge', label: '⚡ 124 WPM', sub: 'SPEED', width: 88, color: 'amber' },
      { type: 'badge', label: '🎯 99.8% ACC', sub: 'ACCURACY', width: 94, color: 'emerald' },
      { type: 'badge', label: '⏱️ 14ms', sub: 'LATENCY', width: 78, color: 'sky' },
      { type: 'badge', label: '📊 480 CPM', sub: 'CADENCE', width: 86, color: 'purple' },
      { type: 'badge', label: '★ AIR #1', sub: 'PERCENTILE', width: 84, color: 'amber' },
      { type: 'badge', label: 'TIER-II CBT', sub: 'STANDARD', width: 92, color: 'indigo' },
    ];

    const count = variant === 'card' ? 18 : variant === 'dense' ? 36 : 26;

    const createParticle = (initialY = null) => {
      const template = KEY_ITEMS[Math.floor(Math.random() * KEY_ITEMS.length)];
      const depth = Math.random() * 0.6 + 0.4; // 0.4 to 1.0 depth scale
      const scale = depth;

      return {
        ...template,
        x: Math.random() * (width - 100) + 50,
        y: initialY !== null ? initialY : Math.random() * (height - 60) + 30,
        vx: (Math.random() - 0.5) * 0.45 * depth,
        vy: -(Math.random() * 0.38 + 0.22) * depth, // gentle upward drift
        rot: (Math.random() - 0.5) * 0.25, // subtle tilt in radians
        vRot: (Math.random() - 0.5) * 0.002,
        scale,
        depth,
        phase: Math.random() * Math.PI * 2,
        floatFreq: Math.random() * 0.0018 + 0.001,
        floatAmp: Math.random() * 10 + 6,
        alpha: Math.random() * 0.25 + 0.65, // Bright, clearly visible (0.65 to 0.90)
        pulse: Math.random() * Math.PI,
        w: template.width * scale,
        h: (template.type === 'badge' ? 24 : 36) * scale,
      };
    };

    const particles = Array.from({ length: count }, () => createParticle());

    // Circuit electron pulses traveling along connection lines
    const electrons = [];
    const addElectron = (p1, p2, color) => {
      electrons.push({
        p1,
        p2,
        progress: 0,
        speed: Math.random() * 0.015 + 0.01,
        color,
      });
    };

    // Expanding shockwaves & mechanical switch click rings
    const shockwaves = [];
    const addShockwave = (x, y, color = '#38bdf8') => {
      shockwaves.push({
        x,
        y,
        radius: 6,
        maxRadius: Math.random() * 60 + 50,
        alpha: 0.8,
        color,
      });
    };

    // Burst keystrokes from real-time typing
    const burstKeys = [];
    const addBurstKey = (keyChar) => {
      const label = keyChar && keyChar.length === 1 ? keyChar.toUpperCase() : '⚡';
      const startX = width * 0.5 + (Math.random() - 0.5) * (width * 0.5);
      const startY = height * 0.72 + (Math.random() - 0.5) * 60;

      burstKeys.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -(Math.random() * 2.5 + 2.0),
        rot: (Math.random() - 0.5) * 0.6,
        vRot: (Math.random() - 0.5) * 0.03,
        label,
        sub: 'PRESS',
        w: 42,
        h: 40,
        color: 'sky',
        alpha: 1.0,
        life: 1.0,
        decay: 0.012,
      });

      addShockwave(startX, startY, isDark ? '#38bdf8' : '#0284c7');
    };

    // Equalizer bars along bottom
    const EQ_BAR_COUNT = 32;
    const eqBars = Array.from({ length: EQ_BAR_COUNT }, (_, i) => ({
      baseHeight: Math.sin((i / EQ_BAR_COUNT) * Math.PI) * 18 + 6,
      currentHeight: 10,
      targetHeight: 12,
      freq: Math.random() * 0.005 + 0.002,
      phase: i * 0.25,
    }));

    // Mouse parallax tracking
    let mouseX = -9999;
    let mouseY = -9999;
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      container.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    }

    // Physical key listener
    const handleKeyDown = (e) => {
      if (['Control', 'Shift', 'Alt', 'Meta', 'Tab', 'Escape'].includes(e.key)) return;
      if (burstKeys.length < 15) {
        addBurstKey(e.key);
      }
    };

    if (interactive) {
      window.addEventListener('keydown', handleKeyDown, { passive: true });
    }

    let lastTime = performance.now();
    let ambientTimer = 0;

    // -------------------------------------------------------------
    // Main Render Loop
    // -------------------------------------------------------------
    const render = (time) => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Ambient pulse trigger
      ambientTimer += dt;
      if (ambientTimer > 3.0 && shockwaves.length < 3) {
        ambientTimer = 0;
        const p = particles[Math.floor(Math.random() * particles.length)];
        if (p) addShockwave(p.x, p.y, isDark ? '#38bdf8' : '#0284c7');
      }

      // Palette resolution
      const themeColors = isDark
        ? {
            sky: { border: '#38bdf8', bg: 'rgba(14, 165, 233, 0.18)', text: '#e0f2fe', glow: 'rgba(56, 189, 248, 0.35)' },
            indigo: { border: '#818cf8', bg: 'rgba(99, 102, 241, 0.18)', text: '#e0e7ff', glow: 'rgba(129, 140, 248, 0.35)' },
            emerald: { border: '#34d399', bg: 'rgba(16, 185, 129, 0.18)', text: '#d1fae5', glow: 'rgba(52, 211, 153, 0.35)' },
            purple: { border: '#c084fc', bg: 'rgba(168, 85, 247, 0.18)', text: '#f3e8ff', glow: 'rgba(192, 132, 252, 0.35)' },
            amber: { border: '#fbbf24', bg: 'rgba(245, 158, 11, 0.20)', text: '#fef3c7', glow: 'rgba(251, 191, 36, 0.40)' },
            pcbLine: 'rgba(56, 189, 248, 0.16)',
            pcbNode: 'rgba(56, 189, 248, 0.45)',
            keycapBase: 'rgba(15, 23, 42, 0.75)',
            eqFill: 'rgba(56, 189, 248, 0.22)',
            eqBorder: 'rgba(56, 189, 248, 0.45)',
          }
        : {
            sky: { border: '#0284c7', bg: 'rgba(224, 242, 254, 0.85)', text: '#0369a1', glow: 'rgba(2, 132, 199, 0.25)' },
            indigo: { border: '#4f46e5', bg: 'rgba(238, 242, 255, 0.85)', text: '#3730a3', glow: 'rgba(79, 70, 229, 0.25)' },
            emerald: { border: '#059669', bg: 'rgba(209, 250, 229, 0.85)', text: '#047857', glow: 'rgba(5, 150, 105, 0.25)' },
            purple: { border: '#7c3aed', bg: 'rgba(243, 232, 255, 0.85)', text: '#6b21a8', glow: 'rgba(124, 58, 237, 0.25)' },
            amber: { border: '#d97706', bg: 'rgba(254, 243, 199, 0.90)', text: '#b45309', glow: 'rgba(217, 119, 6, 0.30)' },
            pcbLine: 'rgba(2, 132, 199, 0.14)',
            pcbNode: 'rgba(2, 132, 199, 0.35)',
            keycapBase: 'rgba(255, 255, 255, 0.92)',
            eqFill: 'rgba(2, 132, 199, 0.16)',
            eqBorder: 'rgba(2, 132, 199, 0.35)',
          };

      // -------------------------------------------------------------
      // 1. Draw Equalizer Typing Cadence Bars along Bottom Edge
      // -------------------------------------------------------------
      const barWidth = width / EQ_BAR_COUNT;
      ctx.save();
      for (let i = 0; i < EQ_BAR_COUNT; i++) {
        const bar = eqBars[i];
        bar.phase += bar.freq * dt * 1000;
        const target = bar.baseHeight + Math.sin(bar.phase) * (bar.baseHeight * 0.7);
        bar.currentHeight += (target - bar.currentHeight) * 0.1;

        const bx = i * barWidth;
        const bh = bar.currentHeight * (variant === 'card' ? 0.6 : 1.0);
        const by = height - bh;

        ctx.fillStyle = themeColors.eqFill;
        ctx.fillRect(bx + 2, by, barWidth - 4, bh);

        ctx.strokeStyle = themeColors.eqBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 2, by);
        ctx.lineTo(bx + barWidth - 2, by);
        ctx.stroke();
      }
      ctx.restore();

      // -------------------------------------------------------------
      // 2. Draw PCB Keyboard Matrix Circuits (Connecting nearby keys)
      // -------------------------------------------------------------
      const connectDist = Math.min(width, height) * 0.22;
      ctx.lineWidth = 1.0;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDist) {
            const alpha = (1 - dist / connectDist) * 0.35 * opacity;
            ctx.strokeStyle = isDark
              ? `rgba(56, 189, 248, ${alpha})`
              : `rgba(2, 132, 199, ${alpha})`;

            // Draw clean Manhattan / orthogonal 90-degree circuit traces
            const midX = (particles[i].x + particles[j].x) / 2;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(midX, particles[i].y);
            ctx.lineTo(midX, particles[j].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();

            // Circuit junction dots
            ctx.fillStyle = themeColors.pcbNode;
            ctx.fillRect(midX - 1.5, particles[i].y - 1.5, 3, 3);
            ctx.fillRect(midX - 1.5, particles[j].y - 1.5, 3, 3);

            // Chance to spawn electron pulse
            if (Math.random() < 0.003 && electrons.length < 8) {
              addElectron(particles[i], particles[j], isDark ? '#38bdf8' : '#0284c7');
            }
          }
        }
      }

      // Update & Draw traveling electron data packets
      for (let e = electrons.length - 1; e >= 0; e--) {
        const el = electrons[e];
        el.progress += el.speed;
        if (el.progress >= 1) {
          electrons.splice(e, 1);
          continue;
        }

        const midX = (el.p1.x + el.p2.x) / 2;
        let curX, curY;
        if (el.progress < 0.33) {
          const p = el.progress / 0.33;
          curX = el.p1.x + (midX - el.p1.x) * p;
          curY = el.p1.y;
        } else if (el.progress < 0.66) {
          const p = (el.progress - 0.33) / 0.33;
          curX = midX;
          curY = el.p1.y + (el.p2.y - el.p1.y) * p;
        } else {
          const p = (el.progress - 0.66) / 0.34;
          curX = midX + (el.p2.x - midX) * p;
          curY = el.p2.y;
        }

        ctx.save();
        ctx.fillStyle = el.color;
        ctx.shadowColor = el.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(curX, curY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // -------------------------------------------------------------
      // 3. Draw & Update Shockwaves
      // -------------------------------------------------------------
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const sw = shockwaves[s];
        sw.radius += 1.8;
        sw.alpha -= 0.016;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(s, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha * opacity;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Inner soft glow
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.7, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // -------------------------------------------------------------
      // 4. Draw Mechanical Keycaps & Badges (Floating Particles)
      // -------------------------------------------------------------
      const drawKeycap = (p, isBurst = false) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        const palette = themeColors[p.color] || themeColors.sky;
        const currentAlpha = (p.alpha || 0.8) * opacity;
        ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));

        const w = p.w;
        const h = p.h;
        const r = 6; // rounded corner radius

        // LED Underglow
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = isBurst ? 16 : 8;

        // 3D Extrusion Bottom Base (tactile mechanical depth)
        ctx.fillStyle = isDark ? 'rgba(2, 6, 23, 0.85)' : 'rgba(203, 213, 225, 0.95)';
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2 + 3, w, h, r);
        ctx.fill();

        // Keycap Face
        ctx.fillStyle = isDark ? themeColors.keycapBase : palette.bg;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, r);
        ctx.fill();

        // Keycap Border
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Inner Bevel Highlight
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3, r - 1);
        ctx.stroke();

        // Tactile Homing Bar for [F] and [J] keys
        if (p.isHomeRow) {
          ctx.fillStyle = palette.border;
          ctx.fillRect(-6, h / 2 - 6, 12, 1.8);
        }

        // Keycap Legend Text
        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (p.type === 'badge') {
          // Telemetry Pill Badge
          ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          ctx.fillStyle = palette.text;
          ctx.fillText(p.label, 0, 0);
        } else {
          // Standard Mechanical Key
          ctx.font = '800 11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          ctx.fillStyle = palette.text;
          const textY = p.sub ? -2 : 0;
          ctx.fillText(p.label, 0, textY);

          if (p.sub) {
            ctx.font = '600 7px ui-sans-serif, system-ui, sans-serif';
            ctx.fillStyle = isDark ? 'rgba(203, 213, 225, 0.65)' : 'rgba(71, 85, 105, 0.8)';
            ctx.fillText(p.sub, 0, 9);
          }
        }

        ctx.restore();
      };

      // Update & Draw floating particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Kinematics
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;

        // Sine wave gentle floating oscillation
        p.phase += p.floatFreq * dt * 1000;
        p.x += Math.sin(p.phase) * 0.15;

        // Gentle mouse repulsion
        if (mouseX > -1000 && mouseY > -1000) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 1) {
            const force = (1 - dist / 120) * 0.6;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        // Screen boundary recycling
        if (p.y < -50) {
          p.y = height + 30;
          p.x = Math.random() * (width - 100) + 50;
        }
        if (p.x < -60) p.x = width + 50;
        if (p.x > width + 60) p.x = -50;

        drawKeycap(p);
      }

      // Update & Draw reactive burst keys
      for (let b = burstKeys.length - 1; b >= 0; b--) {
        const bk = burstKeys[b];
        bk.x += bk.vx;
        bk.y += bk.vy;
        bk.rot += bk.vRot;
        bk.life -= bk.decay;
        bk.alpha = bk.life;

        if (bk.life <= 0) {
          burstKeys.splice(b, 1);
          continue;
        }

        drawKeycap(bk, true);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [variant, interactive, opacity]);

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
