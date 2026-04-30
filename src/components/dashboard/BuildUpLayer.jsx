import React from 'react';

export const BuildUpLayer = ({ displayData, focusedEventId, getEndCoordinates, setHoveredEvent, setMousePos, selectedSequence, setFocusedEvent, setFocusedEventId }) => {
  // Rendu Conditionnel Strict : Désactivation si aucune séquence n'est sélectionnée
  if (!selectedSequence || !displayData || displayData.length === 0) return null;

  // Extraction de la séquence active (displayData contient déjà la séquence filtrée par l'orchestrateur)
  const activeSequence = displayData[0]; 
  const events = activeSequence.events || [];

  // Filtrage métier spécifique au Replay Tactique (Uniquement les actions de progression de l'équipe active)
  const sequenceEvents = events.filter(e => {
    const isSameTeam = String(e.team_id) === String(activeSequence.team_id);
    const isProgression = [1, 10, 13, 14, 15, 16, 98, 99].includes(Number(e.type_id)) || 
                         ['Pass', 'Carry', 'Shot', 'Goal', 'SavedShot', 'MissedShots', 'BallReceipt', 'Ball Receipt'].includes(e.type_name);
    return isSameTeam && isProgression;
  });

  return (
    <g className="buildup-replay-layer">
      {/* Définition des flèches directionnelles */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>

      {sequenceEvents.map((event, i) => {
        const eventId = event.opta_id ?? event.id;
        const cx = (event.x / 100) * 105;
        const cy = ((100 - event.y) / 100) * 68;
        const isSuccess = event.outcome === 1 || event.outcome === 'Successful';
        const color = isSuccess ? '#3cffd0' : '#ff4d4d';
        const isCarry = event.type === 'Carry' || event.type_id === 99 || event.type_name === 'Carry';
        const isFocused = eventId === focusedEventId;
        
        const endCoords = getEndCoordinates(event);
        const endX = endCoords?.x;
        const endY = endCoords?.y;
        const hasValidEnd = endCoords !== null;

        // Animation séquentielle : Délai mathématique de 0.5s par étape
        const animationStyle = {
          animationDelay: `${i * 0.5}s`,
          animationFillMode: 'both'
        };

        return (
          <g 
            key={`buildup-ev-${event.id || i}`} 
            className="cursor-help pointer-events-auto animate-in fade-in"
            style={{ ...animationStyle, opacity: focusedEventId && eventId !== focusedEventId ? 0.2 : 1 }}
            onMouseMove={(e) => {
              setHoveredEvent(event);
              setMousePos({ x: e.clientX, y: e.clientY });
            }}
            onMouseLeave={() => setHoveredEvent(null)}
            onClick={(e) => {
              e.stopPropagation();
              setFocusedEvent(event);
              setFocusedEventId(eventId);
              setHoveredEvent(event);
              setMousePos({ x: e.clientX, y: e.clientY });
            }}
          >
            {/* Vecteurs de trajectoire */}
            {hasValidEnd && (
              <line 
                x1={cx} y1={cy} 
                x2={(endX / 100) * 105} 
                y2={((100 - endY) / 100) * 68} 
                stroke={isFocused ? "#fbbf24" : (isCarry ? '#5200ff' : color)} 
                strokeWidth={isFocused ? "0.8" : (isCarry ? "0.4" : "0.3")} 
                strokeOpacity={isFocused ? 1 : 0.8}
                strokeDasharray={isCarry ? "5,5" : "none"}
                markerEnd={!isCarry && isSuccess ? "url(#arrowhead)" : "none"}
                style={{ color: isFocused ? "#fbbf24" : color }} // Pour le marker currentColor
                className="transition-all duration-300"
              />
            )}

            {/* Point d'impact / Forme de l'action */}
            {event.type === 'Shot' || event.type === 'Goal' ? (
              <circle 
                cx={cx} cy={cy} r={isFocused ? "3" : "1.8"} 
                fill={isFocused ? "#fbbf24" : color} 
                fillOpacity={0.9}
                stroke="white" 
                strokeWidth="0.3"
                className="animate-pulse"
              />
            ) : isCarry ? (
              <rect 
                x={cx - (isFocused ? 1.5 : 0.8)} 
                y={cy - (isFocused ? 1.5 : 0.8)} 
                width={isFocused ? "3" : "1.6"} 
                height={isFocused ? "3" : "1.6"}
                fill={isFocused ? "#fbbf24" : "#5200ff"} 
                transform={`rotate(45, ${cx}, ${cy})`}
                className="opacity-90"
              />
            ) : (
              <circle 
                cx={cx} cy={cy} r={isFocused ? "2" : "1"} 
                fill={isFocused ? "#fbbf24" : color} 
                stroke="white"
                strokeWidth={isFocused ? "0.3" : "0"}
              />
            )}

            {/* Numérotation Chronologique (Métrique Lead Data) */}
            <text 
              x={cx} y={cy - 2} 
              textAnchor="middle"
              fontSize="1.2" 
              fill="white" 
              fontWeight="900" 
              className="pointer-events-none drop-shadow-md"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
};
