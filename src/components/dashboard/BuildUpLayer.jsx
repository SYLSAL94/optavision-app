import React from 'react';
import TacticalPlot from './TacticalPlot';
import { getActionColor } from '../../utils/spatialDesign';

export const BuildUpLayer = ({ 
  displayData, 
  focusedEventId, 
  getEndCoordinates, 
  setHoveredEvent, 
  setMousePos, 
  selectedSequence, 
  setFocusedEvent, 
  setFocusedEventId, 
  projectPoint 
}) => {
  if (!selectedSequence || !displayData || displayData.length === 0) return null;

  const activeSequence = displayData[0]; 
  const events = activeSequence.events || [];

  const sequenceEvents = events.filter(e => {
    const isSameTeam = String(e.team_id) === String(activeSequence.team_id);
    const isProgression = [1, 10, 13, 14, 15, 16, 98, 99].includes(Number(e.type_id)) || 
                         ['Pass', 'Carry', 'Shot', 'Goal', 'SavedShot', 'MissedShots', 'BallReceipt', 'Ball Receipt'].includes(e.type_name);
    return isSameTeam && isProgression;
  });

  return (
    <g className="buildup-replay-layer">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>

      {sequenceEvents.map((event, i) => {
        const eventId = event.opta_id ?? event.id;
        const isFocused = String(eventId) === String(focusedEventId);
        const isDimmed = focusedEventId && !isFocused;
        
        const startPoint = projectPoint(event.x, event.y);
        const endCoords = getEndCoordinates(event);
        const endPoint = endCoords ? projectPoint(endCoords.x, endCoords.y) : null;
        
        const actionColor = getActionColor(event, 'technical');
        const isCarry = (event.type_name || '').toLowerCase().includes('carry');

        return (
          <g key={`buildup-ev-${event.id || i}`}>
            {/* Lignes de mouvement */}
            {endPoint && (
              <line 
                x1={startPoint.x} y1={startPoint.y} 
                x2={endPoint.x} y2={endPoint.y}
                stroke={isFocused ? "#fbbf24" : actionColor} 
                strokeWidth={isFocused ? "0.8" : (isCarry ? "0.5" : "0.4")} 
                strokeOpacity={isFocused ? 1 : 0.7}
                strokeDasharray={isCarry ? "none" : "1,1"}
                markerEnd={!isCarry ? "url(#arrowhead)" : "none"}
                style={{ color: isFocused ? "#fbbf24" : actionColor }}
                className="transition-all duration-300 pointer-events-none"
              />
            )}

            {/* Plot Unifié (Mode Sequence) */}
            <TacticalPlot 
              event={event}
              mode="sequence"
              index={i}
              isFocused={isFocused}
              isDimmed={isDimmed}
              projectPoint={projectPoint}
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
      })}
    </g>
  );
};
