import React from 'react';

const DualRangeSlider = ({ label, min, max, currentMin, currentMax, onChange, step = 1, unit = "" }) => {
  const handleMinChange = (e) => {
    const value = Math.min(Number(e.target.value), currentMax - step);
    onChange(value, currentMax);
  };

  const handleMaxChange = (e) => {
    const value = Math.max(Number(e.target.value), currentMin + step);
    onChange(currentMin, value);
  };

  const minPos = ((currentMin - min) / (max - min)) * 100;
  const maxPos = ((currentMax - min) / (max - min)) * 100;

  return (
    <div className="filter-group group">
      <div className="flex justify-between items-center mb-6">
        <label className="verge-label-mono text-[10px] text-hazard-white font-black uppercase tracking-widest group-hover:text-jelly-mint transition-colors">{label}</label>
        <div className="bg-canvas-black border border-jelly-mint/20 px-4 py-1.5 rounded-[2px] shadow-[0_0_15px_rgba(60,255,208,0.05)]">
          <span className="text-[10px] font-black verge-label-mono text-jelly-mint">
            {currentMin}{unit} — {currentMax}{unit}
          </span>
        </div>
      </div>

      <div className="relative h-6 flex items-center px-1">
        {/* Track Background */}
        <div className="absolute w-full h-1 bg-hazard-white/5 rounded-full" />
        
        {/* Selected Range Highlight */}
        <div 
          className="absolute h-1 rounded-full transition-all duration-300"
          style={{ 
            left: `${minPos}%`, 
            right: `${100 - maxPos}%`,
            background: 'linear-gradient(90deg, #3cffd0, #3860be)',
            boxShadow: '0 0 10px rgba(60, 255, 208, 0.2)'
          }}
        />

        {/* Real Range Inputs */}
        <input 
          type="range" min={min} max={max} step={step} value={currentMin} 
          onChange={handleMinChange}
          className="range-input-premium absolute w-full appearance-none bg-transparent cursor-pointer"
          style={{ WebkitAppearance: 'none', zIndex: currentMin > max / 2 ? 5 : 4 }}
        />
        <input 
          type="range" min={min} max={max} step={step} value={currentMax} 
          onChange={handleMaxChange}
          className="range-input-premium absolute w-full appearance-none bg-transparent cursor-pointer"
          style={{ WebkitAppearance: 'none', zIndex: 4 }}
        />
      </div>
      
      <div className="flex justify-between mt-2 px-1">
        <span className="verge-label-mono text-[9px] text-hazard-white/20 font-black tracking-tighter">{min}{unit}</span>
        <span className="verge-label-mono text-[9px] text-hazard-white/20 font-black tracking-tighter">{max}{unit}</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .range-input-premium {
          pointer-events: none;
        }
        .range-input-premium::-webkit-slider-thumb {
          pointer-events: auto;
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          border: 4px solid #ffffff;
          cursor: pointer;
          margin-top: 0;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(60, 255, 208, 0.4);
          position: relative;
          z-index: 10;
          transition: all 0.2s ease;
        }
        .range-input-premium:hover::-webkit-slider-thumb {
          transform: scale(1.1);
          box-shadow: 0 0 25px rgba(255, 255, 255, 0.8), 0 0 50px rgba(60, 255, 208, 0.6);
        }
        input[type=range]:last-of-type::-webkit-slider-thumb {
           box-shadow: 0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(56, 96, 190, 0.4);
        }
        input[type=range]:last-of-type:hover::-webkit-slider-thumb {
           box-shadow: 0 0 25px rgba(255, 255, 255, 0.8), 0 0 50px rgba(56, 96, 190, 0.6);
        }
      `}} />
    </div>
  );
};

export default DualRangeSlider;
