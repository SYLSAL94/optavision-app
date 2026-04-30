import React from 'react';

const GOAL_LEFT = 45;
const GOAL_RIGHT = 55;
const GOAL_TOP = 0;
const GOAL_GROUND = 36;

const readMetric = (event, key) => {
  const metrics = event?.advanced_metrics || event?.advancedMetrics || {};
  return event?.[key] ?? metrics?.[key] ?? null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isGoal = (shot) => {
  const type = String(shot?.type || '').toLowerCase();
  return shot?.isGoal === true || shot?.type_id === 16 || type.includes('goal');
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
        cx: 100 - goalMouthY,
        cy: GOAL_GROUND - goalMouthZ,
        goal: isGoal(shot),
      };
    })
    .filter(Boolean);

  return (
    <svg
      viewBox="42 -4 16 44"
      role="img"
      aria-label="Vue cage des tirs"
      className="h-full w-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="42" y="-4" width="16" height="44" fill="#050505" />
      <rect x={GOAL_LEFT} y={GOAL_TOP} width="10" height="36" fill="#08130f" stroke="none" />

      {[48.333, 51.667].map((x) => (
        <line key={`v-${x}`} x1={x} y1={GOAL_TOP} x2={x} y2={GOAL_GROUND} stroke="rgba(255,255,255,0.12)" strokeWidth="0.12" />
      ))}
      <line x1={GOAL_LEFT} y1="18" x2={GOAL_RIGHT} y2="18" stroke="rgba(255,255,255,0.12)" strokeWidth="0.12" />

      {[6, 12, 24, 30].map((y) => (
        <line key={`net-h-${y}`} x1={GOAL_LEFT} y1={y} x2={GOAL_RIGHT} y2={y} stroke="rgba(60,255,208,0.08)" strokeWidth="0.08" />
      ))}
      {[46.667, 50, 53.333].map((x) => (
        <line key={`net-v-${x}`} x1={x} y1={GOAL_TOP} x2={x} y2={GOAL_GROUND} stroke="rgba(60,255,208,0.08)" strokeWidth="0.08" />
      ))}

      <path
        d={`M ${GOAL_LEFT} ${GOAL_GROUND} L ${GOAL_LEFT} ${GOAL_TOP} L ${GOAL_RIGHT} ${GOAL_TOP} L ${GOAL_RIGHT} ${GOAL_GROUND}`}
        fill="none"
        stroke="#f5f5f5"
        strokeWidth="0.35"
        strokeLinecap="square"
      />
      <line x1={GOAL_LEFT} y1={GOAL_GROUND} x2={GOAL_RIGHT} y2={GOAL_GROUND} stroke="rgba(255,255,255,0.35)" strokeWidth="0.18" />
      <line x1={GOAL_LEFT} y1={GOAL_GROUND} x2={GOAL_LEFT} y2="40" stroke="#f5f5f5" strokeWidth="0.28" />
      <line x1={GOAL_RIGHT} y1={GOAL_GROUND} x2={GOAL_RIGHT} y2="40" stroke="#f5f5f5" strokeWidth="0.28" />

      {projectedShots.map(({ shot, cx, cy, goal }, index) => {
        const shotId = shot.opta_id ?? shot.id;
        const focusedShotId = focusedShot ? (focusedShot.opta_id ?? focusedShot.id) : null;
        const isFocused = focusedShotId !== null && String(shotId) === String(focusedShotId);
        const isDimmed = focusedShotId !== null && !isFocused;

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
              r="1.15"
              fill="none"
              stroke="#3cffd0"
              strokeWidth="0.18"
              opacity="0.75"
            />
          )}
          <circle
            cx={cx}
            cy={cy}
            r={isFocused ? 0.78 : goal ? 0.55 : 0.42}
            fill={goal ? '#3cffd0' : '#ff4d4d'}
            stroke="#050505"
            strokeWidth="0.12"
            style={{ filter: goal ? 'drop-shadow(0 0 2px #3cffd0)' : 'none' }}
          />
        </g>
        );
      })}
    </svg>
  );
};

export default GoalFrameSVG;
