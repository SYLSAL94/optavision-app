import React from 'react';
import TacticalPlot from './TacticalPlot';
import { getActionColor } from '../../utils/spatialDesign';

export const ExplorationLayer = ({ 
  displayData, 
  focusedEventId, 
  getEndCoordinates, 
  setHoveredEvent, 
  setMousePos, 
  setFocusedEvent, 
  setFocusedEventId, 
  projectPoint 
}) => {
  const isMassFetching = displayData.length > 150;

  return displayData.slice(0, 1000).map((event, i) => {
    const eventId = event.opta_id ?? event.id;
    const isFocused = String(eventId) === String(focusedEventId);
    const isDimmed = focusedEventId && !isFocused;
    
    const startPoint = projectPoint(event.x, event.y);
    if (!startPoint) return null;

    const endCoords = getEndCoordinates(event);
    const endPoint = endCoords ? projectPoint(endCoords.x, endCoords.y) : null;
    const actionColor = getActionColor(event, 'technical');

    return (
      <g key={eventId || i}>
        {/* Trajectoire (Ligne) */}
        {endPoint && (
          <line 
            x1={startPoint.x} y1={startPoint.y} 
            x2={endPoint.x} y2={endPoint.y}
            stroke={isFocused ? "#fbbf24" : actionColor} 
            strokeWidth={isFocused ? "0.8" : "0.4"} 
            strokeOpacity={isFocused ? 1 : 0.6}
            strokeDasharray={event.type_name?.toLowerCase().includes('pass') ? "1,1" : "none"}
            className="pointer-events-none"
          />
        )}

        {/* Point d'action (Normalisé) */}
        <TacticalPlot 
          event={event}
          mode="technical"
          isFocused={isFocused}
          isDimmed={isDimmed}
          projectPoint={projectPoint}
          isMassFetching={isMassFetching}
          onHover={(ev, e) => {
            setHoveredEvent(ev);
            if (e) setMousePos({ x: e.clientX, y: e.clientY });
          }}
          onClick={(ev) => {
            setFocusedEvent(ev);
            setFocusedEventId(eventId);
          }}
        />
      </g>
    );
  });
};
