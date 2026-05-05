import React from 'react';
import { EventMarkerGlyph, EventPathTrace, getEventMarkerColor } from './EventMapMarker';

export const BuildUpLayer = React.memo(({ displayData, focusedEventId, getEndCoordinates, setHoveredEvent, setMousePos, selectedSequence, setFocusedEvent, setFocusedEventId, projectPoint }) => {
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
        const color = getEventMarkerColor(event);
        const isFocused = eventId === focusedEventId;

        const endCoords = getEndCoordinates(event);
        const endPoint = endCoords ? projectPoint(endCoords.x, endCoords.y) : null;
        const hasValidEnd = endPoint !== null;

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
            {hasValidEnd && (
              <EventPathTrace
                event={event}
                start={{ x: cx, y: cy }}
                end={endPoint}
                isFocused={isFocused}
                colorOverride={color}
                opacity={isFocused ? 1 : 0.75}
              />
            )}

            <EventMarkerGlyph
              event={event}
              cx={cx}
              cy={cy}
              isFocused={isFocused}
              opacity={0.9}
              showIndex
              index={i + 1}
            />
          </g>
        );
      })}
    </g>
  );
});
