import React from 'react';

export const ACTION_COLORS = {
  Pass: '#B4F2E5',
  Carry: '#FFA29A',
  BallReceipt: '#E4E4E4',
  BallRecovery: '#22d3ee',
  Goal: '#3cffd0',
  SavedShot: '#ffd03c',
  ShotOnPost: '#949494',
  Shot: '#ff4d4d',
  MissedShots: '#ff4d4d',
  Aerial: '#c084fc',
  Dispossessed: '#fb923c',
  Challenge: '#facc15',
  Foul: '#b91c1c',
  Interception: '#65a30d',
  Tackle: '#1d4ed8',
  TakeOn: '#a21caf',
  Success: '#3cffd0',
  Error: '#ff4d4d',
  Focus: '#fbbf24',
};

const normalizeActionKey = (value) => String(value || '').replace(/\s+/g, '').toLowerCase();

const parseAdvancedMetrics = (event) => {
  const raw = event?.advanced_metrics || event?.advancedMetrics || {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? raw : {};
};

export const getTaperedPolygonPoints = (x1, y1, x2, y2, startWidth, endWidth) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return '';

  const ndx = dx / length;
  const ndy = dy / length;
  const px = -ndy;
  const py = ndx;
  const p1x = x1 - (px * startWidth) / 2;
  const p1y = y1 - (py * startWidth) / 2;
  const p2x = x1 + (px * startWidth) / 2;
  const p2y = y1 + (py * startWidth) / 2;
  const p3x = x2 + (px * endWidth) / 2;
  const p3y = y2 + (py * endWidth) / 2;
  const p4x = x2 - (px * endWidth) / 2;
  const p4y = y2 - (py * endWidth) / 2;

  return `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`;
};

export const isSuccessfulOutcome = (outcome) => (
  outcome === 1
  || outcome === '1'
  || outcome === true
  || ['successful', 'success', 'true', 'won', 'complete', 'completed'].includes(String(outcome || '').toLowerCase())
);

export const getEventTypeLabel = (event = {}) => {
  const metrics = parseAdvancedMetrics(event);
  if (event?.isGoal === true || Number(event?.type_id ?? metrics?.type_id) === 16) return 'Goal';
  return (
    metrics.type_name
    || event.type_name
    || event.type_action
    || event.type
    || event.action_type
    || ''
  );
};

export const getEventFlags = (event = {}) => {
  const metrics = parseAdvancedMetrics(event);
  const typeKey = normalizeActionKey(getEventTypeLabel(event));
  const typeId = Number(event?.type_id ?? metrics?.type_id);
  const status = normalizeActionKey(event?.shot_status || metrics?.shot_status);
  const isGoal = event?.isGoal === true || typeId === 16 || typeKey === 'goal' || status === 'goal';

  return {
    typeKey,
    isGoal,
    isSavedShot: typeKey.includes('savedshot') || status.includes('saved'),
    isMissedShot: typeKey.includes('missedshot') || status.includes('missed'),
    isShotOnPost: typeKey.includes('shotonpost') || status.includes('post'),
    isShot: isGoal || typeKey.includes('shot') || ['saved', 'missed', 'blocked', 'post', 'goal'].some(key => status.includes(key)),
    isPass: typeKey.includes('pass') && !typeKey.includes('blockedpass'),
    isCarry: typeKey.includes('carry'),
    isAssist: event?.assist === 1 || event?.is_assist === true || metrics?.is_assist === true,
    isBigChanceCreated: event?.isBigChanceCreated === true || event?.is_key_pass === true || metrics?.is_key_pass === true,
    isBallReceipt: typeKey.includes('ballreceipt'),
    isBallRecovery: typeKey.includes('ballrecovery'),
    isAerial: typeKey.includes('aerial'),
    isDispossessed: typeKey.includes('dispossessed'),
    isChallenge: typeKey.includes('challenge'),
    isFoul: typeKey.includes('foul'),
    isInterception: typeKey.includes('interception'),
    isTackle: typeKey.includes('tackle'),
    isTakeOn: typeKey.includes('takeon'),
  };
};

