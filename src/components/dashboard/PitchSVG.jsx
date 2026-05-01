import React from 'react';
import { FootballPitch } from './FootballPitch';

export const PitchSVG = ({
  children,
  loading,
  hasData,
  onClearFocus,
  orientation = 'horizontal',
  pitchStyleConfig = { grass: 'transparent', line: 'rgba(255,255,255,0.08)', background: 'transparent' },
  viewBox = '0 0 105 68',
  canvasRef,
  heatmapVisible = false
}) => {
  return (
    <div className="flex-1 min-h-0 bg-black/40 rounded-[2px] border border-white/5 p-8 shadow-inner relative flex items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-[1000px] max-h-[700px] relative">
        <FootballPitch 
          orientation={orientation}
          style={pitchStyleConfig}
          viewBox={viewBox}
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none transition-opacity duration-300"
          style={{ opacity: heatmapVisible ? 0.72 : 0 }}
        />
        
        {!loading && hasData && (
          <svg viewBox={viewBox} className="absolute inset-0 w-full h-full" onClick={onClearFocus}>
            {children}
          </svg>
        )}
      </div>
    </div>
  );
};
