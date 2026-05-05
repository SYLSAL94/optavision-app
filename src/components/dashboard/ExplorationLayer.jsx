import React from 'react';
import { EventMarkerGlyph, EventPathTrace, getEventMarkerColor, isSuccessfulOutcome } from './EventMapMarker';

export const ExplorationLayer = React.memo(({ displayData, focusedEventId, getEndCoordinates, setHoveredEvent, setMousePos, setFocusedEvent, setFocusedEventId, projectPoint }) => {
  const isMassFetching = displayData.length > 150;

  return displayData.slice(0, 1000).map((event, i) => {
    const eventId = event.opta_id ?? event.id;
    const startPoint = projectPoint(event.x, event.y);
    if (!startPoint) return null;
    const cx = startPoint.x;
    const cy = startPoint.y;
    
    const isSuccess = isSuccessfulOutcome(event.outcome);
    const color = getEventMarkerColor(event);
    const opacity = isSuccess ? 0.75 : 0.5;
    
    const endCoords = getEndCoordinates(event);
    const endPoint = endCoords ? projectPoint(endCoords.x, endCoords.y) : null;
    const hasValidEnd = endPoint !== null;

    return (
      <g 
        key={eventId || i} 
        data-event-id={eventId}
        className="cursor-help pointer-events-auto"
        opacity={focusedEventId && eventId !== focusedEventId ? 0.1 : 1}
        filter={!isMassFetching ? "drop-shadow(0px 0px 4px rgba(255,255,255,0.2))" : "none"}
      >
        {hasValidEnd && (
          <EventPathTrace
            event={event}
            start={{ x: cx, y: cy }}
            end={endPoint}
            isFocused={eventId === focusedEventId}
            colorOverride={color}
            opacity={eventId === focusedEventId ? 1 : opacity}
          />
        )}

        <EventMarkerGlyph
          event={event}
          cx={cx}
          cy={cy}
          isFocused={eventId === focusedEventId}
          opacity={opacity}
          animate={!isMassFetching}
        />
      </g>
    );
  });
});