export const getEventMarkerPalette = (event = {}, colorOverride = null) => {
  const flags = getEventFlags(event);
  const successful = isSuccessfulOutcome(event?.outcome ?? event?.outcomeType);
  let eventColor = colorOverride || (successful ? ACTION_COLORS.Success : ACTION_COLORS.Error);
  let plotFillColor = eventColor;

  if (flags.isShot) {
    if (flags.isGoal) eventColor = ACTION_COLORS.Goal;
    else if (flags.isSavedShot) eventColor = ACTION_COLORS.SavedShot;
    else if (flags.isShotOnPost) eventColor = ACTION_COLORS.ShotOnPost;
    else eventColor = ACTION_COLORS.Shot;
    plotFillColor = eventColor;
  } else if (flags.isPass) {
    eventColor = colorOverride || ACTION_COLORS.Pass;
    plotFillColor = successful ? ACTION_COLORS.Success : ACTION_COLORS.Error;
  } else if (flags.isCarry) {
    eventColor = colorOverride || ACTION_COLORS.Carry;
    plotFillColor = eventColor;
  } else if (flags.isBallReceipt) {
    eventColor = colorOverride || '#1C0F12';
    plotFillColor = ACTION_COLORS.BallReceipt;
  } else if (flags.isBallRecovery) {
    eventColor = colorOverride || ACTION_COLORS.BallRecovery;
    plotFillColor = eventColor;
  } else if (flags.isAerial) {
    eventColor = colorOverride || ACTION_COLORS.Aerial;
    plotFillColor = successful ? ACTION_COLORS.Success : ACTION_COLORS.Error;
  } else if (flags.isDispossessed) {
    eventColor = colorOverride || ACTION_COLORS.Dispossessed;
    plotFillColor = eventColor;
  } else if (flags.isChallenge) {
    eventColor = colorOverride || ACTION_COLORS.Challenge;
    plotFillColor = successful ? ACTION_COLORS.Success : ACTION_COLORS.Error;
  } else if (flags.isFoul) {
    eventColor = colorOverride || ACTION_COLORS.Foul;
    plotFillColor = successful ? ACTION_COLORS.Success : ACTION_COLORS.Error;
  } else if (flags.isInterception) {
    eventColor = colorOverride || ACTION_COLORS.Interception;
    plotFillColor = successful ? ACTION_COLORS.Success : ACTION_COLORS.Error;
  } else if (flags.isTackle) {
    eventColor = colorOverride || ACTION_COLORS.Tackle;
    plotFillColor = successful ? ACTION_COLORS.Success : ACTION_COLORS.Error;
  } else if (flags.isTakeOn) {
    eventColor = colorOverride || ACTION_COLORS.TakeOn;
    plotFillColor = successful ? ACTION_COLORS.Success : ACTION_COLORS.Error;
  }

  if (colorOverride && !flags.isPass) plotFillColor = colorOverride;
  return { eventColor, plotFillColor, successful, flags };
};

export const getEventMarkerColor = (event = {}, colorOverride = null) => (
  getEventMarkerPalette(event, colorOverride).eventColor
);

