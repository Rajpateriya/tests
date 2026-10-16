import React, { useEffect, useRef, useState } from 'react';

/**
 * GlobalGlobeAnimation
 * A high-performance, GPU-accelerated HTML5 Canvas 3D rotating globe animation.
 * Features:
 * - 3D spherical projection with latitude/longitude mesh and surface particle matrix
 * - Real geographic examination & academic coordination hubs with pulsing radar rings
 * - Dynamic elevated bezier flight/communication arcs with traveling energy photons
 * - Atmospheric orbital halo and orbital satellite telemetry ring
 * - Smooth mouse parallax tilt & momentum
 * - Dark & Light mode dynamic color palette
 * - Auto-pausing via IntersectionObserver when offscreen for zero CPU/battery drain
 * - Fully responsive across mobile, tablet, and widescreen viewports
 */
export const GlobalGlobeAnimation = ({ className = '' }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let isVisible = true;
    let isDark = document.documentElement.classList.contains('dark');

    // Observer for dark mode class changes
    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark');
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Handle high-DPI scaling & responsive resizing
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;

    const updateDimensions = () => {
      if (!container || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
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

    // Pause animation when offscreen
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

    // -------------------------------------------------------------
    // Globe Mathematical Setup
    // -------------------------------------------------------------
    // Global and National Academic Hubs (lat in deg, lon in deg)
    const HUBS = [
      { name: 'New Delhi (HQ)', lat: 28.6139, lon: 77.209, isPrimary: true },
      { name: 'Prayagraj Node', lat: 25.4358, lon: 81.8463 },
      { name: 'Bengaluru Tech', lat: 12.9716, lon: 77.5946 },
      { name: 'Mumbai Western', lat: 19.076, lon: 72.8777 },
      { name: 'Kolkata Eastern', lat: 22.5726, lon: 88.3639 },
      { name: 'Hyderabad Telemetry', lat: 17.385, lon: 78.4867 },
      { name: 'Patna Regional', lat: 25.5941, lon: 85.1376 },
      { name: 'London Gateway', lat: 51.5074, lon: -0.1278 },
      { name: 'Singapore Cloud', lat: 1.3521, lon: 103.8198 },
      { name: 'Dubai Relay', lat: 25.2048, lon: 55.2708 },
    ];

    // Connection routes between hubs (fromIndex -> toIndex)
    const ROUTES = [
      { from: 0, to: 1, speed: 0.007 }, // Delhi -> Prayagraj
      { from: 0, to: 2, speed: 0.005 }, // Delhi -> Bengaluru
      { from: 0, to: 3, speed: 0.006 }, // Delhi -> Mumbai
      { from: 0, to: 4, speed: 0.005 }, // Delhi -> Kolkata
      { from: 0, to: 6, speed: 0.008 }, // Delhi -> Patna
      { from: 2, to: 5, speed: 0.006 }, // Bengaluru -> Hyderabad
      { from: 0, to: 8, speed: 0.004 }, // Delhi -> Singapore
      { from: 0, to: 7, speed: 0.003 }, // Delhi -> London
      { from: 3, to: 9, speed: 0.005 }, // Mumbai -> Dubai
    ];

    // Generate uniform Fibonacci sphere surface particle matrix
    const DOT_COUNT = 380;
    const surfaceDots = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < DOT_COUNT; i++) {
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / DOT_COUNT);
      surfaceDots.push({
        lat: 90 - (phi * 180) / Math.PI,
        lon: ((theta * 180) / Math.PI) % 360,
        size: Math.random() * 1.2 + 0.9,
      });
    }

    // Latitude & Longitude wireframe grid curves
    const LAT_STEPS = [-60, -40, -20, 0, 20, 40, 60];
    const LON_STEPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    // Animation state
    let rotationY = 1.1; // Initial rotation angle
    let targetRotationSpeed = 0.0035;
    let currentRotationSpeed = 0.0035;
    let tiltX = 0.38; // Axial tilt ~22 degrees
    let targetTiltX = 0.38;
    let mouseX = 0;
    let mouseY = 0;
    let mouseActive = false;

    // Track mouse interactions on container
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseX = normX;
      mouseY = normY;
      mouseActive = true;
      targetRotationSpeed = 0.0035 + normX * 0.003;
      targetTiltX = 0.38 + normY * 0.15;
    };

    const handleMouseLeave = () => {
      mouseActive = false;
      targetRotationSpeed = 0.0035;
      targetTiltX = 0.38;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Route pulse progress trackers
    const routeProgress = ROUTES.map((_, i) => ({
      t: (i * 0.23) % 1.0,
      active: true,
    }));

    // 3D Spherical projection helpers
    const project = (lat, lon, radius, cx, cy) => {
      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180 + rotationY;

      // 3D coordinates on sphere
      const x = radius * Math.cos(latRad) * Math.sin(lonRad);
      const y = -radius * Math.sin(latRad);
      const z = radius * Math.cos(latRad) * Math.cos(lonRad);

      // Rotate around X axis by tiltX
      const cosT = Math.cos(tiltX);
      const sinT = Math.sin(tiltX);
      const y2 = y * cosT - z * sinT;
      const z2 = y * sinT + z * cosT;

      // Weak perspective projection
      const cameraDist = radius * 3.5;
      const perspective = cameraDist / (cameraDist + z2);

      return {
        x: cx + x * perspective,
        y: cy + y2 * perspective,
        z: z2,
        visible: z2 > -radius * 0.25,
        alpha: Math.max(0, (z2 + radius * 0.5) / (radius * 1.5)),
        scale: perspective,
      };
    };

    let lastTime = performance.now();

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

      // Smooth damping
      currentRotationSpeed += (targetRotationSpeed - currentRotationSpeed) * 0.05;
      tiltX += (targetTiltX - tiltX) * 0.05;
      rotationY += currentRotationSpeed;

      ctx.clearRect(0, 0, width, height);

      // Color scheme adapts seamlessly to theme
      const colors = isDark
        ? {
            meshBack: 'rgba(56, 189, 248, 0.08)',
            meshFront: 'rgba(56, 189, 248, 0.22)',
            dotBack: 'rgba(99, 102, 241, 0.15)',
            dotFront: 'rgba(56, 189, 248, 0.55)',
            primaryHub: '#38bdf8',
            secondaryHub: '#818cf8',
            arc: 'rgba(56, 189, 248, 0.40)',
            photon: '#38bdf8',
            halo1: 'rgba(14, 165, 233, 0.18)',
            halo2: 'rgba(99, 102, 241, 0.08)',
            orbitRing: 'rgba(56, 189, 248, 0.20)',
            satellite: '#10b981',
          }
        : {
            meshBack: 'rgba(2, 132, 199, 0.07)',
            meshFront: 'rgba(2, 132, 199, 0.20)',
            dotBack: 'rgba(79, 70, 229, 0.12)',
            dotFront: 'rgba(2, 132, 199, 0.52)',
            primaryHub: '#0284c7',
            secondaryHub: '#6366f1',
            arc: 'rgba(2, 132, 199, 0.35)',
            photon: '#0284c7',
            halo1: 'rgba(2, 132, 199, 0.14)',
            halo2: 'rgba(79, 70, 229, 0.06)',
            orbitRing: 'rgba(2, 132, 199, 0.18)',
            satellite: '#059669',
          };

      // Responsive globe positioning:
      // On desktop (lg+), place it majestically centered or slightly toward the top/center
      // On mobile/tablet, centered with proportional radius
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      
      const radius = isMobile
        ? Math.min(width, height) * 0.36
        : isTablet
        ? Math.min(width, height) * 0.38
        : Math.min(width * 0.32, height * 0.45, 340);

      // Center calculation: nicely aligned behind the grievance card & directory
      const cx = isMobile
        ? width * 0.5
        : isTablet
        ? width * 0.5
        : width * 0.52;
      const cy = isMobile
        ? height * 0.52
        : height * 0.50;

      // 1. Soft atmospheric planetary aura
      const auraGradient = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 1.4);
      auraGradient.addColorStop(0, colors.halo1);
      auraGradient.addColorStop(0.65, colors.halo2);
      auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Outer Orbital Satellite Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.25);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.25, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.strokeStyle = colors.orbitRing;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();

      // Orbiting telemetry satellite point
      const satAngle = time * 0.0012;
      const satX = Math.cos(satAngle) * radius * 1.25;
      const satY = Math.sin(satAngle) * radius * 0.42;
      ctx.fillStyle = colors.satellite;
      ctx.shadowColor = colors.satellite;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(satX, satY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 3. Draw Longitude Wireframe Ribs
      LON_STEPS.forEach((lon) => {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 6) {
          const p = project(lat, lon, radius, cx, cy);
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.strokeStyle = colors.meshFront;
        ctx.lineWidth = 0.75;
        ctx.stroke();
      });

      // 4. Draw Latitude Wireframe Rings
      LAT_STEPS.forEach((lat) => {
        ctx.beginPath();
        let first = true;
        for (let lon = 0; lon <= 360; lon += 6) {
          const p = project(lat, lon, radius, cx, cy);
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = lat === 0 ? colors.meshFront : colors.meshBack;
        ctx.lineWidth = lat === 0 ? 1.2 : 0.65;
        ctx.stroke();
      });

      // 5. Draw Surface Dots (Matrix)
      surfaceDots.forEach((d) => {
        const p = project(d.lat, d.lon, radius, cx, cy);
        if (p.z > -radius * 0.7) {
          ctx.beginPath();
          const r = p.z > 0 ? d.size * p.scale : d.size * 0.7;
          ctx.arc(p.x, p.y, Math.max(0.6, r), 0, Math.PI * 2);
          ctx.fillStyle = p.z > 0 ? colors.dotFront : colors.dotBack;
          ctx.fill();
        }
      });

      // 6. Draw Flight/Communication Arcs & Moving Photons
      ROUTES.forEach((route, idx) => {
        const fromHub = HUBS[route.from];
        const toHub = HUBS[route.to];
        const p1 = project(fromHub.lat, fromHub.lon, radius, cx, cy);
        const p2 = project(toHub.lat, toHub.lon, radius, cx, cy);

        // Only draw if at least one node is in the front hemisphere
        if (p1.z > -radius * 0.3 || p2.z > -radius * 0.3) {
          // Calculate midpoint elevated into space for the 3D arc
          const midLat = (fromHub.lat + toHub.lat) / 2;
          const midLon = (fromHub.lon + toHub.lon) / 2;
          // Arc elevation: 20% higher than surface
          const pMid = project(midLat, midLon, radius * 1.28, cx, cy);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.quadraticCurveTo(pMid.x, pMid.y, p2.x, p2.y);
          ctx.strokeStyle = colors.arc;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();

          // Animate traveling photon along the quadratic bezier curve
          const prog = routeProgress[idx];
          prog.t = (prog.t + route.speed) % 1.0;
          const t = prog.t;

          // Quadratic Bezier formula: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
          const bx = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * pMid.x + t * t * p2.x;
          const by = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * pMid.y + t * t * p2.y;

          ctx.save();
          ctx.shadowColor = colors.photon;
          ctx.shadowBlur = 10;
          ctx.fillStyle = colors.photon;
          ctx.beginPath();
          ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // 7. Draw Academic Support Hubs & Radar Pulse Rings
      HUBS.forEach((hub, idx) => {
        const p = project(hub.lat, hub.lon, radius, cx, cy);
        if (p.z > 0) {
          const hubColor = hub.isPrimary ? colors.primaryHub : colors.secondaryHub;

          // Expanding radar ripple ring
          const pulsePhase = (time * 0.002 + idx * 0.4) % 1;
          const pulseR = 3 + pulsePhase * 16;
          const pulseAlpha = Math.max(0, 1 - pulsePhase) * (p.alpha || 0.8);

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = isDark
            ? `rgba(56, 189, 248, ${pulseAlpha * 0.8})`
            : `rgba(2, 132, 199, ${pulseAlpha * 0.8})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Hub core point
          ctx.shadowColor = hubColor;
          ctx.shadowBlur = 12;
          ctx.fillStyle = hubColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, hub.isPrimary ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Hub Name Tag for Primary Hub (New Delhi HQ) on larger screens
          if (hub.isPrimary && !isMobile && p.z > radius * 0.2) {
            ctx.save();
            ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
            ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
            ctx.fillText('• HQ (Delhi)', p.x + 8, p.y - 4);
            ctx.restore();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
};
