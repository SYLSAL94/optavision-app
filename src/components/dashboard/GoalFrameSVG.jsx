import React from 'react';

const GOAL_LEFT = 45;
const GOAL_RIGHT = 55;
const GOAL_TOP = 0;
const GOAL_GROUND = 36;

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 128;
const FRAME_X = 30;
const FRAME_Y = 16;
const FRAME_WIDTH = 240;
const FRAME_HEIGHT = 80;
const POST_DEPTH = 12;

const readMetric = (event, key) => {
  const rawMetrics = event?.advanced_metrics || event?.advancedMetrics || {};
  let metrics = rawMetrics;

  if (typeof rawMetrics === 'string') {
    try {
      metrics = JSON.parse(rawMetrics);
    } catch {
      metrics = {};
    }
  }

  return event?.[key] ?? metrics?.[key] ?? null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const shotStatus = (shot) => {
  const raw = readMetric(shot, 'shot_status') || shot?.shot_status || shot?.type_name || shot?.type || '';
  return String(raw).trim().toLowerCase();
};

const isGoal = (shot) => {
  const status = shotStatus(shot);
  return shot?.isGoal === true || Number(shot?.type_id) === 16 || status.includes('goal');
};

const markerStyleFor = (shot) => {
  const status = shotStatus(shot);
  if (isGoal(shot)) return { fill: '#3cffd0', stroke: '#ffffff', label: 'Goal' };
  if (status.includes('saved')) return { fill: '#8be9fd', stroke: '#dff7ff', label: 'Saved' };
  if (status.includes('post') || status.includes('woodwork')) return { fill: '#ffd03c', stroke: '#fff2a8', label: 'Post' };
  if (status.includes('blocked')) return { fill: '#949494', stroke: '#d7d7d7', label: 'Blocked' };
  return { fill: '#ff4d4d', stroke: '#ffd0d0', label: 'Missed' };
};

const markerRadiusFor = (shot, isFocused) => {
  const xgot = toNumber(readMetric(shot, 'xGOT') ?? readMetric(shot, 'xgot') ?? readMetric(shot, 'psxg'));
  const xg = toNumber(readMetric(shot, 'xG') ?? readMetric(shot, 'xg'));
  const quality = xgot ?? xg ?? 0;
  const base = 2.8 + clamp(quality, 0, 1) * 3.2;
  return isFocused ? base + 1.2 : base;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const projectGoalMouthPoint = (goalMouthY, goalMouthZ) => {
  // Audit legacy: x opta = 100 - goal_mouth_y, y opta = 36 - goal_mouth_z.
  const optaX = 100 - goalMouthY;
  const optaY = GOAL_GROUND - goalMouthZ;
  const xRatio = (optaX - GOAL_LEFT) / (GOAL_RIGHT - GOAL_LEFT);
  const yRatio = (optaY - GOAL_TOP) / (GOAL_GROUND - GOAL_TOP);

  return {
    cx: FRAME_X + clamp(xRatio, -0.08, 1.08) * FRAME_WIDTH,
    cy: FRAME_Y + clamp(yRatio, -0.08, 1.08) * FRAME_HEIGHT,
  };
};

const GoalFrameSVG = ({ shots = [], focusedShot, onShotFocus }) => {
  const projectedShots = shots
    .map((shot) => {
      const goalMouthY = toNumber(readMetric(shot, 'goal_mouth_y'));
      const goalMouthZ = toNumber(readMetric(shot, 'goal_mouth_z'));

      if (goalMouthY === null || goalMouthZ === null) {
        return null;
      }

      return {
        shot,
        ...projectGoalMouthPoint(goalMouthY, goalMouthZ),
        goal: isGoal(shot),
      };
    })
    .filter(Boolean);

  return (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      role="img"
      aria-label="Vue cage des tirs"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={FRAME_X} y={FRAME_Y} width={FRAME_WIDTH} height={FRAME_HEIGHT} fill="rgba(60,255,208,0.02)" stroke="none" />

      {[1 / 3, 2 / 3].map((ratio) => {
        const x = FRAME_X + FRAME_WIDTH * ratio;
        return (
          <line key={`third-v-${ratio}`} x1={x} y1={FRAME_Y} x2={x} y2={FRAME_Y + FRAME_HEIGHT} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        );
      })}
      <line x1={FRAME_X} y1={FRAME_Y + FRAME_HEIGHT / 2} x2={FRAME_X + FRAME_WIDTH} y2={FRAME_Y + FRAME_HEIGHT / 2} stroke="rgba(255,255,255,0.16)" strokeWidth="1" />

      {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
        <line key={`net-h-${ratio}`} x1={FRAME_X} y1={FRAME_Y + FRAME_HEIGHT * ratio} x2={FRAME_X + FRAME_WIDTH} y2={FRAME_Y + FRAME_HEIGHT * ratio} stroke="rgba(60,255,208,0.08)" strokeWidth="0.8" />
      ))}
      {[0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((ratio) => (
        <line key={`net-v-${ratio}`} x1={FRAME_X + FRAME_WIDTH * ratio} y1={FRAME_Y} x2={FRAME_X + FRAME_WIDTH * ratio} y2={FRAME_Y + FRAME_HEIGHT} stroke="rgba(60,255,208,0.08)" strokeWidth="0.8" />
      ))}

      <path
        d={`M ${FRAME_X} ${FRAME_Y + FRAME_HEIGHT} L ${FRAME_X} ${FRAME_Y} L ${FRAME_X + FRAME_WIDTH} ${FRAME_Y} L ${FRAME_X + FRAME_WIDTH} ${FRAME_Y + FRAME_HEIGHT}`}
        fill="none"
        stroke="#f5f5f5"
        strokeWidth="2.4"
        strokeLinecap="square"
      />
      <line x1={FRAME_X} y1={FRAME_Y + FRAME_HEIGHT} x2={FRAME_X + FRAME_WIDTH} y2={FRAME_Y + FRAME_HEIGHT} stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
      <line x1={FRAME_X} y1={FRAME_Y + FRAME_HEIGHT} x2={FRAME_X} y2={FRAME_Y + FRAME_HEIGHT + POST_DEPTH} stroke="#f5f5f5" strokeWidth="2" />
      <line x1={FRAME_X + FRAME_WIDTH} y1={FRAME_Y + FRAME_HEIGHT} x2={FRAME_X + FRAME_WIDTH} y2={FRAME_Y + FRAME_HEIGHT + POST_DEPTH} stroke="#f5f5f5" strokeWidth="2" />

      {(() => {
        const focusedShotId = focusedShot ? (focusedShot.opta_id ?? focusedShot.id) : null;
        const regularShots = projectedShots.filter(s => String(s.shot.opta_id ?? s.shot.id) !== String(focusedShotId));
        const activeShot = projectedShots.find(s => String(s.shot.opta_id ?? s.shot.id) === String(focusedShotId));

        const renderItem = ({ shot, cx, cy, goal }, index, isFocused) => {
          const shotId = shot.opta_id ?? shot.id;
          const isDimmed = focusedShotId !== null && !isFocused;
          const markerStyle = markerStyleFor(shot);
          const radius = markerRadiusFor(shot, isFocused);
          const playerName = shot.playerName || shot.player_name || 'Joueur';
          const minute = shot.minute ?? shot.min ?? '-';
          const xg = toNumber(readMetric(shot, 'xG') ?? readMetric(shot, 'xg'));

          return (
            <g
              key={shot.id || shot.opta_id || `${cx}-${cy}-${index}`}
              opacity={isDimmed ? 0.2 : 1}
              className="cursor-pointer pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                onShotFocus?.(shot);
              }}
            >
              {goal && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius + 2}
                  fill="none"
                  stroke="#3cffd0"
                  strokeWidth="1"
                  opacity="0.65"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={markerStyle.fill}
                fillOpacity={isDimmed ? 0.35 : 0.82}
                stroke={isFocused ? "#ffffff" : markerStyle.stroke}
                strokeWidth={isFocused ? 1.2 : 0.8}
                style={{ filter: isFocused ? 'drop-shadow(0 0 5px #ffffff)' : (goal ? 'drop-shadow(0 0 3px #3cffd0)' : 'none') }}
              >
                <title>
                  {`${playerName} - ${minute}' - ${markerStyle.label}${xg !== null ? ` - xG ${xg.toFixed(2)}` : ''}`}
                </title>
              </circle>
            </g>
          );
        };

        return (
          <>
            {regularShots.map((s, idx) => renderItem(s, idx, false))}
            {activeShot && renderItem(activeShot, 'active', true)}
          </>
        );
      })()}
    </svg>
  );
};

export default GoalFrameSVG;
