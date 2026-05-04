import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Database, Film, ListMusic, Loader2, Map, PlayCircle, RefreshCcw, Save, Scissors, Search, Shuffle, Trash2 } from 'lucide-react';
import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';
import { API_BASE_URL, OPTAVISION_API_URL } from '../../config';
import { pollVideoJob } from '../../utils/videoJobs';

const DEFAULT_TRIM_BEFORE = 5;
const DEFAULT_TRIM_AFTER = 8;
const DEFAULT_VIDEO_CONFIG = { before_buffer: 3, after_buffer: 5, min_clip_gap: 0.5 };
const PLAYBAR_TRIM_RANGE = 60;
const MIN_TRIM_CLIP_DURATION = 1;

const readVideoConfig = () => {
  try {
    const savedConfig = localStorage.getItem('optavision_video_config');
    return savedConfig ? { ...DEFAULT_VIDEO_CONFIG, ...JSON.parse(savedConfig) } : DEFAULT_VIDEO_CONFIG;
  } catch {
    return DEFAULT_VIDEO_CONFIG;
  }
};

const parseAdvancedMetrics = (item) => {
  const raw = item?.advanced_metrics || {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw && typeof raw === 'object' ? raw : {};
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const formatSignedSeconds = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  return `${numeric >= 0 ? '+' : '-'}${Math.abs(Math.round(numeric))}s`;
};

const getEndCoordinates = (item) => {
  const metrics = parseAdvancedMetrics(item);
  const x = toNumber(item?.end_x ?? metrics.end_x ?? metrics.endX);
  const y = toNumber(item?.end_y ?? metrics.end_y ?? metrics.endY);
  return x !== null && y !== null ? { x, y } : null;
};

const getItemLabel = (item) => (
  item?.type_action
  || item?.type_name
  || item?.type
  || (item?.item_kind === 'sequence' ? 'Sequence' : 'Action')
);

const looksLikeTechnicalId = (value) => /^[a-z0-9]{12,}$/i.test(String(value || '').trim());

const getCompactItemLabel = (item) => {
  if (item?.item_kind !== 'sequence') return getItemLabel(item);
  const readable = [
    item?.silo,
    item?.seq_silo,
    item?.sequence_type,
    item?.type_name,
    item?.type_action,
  ].find((value) => value && !looksLikeTechnicalId(value));
  if (!readable) return 'Sequence';
  return String(readable).toLowerCase().includes('sequence') ? readable : `Sequence ${readable}`;
};

const getItemPlayer = (item) => (
  item?.playerName
  || item?.seq_team
  || item?.teamName
  || item?.team_id
  || 'Collectif'
);

const getItemClock = (item) => {
  if (Array.isArray(item?.events) && item.events.length > 0) {
    const start = formatMatchClock(item.events[0]);
    const end = formatMatchClock(item.events[item.events.length - 1]);
    return start === end ? start : `${start} - ${end}`;
  }
  if (item?.start_time && item?.end_time) return `${item.start_time} - ${item.end_time}`;
  return formatMatchClock(item);
};

const formatMatchClock = (event = {}) => {
  const periodId = Number(event.period_id ?? event.periodId ?? event.period);
  const minute = event.minute ?? event.min;
  const second = Number(event.sec ?? event.second ?? 0);
  const numericMinute = Number(minute);
  const safeSecond = Number.isFinite(second) ? Math.max(0, Math.floor(second)) : 0;
  const secondsLabel = safeSecond > 0 ? `:${String(safeSecond).padStart(2, '0')}` : '';

  if (!Number.isFinite(numericMinute)) {
    const cumulative = Number(event.cumulative_mins);
    return Number.isFinite(cumulative) ? `${cumulative.toFixed(1)}'` : '--';
  }

  const minuteLabel = Math.floor(numericMinute);
  const stoppage = (base, label) => {
    const added = minuteLabel - base;
    return added > 0 ? `${label} ${base}+${added}${secondsLabel}` : `${label} ${minuteLabel}${secondsLabel}`;
  };

  if (periodId === 1) return minuteLabel >= 45 ? stoppage(45, 'H1') : `H1 ${minuteLabel}${secondsLabel}`;
  if (periodId === 2) return minuteLabel >= 90 ? stoppage(90, 'H2') : `H2 ${minuteLabel}${secondsLabel}`;
  if (periodId === 3) return minuteLabel >= 105 ? stoppage(105, 'ET1') : `ET1 ${minuteLabel}${secondsLabel}`;
  if (periodId === 4) return minuteLabel >= 120 ? stoppage(120, 'ET2') : `ET2 ${minuteLabel}${secondsLabel}`;
  return `P${Number.isFinite(periodId) ? periodId : '?'} ${minuteLabel}${secondsLabel}`;
};

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const parseClockSeconds = (value) => {
  if (!value) return null;
  const match = String(value).match(/(\d+)'(\d+)/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const formatSecondsClock = (seconds, periodId = null) => {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) return '--';
  const safeSeconds = Math.max(0, Math.round(numeric));
  const minute = Math.floor(safeSeconds / 60);
  const second = safeSeconds % 60;
  if (periodId !== null && periodId !== undefined) {
    return formatMatchClock({ period_id: periodId, minute, sec: second });
  }
  return `${minute}'${String(second).padStart(2, '0')}`;
};

const formatMetric = (value, digits = 2, suffix = '') => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(digits)}${suffix}` : '--';
};

const getItemMatch = (item) => (
  item?.match_name
  || item?.matchName
  || item?.description
  || 'Match non renseigne'
);

const formatWeek = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return raw.toLowerCase().includes('week') ? raw : `Week ${raw}`;
};

const getItemContextParts = (item) => {
  const date = formatDate(item?.match_date || item?.date_time || item?.date);
  return [
    date !== '--' ? date : null,
    item?.competition,
    item?.phase || item?.stage,
    formatWeek(item?.week),
  ].filter(Boolean);
};

const getMetricValue = (item, keys) => {
  const metrics = parseAdvancedMetrics(item);
  for (const key of keys) {
    const value = item?.[key] ?? metrics?.[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const getItemDetails = (item) => {
  const end = getEndCoordinates(item);
  const startX = toNumber(item?.x);
  const startY = toNumber(item?.y);
  const details = [];

  if (item?.item_kind === 'sequence') {
    details.push(['Score', formatMetric(item?.seq_score, 3)]);
    details.push(['Passes', item?.seq_pass_count ?? '--']);
    details.push(['Actions', item?.seq_actions_count ?? item?.events?.length ?? '--']);
    details.push(['xT', formatMetric(item?.seq_total_xt, 3)]);
  } else {
    details.push(['xT', formatMetric(getMetricValue(item, ['xT_credit', 'xT', 'xT_raw']), 3)]);
    details.push(['Dist.', formatMetric(getMetricValue(item, ['distance_m', 'pass_distance_m', 'carry_distance_m']), 1, 'm')]);
    details.push(['Prog.', formatMetric(getMetricValue(item, ['prog_dist', 'progressive_distance']), 1, 'm')]);
    details.push(['Resultat', String(item?.outcome ?? '--')]);
  }

  if (startX !== null && startY !== null) {
    details.push(['Start', `${startX.toFixed(1)}, ${startY.toFixed(1)}`]);
  }
  if (end) {
    details.push(['End', `${end.x.toFixed(1)}, ${end.y.toFixed(1)}`]);
  }
  if (item?.trim_before_seconds !== null && item?.trim_before_seconds !== undefined) {
    details.push(['Trim', `${formatSignedSeconds(-Number(item.trim_before_seconds || 0))}/${formatSignedSeconds(Number(item.trim_after_seconds ?? 0))}`]);
  }

  return details.filter(([, value]) => value !== null && value !== undefined && value !== '');
};

const getVideoEventId = (event) => event?.opta_id || event?.event_id || event?.id || null;

const getPlaylistItemKey = (item) => String(item?.playlist_item_id || item?.id || item?.opta_id || '');

const getStartCoordinates = (item) => {
  const x = toNumber(item?.x);
  const y = toNumber(item?.y);
  return x !== null && y !== null ? { x, y } : null;
};

const getItemPeriodId = (item) => {
  const firstEvent = Array.isArray(item?.events) && item.events.length > 0 ? item.events[0] : null;
  const period = Number(firstEvent?.period_id ?? firstEvent?.period ?? item?.period_id ?? item?.period);
  return Number.isFinite(period) ? period : null;
};

const getItemMatchSeconds = (item, fallbackValue = null) => {
  const direct = Number(fallbackValue);
  if (Number.isFinite(direct)) return direct;

  const firstEvent = Array.isArray(item?.events) && item.events.length > 0 ? item.events[0] : item;
  const minute = Number(firstEvent?.minute ?? firstEvent?.min ?? item?.minute ?? item?.min ?? 0);
  const second = Number(firstEvent?.sec ?? firstEvent?.second ?? item?.sec ?? item?.second ?? 0);
  if (!Number.isFinite(minute) || !Number.isFinite(second)) return null;

  const periodId = getItemPeriodId(item);
  const periodBase = { 2: 45, 3: 90, 4: 105 }[periodId] || 0;
  const normalizedMinute = periodBase > 0 && minute < periodBase ? minute + periodBase : minute;
  return normalizedMinute * 60 + second;
};

const getItemVideoPayload = (item, trim) => {
  if (!item) return null;
  const isSequence = Array.isArray(item.events) && item.events.length > 0;
  const firstEvent = isSequence ? item.events[0] : item;
  const lastEvent = isSequence ? item.events[item.events.length - 1] : null;
  const eventId = getVideoEventId(firstEvent);
  const matchId = firstEvent?.match_id || firstEvent?.matchId || item?.match_id || item?.matchId;

  if (!matchId || !eventId) return null;

  const numericStart = Number(item.start_seconds ?? item.sequence_start_seconds);
  const numericEnd = Number(item.end_seconds ?? item.sequence_end_seconds);
  const sequenceStart = Number.isFinite(numericStart)
    ? numericStart
    : (parseClockSeconds(item.start_time) ?? (Number(firstEvent?.minute ?? firstEvent?.min ?? 0) * 60 + Number(firstEvent?.sec ?? firstEvent?.second ?? 0)));
  const sequenceEnd = Number.isFinite(numericEnd)
    ? numericEnd
    : (parseClockSeconds(item.end_time) ?? (Number(lastEvent?.minute ?? lastEvent?.min ?? 0) * 60 + Number(lastEvent?.sec ?? lastEvent?.second ?? 0)));
  const sequencePeriodId = firstEvent?.period_id ?? firstEvent?.period ?? item?.period_id ?? item?.period ?? null;

  return {
    match_id: matchId,
    event_id: eventId,
    before_buffer: Number(trim.before || 0),
    after_buffer: Number(trim.after || 0),
    min_clip_gap: Number(trim.minGap ?? DEFAULT_VIDEO_CONFIG.min_clip_gap),
    force_rebuild: true,
    ...(isSequence ? {
      event_ids: item.events.map(getVideoEventId).filter(Boolean),
      sequence_id: item.sub_sequence_id || item.seq_uuid || item.playlist_item_id || item.id,
      sequence_start_seconds: sequenceStart,
      sequence_end_seconds: sequenceEnd,
      sequence_period_id: sequencePeriodId,
    } : {})
  };
};

const itemColor = (item) => {
  const label = String(getItemLabel(item)).toLowerCase();
  if (item?.item_kind === 'sequence') return '#ffd03c';
  if (label.includes('shot') || label.includes('goal') || label.includes('tir')) return '#ff4d4d';
  if (label.includes('carry')) return '#8be9fd';
  return '#3cffd0';
};

const orderPlaylistEntriesForMix = (entries, mode) => {
  if (mode !== 'advanced' || entries.length <= 2) return entries;

  const pool = entries.slice(1);
  const ordered = [entries[0]];
  while (pool.length > 0) {
    const last = ordered[ordered.length - 1];
    const anchor = last.end || last.start;
    let bestIndex = 0;
    let bestScore = -Infinity;

    pool.forEach((entry, index) => {
      let score = 0;
      if (entry.player && entry.player !== last.player) score += 4;
      if (entry.type && entry.type !== last.type) score += 3;
      if (anchor && entry.start) {
        const distance = Math.hypot(anchor.x - entry.start.x, anchor.y - entry.start.y);
        score += Math.max(0, 4 - distance / 18);
      }
      score -= index * 0.01;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    ordered.push(pool.splice(bestIndex, 1)[0]);
  }
  return ordered;
};

const mergePlaylistEntriesForMix = (entries = [], videoCfg = DEFAULT_VIDEO_CONFIG) => {
  const minGap = Number(videoCfg.min_clip_gap ?? DEFAULT_VIDEO_CONFIG.min_clip_gap);
  const groups = [];

  entries.forEach((entry) => {
    const lastGroup = groups[groups.length - 1];
    const canMerge = Boolean(
      lastGroup
      && lastGroup.matchId === entry.matchId
      && lastGroup.periodId === entry.periodId
      && Number.isFinite(lastGroup.windowEnd)
      && Number.isFinite(entry.windowStart)
      && entry.windowStart <= lastGroup.windowEnd + minGap
    );

    if (canMerge) {
      lastGroup.entries.push(entry);
      lastGroup.windowStart = Math.min(lastGroup.windowStart, entry.windowStart);
      lastGroup.windowEnd = Math.max(lastGroup.windowEnd, entry.windowEnd);
      return;
    }

    groups.push({
      matchId: entry.matchId,
      periodId: entry.periodId,
      windowStart: entry.windowStart,
      windowEnd: entry.windowEnd,
      entries: [entry],
    });
  });

  return groups.map((group, index) => {
    if (group.entries.length === 1) return group.entries[0];

    const eventIds = [...new Set(group.entries.flatMap((entry) => entry.eventIds || []).filter(Boolean))];
    const first = group.entries[0];
    return {
      ...first,
      key: `playlist-merge-${group.matchId}-${Math.round(group.windowStart * 10)}-${Math.round(group.windowEnd * 10)}-${index}`,
      mergedCount: group.entries.length,
      clip: {
        match_id: group.matchId,
        event_id: eventIds[0],
        event_ids: eventIds,
        sequence_id: `playlist-merge-${group.matchId}-${Math.round(group.windowStart * 10)}-${Math.round(group.windowEnd * 10)}-${index}`,
        sequence_start_seconds: group.windowStart,
        sequence_end_seconds: group.windowEnd,
        sequence_period_id: group.periodId,
        trim_before_seconds: 0,
        trim_after_seconds: 0,
      },
    };
  });
};

const PlaylistSpatialLayer = ({ items, selectedItem, onSelect, projectPoint }) => (
  <g>
    {items.map((item, index) => {
      const x = toNumber(item.x);
      const y = toNumber(item.y);
      if (x === null || y === null) return null;
      const start = projectPoint(x, y);
      const endRaw = getEndCoordinates(item);
      const end = endRaw ? projectPoint(endRaw.x, endRaw.y) : null;
      if (!start) return null;

      const selected = String(selectedItem?.playlist_item_id || selectedItem?.id) === String(item.playlist_item_id || item.id);
      const color = itemColor(item);
      return (
        <g
          key={item.playlist_item_id || item.id || index}
          className="cursor-pointer pointer-events-auto"
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(item);
          }}
        >
          {end && (
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={color}
              strokeWidth={selected ? 0.85 : 0.45}
              strokeOpacity={selected ? 0.95 : 0.42}
              strokeLinecap="round"
            />
          )}
          <circle
            cx={start.x}
            cy={start.y}
            r={selected ? 1.8 : 1.15}
            fill={color}
            fillOpacity={selected ? 1 : 0.74}
            stroke={selected ? '#ffffff' : '#050505'}
            strokeWidth={selected ? 0.45 : 0.25}
          />
          {selected && (
            <circle
              cx={start.x}
              cy={start.y}
              r="3"
              fill="transparent"
              stroke={color}
              strokeWidth="0.28"
              strokeOpacity="0.55"
            />
          )}
        </g>
      );
    })}
  </g>
);

const TrimPlaybar = ({
  mode = 'detailed',
  disabled = false,
  periodId,
  rawStart,
  rawEnd,
  trimBefore,
  trimAfter,
  onTrimBeforeChange,
  onTrimAfterChange,
}) => {
  const trackRef = useRef(null);
  const start = Number(rawStart);
  const end = Number(rawEnd);
  const hasWindow = Number.isFinite(start) && Number.isFinite(end);
  const baseStart = hasWindow ? start : 0;
  const baseEnd = hasWindow ? Math.max(end, start) : 0;
  const before = clamp(Number(trimBefore || 0), -PLAYBAR_TRIM_RANGE, PLAYBAR_TRIM_RANGE);
  const after = clamp(Number(trimAfter || 0), -PLAYBAR_TRIM_RANGE, PLAYBAR_TRIM_RANGE);
  const timelineStart = Math.max(0, baseStart - PLAYBAR_TRIM_RANGE);
  const timelineEnd = baseEnd + PLAYBAR_TRIM_RANGE;
  const total = Math.max(1, timelineEnd - timelineStart);
  const rawClipStart = baseStart - before;
  const rawClipEnd = baseEnd + after;
  const clipStart = clamp(rawClipStart, timelineStart, timelineEnd - MIN_TRIM_CLIP_DURATION);
  const clipEnd = Math.max(
    clipStart + MIN_TRIM_CLIP_DURATION,
    clamp(rawClipEnd, timelineStart + MIN_TRIM_CLIP_DURATION, timelineEnd)
  );
  const pct = (seconds) => clamp(((seconds - timelineStart) / total) * 100, 0, 100);
  const leftPct = pct(clipStart);
  const actionStartPct = pct(baseStart);
  const actionEndPct = pct(baseEnd);
  const rightPct = pct(clipEnd);
  const isCompact = mode === 'compact';

  const setBeforeFromClipStart = (seconds) => {
    const bounded = clamp(seconds, timelineStart, clipEnd - MIN_TRIM_CLIP_DURATION);
    onTrimBeforeChange(Math.round(baseStart - bounded));
  };

  const setAfterFromClipEnd = (seconds) => {
    const bounded = clamp(seconds, clipStart + MIN_TRIM_CLIP_DURATION, timelineEnd);
    onTrimAfterChange(Math.round(bounded - baseEnd));
  };

  const startDrag = (side) => (event) => {
    if (disabled || !hasWindow || !trackRef.current) return;
    event.preventDefault();
    const rect = trackRef.current.getBoundingClientRect();

    const updateFromClientX = (clientX) => {
      const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const seconds = timelineStart + ratio * total;
      if (side === 'left') {
        setBeforeFromClipStart(seconds);
      } else {
        setAfterFromClipEnd(seconds);
      }
    };

    const handleMove = (moveEvent) => updateFromClientX(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    updateFromClientX(event.clientX);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  if (!hasWindow) {
    return (
      <div className="rounded-[3px] border border-white/10 bg-black/25 px-4 py-5 text-center verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#666]">
        Rognage indisponible pour cet item
      </div>
    );
  }

  return (
    <div className={`${isCompact ? 'space-y-2' : 'space-y-4'} ${disabled ? 'pointer-events-none opacity-45' : ''}`}>
      {!isCompact && (
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="verge-label-mono text-[8px] font-black uppercase tracking-[0.22em] text-[#949494]">
            Playbar de rognage
          </div>
          <div className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#3cffd0]">
            {formatSecondsClock(clipStart, periodId)} - {formatSecondsClock(clipEnd, periodId)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-[2px] border border-white/10 bg-black/30 px-2 py-1">
            <span className="verge-label-mono text-[7px] font-black uppercase tracking-[0.16em] text-[#666]">Avant</span>
            <input
              type="number"
              min={-PLAYBAR_TRIM_RANGE}
              max={PLAYBAR_TRIM_RANGE}
              value={trimBefore}
              onChange={(event) => setBeforeFromClipStart(baseStart - (Number(event.target.value) || 0))}
              className="h-7 w-12 bg-transparent text-right verge-label-mono text-[9px] font-black text-white outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-[2px] border border-white/10 bg-black/30 px-2 py-1">
            <span className="verge-label-mono text-[7px] font-black uppercase tracking-[0.16em] text-[#666]">Apres</span>
            <input
              type="number"
              min={-PLAYBAR_TRIM_RANGE}
              max={PLAYBAR_TRIM_RANGE}
              value={trimAfter}
              onChange={(event) => setAfterFromClipEnd(baseEnd + (Number(event.target.value) || 0))}
              className="h-7 w-12 bg-transparent text-right verge-label-mono text-[9px] font-black text-white outline-none"
            />
          </label>
        </div>
      </div>
      )}

      {isCompact && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-white">
              {formatSecondsClock(clipStart, periodId)} - {formatSecondsClock(clipEnd, periodId)}
            </div>
            <div className="mt-0.5 verge-label-mono text-[7px] font-black uppercase tracking-[0.14em] text-[#666]">
              Avant {trimBefore}s / Apres {trimAfter}s
            </div>
          </div>
          <div className="shrink-0 rounded-[2px] border border-white/10 bg-black/30 px-2 py-1 verge-label-mono text-[7px] font-black uppercase tracking-[0.12em] text-[#3cffd0]">
            {Math.max(0, Math.round(clipEnd - clipStart))}s
          </div>
        </div>
      )}

      <div className={`relative ${isCompact ? 'pb-1 pt-4' : 'pb-8 pt-10'}`}>
        <div ref={trackRef} className={`relative select-none rounded-[3px] border border-white/10 bg-[#40505a]/55 ${isCompact ? 'h-6' : 'h-9'}`}>
          <div className="absolute inset-0 bg-[#40505a]" />
          <div className="absolute inset-y-0 bg-[#0b7ea8]/70" style={{ left: `${actionStartPct}%`, right: `${100 - actionEndPct}%` }} />
          <div className="absolute inset-y-0 bg-[#56fff0]/75 shadow-[0_0_18px_rgba(86,255,240,0.25)]" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />

          <button
            type="button"
            onPointerDown={startDrag('left')}
            className={`absolute top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 cursor-ew-resize flex-col items-center outline-none ${isCompact ? 'scale-75' : ''}`}
            style={{ left: `${leftPct}%` }}
            title="Glisser pour ajuster le debut du clip"
          >
            <span className={`absolute bottom-[calc(100%+8px)] whitespace-nowrap rounded-[2px] border border-white/10 bg-black/80 px-2 py-1 verge-label-mono text-[7px] font-black uppercase tracking-[0.08em] text-white ${isCompact ? 'hidden' : ''}`}>
              {formatSignedSeconds(clipStart - baseStart)} ({formatSecondsClock(clipStart, periodId)})
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-black/50 bg-[#151515] text-[#3cffd0] shadow-xl">‹</span>
          </button>

          <div
            className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${actionStartPct}%` }}
          >
            <span className={`${isCompact ? 'h-8' : 'h-12'} w-1 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)]`} />
            <span className={`absolute top-[calc(100%+8px)] whitespace-nowrap rounded-[2px] border border-white/10 bg-black/80 px-2 py-1 verge-label-mono text-[7px] font-black uppercase tracking-[0.08em] text-white ${isCompact ? 'hidden' : ''}`}>
              0s ({formatSecondsClock(baseStart, periodId)})
            </span>
          </div>

          <button
            type="button"
            onPointerDown={startDrag('right')}
            className={`absolute top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 cursor-ew-resize flex-col items-center outline-none ${isCompact ? 'scale-75' : ''}`}
            style={{ left: `${rightPct}%` }}
            title="Glisser pour ajuster la fin du clip"
          >
            <span className={`absolute bottom-[calc(100%+8px)] whitespace-nowrap rounded-[2px] border border-white/10 bg-black/80 px-2 py-1 verge-label-mono text-[7px] font-black uppercase tracking-[0.08em] text-white ${isCompact ? 'hidden' : ''}`}>
              {formatSignedSeconds(clipEnd - baseEnd)} ({formatSecondsClock(clipEnd, periodId)})
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-black/50 bg-[#151515] text-[#3cffd0] shadow-xl">›</span>
          </button>
        </div>

        {!isCompact && (
          <>
            <span className="absolute left-0 bottom-0 verge-label-mono text-[8px] font-black uppercase tracking-[0.1em] text-white">
              -{PLAYBAR_TRIM_RANGE}s ({formatSecondsClock(timelineStart, periodId)})
            </span>
            <span className="absolute right-0 bottom-0 verge-label-mono text-[8px] font-black uppercase tracking-[0.1em] text-white">
              +{PLAYBAR_TRIM_RANGE}s ({formatSecondsClock(timelineEnd, periodId)})
            </span>
          </>
        )}
      </div>
    </div>
  );
};

const PlaylistExplorer = ({ onPlayVideo, isVideoLoading = false }) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [playingItemId, setPlayingItemId] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [activeSurface, setActiveSurface] = useState('map');
  const [displayMode, setDisplayMode] = useState('detailed');
  const [trimBefore, setTrimBefore] = useState(DEFAULT_TRIM_BEFORE);
  const [trimAfter, setTrimAfter] = useState(DEFAULT_TRIM_AFTER);
  const [savingTrim, setSavingTrim] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState(null);
  const [localVideoLoading, setLocalVideoLoading] = useState(false);
  const [localVideoError, setLocalVideoError] = useState(null);
  const [mixMode, setMixMode] = useState('standard');
  const [mixLoading, setMixLoading] = useState(false);
  const [mixDownloadLoading, setMixDownloadLoading] = useState(false);
  const [error, setError] = useState(null);
  const { projectPoint } = usePitchProjection('horizontal');

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => String(playlist.id) === String(selectedPlaylistId)),
    [playlists, selectedPlaylistId]
  );

  const filteredPlaylists = useMemo(() => {
    const query = playlistSearch.trim().toLowerCase();
    if (!query) return playlists;
    return playlists.filter((playlist) => String(playlist.name || '').toLowerCase().includes(query));
  }, [playlists, playlistSearch]);

  const selectOptions = useMemo(() => {
    if (!selectedPlaylist) return filteredPlaylists;
    const hasSelected = filteredPlaylists.some((playlist) => String(playlist.id) === String(selectedPlaylist.id));
    return hasSelected ? filteredPlaylists : [selectedPlaylist, ...filteredPlaylists];
  }, [filteredPlaylists, selectedPlaylist]);

  const playlistTotals = useMemo(() => ({
    playlists: playlists.length,
    totalItems: playlists.reduce((sum, playlist) => sum + Number(playlist.item_count || 0), 0),
    selectedItems: Number(selectedPlaylist?.item_count || items.length || 0),
    hydratedItems: items.length,
  }), [items.length, playlists, selectedPlaylist]);

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    setError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || 'PLAYLISTS_FETCH_FAILED');
      const nextPlaylists = json.playlists || [];
      setPlaylists(nextPlaylists);
      setSelectedPlaylistId((current) => (
        nextPlaylists.some((playlist) => String(playlist.id) === String(current))
          ? current
          : nextPlaylists[0]?.id || null
      ));
    } catch (err) {
      setError(err.message || 'Erreur playlists');
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const fetchItems = async (playlistId) => {
    if (!playlistId) {
      setItems([]);
      setSelectedItem(null);
      return;
    }

    setLoadingItems(true);
    setError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists/${playlistId}/items`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || 'PLAYLIST_ITEMS_FETCH_FAILED');
      const nextItems = json.items || [];
      setItems(nextItems);
      setSelectedItem(nextItems[0] || null);
    } catch (err) {
      setError(err.message || 'Erreur items playlist');
      setItems([]);
      setSelectedItem(null);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    fetchItems(selectedPlaylistId);
  }, [selectedPlaylistId]);

  useEffect(() => {
    setLocalVideoUrl(null);
    setLocalVideoError(null);
    setTrimBefore(Number(selectedItem?.trim_before_seconds ?? DEFAULT_TRIM_BEFORE));
    setTrimAfter(Number(selectedItem?.trim_after_seconds ?? DEFAULT_TRIM_AFTER));
  }, [selectedItem?.playlist_item_id, selectedItem?.id]);

  const hasSavedTrim = selectedItem?.trim_before_seconds !== null
    && selectedItem?.trim_before_seconds !== undefined
    && selectedItem?.trim_after_seconds !== null
    && selectedItem?.trim_after_seconds !== undefined;
  const hasTrimChanges = Boolean(selectedItem) && (
    Number(trimBefore) !== Number(selectedItem?.trim_before_seconds ?? DEFAULT_TRIM_BEFORE)
    || Number(trimAfter) !== Number(selectedItem?.trim_after_seconds ?? DEFAULT_TRIM_AFTER)
  );

  const playlistVideoConfig = readVideoConfig();

  const selectedVideoPayload = useMemo(
    () => getItemVideoPayload(selectedItem, { before: trimBefore, after: trimAfter, minGap: playlistVideoConfig.min_clip_gap }),
    [selectedItem, trimAfter, trimBefore, playlistVideoConfig.min_clip_gap]
  );

  const playlistMixEntries = useMemo(() => {
    const selectedKey = getPlaylistItemKey(selectedItem);
    return items.map((item) => {
      const isSelected = selectedKey && getPlaylistItemKey(item) === selectedKey;
      const before = isSelected ? trimBefore : Number(item?.trim_before_seconds ?? DEFAULT_TRIM_BEFORE);
      const after = isSelected ? trimAfter : Number(item?.trim_after_seconds ?? DEFAULT_TRIM_AFTER);
      const payload = getItemVideoPayload(item, { before, after, minGap: playlistVideoConfig.min_clip_gap });
      if (!payload) return null;
      const periodId = getItemPeriodId(item);
      const rawStart = getItemMatchSeconds(item, payload.sequence_start_seconds);
      const rawEnd = getItemMatchSeconds(item, payload.sequence_end_seconds ?? payload.sequence_start_seconds);
      const windowStart = Number.isFinite(rawStart) ? Math.max(0, rawStart - before) : null;
      const windowEnd = Number.isFinite(rawEnd) ? rawEnd + after : null;
      const eventIds = payload.event_ids || [payload.event_id].filter(Boolean);
      return {
        key: getPlaylistItemKey(item),
        type: String(getItemLabel(item)).toLowerCase(),
        player: getItemPlayer(item),
        start: getStartCoordinates(item),
        end: getEndCoordinates(item),
        matchId: payload.match_id,
        periodId,
        windowStart,
        windowEnd,
        eventIds,
        clip: {
          match_id: payload.match_id,
          event_id: payload.event_id,
          event_ids: payload.event_ids,
          sequence_id: payload.sequence_id,
          sequence_start_seconds: payload.sequence_start_seconds,
          sequence_end_seconds: payload.sequence_end_seconds,
          sequence_period_id: payload.sequence_period_id,
          trim_before_seconds: payload.before_buffer,
          trim_after_seconds: payload.after_buffer,
        },
      };
    }).filter(Boolean);
  }, [items, selectedItem, trimAfter, trimBefore, playlistVideoConfig.min_clip_gap]);

  const orderedPlaylistMixEntries = useMemo(
    () => orderPlaylistEntriesForMix(playlistMixEntries, mixMode),
    [mixMode, playlistMixEntries]
  );

  const mergedPlaylistMixEntries = useMemo(
    () => mergePlaylistEntriesForMix(orderedPlaylistMixEntries, playlistVideoConfig),
    [orderedPlaylistMixEntries, playlistVideoConfig.min_clip_gap]
  );

  const playlistMixMatchIds = useMemo(
    () => [...new Set(mergedPlaylistMixEntries.map((entry) => entry.matchId).filter(Boolean))],
    [mergedPlaylistMixEntries]
  );

  const canGeneratePlaylistMix = mergedPlaylistMixEntries.length > 0
    && mergedPlaylistMixEntries.every((entry) => entry.matchId);
  const playlistMergeCount = Math.max(0, orderedPlaylistMixEntries.length - mergedPlaylistMixEntries.length);

  const previewStart = selectedItem?.item_kind === 'sequence'
    ? toNumber(selectedItem?.start_seconds ?? selectedItem?.sequence_start_seconds)
    : (Number(selectedItem?.minute ?? selectedItem?.min ?? 0) * 60 + Number(selectedItem?.sec ?? selectedItem?.second ?? 0));
  const previewEnd = selectedItem?.item_kind === 'sequence'
    ? toNumber(selectedItem?.end_seconds ?? selectedItem?.sequence_end_seconds)
    : previewStart;
  const selectedPeriodId = selectedItem?.period_id ?? selectedItem?.period ?? selectedItem?.events?.[0]?.period_id ?? selectedItem?.events?.[0]?.period;
  const finalPreviewStart = Number.isFinite(previewStart) ? Math.max(0, previewStart - Number(trimBefore || 0)) : null;
  const finalPreviewEnd = Number.isFinite(previewEnd) ? previewEnd + Number(trimAfter || 0) : null;

  const handleGenerateLocalVideo = async (item = selectedItem, event) => {
    event?.stopPropagation();
    const itemId = item?.playlist_item_id || item?.id;
    const isCurrentSelection = getPlaylistItemKey(item) === getPlaylistItemKey(selectedItem);
    const itemTrim = isCurrentSelection
      ? { before: trimBefore, after: trimAfter }
      : {
        before: Number(item?.trim_before_seconds ?? DEFAULT_TRIM_BEFORE),
        after: Number(item?.trim_after_seconds ?? DEFAULT_TRIM_AFTER),
      };
    const payload = getItemVideoPayload(item, itemTrim);
    if (!payload) {
      setLocalVideoError('Clip invalide: match_id/event_id manquant.');
      setActiveSurface('video');
      return;
    }

    setSelectedItem(item);
    setActiveSurface('video');
    setPlayingItemId(itemId);
    setLocalVideoLoading(true);
    setLocalVideoError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.detail || 'Erreur generation clip');

      const videoUrl = json.video_url || (json.job_id ? await pollVideoJob(json.job_id) : null);
      if (!videoUrl) throw new Error('Aucune URL video retournee.');
      setLocalVideoUrl(videoUrl);
    } catch (err) {
      setLocalVideoError(err.message || 'Erreur lecteur playlist');
    } finally {
      setPlayingItemId(null);
      setLocalVideoLoading(false);
    }
  };

  const handlePlay = async (item, event) => {
    event?.stopPropagation();
    if (!item) return;
    await handleGenerateLocalVideo(item, event);
  };

  const handleDeleteItem = async (item, event) => {
    event?.stopPropagation();
    if (!item || !selectedPlaylistId) return;
    const itemId = item.playlist_item_id || item.id;
    if (!itemId) return;
    const confirmed = window.confirm('Retirer ce clip de la playlist ?');
    if (!confirmed) return;

    setDeletingItemId(itemId);
    setError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists/${selectedPlaylistId}/items/${itemId}`, {
        method: 'DELETE'
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || 'PLAYLIST_ITEM_DELETE_FAILED');

      setItems((currentItems) => {
        const nextItems = currentItems.filter((current) => String(current.playlist_item_id || current.id) !== String(itemId));
        setSelectedItem((currentSelected) => {
          if (String(currentSelected?.playlist_item_id || currentSelected?.id) !== String(itemId)) return currentSelected;
          return nextItems[0] || null;
        });
        return nextItems;
      });
      setPlaylists((currentPlaylists) => currentPlaylists.map((playlist) => (
        String(playlist.id) === String(selectedPlaylistId)
          ? { ...playlist, item_count: Math.max(0, Number(playlist.item_count || 0) - 1) }
          : playlist
      )));
    } catch (err) {
      setError(err.message || 'Erreur suppression item');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleSaveTrim = async () => {
    if (!selectedItem || !selectedPlaylistId) return;
    const itemId = selectedItem.playlist_item_id || selectedItem.id;
    if (!itemId) return;

    setSavingTrim(true);
    setLocalVideoError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists/${selectedPlaylistId}/items/${itemId}/trim`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trim_before_seconds: Number(trimBefore),
          trim_after_seconds: Number(trimAfter),
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.detail || 'TRIM_SAVE_FAILED');

      const patch = {
        trim_before_seconds: json.trim_before_seconds,
        trim_after_seconds: json.trim_after_seconds,
        trim_updated_at: json.trim_updated_at,
      };
      setSelectedItem((current) => current ? { ...current, ...patch } : current);
      setItems((currentItems) => currentItems.map((item) => (
        String(item.playlist_item_id || item.id) === String(itemId)
          ? { ...item, ...patch }
          : item
      )));
    } catch (err) {
      setLocalVideoError(err.message || 'Erreur sauvegarde rognage');
    } finally {
      setSavingTrim(false);
    }
  };

  const handleGeneratePlaylistMix = async () => {
    if (!canGeneratePlaylistMix) {
      setLocalVideoError('Aucun clip valide dans la playlist ou match_id manquant.');
      setActiveSurface('video');
      return;
    }

    setActiveSurface('video');
    setMixLoading(true);
    setLocalVideoLoading(true);
    setLocalVideoUrl(null);
    setLocalVideoError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/playlist-mix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: playlistMixMatchIds[0] || null,
          playlist_id: selectedPlaylistId,
          clips: mergedPlaylistMixEntries.map((entry) => entry.clip),
          mix_mode: mixMode,
          min_clip_gap: playlistVideoConfig.min_clip_gap,
          delivery: 'view',
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.detail || 'Erreur generation mixage playlist');

      const videoUrl = json.video_url || (json.job_id ? await pollVideoJob(json.job_id) : null);
      if (!videoUrl) throw new Error('Aucune URL video retournee pour le mixage.');
      setLocalVideoUrl(videoUrl);
    } catch (err) {
      setLocalVideoError(err.message || 'Erreur mixage playlist');
    } finally {
      setMixLoading(false);
      setLocalVideoLoading(false);
    }
  };

  const handleDownloadPlaylistMix = async () => {
    if (!canGeneratePlaylistMix) {
      setLocalVideoError('Aucun clip valide dans la playlist ou match_id manquant.');
      return;
    }

    setMixDownloadLoading(true);
    setLocalVideoError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/playlist-mix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: playlistMixMatchIds[0] || null,
          playlist_id: selectedPlaylistId,
          clips: mergedPlaylistMixEntries.map((entry) => entry.clip),
          mix_mode: mixMode,
          min_clip_gap: playlistVideoConfig.min_clip_gap,
          delivery: 'download',
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.detail || 'Erreur generation Mixage DL playlist');

      const videoUrl = json.video_url || (json.job_id ? await pollVideoJob(json.job_id) : null);
      if (!videoUrl) throw new Error('Aucune URL video retournee pour le Mixage DL.');

      const blobResponse = await fetch(videoUrl);
      const blob = await blobResponse.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = `OptaVision_Playlist_MixageDL_${mixMode}_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (err) {
      setLocalVideoError(err.message || 'Erreur Mixage DL playlist');
    } finally {
      setMixDownloadLoading(false);
    }
  };

  return (
    <div className="h-full w-full overflow-hidden bg-[#050505] p-6 lg:p-8">
      <div className="mx-auto grid h-full w-full max-w-[1800px] grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[4px] border border-white/10 bg-[#1a1a1a] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#2d2d2d] px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#3cffd0] text-black">
                <ListMusic size={18} />
              </div>
              <div>
                <h2 className="verge-label-mono text-[11px] font-black uppercase tracking-[0.25em] text-white">Playlist</h2>
                <p className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#3cffd0]">spatial review board</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchPlaylists}
              disabled={loadingPlaylists}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[#949494] transition-all hover:border-[#3cffd0] hover:text-[#3cffd0] disabled:opacity-50"
            >
              {loadingPlaylists ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
            </button>
          </div>

          <div className="shrink-0 space-y-4 border-b border-white/10 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="verge-label-mono text-[8px] font-black uppercase tracking-[0.25em] text-[#949494]">
                  Playlist active
                </label>
                <span className="verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#3cffd0]">
                  {playlistTotals.playlists} listes
                </span>
              </div>
              <select
                value={selectedPlaylistId || ''}
                onChange={(event) => setSelectedPlaylistId(event.target.value || null)}
                disabled={loadingPlaylists || playlists.length === 0}
                className="h-12 w-full rounded-[3px] border border-white/10 bg-black/40 px-4 verge-label-mono text-[10px] font-black uppercase tracking-[0.18em] text-white outline-none transition-colors focus:border-[#3cffd0]/70 disabled:opacity-40"
              >
                <option value="" className="bg-[#131313] text-white">Aucune playlist</option>
                {selectOptions.map((playlist) => (
                  <option key={playlist.id} value={playlist.id} className="bg-[#131313] text-white">
                    {playlist.name} - {playlist.item_count || 0} items
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[3px] border border-[#ffd03c]/20 bg-[#ffd03c]/[0.04] p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="verge-label-mono text-[8px] font-black uppercase tracking-[0.22em] text-[#ffd03c]">
                    Mixage playlist
                  </div>
                  <div className="mt-1 verge-label-mono text-[7px] font-black uppercase tracking-[0.16em] text-[#777]">
                    {mergedPlaylistMixEntries.length} clips - {playlistMixMatchIds.length || 0} matchs
                  </div>
                </div>
                {(mixLoading || mixDownloadLoading) && <Loader2 size={14} className="shrink-0 animate-spin text-[#ffd03c]" />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['standard', 'Standard'],
                  ['advanced', 'Avance'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMixMode(value)}
                    className={`h-9 rounded-[2px] border px-2 verge-label-mono text-[7px] font-black uppercase tracking-[0.14em] transition-all ${mixMode === value ? 'border-[#ffd03c]/60 bg-[#ffd03c] text-black' : 'border-white/10 bg-black/30 text-[#949494] hover:border-[#ffd03c]/40 hover:text-[#ffd03c]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleGeneratePlaylistMix}
                disabled={!canGeneratePlaylistMix || localVideoLoading || mixLoading || mixDownloadLoading}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[3px] border border-[#ffd03c]/40 bg-[#ffd03c] px-3 verge-label-mono text-[8px] font-black uppercase tracking-[0.16em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                title="Lire toute la playlist dans l'app avec les rognages individuels"
              >
                {mixLoading ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
                Mixage View
              </button>
              <button
                type="button"
                onClick={handleDownloadPlaylistMix}
                disabled={!canGeneratePlaylistMix || localVideoLoading || mixLoading || mixDownloadLoading}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-[3px] border border-[#ffd03c]/35 bg-black/30 px-3 verge-label-mono text-[8px] font-black uppercase tracking-[0.16em] text-[#ffd03c] transition-all hover:border-[#ffd03c]/70 hover:bg-[#ffd03c]/10 disabled:cursor-not-allowed disabled:opacity-40"
                title="Telecharger toute la playlist avec les rognages individuels"
              >
                {mixDownloadLoading ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
                Mixage DL
              </button>
              {playlistMixMatchIds.length > 1 && (
                <div className="mt-2 rounded-[2px] border border-[#ffd03c]/20 bg-black/25 px-3 py-2 verge-label-mono text-[7px] font-black uppercase tracking-[0.12em] text-[#ffd03c]">
                  Multi-match actif
                </div>
              )}
              {playlistMergeCount > 0 && (
                <div className="mt-2 rounded-[2px] border border-[#3cffd0]/20 bg-black/25 px-3 py-2 verge-label-mono text-[7px] font-black uppercase tracking-[0.12em] text-[#3cffd0]">
                  {playlistMergeCount} merges actifs - gap {playlistVideoConfig.min_clip_gap}s
                </div>
              )}
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3cffd0]" />
              <input
                value={playlistSearch}
                onChange={(event) => setPlaylistSearch(event.target.value)}
                placeholder="Filtrer les playlists"
                className="h-10 w-full rounded-[3px] border border-white/10 bg-black/25 pl-9 pr-3 verge-label-mono text-[9px] font-black uppercase tracking-[0.16em] text-white outline-none placeholder:text-[#555] focus:border-[#3cffd0]/60"
              />
            </div>

            {selectedPlaylist && (
              <div className="rounded-[3px] border border-[#3cffd0]/25 bg-[#3cffd0]/10 p-4">
                <div className="truncate verge-label-mono text-[10px] font-black uppercase tracking-[0.22em] text-white">
                  {selectedPlaylist.name}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ['Items', playlistTotals.selectedItems],
                    ['Hydrates', playlistTotals.hydratedItems],
                    ['Creee', formatDate(selectedPlaylist.created_at)],
                    ['Total DB', playlistTotals.totalItems],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[2px] border border-white/10 bg-black/25 px-3 py-2">
                      <div className="verge-label-mono text-[7px] font-black uppercase tracking-[0.2em] text-[#949494]">{label}</div>
                      <div className="mt-1 truncate verge-label-mono text-[10px] font-black uppercase text-[#3cffd0]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingPlaylists && playlists.length === 0 && (
              <div className="flex h-20 flex-col items-center justify-center rounded-[3px] border border-white/10 bg-black/20 text-[#444]">
                <Database size={20} />
                <div className="mt-3 verge-label-mono text-[8px] font-black uppercase tracking-[0.25em]">Aucune playlist</div>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <div className="truncate verge-label-mono text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  {selectedPlaylist?.name || 'Selection'}
                </div>
                <div className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494]">
                  {items.length} clips hydrates - {items.filter((item) => item.item_kind === 'sequence').length} sequences
                </div>
              </div>
              <div className="flex shrink-0 rounded-[3px] border border-white/10 bg-black/30 p-1">
                {[
                  ['compact', 'Compact'],
                  ['detailed', 'Detail'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDisplayMode(value)}
                    className={`rounded-[2px] px-2.5 py-1.5 verge-label-mono text-[7px] font-black uppercase tracking-[0.14em] transition-all ${displayMode === value ? 'bg-[#3cffd0] text-black' : 'text-[#949494] hover:bg-white/10 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto styled-scrollbar-verge">
              {loadingItems ? (
                <div className="flex h-full items-center justify-center text-[#3cffd0]">
                  <Loader2 size={26} className="animate-spin" />
                </div>
              ) : items.length > 0 ? (
                items.map((item, index) => {
                  const selected = String(selectedItem?.playlist_item_id || selectedItem?.id) === String(item.playlist_item_id || item.id);
                  const currentId = item.playlist_item_id || item.id;
                  const details = getItemDetails(item);
                  const contextParts = getItemContextParts(item);
                  const color = itemColor(item);
                  const compact = displayMode === 'compact';
                  const compactDetails = item?.item_kind === 'sequence'
                    ? details.filter(([label]) => label === 'Score').slice(0, 1)
                    : details.filter(([label]) => label !== 'Dist.').slice(0, 2);
                  return (
                    <button
                      key={currentId || index}
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className={`group flex w-full justify-between gap-3 border-b border-white/[0.04] px-4 text-left transition-all ${compact ? 'items-center py-2' : 'items-start py-3'} ${selected ? 'bg-[#3cffd0]/10 border-l-2 border-l-[#3cffd0]' : 'hover:bg-[#3cffd0]/5'}`}
                    >
                      <div className="min-w-0 flex-1">
                        {compact ? (
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}66` }}
                            />
                            <span className="shrink-0 verge-label-mono text-[8px] font-black text-[#3cffd0]">{getItemClock(item)}</span>
                            <span className="min-w-0 flex-1 truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.12em] text-white">
                              {getCompactItemLabel(item)}
                            </span>
                            <span className="hidden shrink-0 truncate verge-label-mono text-[7px] font-black uppercase tracking-[0.1em] text-[#949494] lg:block lg:max-w-[90px]">
                              {getItemPlayer(item)}
                            </span>
                            {compactDetails.map(([label, value]) => (
                              <span key={`${currentId}-compact-${label}`} className="hidden shrink-0 rounded-[2px] border border-white/10 bg-black/25 px-1.5 py-0.5 verge-label-mono text-[6px] font-black uppercase tracking-[0.08em] text-[#949494] sm:inline-flex">
                                <span className="text-[#555]">{label}</span>
                                <span className="ml-1 text-white">{value}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-2">
                              <span
                                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}66` }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="shrink-0 verge-label-mono text-[8px] font-black text-[#3cffd0]">{getItemClock(item)}</span>
                                  <span className="truncate verge-label-mono text-[9px] font-black uppercase tracking-[0.12em] text-white">{getItemLabel(item)}</span>
                                </div>
                                <div className="mt-0.5 truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#949494]">
                                  {getItemPlayer(item)}
                                </div>
                                <div className="mt-0.5 truncate verge-label-mono text-[7px] font-black uppercase tracking-[0.12em] text-[#666]">
                                  {getItemMatch(item)}
                                </div>
                                {contextParts.length > 0 && (
                                  <div className="mt-0.5 truncate verge-label-mono text-[7px] font-black uppercase tracking-[0.1em] text-[#555]" title={contextParts.join(' / ')}>
                                    {contextParts.join(' / ')}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {details.slice(0, 4).map(([label, value]) => (
                                <span key={`${currentId}-${label}`} className="rounded-[2px] border border-white/10 bg-black/25 px-2 py-1 verge-label-mono text-[7px] font-black uppercase tracking-[0.1em] text-[#949494]">
                                  <span className="text-[#555]">{label}</span>
                                  <span className="ml-1 text-white">{value}</span>
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className={`flex shrink-0 ${compact ? 'flex-row gap-1' : 'flex-col gap-1.5'}`}>
                        <span
                          onClick={(event) => handlePlay(item, event)}
                          className={`flex items-center justify-center rounded-full border border-white/10 bg-black/30 text-[#949494] transition-all hover:border-[#3cffd0] hover:text-[#3cffd0] ${compact ? 'h-7 w-7' : 'h-8 w-8'}`}
                          title="Lancer la video"
                        >
                          {playingItemId === currentId || isVideoLoading ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={16} />}
                        </span>
                        <span
                          onClick={(event) => handleDeleteItem(item, event)}
                          className={`flex items-center justify-center rounded-full border border-white/10 bg-black/30 text-[#666] transition-all hover:border-[#ff4d4d]/60 hover:text-[#ff4d4d] ${compact ? 'h-7 w-7' : 'h-8 w-8'}`}
                          title="Retirer de la playlist"
                        >
                          {deletingItemId === currentId ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-[#333]">
                  <Database size={30} />
                  <div className="mt-4 verge-label-mono text-[9px] font-black uppercase tracking-[0.25em]">Aucun item</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="relative min-h-0 overflow-hidden rounded-[4px] border border-white/10 bg-[#101010] shadow-2xl">
          <div className="absolute left-6 top-6 z-30 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-[3px] border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-xl">
              <div className="h-2 w-2 rounded-full bg-[#3cffd0]" />
              <div>
                <div className="verge-label-mono text-[9px] font-black uppercase tracking-[0.25em] text-white">
                  {activeSurface === 'map' ? 'Projection spatiale' : 'Lecteur integre'}
                </div>
                <div className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#949494]">
                  {selectedItem ? getItemLabel(selectedItem) : 'Aucun item selectionne'}
                </div>
              </div>
            </div>
            <div className="flex rounded-[3px] border border-white/10 bg-black/55 p-1 backdrop-blur-xl">
              {[
                ['map', 'Map', Map],
                ['video', 'Lecteur', Film],
              ].map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveSurface(value)}
                  className={`flex items-center gap-2 rounded-[2px] px-3 py-2 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] transition-all ${activeSurface === value ? 'bg-[#3cffd0] text-black' : 'text-[#949494] hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeSurface === 'map' ? (
            <TacticalPitch
              orientation="horizontal"
              view="full"
              style={{ grass: '#111827', line: 'rgba(255,255,255,0.16)', background: '#050505' }}
              onClick={() => setSelectedItem(null)}
            >
              <PlaylistSpatialLayer
                items={items}
                selectedItem={selectedItem}
                onSelect={setSelectedItem}
                projectPoint={projectPoint}
              />
            </TacticalPitch>
          ) : (
            <div className="absolute inset-0 flex flex-col bg-[#050505] p-6 pt-28">
              <div className="min-h-0 flex-1 overflow-hidden rounded-[4px] border border-white/10 bg-black shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
                {localVideoLoading ? (
                  <div className="flex h-full flex-col items-center justify-center text-[#3cffd0]">
                    <Loader2 size={34} className="animate-spin" />
                    <div className="mt-5 verge-label-mono text-[9px] font-black uppercase tracking-[0.25em]">
                      {mixLoading ? 'Generation du Mixage View playlist' : mixDownloadLoading ? 'Generation du Mixage DL playlist' : 'Generation du clip rogne'}
                    </div>
                  </div>
                ) : localVideoUrl ? (
                  <video
                    key={localVideoUrl}
                    src={localVideoUrl}
                    controls
                    autoPlay
                    className="h-full w-full bg-black object-contain"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                    <Film size={42} className="text-[#3cffd0]/50" />
                    <div className="mt-5 verge-label-mono text-[11px] font-black uppercase tracking-[0.25em] text-white">
                      Lecteur playlist pret
                    </div>
                    <div className="mt-3 max-w-xl text-xs leading-relaxed text-[#949494]">
                      Selectionne un item, ajuste les marges avant/apres, puis genere le clip pour le previsualiser ici.
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid shrink-0 grid-cols-1 gap-4 rounded-[4px] border border-white/10 bg-[#1a1a1a] p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="verge-label-mono text-[9px] font-black uppercase tracking-[0.25em] text-white">Rognage temporel</div>
                      <div className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494]">
                        Fenetre: {formatSecondsClock(finalPreviewStart, selectedPeriodId)} - {formatSecondsClock(finalPreviewEnd, selectedPeriodId)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-[2px] border border-white/10 bg-black/30 px-3 py-2 text-[#3cffd0]">
                      <Scissors size={13} />
                      <span className="verge-label-mono text-[8px] font-black uppercase tracking-[0.18em]">Trim</span>
                    </div>
                  </div>

                  <TrimPlaybar
                    mode={displayMode}
                    disabled={!selectedItem}
                    periodId={selectedPeriodId}
                    rawStart={previewStart}
                    rawEnd={previewEnd}
                    trimBefore={trimBefore}
                    trimAfter={trimAfter}
                    onTrimBeforeChange={setTrimBefore}
                    onTrimAfterChange={setTrimAfter}
                  />
                </div>

                <div className="flex flex-col justify-between gap-3">
                  <div className="rounded-[2px] border border-white/10 bg-black/25 p-3">
                    <div className="truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494]">{getItemPlayer(selectedItem)}</div>
                    <div className="mt-1 truncate verge-label-mono text-[10px] font-black uppercase tracking-[0.14em] text-white">{selectedItem ? getItemLabel(selectedItem) : 'Aucun clip'}</div>
                    <div className="mt-1 truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#666]">{selectedItem ? getItemClock(selectedItem) : '--'}</div>
                    {selectedItem && getItemContextParts(selectedItem).length > 0 && (
                      <div className="mt-1 truncate verge-label-mono text-[7px] font-black uppercase tracking-[0.12em] text-[#666]" title={getItemContextParts(selectedItem).join(' / ')}>
                        {getItemContextParts(selectedItem).join(' / ')}
                      </div>
                    )}
                    <div className={`mt-2 verge-label-mono text-[7px] font-black uppercase tracking-[0.16em] ${hasSavedTrim ? 'text-[#3cffd0]' : 'text-[#666]'}`}>
                      {hasSavedTrim ? 'Rognage sauvegarde' : 'Rognage par defaut'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveTrim}
                    disabled={!selectedItem || savingTrim || !hasTrimChanges}
                    className="flex h-10 items-center justify-center gap-2 rounded-[3px] border border-white/10 bg-black/40 px-4 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494] transition-all hover:border-[#3cffd0]/50 hover:text-[#3cffd0] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingTrim ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateLocalVideo(selectedItem)}
                    disabled={!selectedVideoPayload || localVideoLoading || mixLoading || mixDownloadLoading}
                    className="flex h-11 items-center justify-center gap-2 rounded-[3px] border border-[#3cffd0]/40 bg-[#3cffd0] px-4 verge-label-mono text-[9px] font-black uppercase tracking-[0.2em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {localVideoLoading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={15} />}
                    Generer
                  </button>
                </div>
              </div>

              {localVideoError && (
                <div className="mt-3 rounded-[3px] border border-[#ff4d4d]/30 bg-[#ff4d4d]/10 px-4 py-3 verge-label-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#ff8a8a]">
                  {localVideoError}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="absolute bottom-6 left-6 right-6 z-30 rounded-[3px] border border-[#ff4d4d]/30 bg-[#ff4d4d]/10 px-4 py-3 verge-label-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#ff8a8a]">
              {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PlaylistExplorer;