export const EventPathTrace = ({
  event,
  start,
  end,
  isFocused = false,
  colorOverride = null,
  opacity,
  showPassEndpoint = true,
}) => {
  if (!start || !end) return null;

  const { eventColor, plotFillColor, flags } = getEventMarkerPalette(event, colorOverride);
  const traceOpacity = opacity ?? (isFocused ? 1 : 0.75);

  if (flags.isPass) {
    const points = getTaperedPolygonPoints(start.x, start.y, end.x, end.y, 0.1, isFocused ? 1 : 0.6);
    return (
      <>
        <polygon points={points} fill={eventColor} fillOpacity={traceOpacity} stroke="none" />
        {showPassEndpoint && (
          <circle
            cx={end.x}
            cy={end.y}
            r={isFocused ? 1.1 : 0.9}
            fill={plotFillColor}
            stroke={eventColor}
            strokeWidth={isFocused ? 0.25 : 0.2}
            className="transition-all duration-300"
          />
        )}
      </>
    );
  }

  if (flags.isCarry) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const totalLength = Math.sqrt(dx * dx + dy * dy);
    if (totalLength < 1) return null;

    const ndx = dx / totalLength;
    const ndy = dy / totalLength;
    const dashLength = 1.5;
    const gapLength = 1;
    const segmentLength = dashLength + gapLength;
    const numDashes = Math.floor(totalLength / segmentLength);
    const startWidth = 0.2;
    const endWidth = isFocused ? 0.8 : 0.5;
    const elements = [];

    for (let i = 0; i < numDashes; i += 1) {
      const currentPos = i * segmentLength;
      const dashStartX = start.x + ndx * currentPos;
      const dashStartY = start.y + ndy * currentPos;
      const dashEndX = start.x + ndx * (currentPos + dashLength);
      const dashEndY = start.y + ndy * (currentPos + dashLength);
      const segmentStartWidth = startWidth + (endWidth - startWidth) * (currentPos / totalLength);
      const segmentEndWidth = startWidth + (endWidth - startWidth) * ((currentPos + dashLength) / totalLength);
      const dashPoints = getTaperedPolygonPoints(dashStartX, dashStartY, dashEndX, dashEndY, segmentStartWidth, segmentEndWidth);
      if (dashPoints) {
        elements.push(
          <polygon
            key={`carry-dash-${i}`}
            points={dashPoints}
            fill={eventColor}
            fillOpacity={traceOpacity}
            stroke="none"
          />
        );
      }
    }

    const arrowLength = 1.5;
    const arrowWidth = 1.2;
    const p1x = end.x;
    const p1y = end.y;
    const p2x = end.x - ndx * arrowLength + -ndy * (arrowWidth / 2);
    const p2y = end.y - ndy * arrowLength + ndx * (arrowWidth / 2);
    const p3x = end.x - ndx * arrowLength - -ndy * (arrowWidth / 2);
    const p3y = end.y - ndy * arrowLength - ndx * (arrowWidth / 2);
    elements.push(
      <polygon
        key="carry-arrow"
        points={`${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`}
        fill={eventColor}
        fillOpacity={traceOpacity}
      />
    );
    return <>{elements}</>;
  }

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={eventColor}
      strokeWidth={isFocused ? 0.8 : 0.4}
      strokeOpacity={traceOpacity}
      strokeLinecap="round"
    />
  );
};

