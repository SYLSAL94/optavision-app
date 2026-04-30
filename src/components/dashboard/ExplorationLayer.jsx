import React from 'react';

export const ExplorationLayer = ({ displayData, focusedEventId, getEndCoordinates, setHoveredEvent, setMousePos }) => {
  return displayData.slice(0, 1000).map((event, i) => {
    const cx = (event.x / 100) * 105;
    const cy = ((100 - event.y) / 100) * 68;
    const ACTION_COLORS = {
      'Pass': '#3cffd0',
      'BallReceipt': '#ffd03c',
      'Shot': '#ff4d4d',
      'Goal': '#ff4d4d',
      'Duel': '#5200ff',
      'Interception': '#ffd03c',
      'Carry': '#5200ff'
    };

    const isSuccess = event.outcome === 1;
    const actionType = event.type_name || event.type || '';
    const color = ACTION_COLORS[actionType.replace(/\s+/g, '')] || (isSuccess ? '#3cffd0' : '#ff4d4d');
    const opacity = isSuccess ? 0.9 : 0.4;
    
    const endCoords = getEndCoordinates(event);
    const endX = endCoords?.x;
    const endY = endCoords?.y;
    const hasValidEnd = endCoords !== null;

    return (
      <g 
        key={i} 
        className="cursor-help pointer-events-auto"
        onMouseMove={(e) => {
          setHoveredEvent(event);
          setMousePos({ x: e.clientX, y: e.clientY });
        }}
        onMouseLeave={() => setHoveredEvent(null)}
      >
        {hasValidEnd && (
          <line 
            x1={cx} y1={cy} 
            x2={(endX / 100) * 105} 
            y2={((100 - endY) / 100) * 68} 
            stroke={event.opta_id === focusedEventId ? "#fbbf24" : (event.type === 'Carry' || event.type_id === 99 || event.type_name === 'Carry' ? '#5200ff' : color)} 
            strokeWidth={event.opta_id === focusedEventId ? "0.8" : (event.type === 'Carry' || event.type_id === 99 || event.type_name === 'Carry' ? "0.4" : "0.2")} 
            strokeOpacity={event.opta_id === focusedEventId ? 1 : opacity * 0.9}
            strokeDasharray={event.type === 'Carry' || event.type_id === 99 || event.type_name === 'Carry' ? "5,5" : (isSuccess ? "none" : "1,1")}
            className={`animate-in fade-in duration-500 ${event.opta_id === focusedEventId ? 'animate-pulse' : ''}`}
          />
        )}

        {event.type === 'Shot' || event.type === 'Goal' ? (
          <circle 
            cx={cx} cy={cy} r={event.opta_id === focusedEventId ? "3" : "1.4"} 
            fill={event.opta_id === focusedEventId ? "#fbbf24" : color} fillOpacity={opacity}
            stroke="white" strokeWidth={event.opta_id === focusedEventId ? "0.4" : "0.2"}
            className={`animate-in fade-in zoom-in duration-300 ${event.opta_id === focusedEventId ? 'animate-pulse' : ''}`}
          />
        ) : event.type === 'Carry' ? (
          <rect 
            x={cx - (event.opta_id === focusedEventId ? 1.5 : 0.7)} 
            y={cy - (event.opta_id === focusedEventId ? 1.5 : 0.7)} 
            width={event.opta_id === focusedEventId ? "3" : "1.4"} 
            height={event.opta_id === focusedEventId ? "3" : "1.4"}
            fill={event.opta_id === focusedEventId ? "#fbbf24" : color} fillOpacity={opacity}
            transform={`rotate(45, ${cx}, ${cy})`}
            className={`animate-in fade-in zoom-in duration-300 ${event.opta_id === focusedEventId ? 'animate-pulse' : ''}`}
          />
        ) : (
          <circle 
            cx={cx} cy={cy} r={event.opta_id === focusedEventId ? "2" : "0.7"} 
            fill={event.opta_id === focusedEventId ? "#fbbf24" : color} fillOpacity={opacity}
            stroke={event.opta_id === focusedEventId ? "white" : "none"} strokeWidth="0.2"
            className={`animate-in fade-in zoom-in duration-300 ${event.opta_id === focusedEventId ? 'animate-pulse' : ''}`}
          />
        )}
      </g>
    );
  });
};
