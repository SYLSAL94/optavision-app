import React, { useMemo, useRef, useEffect } from 'react';
import { FootballPitch } from './FootballPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';

const SIMPLEHEAT_SRC = 'https://cdn.jsdelivr.net/npm/simpleheat@0.4.0/simpleheat.min.js';
const SIMPLEHEAT_SCRIPT_ID = 'simpleheat-script';
let simpleheatLoadPromise = null;

const extractEndCoordinates = (event) => {
  let metrics = event?.advanced_metrics || {};
  if (typeof metrics === 'string') {
    try { metrics = JSON.parse(metrics); } catch { metrics = {}; }
  }

  const ex = metrics.end_x ?? metrics.endX ?? event?.end_x ?? event?.endX;
  const ey = metrics.end_y ?? metrics.endY ?? event?.end_y ?? event?.endY;
  if (ex !== undefined && ey !== undefined && ex !== null && ey !== null) {
    return { x: parseFloat(ex), y: parseFloat(ey), value: event?.value || 1 };
  }

  const qualifiers = event?.qualifiers || [];
  if (Array.isArray(qualifiers)) {
    const qX = qualifiers.find(q => [140, 212].includes(Number(q.type_id || q.id)));
    const qY = qualifiers.find(q => [141, 213].includes(Number(q.type_id || q.id)));
    if (qX && qY) return { x: parseFloat(qX.value), y: parseFloat(qY.value), value: event?.value || 1 };
  }

  return null;
};

const getHeatmapSourcePoints = (event, mode) => {
  const startPoint = { x: event?.x, y: event?.y, value: event?.value || 1 };
  const endPoint = extractEndCoordinates(event);

  if (mode === 'end') return endPoint ? [endPoint] : [];
  if (mode === 'both') return endPoint ? [startPoint, endPoint] : [startPoint];
  return [startPoint];
};

/**
 * Assure le chargement de la librairie simpleheat (Zero-Régression logic)
 */
const ensureSimpleheat = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.simpleheat) return Promise.resolve(window.simpleheat);
  if (simpleheatLoadPromise) return simpleheatLoadPromise;
  
  simpleheatLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SIMPLEHEAT_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.simpleheat), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = SIMPLEHEAT_SCRIPT_ID;
    script.src = SIMPLEHEAT_SRC;
    script.async = true;
    script.onload = () => resolve(window.simpleheat);
    script.onerror = () => reject(new Error('Simpleheat load failed'));
    document.body.appendChild(script);
  });
  return simpleheatLoadPromise;
};

/**
 * TacticalPitch - Le nouveau moteur de rendu spatial unifié
 */
export const TacticalPitch = ({ 
  style = { grass: '#1a1a1a', line: '#333333', background: '#131313' },
  orientation = 'horizontal',
  view = 'full',
  heatmapData = [],
  heatmapMode = 'off',
  children,
  className = "",
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onClick
}) => {
  const { getPitchViewBox, projectPoint } = usePitchProjection(orientation);
  const pitchViewBox = useMemo(() => getPitchViewBox(view), [getPitchViewBox, view]);
  const viewBoxString = `${pitchViewBox.x} ${pitchViewBox.y} ${pitchViewBox.width} ${pitchViewBox.height}`;
  
  const heatmapCanvasRef = useRef(null);
  const heatmapInstanceRef = useRef(null);

  // Gestion de la Heatmap (Centralisation de la logique lourde)
  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    
    let cancelled = false;
    let resizeObserver = null;

    const syncCanvasToPitchViewport = () => {
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const scale = Math.min(rect.width / pitchViewBox.width, rect.height / pitchViewBox.height);
      const width = pitchViewBox.width * scale;
      const height = pitchViewBox.height * scale;
      const left = (rect.width - width) / 2;
      const top = (rect.height - height) / 2;

      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));

      return { dpr, scale };
    };

    const clearCanvas = () => {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };

    const drawHeatmap = () => {
      const { dpr, scale } = syncCanvasToPitchViewport();
      clearCanvas();
      if (heatmapMode === 'off' || !heatmapData.length) return;

      ensureSimpleheat().then(simpleheat => {
        if (cancelled || !simpleheat || !canvas) return;

        const points = heatmapData.flatMap(d => (
          getHeatmapSourcePoints(d, heatmapMode)
        )).map(d => {
          const p = projectPoint(d.x, d.y);
          if (!p) return null;
          const withinViewBox = p.x >= pitchViewBox.x
            && p.x <= pitchViewBox.x + pitchViewBox.width
            && p.y >= pitchViewBox.y
            && p.y <= pitchViewBox.y + pitchViewBox.height;
          if (!withinViewBox) return null;
          
          return [
            (p.x - pitchViewBox.x) * scale * dpr,
            (p.y - pitchViewBox.y) * scale * dpr,
            d.value || 1
          ];
        }).filter(Boolean);

        if (points.length === 0) return;

        heatmapInstanceRef.current = simpleheat(canvas);
        const heat = heatmapInstanceRef.current;
        heat.data(points);
        heat.radius(15 * dpr, 10 * dpr);
        heat.max(5);
        heat.draw();
      });
    };

    drawHeatmap();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(drawHeatmap);
      resizeObserver.observe(host);
    }

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
    };
  }, [heatmapMode, heatmapData, pitchViewBox, projectPoint]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* 1. Couche Heatmap (Canvas) */}
      <canvas 
        ref={heatmapCanvasRef}
        className="absolute pointer-events-none z-0"
      />

      {/* 2. Couche Terrain & Données (SVG) */}
      <FootballPitch 
        style={style} 
        orientation={orientation} 
        viewBox={viewBoxString}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onClick={onClick}
        className="relative z-10"
      >
        {children}
      </FootballPitch>
    </div>
  );
};