export const EventMarkerGlyph = ({
  event,
  cx,
  cy,
  isFocused = false,
  isDimmed = false,
  colorOverride = null,
  opacity,
  radiusScale = 1,
  halo = false,
  showIndex = false,
  index,
  title,
}) => {
  const { eventColor, plotFillColor, flags } = getEventMarkerPalette(event, colorOverride);
  const fillOpacity = opacity ?? (isDimmed ? 0.2 : 1);
  const titleText = title || [event?.playerName, getEventTypeLabel(event)].filter(Boolean).join(' - ');
  const selectedStroke = isFocused ? ACTION_COLORS.Focus : eventColor;
  const selectedScale = isFocused ? 1.18 : 1;
  const scale = selectedScale * radiusScale;

  return (
    <>
      {titleText && <title>{titleText}</title>}
      {(halo || isFocused) && (
        <circle
          cx={cx}
          cy={cy}
          r={(isFocused ? 2.8 : 2.25) * radiusScale}
          fill="transparent"
          stroke={eventColor}
          strokeWidth="0.18"
          strokeOpacity={isFocused ? 0.75 : 0.32}
          className="pointer-events-none"
        />
      )}

      {flags.isShot ? (
        <circle
          cx={cx}
          cy={cy}
          r={(isFocused ? 1.2 : 1.0) * radiusScale}
          fill={plotFillColor}
          fillOpacity={fillOpacity}
          stroke={isFocused ? ACTION_COLORS.Focus : '#ffffff'}
          strokeWidth={isFocused ? 0.3 : 0.25}
          className="transition-all duration-300"
        />
      ) : flags.isBallRecovery ? (
        <rect
          x={cx - 0.75 * scale}
          y={cy - 0.75 * scale}
          width={1.5 * scale}
          height={1.5 * scale}
          fill={plotFillColor}
          fillOpacity={fillOpacity}
          stroke="#ffffff"
          strokeWidth={0.15}
          rx="0.2"
          transform={`rotate(45 ${cx} ${cy})`}
          className="transition-all duration-300"
        />
      ) : flags.isAerial ? (
        <polygon
          points={`${cx},${cy - 0.9 * scale} ${cx - 0.9 * scale},${cy + 0.7 * scale} ${cx + 0.9 * scale},${cy + 0.7 * scale}`}
          fill={plotFillColor}
          fillOpacity={fillOpacity}
          stroke={eventColor}
          strokeWidth={0.2}
          className="transition-all duration-300"
        />
      ) : flags.isDispossessed ? (
        <path
          d={`M ${cx - 0.7 * scale} ${cy - 0.7 * scale} L ${cx + 0.7 * scale} ${cy + 0.7 * scale} M ${cx - 0.7 * scale} ${cy + 0.7 * scale} L ${cx + 0.7 * scale} ${cy - 0.7 * scale}`}
          stroke={plotFillColor}
          strokeWidth={isFocused ? 0.4 : 0.3}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      ) : flags.isChallenge ? (
        <polygon
          points={Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
            return `${cx + 0.85 * scale * Math.cos(angle)},${cy + 0.85 * scale * Math.sin(angle)}`;
          }).join(' ')}
          fill={plotFillColor}
          fillOpacity={fillOpacity}
          stroke={eventColor}
          strokeWidth={0.2}
          className="transition-all duration-300"
        />
      ) : flags.isInterception ? (
        <polygon
          points={Array.from({ length: 5 }).map((_, i) => {
            const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
            return `${cx + 0.85 * scale * Math.cos(angle)},${cy + 0.85 * scale * Math.sin(angle)}`;
          }).join(' ')}
          fill={plotFillColor}
          fillOpacity={fillOpacity}
          stroke={eventColor}
          strokeWidth={0.2}
          className="transition-all duration-300"
        />
      ) : flags.isTackle ? (
        <rect
          x={cx - 0.45 * scale}
          y={cy - 0.45 * scale}
          width={0.9 * scale}
          height={0.9 * scale}
          fill={plotFillColor}
          fillOpacity={fillOpacity}
          stroke={eventColor}
          strokeWidth={0.2}
          className="transition-all duration-300"
        />
      ) : flags.isFoul ? (
        <rect
          x={cx - 0.7 * scale}
          y={cy - 0.7 * scale}
          width={1.4 * scale}
          height={1.4 * scale}
          fill={plotFillColor}
          fillOpacity={fillOpacity}
          stroke={eventColor}
          strokeWidth={0.2}
          rx="0.2"
          className="transition-all duration-300"
        />
      ) : (
        <circle
          cx={cx}
          cy={cy}
          r={(isFocused ? 1.1 : 0.9) * radiusScale}
          fill={flags.isBallReceipt ? ACTION_COLORS.BallReceipt : plotFillColor}
          fillOpacity={fillOpacity}
          stroke={flags.isBallReceipt ? '#1C0F12' : selectedStroke}
          strokeWidth={isFocused ? 0.25 : 0.2}
          className="transition-all duration-300"
        />
      )}

      {showIndex && (
        <text
          x={cx}
          y={cy - 2.3 * radiusScale}
          textAnchor="middle"
          fontSize={1.25 * radiusScale}
          fill="#ffffff"
          fontWeight="900"
          className="pointer-events-none"
        >
          {index}
        </text>
      )}
    </>
  );
};

export const EventMapMarker = React.memo(({
  event,
  cx,
  cy,
  isFocused = false,
  isDimmed = false,
  colorOverride = null,
  opacity,
  radiusScale = 1,
  halo = false,
  showIndex = false,
  index,
  title,
  className = '',
  style,
  filter,
  onClick,
  onMouseMove,
  onMouseLeave,
}) => (
  <g
    className={`cursor-help pointer-events-auto ${className}`}
    style={style}
    filter={filter}
    onClick={onClick}
    onMouseMove={onMouseMove}
    onMouseLeave={onMouseLeave}
  >
    <EventMarkerGlyph
      event={event}
      cx={cx}
      cy={cy}
      isFocused={isFocused}
      isDimmed={isDimmed}
      colorOverride={colorOverride}
      opacity={opacity}
      radiusScale={radiusScale}
      halo={halo}
      showIndex={showIndex}
      index={index}
      title={title}
    />
  </g>
));
