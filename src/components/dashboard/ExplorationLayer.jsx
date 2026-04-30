import React from 'react';

export const ExplorationLayer = ({ displayData, focusedEventId, getEndCoordinates, setHoveredEvent, setMousePos, setFocusedEvent, setFocusedEventId }) => {
  return displayData.slice(0, 1000).map((event, i) => {
    const eventId = event.opta_id ?? event.id;
    const cx = (event.x / 100) * 105;
    const cy = ((100 - event.y) / 100) * 68;
    const ACTION_COLORS = {
      'Pass': '#00ff88',
      'BallReceipt': '#ffd03c',
      'Shot': '#ff3366',
      'Goal': '#f1c40f',
      'SavedShot': '#ffcc00',
      'Tackle': '#3498db',
      'Interception': '#2ecc71',
      'Carry': '#00d9ff'
    };

    const isSuccess = event.outcome === 1 || event.outcome === 'Successful';
    const actionType = event.type_name || event.type || '';
    const baseColor = ACTION_COLORS[actionType.replace(/\s+/g, '')] || '#95a5a6';
    const color = baseColor;
    
    // Aesthetic from old project: lower opacity for focused out events
    const opacity = isSuccess ? 0.75 : 0.5;
    
    const endCoords = getEndCoordinates(event);
    const endX = endCoords?.x;
    const endY = endCoords?.y;
    const hasValidEnd = endCoords !== null;

    // Movement logic from audit: Pass = dot, Carry = solid (or as per audit plot_interactive_pitch)
    const isCarry = actionType.toLowerCase().includes('carry');
    const isPass = actionType.toLowerCase().includes('pass');
    const dashArray = isPass ? "1,1" : "none";
    const strokeWidth = isCarry ? "0.5" : "0.4"; // Scaled from Plotly 2.5/4

    return (
      <g 
        key={i} 
        className="cursor-help pointer-events-auto"
        opacity={focusedEventId && eventId !== focusedEventId ? 0.2 : 1}
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
        {hasValidEnd && (
          <line 
            x1={cx} y1={cy} 
            x2={(endX / 100) * 105} 
            y2={((100 - endY) / 100) * 68} 
            stroke={eventId === focusedEventId ? "#fbbf24" : color} 
            strokeWidth={eventId === focusedEventId ? "0.8" : strokeWidth} 
            strokeOpacity={eventId === focusedEventId ? 1 : opacity}
            strokeDasharray={eventId === focusedEventId ? "none" : dashArray}
            className={`animate-in fade-in duration-500 ${eventId === focusedEventId ? 'animate-pulse' : ''}`}
          />
        )}

        {actionType.includes('Shot') || actionType.includes('Goal') ? (
          <path
            d={`M ${cx} ${cy-1.5} L ${cx+0.4} ${cy-0.4} L ${cx+1.5} ${cy-0.4} L ${cx+0.6} ${cy+0.3} L ${cx+0.9} ${cy+1.4} L ${cx} ${cy+0.7} L ${cx-0.9} ${cy+1.4} L ${cx-0.6} ${cy+0.3} L ${cx-1.5} ${cy-0.4} L ${cx-0.4} ${cy-0.4} Z`}
            fill={eventId === focusedEventId ? "#fbbf24" : color} 
            fillOpacity={opacity}
            stroke={isSuccess ? "white" : "#454a54"} 
            strokeWidth="0.2"
            className={`animate-in fade-in zoom-in duration-300 ${eventId === focusedEventId ? 'animate-pulse' : ''}`}
          />
        ) : actionType.includes('Tackle') ? (
          <g transform={`translate(${cx}, ${cy}) scale(${eventId === focusedEventId ? 1.5 : 1})`}>
            <line x1="-0.7" y1="-0.7" x2="0.7" y2="0.7" stroke={color} strokeWidth="0.4" />
            <line x1="0.7" y1="-0.7" x2="-0.7" y2="0.7" stroke={color} strokeWidth="0.4" />
          </g>
        ) : (
          <circle 
            cx={cx} cy={cy} r={eventId === focusedEventId ? "2" : "0.8"} 
            fill={eventId === focusedEventId ? "#fbbf24" : color} fillOpacity={opacity}
            stroke={isSuccess ? "white" : "#454a54"} 
            strokeWidth="0.2"
            className={`animate-in fade-in zoom-in duration-300 ${eventId === focusedEventId ? 'animate-pulse' : ''}`}
          />
        )}
      </g>
    );
  });
};
