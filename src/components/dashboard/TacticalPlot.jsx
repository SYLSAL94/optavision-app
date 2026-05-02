import React from 'react';
import { TACTICAL_THEME, getActionColor, getActionLabel } from '../../utils/spatialDesign';

/**
 * TacticalPlot - Composant unifié pour le rendu d'un événement sur la carte.
 * Modes disponibles :
 * - 'technical' : Couleurs par type d'action (Pass, Carry, etc.)
 * - 'outcome' : Couleurs par résultat (Vert/Rouge)
 * - 'sequence' : Support des formes géométriques et numérotation
 */
const TacticalPlot = ({ 
  event, 
  mode = 'technical', 
  isFocused = false, 
  isDimmed = false, 
  projectPoint, 
  index,
  onHover,
  onClick,
  isMassFetching = false
}) => {
  const position = projectPoint(event.x, event.y);
  if (!position) return null;

  const eventId = event.opta_id ?? event.id;
  const isSuccess = event.outcome === 1 || event.outcome === 'Successful';
  const actionLabel = getActionLabel(event);
  const color = isFocused ? TACTICAL_THEME.colors.focus : getActionColor(event, mode);
  const opacity = isDimmed ? 0.1 : (isSuccess ? 0.8 : 0.5);

  const handleMouseEnter = (e) => onHover?.(event, e);
  const handleMouseLeave = () => onHover?.(null);
  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.(event, e);
  };

  // --- RENDU DES FORMES SPÉCIFIQUES (MODE SEQUENCE) ---
  if (mode === 'sequence') {
    const isShot = actionLabel.includes('Shot') || actionLabel.includes('Goal');
    const isCarry = actionLabel.toLowerCase().includes('carry');

    if (isShot) {
      return (
        <g 
          className="cursor-help pointer-events-auto" 
          opacity={opacity}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <path
            d={`M ${position.x} ${position.y-1.5} L ${position.x+0.4} ${position.y-0.4} L ${position.x+1.5} ${position.y-0.4} L ${position.x+0.6} ${position.y+0.3} L ${position.x+0.9} ${position.y+1.4} L ${position.x} ${position.y+0.7} L ${position.x-0.9} ${position.y+1.4} L ${position.x-0.6} ${position.y+0.3} L ${position.x-1.5} ${position.y-0.4} L ${position.x-0.4} ${position.y-0.4} Z`}
            fill={color} 
            stroke={isSuccess ? "white" : TACTICAL_THEME.colors.stroke.failure} 
            strokeWidth="0.2"
          />
          {index !== undefined && (
            <text 
              x={position.x} y={position.y - 2.5} 
              textAnchor="middle" fontSize="1.2" fill="white" fontWeight="900" 
              className="pointer-events-none drop-shadow-md"
            >
              {index + 1}
            </text>
          )}
        </g>
      );
    }

    if (isCarry) {
      return (
        <g 
          className="cursor-help pointer-events-auto" 
          opacity={opacity}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <rect 
            x={position.x - (isFocused ? 1.5 : 0.8)} 
            y={position.y - (isFocused ? 1.5 : 0.8)} 
            width={isFocused ? "3" : "1.6"} 
            height={isFocused ? "3" : "1.6"}
            fill={color} 
            transform={`rotate(45, ${position.x}, ${position.y})`}
          />
        </g>
      );
    }
  }

  // --- RENDU STANDARD (CIRCLE) ---
  const radius = isFocused ? TACTICAL_THEME.sizes.focus : TACTICAL_THEME.sizes.dot;
  const showGlow = mode === 'outcome' && !isMassFetching;

  return (
    <g 
      className="cursor-help pointer-events-auto"
      opacity={opacity}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {showGlow && (
        <circle 
          cx={position.x} cy={position.y} 
          r={radius * 3} 
          fill="transparent" 
          stroke={color} 
          strokeWidth="0.1" 
          className="opacity-20"
        />
      )}
      <circle 
        cx={position.x} cy={position.y} 
        r={radius} 
        fill={color}
        stroke={isSuccess ? TACTICAL_THEME.colors.stroke.success : TACTICAL_THEME.colors.stroke.failure}
        strokeWidth={TACTICAL_THEME.sizes.stroke}
        filter={!isMassFetching ? "drop-shadow(0px 0px 4px rgba(255,255,255,0.1))" : "none"}
      />
    </g>
  );
};

export default TacticalPlot;
