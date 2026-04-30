import React from 'react';
import { FootballPitch } from './FootballPitch';

export const PitchSVG = ({ children, loading, hasData }) => {
  return (
    <div className="flex-1 min-h-0 bg-black/40 rounded-[2px] border border-white/5 p-8 shadow-inner relative flex items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-[1000px] max-h-[700px] relative">
        <FootballPitch 
          orientation="horizontal" 
          style={{ grass: 'transparent', line: 'rgba(255,255,255,0.08)', background: 'transparent' }} 
        />
        
        {!loading && hasData && (
          <svg viewBox="0 0 105 68" className="absolute inset-0 w-full h-full">
            {children}
          </svg>
        )}
      </div>
    </div>
  );
};
