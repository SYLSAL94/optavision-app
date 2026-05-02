import React, { useMemo, useRef, useEffect, useState } from 'react';
import { FootballPitch } from './FootballPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';

const SIMPLEHEAT_SRC = 'https://cdn.jsdelivr.net/npm/simpleheat@0.4.0/simpleheat.min.js';
const SIMPLEHEAT_SCRIPT_ID = 'simpleheat-script';
let simpleheatLoadPromise = null;

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
    if (!canvas || heatmapMode === 'off' || !heatmapData.length) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let cancelled = false;
    ensureSimpleheat().then(simpleheat => {
      if (cancelled || !simpleheat || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const scale = Math.min(rect.width / pitchViewBox.width, rect.height / pitchViewBox.height);
      const offsetX = (rect.width - pitchViewBox.width * scale) / 2;
      const offsetY = (rect.height - pitchViewBox.height * scale) / 2;

      const points = heatmapData.map(d => {
        const p = projectPoint(d.x, d.y);
        if (!p) return null;
        return [
          ((p.x - pitchViewBox.x) * scale + offsetX) * dpr,
          ((p.y - pitchViewBox.y) * scale + offsetY) * dpr,
          d.value || 1
        ];
      }).filter(Boolean);

      heatmapInstanceRef.current = simpleheat(canvas);
      const heat = heatmapInstanceRef.current;
      heat.data(points);
      heat.radius(15 * dpr, 10 * dpr);
      heat.max(5);
      heat.draw();
    });

    return () => { cancelled = true; };
  }, [heatmapMode, heatmapData, pitchViewBox, projectPoint]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* 1. Couche Heatmap (Canvas) */}
      <canvas 
        ref={heatmapCanvasRef}
        className="absolute inset-0 pointer-events-none z-0"
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
