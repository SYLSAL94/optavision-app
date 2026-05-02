import React from 'react';

export const BuildUpLayer = ({ displayData, focusedEventId, getEndCoordinates, setHoveredEvent, setMousePos, selectedSequence, setFocusedEvent, setFocusedEventId, projectPoint }) => {
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
        const startPoint = projectPoint(event.x, event.y);
        if (!startPoint) return null;
        const cx = startPoint.x;
        const cy = startPoint.y;
        const ACTION_COLORS = {
          'Pass': '#00ff88',
          'Goal': '#f1c40f',
          'Shot': '#ff3366',
          'SavedShot': '#ffcc00',
          'Tackle': '#3498db',
          'Interception': '#2ecc71',
          'Carry': '#00d9ff'
        };

        const isSuccess = event.outcome === 1 || event.outcome === 'Successful';
        const actionType = event.type_name || event.type || '';
        const baseColor = ACTION_COLORS[actionType.replace(/\s+/g, '')] || '#95a5a6';
        const color = baseColor;
        const isCarry = actionType.toLowerCase().includes('carry');
        const isFocused = eventId === focusedEventId;
        
        const endCoords = getEndCoordinates(event);
        const endPoint = endCoords ? projectPoint(endCoords.x, endCoords.y) : null;
        const hasValidEnd = endPoint !== null;

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
            filter="drop-shadow(0px 0px 4px rgba(255,255,255,0.3))"
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
                x2={endPoint.x}
                y2={endPoint.y}
                stroke={isFocused ? "#fbbf24" : color} 
                strokeWidth={isFocused ? "0.8" : (isCarry ? "0.5" : "0.4")} 
                strokeOpacity={isFocused ? 1 : 0.75}
                strokeDasharray={isCarry ? "none" : (actionType.toLowerCase().includes('pass') ? "1,1" : "none")}
                markerEnd={!isCarry && isSuccess ? "url(#arrowhead)" : "none"}
                style={{ color: isFocused ? "#fbbf24" : color }} // Pour le marker currentColor
                className="transition-all duration-300"
              />
            )}

            {/* Point d'impact / Forme de l'action */}
            {actionType.includes('Shot') || actionType.includes('Goal') ? (
              <path
                d={`M ${cx} ${cy-1.5} L ${cx+0.4} ${cy-0.4} L ${cx+1.5} ${cy-0.4} L ${cx+0.6} ${cy+0.3} L ${cx+0.9} ${cy+1.4} L ${cx} ${cy+0.7} L ${cx-0.9} ${cy+1.4} L ${cx-0.6} ${cy+0.3} L ${cx-1.5} ${cy-0.4} L ${cx-0.4} ${cy-0.4} Z`}
                fill={isFocused ? "#fbbf24" : color} 
                fillOpacity={0.9}
                stroke={isSuccess ? "white" : "#454a54"} 
                strokeWidth="0.2"
                className="animate-pulse"
              />
            ) : isCarry ? (
              <rect 
                x={cx - (isFocused ? 1.5 : 0.8)} 
                y={cy - (isFocused ? 1.5 : 0.8)} 
                width={isFocused ? "3" : "1.6"} 
                height={isFocused ? "3" : "1.6"}
                fill={isFocused ? "#fbbf24" : color} 
                transform={`rotate(45, ${cx}, ${cy})`}
                className="opacity-90"
              />
            ) : (
              <circle 
                cx={cx} cy={cy} r={isFocused ? "2" : "1"} 
                fill={isFocused ? "#fbbf24" : color} 
                stroke={isSuccess ? "white" : "#454a54"}
                strokeWidth={isFocused ? "0.3" : "0.1"}
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
