import React from 'react';

/**
 * PITCH_DIMENSIONS - Constantes de base pour le tracé du terrain (Standard FIFA)
 */
export const PITCH_DIMENSIONS = {
  WIDTH: 105,
  HEIGHT: 68,
  CENTER_X: 105 / 2,
  CENTER_Y: 68 / 2,
  PENALTY_AREA_WIDTH: 16.5,
  PENALTY_AREA_HEIGHT: 40.32,
  GOAL_AREA_WIDTH: 5.5,
  GOAL_AREA_HEIGHT: 18.32,
  CENTER_CIRCLE_RADIUS: 9.15,
};

const HorizontalPitch = ({ style }) => (
  <>
    {/* Fond et Bordure */}
    <rect x="0" y="0" width={PITCH_DIMENSIONS.WIDTH} height={PITCH_DIMENSIONS.HEIGHT} fill={style.grass} stroke={style.line} strokeWidth="0.2" />
    
    {/* Surface de réparation gauche */}
    <rect x="0" y={(PITCH_DIMENSIONS.HEIGHT - PITCH_DIMENSIONS.PENALTY_AREA_HEIGHT) / 2} width={PITCH_DIMENSIONS.PENALTY_AREA_WIDTH} height={PITCH_DIMENSIONS.PENALTY_AREA_HEIGHT} fill="none" stroke={style.line} strokeWidth="0.2" />
    <rect x="0" y={(PITCH_DIMENSIONS.HEIGHT - PITCH_DIMENSIONS.GOAL_AREA_HEIGHT) / 2} width={PITCH_DIMENSIONS.GOAL_AREA_WIDTH} height={PITCH_DIMENSIONS.GOAL_AREA_HEIGHT} fill="none" stroke={style.line} strokeWidth="0.2" />
    
    {/* Surface de réparation droite */}
    <rect x={PITCH_DIMENSIONS.WIDTH - PITCH_DIMENSIONS.PENALTY_AREA_WIDTH} y={(PITCH_DIMENSIONS.HEIGHT - PITCH_DIMENSIONS.PENALTY_AREA_HEIGHT) / 2} width={PITCH_DIMENSIONS.PENALTY_AREA_WIDTH} height={PITCH_DIMENSIONS.PENALTY_AREA_HEIGHT} fill="none" stroke={style.line} strokeWidth="0.2" />
    <rect x={PITCH_DIMENSIONS.WIDTH - PITCH_DIMENSIONS.GOAL_AREA_WIDTH} y={(PITCH_DIMENSIONS.HEIGHT - PITCH_DIMENSIONS.GOAL_AREA_HEIGHT) / 2} width={PITCH_DIMENSIONS.GOAL_AREA_WIDTH} height={PITCH_DIMENSIONS.GOAL_AREA_HEIGHT} fill="none" stroke={style.line} strokeWidth="0.2" />
    
    {/* Ligne médiane et Cercle central */}
    <line x1={PITCH_DIMENSIONS.CENTER_X} y1="0" x2={PITCH_DIMENSIONS.CENTER_X} y2={PITCH_DIMENSIONS.HEIGHT} stroke={style.line} strokeWidth="0.2" />
    <circle cx={PITCH_DIMENSIONS.CENTER_X} cy={PITCH_DIMENSIONS.CENTER_Y} r={PITCH_DIMENSIONS.CENTER_CIRCLE_RADIUS} fill="none" stroke={style.line} strokeWidth="0.2" />
    <circle cx={PITCH_DIMENSIONS.CENTER_X} cy={PITCH_DIMENSIONS.CENTER_Y} r="0.3" fill={style.line} />
    
    {/* Points de penalty */}
    <circle cx="11" cy={PITCH_DIMENSIONS.CENTER_Y} r="0.2" fill={style.line} />
    <circle cx={PITCH_DIMENSIONS.WIDTH - 11} cy={PITCH_DIMENSIONS.CENTER_Y} r="0.2" fill={style.line} />
    
    {/* Arcs de cercle de surface */}
    <path d={`M 16.5, ${(PITCH_DIMENSIONS.HEIGHT - 14.6) / 2} A 9.15 9.15 0 0 1 16.5, ${(PITCH_DIMENSIONS.HEIGHT + 14.6) / 2}`} fill="none" stroke={style.line} strokeWidth="0.2" />
    <path d={`M ${PITCH_DIMENSIONS.WIDTH - 16.5}, ${(PITCH_DIMENSIONS.HEIGHT - 14.6) / 2} A 9.15 9.15 0 0 0 ${PITCH_DIMENSIONS.WIDTH - 16.5}, ${(PITCH_DIMENSIONS.HEIGHT + 14.6) / 2}`} fill="none" stroke={style.line} strokeWidth="0.2" />
    
    {/* Buts */}
    <path d={`M 0 ${(PITCH_DIMENSIONS.HEIGHT - 7.32) / 2} L 0 ${(PITCH_DIMENSIONS.HEIGHT + 7.32) / 2}`} stroke={style.line} strokeWidth="0.8" />
    <path d={`M ${PITCH_DIMENSIONS.WIDTH} ${(PITCH_DIMENSIONS.HEIGHT - 7.32) / 2} L ${PITCH_DIMENSIONS.WIDTH} ${(PITCH_DIMENSIONS.HEIGHT + 7.32) / 2}`} stroke={style.line} strokeWidth="0.8" />
  </>
);

