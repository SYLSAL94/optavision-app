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
  heatmapVisible = false,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  className = ""
}) => {
  return (
    <div className="flex-1 min-h-0 bg-black/40 rounded-[2px] border border-white/5 p-2 shadow-inner relative flex items-center justify-center overflow-hidden">
      <div className={`relative ${orientation === 'horizontal' ? 'aspect-[105/68]' : 'aspect-[68/105]'} h-full max-w-full flex items-center justify-center`}>
        <FootballPitch 
          orientation={orientation}
          style={pitchStyleConfig}
          viewBox={viewBox}
          onClick={onClearFocus}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          className={className}
        >
          {!loading && hasData && children}
        </FootballPitch>

        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full pointer-events-none transition-opacity duration-300"
          style={{ 
            opacity: heatmapVisible ? 0.72 : 0,
            // Assurer que le canvas heatmap suit aussi le même aspect ratio
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
    </div>
  );
};
