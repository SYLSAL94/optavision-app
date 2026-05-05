import { useEffect, useMemo, useState, useRef } from 'react';
import { Info, PlayCircle, Loader2, Download, Database, ListPlus } from 'lucide-react';
import { computeShotMap, ShotMapStaticSvg, shotMapRecipes } from '@withqwerty/campos-react';
import GoalFrameSVG from './GoalFrameSVG';

import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection, PITCH_DIMENSIONS as GLOBAL_DIMENSIONS } from '../../hooks/usePitchProjection';

const normalizeShotToAttackingGoal = (event) => {
  const x = Number(event?.x);
  const y = Number(event?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Normalisation : on ramène tous les tirs vers la même cage (x > 50)
  if (x < 50) return { x: 100 - x, y: 100 - y };
  return { x, y };
};

const calculateShotDistance = (event) => {
  const normalized = normalizeShotToAttackingGoal(event);
  if (!normalized) return null;
  const { x, y } = normalized;
  // Distance basée sur les dimensions FIFA réelles centralisées
  const dist_x = (x - 100) * (GLOBAL_DIMENSIONS.width / 100);
  const dist_y = (y - 50) * (GLOBAL_DIMENSIONS.height / 100);
  return Math.sqrt(dist_x ** 2 + dist_y ** 2);
};

const isGoalShot = (shot) => {
  const typeId = Number(shot?.type_id);
  const typeName = String(shot?.type_name || shot?.type || '').trim().toLowerCase();
  const status = String(shot?.shot_status || shot?.advanced_metrics?.shot_status || '').trim().toLowerCase();
  return shot?.isGoal === true || typeId === 16 || typeName === 'goal' || typeName === 'own goal' || status === 'goal';
};

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

const firstMetric = (event, metrics, keys) => {
  for (const key of keys) {
    const value = event?.[key] ?? metrics?.[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const hasMetricFlag = (metrics, key) => (
  metrics?.[key] === true || metrics?.[key] === 1 || metrics?.[key] === 'true'
);

const deriveBodyPart = (shot, metrics) => {
  const explicit = firstMetric(shot, metrics, ['body_part_name', 'bodyPart', 'body_part']);
  if (explicit) return explicit;
  if (hasMetricFlag(metrics, 'is_shot_head')) return 'Tete';
  if (hasMetricFlag(metrics, 'is_shot_left_footed')) return 'Pied gauche';
  if (hasMetricFlag(metrics, 'is_shot_right_footed')) return 'Pied droit';
  if (hasMetricFlag(metrics, 'is_shot_overhead')) return 'Retourne';
  return 'Non renseigne';
};

const deriveShotTags = (metrics) => {
  const tags = [];
  if (hasMetricFlag(metrics, 'is_shot_big_chance')) tags.push('Big chance');
  if (hasMetricFlag(metrics, 'is_shot_one_on_one')) tags.push('1v1');
  if (hasMetricFlag(metrics, 'is_shot_fast_break')) tags.push('Transition');
  if (hasMetricFlag(metrics, 'is_shot_from_corner')) tags.push('Corner');
  if (hasMetricFlag(metrics, 'is_shot_free_kick') || hasMetricFlag(metrics, 'is_shot_direct_free_kick')) tags.push('Coup franc');
  if (hasMetricFlag(metrics, 'is_shot_penalty')) tags.push('Penalty');
  if (hasMetricFlag(metrics, 'is_shot_assisted')) tags.push('Assiste');
  if (hasMetricFlag(metrics, 'is_shot_volley')) tags.push('Volee');
  if (hasMetricFlag(metrics, 'is_shot_first_touch')) tags.push('1ere touche');
  if (hasMetricFlag(metrics, 'is_shot_follows_dribble')) tags.push('Apres dribble');
  if (hasMetricFlag(metrics, 'is_shot_deflection')) tags.push('Deviation');
  return tags;
};

const statusLabel = (shot) => {
  const status = String(shot?.shot_status || shot?.type_name || shot?.type || 'Tir').trim();
  const normalized = status.toLowerCase();
  if (normalized === 'goal') return 'But';
  if (normalized === 'saved') return 'Arret';
  if (normalized === 'blocked') return 'Bloque';
  if (normalized === 'post') return 'Poteau';
  if (normalized === 'missed') return 'Manque';
  return status;
};

const formatMetric = (value, digits = 2) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : '-';
};

const CAMPOS_SHOTMAP_CONFIG = {
  ...shotMapRecipes.statsbomb.props,
  colorScale: 'turbo',
  crop: 'half',
  attackingDirection: 'up',
  side: 'attack',
};

const CAMPOS_PITCH_EXPORT_STYLE = {
  pitchPreset: 'dark',
  pitchColors: {
    fill: '#101010',
    lines: '#3a3a3a',
    markings: '#333333',
  },
};

const toFiniteNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toCamposPeriod = (value) => {
  const period = toFiniteNumber(value, 1);
  if (period >= 1 && period <= 5) return period;
  return 1;
};

const deriveCamposOutcome = (shot, metrics) => {
  const typeId = Number(shot?.type_id);
  const status = String(shot?.shot_status || metrics?.shot_status || shot?.type_name || shot?.type || '').trim().toLowerCase();
  if (shot?.isGoal === true || typeId === 16 || status.includes('goal')) return 'goal';
  if (typeId === 15 || status.includes('saved') || status.includes('arret')) return 'saved';
  if (status.includes('blocked') || status.includes('bloque')) return 'blocked';
  if (typeId === 14 || status.includes('post') || status.includes('woodwork') || status.includes('poteau')) return 'hit-woodwork';
  if (typeId === 13 || status.includes('missed') || status.includes('off target') || status.includes('manque')) return 'off-target';
  return 'other';
};

const deriveCamposBodyPart = (bodyPartName, metrics) => {
  const raw = String(bodyPartName || '').toLowerCase();
  if (raw.includes('head') || raw.includes('tete') || raw.includes('tÃªte') || hasMetricFlag(metrics, 'is_shot_head')) return 'head';
  if (raw.includes('left') || raw.includes('gauche') || hasMetricFlag(metrics, 'is_shot_left_footed')) return 'left-foot';
  if (raw.includes('right') || raw.includes('droit') || hasMetricFlag(metrics, 'is_shot_right_footed')) return 'right-foot';
  return 'other';
};

const deriveCamposContext = (metrics) => {
  if (hasMetricFlag(metrics, 'is_shot_penalty')) return 'penalty';
  if (hasMetricFlag(metrics, 'is_shot_direct_free_kick') || hasMetricFlag(metrics, 'is_shot_free_kick')) return 'direct-free-kick';
  if (hasMetricFlag(metrics, 'is_shot_from_corner')) return 'from-corner';
  if (hasMetricFlag(metrics, 'is_shot_fast_break')) return 'fast-break';
  if (hasMetricFlag(metrics, 'is_shot_set_piece')) return 'set-piece';
  return 'regular-play';
};

const toCamposShot = (shot) => {
  const normalized = normalizeShotToAttackingGoal(shot);
  if (!normalized) return null;

  const metrics = parseAdvancedMetrics(shot);
  const shotId = String(shot.opta_id ?? shot.id ?? `${shot.match_id || 'match'}-${shot.min ?? shot.minute ?? 0}-${shot.x}-${shot.y}`);
  const xg = toFiniteNumber(shot.xG ?? shot.xg, null);
  const xgot = toFiniteNumber(shot.xGOT ?? shot.xgot ?? shot.psxg, null);
  const goalMouthY = toFiniteNumber(firstMetric(shot, metrics, ['goal_mouth_y', 'goalMouthY']), null);
  const goalMouthZ = toFiniteNumber(firstMetric(shot, metrics, ['goal_mouth_z', 'goalMouthZ']), null);

  return {
    kind: 'shot',
    id: shotId,
    matchId: String(shot.match_id ?? shot.matchId ?? 'unknown-match'),
    teamId: String(shot.team_id ?? shot.teamId ?? 'unknown-team'),
    playerId: shot.player_id ?? shot.playerId ?? null,
    playerName: shot.playerName || shot.player_name || null,
    minute: toFiniteNumber(shot.minute ?? shot.min, 0),
    addedMinute: toFiniteNumber(shot.addedMinute ?? shot.added_minute, null),
    second: toFiniteNumber(shot.second ?? shot.sec, 0),
    period: toCamposPeriod(shot.period ?? shot.period_id),
    x: normalized.x,
    y: normalized.y,
    xg,
    xgot,
    outcome: deriveCamposOutcome(shot, metrics),
    bodyPart: deriveCamposBodyPart(shot.body_part_name || shot.bodyPart, metrics),
    isOwnGoal: String(shot.type_name || shot.type || '').toLowerCase().includes('own goal'),
    isPenalty: hasMetricFlag(metrics, 'is_shot_penalty'),
    context: deriveCamposContext(metrics),
    provider: 'opta',
    providerEventId: shotId,
    ...(goalMouthY !== null ? { goalMouthY } : {}),
    ...(goalMouthZ !== null ? { goalMouthZ } : {}),
    sourceMeta: {
      optaId: shot.opta_id ?? shot.id ?? null,
      status: shot.shot_status ?? metrics.shot_status ?? null,
    },
  };
};

const polygonPoints = (cx, cy, r, sides, rotation = -Math.PI / 2) => (
  Array.from({ length: sides }).map((_, index) => {
    const angle = rotation + (index / sides) * Math.PI * 2;
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(' ')
);

const CamposShotGlyph = ({ cx, cy, marker, isFocused, isDimmed, title, onClick }) => {
  const radius = (marker?.visualSize || 1) * (isFocused ? 1.28 : 1);
  const fill = marker?.fill || '#ff4d4d';
  const stroke = isFocused ? '#ffffff' : (marker?.stroke || '#ffffff');
  const fillOpacity = isDimmed ? 0.25 : (marker?.fillOpacity ?? 0.9);
  const strokeWidth = isFocused ? 0.48 : (marker?.outlineKey === 'goal' ? 0.36 : 0.24);
  const shape = marker?.shapeKey || 'circle';
  const commonProps = {
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    className: 'transition-all duration-300',
  };

  const glyph = (() => {
    if (shape === 'square') {
      return (
        <rect
          x={cx - radius}
          y={cy - radius}
          width={radius * 2}
          height={radius * 2}
          rx={radius * 0.18}
          {...commonProps}
        />
      );
    }
    if (shape === 'triangle') {
      return <polygon points={polygonPoints(cx, cy, radius * 1.25, 3)} {...commonProps} />;
    }
    if (shape === 'diamond') {
      return <polygon points={polygonPoints(cx, cy, radius * 1.2, 4, 0)} {...commonProps} />;
    }
    if (shape === 'hexagon') {
      return <polygon points={polygonPoints(cx, cy, radius * 1.12, 6)} {...commonProps} />;
    }
    return <circle cx={cx} cy={cy} r={radius} {...commonProps} />;
  })();

  return (
    <g
      className="cursor-pointer pointer-events-auto"
      opacity={isDimmed ? 0.55 : 1}
      style={{ filter: isFocused ? 'drop-shadow(0 0 4px rgba(255,255,255,0.65))' : 'none' }}
      onClick={onClick}
    >
      {title && <title>{title}</title>}
      {marker?.outlineKey === 'goal' && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 0.9}
          fill="transparent"
          stroke="#3cffd0"
          strokeWidth="0.18"
          strokeOpacity={isFocused ? 0.85 : 0.55}
          className="pointer-events-none"
        />
      )}
      {glyph}
    </g>
  );
};

const LegendShapeSwatch = ({ shapeKey, color = '#949494' }) => {
  const cx = 7;
  const cy = 7;
  const r = 4.2;
  if (shapeKey === 'square') return <svg width="14" height="14"><rect x="3" y="3" width="8" height="8" rx="1" fill={color} /></svg>;
  if (shapeKey === 'triangle') return <svg width="14" height="14"><polygon points={polygonPoints(cx, cy, r, 3)} fill={color} /></svg>;
  if (shapeKey === 'diamond') return <svg width="14" height="14"><polygon points={polygonPoints(cx, cy, r, 4, 0)} fill={color} /></svg>;
  if (shapeKey === 'hexagon') return <svg width="14" height="14"><polygon points={polygonPoints(cx, cy, r, 6)} fill={color} /></svg>;
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
};

const CamposShotLegend = ({ model, sizeModel }) => {
  if (!model) return null;
  const headerItems = model.headerStats?.items || [];
  const scaleBar = model.scaleBar;
  const sizeScale = sizeModel?.sizeScale;
  const legendGroups = model.legend?.groups || [];

  return (
    <div className="px-6 py-3 border-b border-white/5 bg-black/10 flex flex-wrap items-center gap-x-6 gap-y-3 z-10">
      {headerItems.map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="verge-label-mono text-[7px] text-[#666] uppercase tracking-[0.22em]">{item.label}</span>
          <span className="verge-label-mono text-[10px] text-white font-black tabular-nums">{item.value}</span>
        </div>
      ))}

      {scaleBar && (
        <div className="flex items-center gap-2 min-w-[170px]">
          <span className="verge-label-mono text-[7px] text-[#666] uppercase tracking-[0.22em]">{scaleBar.label}</span>
          <div
            className="h-2 flex-1 rounded-full border border-white/10"
            style={{ background: `linear-gradient(90deg, ${scaleBar.stops.map(stop => `${stop.color} ${stop.offset * 100}%`).join(', ')})` }}
          />
          <span className="verge-label-mono text-[7px] text-[#949494]">{scaleBar.domain[1]}</span>
        </div>
      )}

      {sizeScale && (
        <div className="flex items-center gap-2">
          <span className="verge-label-mono text-[7px] text-[#666] uppercase tracking-[0.22em]">{sizeScale.label} size</span>
          {sizeScale.samples.slice(0, 4).map(sample => (
            <span key={sample.xg} className="flex items-center gap-1">
              <span
                className="inline-block rounded-full bg-white/30 border border-white/20"
                style={{ width: `${Math.max(5, sample.size * 4)}px`, height: `${Math.max(5, sample.size * 4)}px` }}
              />
              <span className="verge-label-mono text-[7px] text-[#949494]">{Number(sample.xg).toFixed(2)}</span>
            </span>
          ))}
        </div>
      )}

      {legendGroups.flatMap(group => group.items.map(item => (
        <div key={`${group.kind}-${item.key}`} className="flex items-center gap-1.5">
          {group.kind === 'shape'
            ? <LegendShapeSwatch shapeKey={item.key} color="#949494" />
            : <span className="inline-block h-2.5 w-2.5 rounded-full border border-white/20" style={{ background: item.color || '#949494' }} />}
          <span className="verge-label-mono text-[7px] text-[#949494] uppercase tracking-[0.18em]">{item.label}</span>
        </div>
      )))}
    </div>
  );
};

const ShotMapLayer = ({ shots, focusedShot, onShotFocus, projectPoint, markerByShotId = new Map() }) => {
  const focusedShotId = focusedShot ? (focusedShot.opta_id ?? focusedShot.id) : null;
  
  const renderShot = (shot, index, isFocused) => {
    const normalized = normalizeShotToAttackingGoal(shot);
    const position = normalized ? projectPoint(normalized.x, normalized.y) : null;
    if (!position) return null;

    const isDimmed = focusedShotId !== null && !isFocused;
    const marker = shot.campos_shot ? markerByShotId.get(shot.campos_shot.id) : null;

    return (
      <CamposShotGlyph
        key={shot.id || shot.opta_id || index}
        cx={position.x}
        cy={position.y}
        marker={marker}
        isFocused={isFocused}
        isDimmed={isDimmed}
        title={`${shot.playerName || 'Joueur'} - ${shot.type_name || 'Tir'}`}
        onClick={(e) => {
          e.stopPropagation();
          onShotFocus?.(shot);
        }}
      />
    );
  };

  // Séparation pour garantir le rendu au-dessus (Z-index SVG)
  const regularShots = shots.filter(s => String(s.opta_id ?? s.id) !== String(focusedShotId));
  const activeShot = shots.find(s => String(s.opta_id ?? s.id) === String(focusedShotId));

  return (
    <>
      {regularShots.map((s, idx) => renderShot(s, idx, false))}
      {activeShot && renderShot(activeShot, 'active', true)}
    </>
  );
};

const ShotMapExplorer = ({ data = [], loading = false, onPlayVideo, onAddToPlaylist, isVideoLoading = false }) => {
  const [focusedShot, setFocusedShot] = useState(null);
  const [generatingEventId, setGeneratingEventId] = useState(null);
  const { projectPoint } = usePitchProjection('vertical');

  const handleToggleShot = (shot) => {
    const shotId = shot.opta_id ?? shot.id;
    const currentId = focusedShot ? (focusedShot.opta_id ?? focusedShot.id) : null;
    if (String(shotId) === String(currentId)) {
      setFocusedShot(null);
    } else {
      setFocusedShot(shot);
    }
  };

  const shotData = useMemo(() => {
    const events = Array.isArray(data) ? data : (data?.items || []);
    return events
      .filter(event =>
        event.isShot === true ||
        event.isShot === 1 ||
        (event.type_id >= 13 && event.type_id <= 16) ||
        ['Shot', 'Goal', 'MissedShots', 'SavedShot', 'ShotOnPost'].includes(event.type)
      )
      .map(shot => {
        const metrics = parseAdvancedMetrics(shot);
        const xG = firstMetric(shot, metrics, ['xG', 'xg']);
        const xGOT = firstMetric(shot, metrics, ['xGOT', 'xgot', 'psxg']);
        const xT = firstMetric(shot, metrics, ['xT', 'xT_credit']);
        const shotStatus = firstMetric(shot, metrics, ['shot_status']);
        const bodyPart = deriveBodyPart(shot, metrics);
        const shotTags = deriveShotTags(metrics);

        const enrichedShot = {
          ...shot,
          advanced_metrics: metrics,
          xG: xG !== null ? Number(xG) : null,
          xGOT: xGOT !== null ? Number(xGOT) : null,
          xT: xT !== null ? Number(xT) : Number(shot.xT ?? 0),
          shot_status: shotStatus || shot.shot_status,
          body_part_name: bodyPart,
          shot_tags: shotTags,
          isGoal: isGoalShot({ ...shot, advanced_metrics: metrics, shot_status: shotStatus }),
          shotDistance: calculateShotDistance(shot),
        };

        return {
          ...enrichedShot,
          campos_shot: toCamposShot(enrichedShot),
        };
      });
  }, [data]);

  const camposShots = useMemo(() => shotData.map(shot => shot.campos_shot).filter(Boolean), [shotData]);

  const camposShotMapModel = useMemo(() => computeShotMap({
    shots: camposShots,
    ...CAMPOS_SHOTMAP_CONFIG,
  }), [camposShots]);

  const camposSizeScaleModel = useMemo(() => computeShotMap({
    shots: camposShots,
    preset: 'opta',
    crop: 'half',
    attackingDirection: 'up',
    side: 'attack',
  }), [camposShots]);

  const camposMarkerByShotId = useMemo(() => {
    const map = new Map();
    (camposShotMapModel.plot?.markers || []).forEach(marker => {
      map.set(marker.shotId, marker);
    });
    return map;
  }, [camposShotMapModel]);

  // --- MOTEUR DE VIRTUALISATION (Optimisation Shot Map) ---
  const scrollContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const ROW_HEIGHT = 102; 
  const BUFFER_ROWS = 5;

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const virtualShots = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const end = Math.min(shotData.length, Math.ceil((scrollTop + 800) / ROW_HEIGHT) + BUFFER_ROWS);
    
    return shotData.slice(start, end).map((shot, index) => ({
      shot,
      index: start + index,
      top: (start + index) * ROW_HEIGHT
    }));
  }, [scrollTop, shotData]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFocusedShot(null);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [data]);

  const handleFocusedShotVideo = async () => {
    if (!focusedShot || !onPlayVideo) return;
    const shotId = focusedShot.opta_id || focusedShot.id;
    setGeneratingEventId(shotId);
    try {
      await onPlayVideo(focusedShot);
    } finally {
      setGeneratingEventId(null);
    }
  };

  const handleExportShotMapSvg = async () => {
    if (camposShots.length === 0) return;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const svgMarkup = renderToStaticMarkup(
      <ShotMapStaticSvg
        shots={camposShots}
        {...CAMPOS_SHOTMAP_CONFIG}
        {...CAMPOS_PITCH_EXPORT_STYLE}
        showShotTrajectory={false}
        markers={{
          strokeWidth: ({ marker }) => (marker.outlineKey === 'goal' ? 0.55 : 0.32),
          opacity: 0.94,
        }}
      />
    );
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>${svgMarkup}`], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `optavision-shotmap-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden">
      <div className="max-w-[1800px] mx-auto w-full h-full flex flex-col lg:flex-row gap-6 p-8 overflow-hidden">
      {/* COLONNE GAUCHE : CONSOLE TACTIQUE UNIFIÉE (MAP + CAGE) */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#3cffd0]/2 to-transparent pointer-events-none" />
        
        {/* HEADER UNIFIÉ */}
        <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex justify-between items-center z-10">
          <div className="flex items-center gap-6">
            <div className="w-1 h-8 bg-[#3cffd0]" />
            <div>
              <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Console de Finition</h3>
              <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.3em] font-bold mt-1">
                IMMERSION SPATIALE & TARGET 2D
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-[2px] border border-white/5"
              title={shotMapRecipes.statsbomb.description}
            >
              <Info size={12} className="text-[#3cffd0]" />
              <span className="verge-label-mono text-[8px] text-[#949494] uppercase font-black">Campos</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-[2px] border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3cffd0]" />
              <span className="verge-label-mono text-[8px] text-[#949494] uppercase font-black">Buts</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-[2px] border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff4d4d]" />
              <span className="verge-label-mono text-[8px] text-[#949494] uppercase font-black">Échecs</span>
            </div>
            <div className="verge-label-mono text-[9px] text-white font-black bg-[#3cffd0]/10 px-3 py-1.5 rounded-[2px] border border-[#3cffd0]/20">
              {shotData.length} FRAPPES
            </div>
            <button
              type="button"
              onClick={handleExportShotMapSvg}
              disabled={camposShots.length === 0}
              className="h-8 w-8 rounded-[2px] border border-white/10 bg-black/40 text-[#949494] flex items-center justify-center transition-all hover:border-[#3cffd0]/50 hover:text-[#3cffd0] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Exporter la ShotMap Campos en SVG"
            >
              <Download size={14} />
            </button>
          </div>
        </div>

        <CamposShotLegend model={camposShotMapModel} sizeModel={camposSizeScaleModel} />

        <div className="flex-1 flex flex-col min-h-0 relative z-10 gap-0">
          {/* ZONE 2D TARGET (Intégration Premium) */}
          <div className="h-[260px] w-full flex items-end justify-center shrink-0 relative z-20">
             {/* Effet de lueur diffuse derrière la cage */}
             <div className="absolute inset-0 bg-[#3cffd0]/5 blur-[100px] rounded-full scale-150 pointer-events-none" />
             <div className="absolute top-4 left-1/2 -translate-x-1/2 verge-label-mono text-[7px] text-[#3cffd0]/40 uppercase tracking-[0.5em] font-black">Performance Target (Target 2D)</div>
             
             {/* Conteneur Invisible de Précision */}
             <div className="w-full max-w-[800px] h-full flex items-center justify-center relative">
               <GoalFrameSVG 
                 shots={shotData} 
                 focusedShot={focusedShot}
                 onShotFocus={setFocusedShot}
               />
             </div>
          </div>

          {/* MAP TACTIQUE (Shot Map) */}
          <div className="flex-1 px-8 pb-8 pt-0 relative min-h-0 z-10 overflow-hidden bg-gradient-to-t from-black/20 to-transparent">
            <div className="w-full h-full max-w-[800px] mx-auto">
              <TacticalPitch 
                mode="vertical-half" 
                orientation="vertical"
                view="offensive"
                style={{ grass: 'transparent', line: '#333', background: 'transparent' }}
                onClick={() => setFocusedShot(null)}
              >
                <ShotMapLayer 
                  shots={shotData} 
                  focusedShot={focusedShot} 
                  onShotFocus={handleToggleShot}
                  projectPoint={projectPoint}
                  markerByShotId={camposMarkerByShotId}
                />
              </TacticalPitch>
            </div>

            {focusedShot && (
              <div className="absolute right-8 top-8 z-[100] w-72 rounded-lg border border-[#3cffd0]/30 bg-[#131313]/95 p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 ring-1 ring-white/5">
                <div className="mb-4 border-b border-white/10 pb-3 flex justify-between items-start">
                  <div>
                    <div className="verge-label-mono text-[7px] uppercase tracking-widest text-[#3cffd0]">Analytique Individuel</div>
                    <div className="mt-1 truncate text-xs font-black uppercase">{focusedShot.playerName || 'Joueur'}</div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-[2px] verge-label-mono text-[7px] font-black uppercase ${focusedShot.isGoal ? 'bg-[#3cffd0] text-black' : 'bg-white/10 text-white'}`}>
                    {statusLabel(focusedShot)}
                  </div>
                </div>
                <div className="space-y-2 verge-label-mono text-[8px] uppercase text-[#949494]">
                  <div className="flex justify-between font-bold">
                    <span>Minute</span>
                    <span className="text-white">{focusedShot.min ?? focusedShot.minute ?? '-'}'</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Distance</span>
                    <span className="text-white">{focusedShot.shotDistance?.toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Surface</span>
                    <span className="text-white">{focusedShot.body_part_name || 'Non renseigne'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-black/30 border border-white/10 rounded-[2px] p-2">
                      <div className="text-[7px] text-[#666]">xG</div>
                      <div className="text-white text-[10px] mt-1">{formatMetric(focusedShot.xG)}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-[2px] p-2">
                      <div className="text-[7px] text-[#666]">xGOT</div>
                      <div className="text-white text-[10px] mt-1">{formatMetric(focusedShot.xGOT)}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-[2px] p-2">
                      <div className="text-[7px] text-[#666]">xT</div>
                      <div className="text-white text-[10px] mt-1">{formatMetric(focusedShot.xT)}</div>
                    </div>
                  </div>
                  {focusedShot.shot_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {focusedShot.shot_tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-white/5 border border-white/10 rounded-[2px] text-[7px] text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist?.(focusedShot);
                    }}
                    className="flex items-center justify-center rounded-[2px] border border-white/10 bg-black/50 px-3 text-[#949494] transition-all hover:border-[#3cffd0]/50 hover:text-[#3cffd0]"
                    title="Ajouter a une playlist"
                  >
                    <ListPlus size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocusedShotVideo();
                    }}
                    disabled={generatingEventId !== null || isVideoLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#3cffd0]/40 bg-black/50 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-[#3cffd0] hover:bg-[#3cffd0] hover:text-black transition-all disabled:opacity-50 disabled:cursor-wait"
                  >
                    {generatingEventId !== null || isVideoLoading ? (
                      <Loader2 size={12} className="animate-spin text-[#3cffd0]" />
                    ) : (
                      <PlayCircle size={12} />
                    )}
                    <span>{generatingEventId !== null || isVideoLoading ? 'Extraction...' : 'Visualiser'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <Loader2 className="animate-spin text-[#3cffd0]" size={32} />
          </div>
        )}
      </div>

      {/* COLONNE DROITE : SIDEBAR (FLUX SEUL) */}
      <aside className="w-full lg:w-[400px] flex flex-col gap-6 min-h-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10 bg-[#2d2d2d] flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-[#3cffd0] animate-pulse'}`} />
            <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">Flux Analytique (Tirs)</span>
          </div>
          <div className="verge-label-mono text-[9px] text-[#949494] bg-white/5 px-3 py-1.5 rounded-[2px] border border-white/5">
            {shotData.length} TOTAL
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto styled-scrollbar-verge bg-black/20 relative"
        >
          {/* Container fantôme pour simuler la hauteur totale du scroll */}
          <div style={{ height: `${shotData.length * ROW_HEIGHT}px`, width: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
          
          {shotData.length > 0 ? (
            virtualShots.map(({ shot: s, index, top }) => {
              const shotId = s.opta_id ?? s.id;
              const isFocused = focusedShot && String(shotId) === String(focusedShot.opta_id ?? focusedShot.id);
              
              return (
                <div
                  key={shotId || index}
                  style={{ position: 'absolute', top: `${top}px`, left: 0, right: 0, height: `${ROW_HEIGHT}px` }}
                  onClick={() => handleToggleShot(s)}
                  className={`flex items-center justify-between py-3 border-b border-white/[0.03] hover:bg-[#3cffd0]/5 transition-colors px-6 group cursor-pointer ${isFocused ? 'bg-[#3cffd0]/10 border-l-2 border-l-[#3cffd0]' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="verge-label-mono text-[10px] text-[#3cffd0] font-black w-12 shrink-0">
                      {s.min ?? s.minute ?? 0}'
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="verge-label-mono text-[11px] text-white uppercase font-black truncate">
                          {statusLabel(s)}
                        </span>
                        {s.isGoal && (
                          <span className="verge-label-mono text-[7px] px-1.5 py-0.5 rounded-[2px] bg-[#3cffd0] text-black font-black uppercase shadow-[0_0_10px_rgba(60,255,208,0.4)]">
                            But
                          </span>
                        )}
                      </div>
                      <div className="verge-label-mono text-[10px] text-[#949494] group-hover:text-white transition-colors truncate mt-1">
                        {s.playerName || 'Joueur inconnu'}
                      </div>
                      <div className="mt-1 flex items-center gap-3 overflow-hidden">
                        <span className="verge-label-mono text-[8px] text-[#666]">
                          <span className="text-white/60">{s.shotDistance?.toFixed(1)}m</span> • {s.body_part_name || s.bodyPart || 'Pied'}
                        </span>
                        {Number.isFinite(Number(s.xG)) && (
                          <span className="verge-label-mono text-[8px] text-[#3cffd0] font-black">
                            xG {Number(s.xG).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist?.(s);
                    }}
                    className="p-2 text-slate-400 transition-all transform hover:scale-110 hover:text-[#3cffd0]"
                    title="Ajouter a une playlist"
                  >
                    <ListPlus size={18} />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const evId = s.opta_id || s.id;
                      setGeneratingEventId(evId);
                      try {
                        await onPlayVideo?.(s);
                      } finally {
                        setGeneratingEventId(null);
                      }
                    }}
                    disabled={generatingEventId === (s.opta_id || s.id)}
                    className={`p-2 transition-all transform hover:scale-110 ${
                      generatingEventId === (s.opta_id || s.id) ? 'text-[#3cffd0]' : 'text-slate-400 hover:text-[#3cffd0]'
                    }`}
                  >
                    {generatingEventId === (s.opta_id || s.id) ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <PlayCircle size={20} />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center opacity-10">
              <Database size={32} />
            </div>
          )}
        </div>
      </aside>
    </div>
  </div>
  );
};

export default ShotMapExplorer;