const VerticalPitch = ({ style }) => (
  <>
    {/* Fond et Bordure */}
    <rect x="0" y="0" width={PITCH_DIMENSIONS.HEIGHT} height={PITCH_DIMENSIONS.WIDTH} fill={style.grass} stroke={style.line} strokeWidth="0.2" />
    
    {/* Surface de réparation haut */}
    <rect x={(PITCH_DIMENSIONS.HEIGHT - PITCH_DIMENSIONS.PENALTY_AREA_HEIGHT) / 2} y="0" width={PITCH_DIMENSIONS.PENALTY_AREA_HEIGHT} height={PITCH_DIMENSIONS.PENALTY_AREA_WIDTH} fill="none" stroke={style.line} strokeWidth="0.2" />
    <rect x={(PITCH_DIMENSIONS.HEIGHT - PITCH_DIMENSIONS.GOAL_AREA_HEIGHT) / 2} y="0" width={PITCH_DIMENSIONS.GOAL_AREA_HEIGHT} height={PITCH_DIMENSIONS.GOAL_AREA_WIDTH} fill="none" stroke={style.line} strokeWidth="0.2" />
    
    {/* Surface de réparation bas */}
    <rect x={(PITCH_DIMENSIONS.HEIGHT - PITCH_DIMENSIONS.PENALTY_AREA_HEIGHT) / 2} y={PITCH_DIMENSIONS.WIDTH - PITCH_DIMENSIONS.PENALTY_AREA_WIDTH} width={PITCH_DIMENSIONS.PENALTY_AREA_HEIGHT} height={PITCH_DIMENSIONS.PENALTY_AREA_WIDTH} fill="none" stroke={style.line} strokeWidth="0.2" />
    <rect x={(PITCH_DIMENSIONS.HEIGHT - PITCH_DIMENSIONS.GOAL_AREA_HEIGHT) / 2} y={PITCH_DIMENSIONS.WIDTH - PITCH_DIMENSIONS.GOAL_AREA_WIDTH} width={PITCH_DIMENSIONS.GOAL_AREA_HEIGHT} height={PITCH_DIMENSIONS.GOAL_AREA_WIDTH} fill="none" stroke={style.line} strokeWidth="0.2" />
    
    {/* Ligne médiane et Cercle central */}
    <line x1="0" y1={PITCH_DIMENSIONS.CENTER_X} x2={PITCH_DIMENSIONS.HEIGHT} y2={PITCH_DIMENSIONS.CENTER_X} stroke={style.line} strokeWidth="0.2" />
    <circle cx={PITCH_DIMENSIONS.CENTER_Y} cy={PITCH_DIMENSIONS.CENTER_X} r={PITCH_DIMENSIONS.CENTER_CIRCLE_RADIUS} fill="none" stroke={style.line} strokeWidth="0.2" />
    
    {/* Points de penalty */}
    <circle cx={PITCH_DIMENSIONS.CENTER_Y} cy="11" r="0.2" fill={style.line} />
    <circle cx={PITCH_DIMENSIONS.CENTER_Y} cy={PITCH_DIMENSIONS.WIDTH - 11} r="0.2" fill={style.line} />
    
    {/* Arcs de cercle */}
    <path d={`M ${(PITCH_DIMENSIONS.HEIGHT - 14.6) / 2}, 16.5 A 9.15 9.15 0 0 0 ${(PITCH_DIMENSIONS.HEIGHT + 14.6) / 2}, 16.5`} fill="none" stroke={style.line} strokeWidth="0.2" />
    <path d={`M ${(PITCH_DIMENSIONS.HEIGHT - 14.6) / 2}, ${PITCH_DIMENSIONS.WIDTH - 16.5} A 9.15 9.15 0 0 1 ${(PITCH_DIMENSIONS.HEIGHT + 14.6) / 2}, ${PITCH_DIMENSIONS.WIDTH - 16.5}`} fill="none" stroke={style.line} strokeWidth="0.2" />

    {/* Buts */}
    <path d={`M ${(PITCH_DIMENSIONS.HEIGHT - 7.32) / 2} 0 L ${(PITCH_DIMENSIONS.HEIGHT + 7.32) / 2} 0`} stroke={style.line} strokeWidth="0.8" />
    <path d={`M ${(PITCH_DIMENSIONS.HEIGHT - 7.32) / 2} ${PITCH_DIMENSIONS.WIDTH} L ${(PITCH_DIMENSIONS.HEIGHT + 7.32) / 2} ${PITCH_DIMENSIONS.WIDTH}`} stroke={style.line} strokeWidth="0.8" />
  </>
);

export const FootballPitch = ({ 
  style = { grass: '#1a1a1a', line: '#333333', background: '#131313' }, 
  orientation = 'horizontal', 
  children,
  className = "",
  viewBox,
  onClick
}) => {
  const computedViewBox = viewBox || (orientation === 'horizontal'
    ? `0 0 ${PITCH_DIMENSIONS.WIDTH} ${PITCH_DIMENSIONS.HEIGHT}` 
    : `0 0 ${PITCH_DIMENSIONS.HEIGHT} ${PITCH_DIMENSIONS.WIDTH}`);

  return (
    <svg
      viewBox={computedViewBox}
      preserveAspectRatio="xMidYMid meet"
      className={`w-full h-full ${className}`}
      style={{ backgroundColor: style.background }}
      onClick={onClick}
    >
      {orientation === 'horizontal' ? <HorizontalPitch style={style} /> : <VerticalPitch style={style} />}
      {children}
    </svg>
  );
};
