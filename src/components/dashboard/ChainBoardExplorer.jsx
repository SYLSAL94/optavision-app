import React, { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, Square, Trash2, Network, Loader2, PlayCircle, MapPin, Search, RotateCw } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';
import { TacticalPitch } from './TacticalPitch';
import { EventTooltip } from './EventTooltip';
import { usePitchProjection, PITCH_DIMENSIONS } from '../../hooks/usePitchProjection';

const EMPTY_DRAW = { start: null, current: null };
const ZONE_COLORS = {
  start: { fill: 'rgba(60,255,208,0.20)', stroke: '#3cffd0', label: 'D' },
  end: { fill: 'rgba(255,77,77,0.22)', stroke: '#ff4d4d', label: 'A' },
  relay: { fill: 'rgba(255,208,60,0.24)', stroke: '#ffd03c', label: 'R' }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const svgToOpta = (point, orientation = 'horizontal') => {
  if (orientation === 'vertical') {
    return {
      x: clamp(100 - ((point.y / PITCH_DIMENSIONS.width) * 100), 0, 100),
      y: clamp(100 - ((point.x / PITCH_DIMENSIONS.height) * 100), 0, 100)
    };
  }

  return {
    x: clamp((point.x / PITCH_DIMENSIONS.width) * 100, 0, 100),
    y: clamp(100 - ((point.y / PITCH_DIMENSIONS.height) * 100), 0, 100)
  };
};

const normaliseEvent = (event = {}) => ({
  ...event,
  advanced_metrics: {
    ...(event.advanced_metrics && typeof event.advanced_metrics === 'object' ? event.advanced_metrics : {}),
    xT: event.xT,
    distance_m: event.distance_m,
    receiver: event.receiver,
    type_name: event.type_name || event.type
  },
  id: event.id || event.opta_id,
  end_x: event.end_x ?? event.endX,
  end_y: event.end_y ?? event.endY
});

const eventType = (event) => String(event?.type_name || event?.type || event?.type_id || '');

const ChainBoardLayer = ({ chains, selectedChainId, focusedEventId, projectPoint, onEventFocus, onEventHover, onEventLeave }) => {
  const selectedOnly = selectedChainId ? chains.filter(chain => chain.chain_id === selectedChainId) : chains;
  const displayChains = selectedOnly.slice(0, 250);

  return (
    <g className="chainboard-layer">
      <defs>
        <marker id="chainboard-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {displayChains.map((chain, chainIndex) => (
        <g key={chain.chain_id || chainIndex} opacity={selectedChainId && chain.chain_id !== selectedChainId ? 0.15 : 1}>
          {(chain.events || []).map((rawEvent, eventIndex) => {
            const event = normaliseEvent(rawEvent);
            const start = projectPoint(event.x, event.y);
            const endX = event.end_x ?? event.endX;
            const endY = event.end_y ?? event.endY;
            const end = endX !== null && endY !== null && endX !== undefined && endY !== undefined
              ? projectPoint(endX, endY)
              : null;
            if (!start) return null;

            const id = event.opta_id || event.id || `${chain.chain_id}-${eventIndex}`;
            const isFocused = String(id) === String(focusedEventId);
            const type = eventType(event).replace(/\s+/g, '').toLowerCase();
            const isCarry = type.includes('carry');
            const color = eventIndex === 0 ? '#3cffd0' : '#ffd03c';

            return (
              <g
                key={id}
                data-chain-event-id={id}
                className="cursor-help pointer-events-auto"
                opacity={isFocused ? 1 : 0.82}
                onMouseEnter={(e) => onEventHover(event, e)}
                onMouseMove={(e) => onEventHover(event, e)}
                onMouseLeave={onEventLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventFocus(event, e);
                }}
              >
                {end && (
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={isFocused ? '#ffffff' : color}
                    strokeWidth={isFocused ? 0.9 : 0.52}
                    strokeDasharray={isCarry ? '1.2,0.9' : 'none'}
                    markerEnd="url(#chainboard-arrow)"
                    style={{ color: isFocused ? '#ffffff' : color }}
                  />
                )}
                <circle
                  cx={start.x}
                  cy={start.y}
                  r={isFocused ? 1.7 : 1.05}
                  fill={isFocused ? '#ffffff' : color}
                  stroke="#050505"
                  strokeWidth="0.25"
                />
                <text
                  x={start.x}
                  y={start.y - 2.3}
                  textAnchor="middle"
                  fontSize="1.25"
                  fill="#ffffff"
                  fontWeight="900"
                  className="pointer-events-none"
                >
                  {eventIndex + 1}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
};

const ZoneOverlay = ({ zonesByMode, draftZone, projectPoint, orientation }) => {
  const renderZone = (zone, key, mode, index, isDraft = false) => {
    const colors = ZONE_COLORS[mode] || ZONE_COLORS.start;
    const circleRx = (zone.radius / 100) * (orientation === 'vertical' ? PITCH_DIMENSIONS.height : PITCH_DIMENSIONS.width);
    const circleRy = (zone.radius / 100) * (orientation === 'vertical' ? PITCH_DIMENSIONS.width : PITCH_DIMENSIONS.height);
    if (zone.shape === 'circle') {
      const center = projectPoint(zone.x, zone.y);
      if (!center) return null;
      return (
        <g key={key} pointerEvents="none" opacity={isDraft ? 0.55 : 1}>
          <ellipse
            cx={center.x}
            cy={center.y}
            rx={circleRx}
            ry={circleRy}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="0.35"
            strokeDasharray={isDraft ? '1,1' : 'none'}
          />
          <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="middle" fontSize="2.2" fill="#ffffff" fontWeight="900">
            {colors.label}{index + 1}
          </text>
        </g>
      );
    }

    const p1 = projectPoint(zone.x1, zone.y1);
    const p2 = projectPoint(zone.x2, zone.y2);
    if (!p1 || !p2) return null;
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);
    return (
      <g key={key} pointerEvents="none" opacity={isDraft ? 0.55 : 1}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="0.35"
          strokeDasharray={isDraft ? '1,1' : 'none'}
        />
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize="2.2" fill="#ffffff" fontWeight="900">
          {colors.label}{index + 1}
        </text>
      </g>
    );
  };

  return (
    <g className="chainboard-zones">
      {Object.entries(zonesByMode).flatMap(([mode, zones]) => (
        zones.map((zone, index) => renderZone(zone, `${mode}-${index}`, mode, index))
      ))}
      {draftZone && renderZone(draftZone, 'draft-zone', draftZone.mode, 0, true)}
    </g>
  );
};

const ChainBoardExplorer = ({ filters = {}, playersList = [], onPlayVideo, isVideoLoading = false }) => {
  const [mode, setMode] = useState('start');
  const [shape, setShape] = useState('rectangle');
  const [brushSize, setBrushSize] = useState(8);
  const [zonesByMode, setZonesByMode] = useState({ start: [], end: [], relay: [] });
  const [drawState, setDrawState] = useState(EMPTY_DRAW);
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedChainId, setSelectedChainId] = useState(null);
  const [focusedEvent, setFocusedEvent] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [orientation, setOrientation] = useState('horizontal');

  const { projectPoint, getPitchViewBox, getPitchSvgPoint } = usePitchProjection(orientation);
  const pitchViewBox = useMemo(() => getPitchViewBox('full'), [getPitchViewBox]);

  const playerMap = useMemo(() => {
    const map = {};
    playersList.forEach(player => {
      map[String(player.id || player.player_id)] = player.name || player.shortName || player.id;
    });
    return map;
  }, [playersList]);

  const draftZone = useMemo(() => {
    if (shape !== 'rectangle' || !drawState.start || !drawState.current) return null;
    return {
      mode,
      shape: 'rectangle',
      x1: drawState.start.x,
      y1: drawState.start.y,
      x2: drawState.current.x,
      y2: drawState.current.y
    };
  }, [drawState, mode, shape]);

  const canRun = zonesByMode.start.length > 0 && zonesByMode.end.length > 0 && !loading;

  const addZone = useCallback((zone) => {
    setZonesByMode(prev => ({
      ...prev,
      [mode]: [...prev[mode], zone]
    }));
    setSelectedChainId(null);
    setFocusedEvent(null);
  }, [mode]);

  const handlePitchMouseDown = useCallback((event) => {
    if (event.button !== 0) return;
    if (event.target.closest?.('[data-chain-event-id]')) return;
    const point = getPitchSvgPoint(event, pitchViewBox);
    if (!point) return;
    const optaPoint = svgToOpta(point, orientation);
    event.preventDefault();

    if (shape === 'circle') {
      addZone({ shape: 'circle', x: optaPoint.x, y: optaPoint.y, radius: brushSize });
      return;
    }

    setDrawState({ start: optaPoint, current: optaPoint });
  }, [addZone, brushSize, getPitchSvgPoint, orientation, pitchViewBox, shape]);

  const handlePitchMouseMove = useCallback((event) => {
    const point = getPitchSvgPoint(event, pitchViewBox);
    if (!point) return;
    if (drawState.start) {
      setDrawState(prev => ({ ...prev, current: svgToOpta(point, orientation) }));
    }
  }, [drawState.start, getPitchSvgPoint, orientation, pitchViewBox]);

  const handlePitchMouseUp = useCallback((event) => {
    if (!drawState.start) return;
    const point = getPitchSvgPoint(event, pitchViewBox);
    const end = point ? svgToOpta(point, orientation) : drawState.current;
    setDrawState(EMPTY_DRAW);
    if (!end) return;
    if (Math.abs(end.x - drawState.start.x) < 1 || Math.abs(end.y - drawState.start.y) < 1) return;
    addZone({
      shape: 'rectangle',
      x1: drawState.start.x,
      y1: drawState.start.y,
      x2: end.x,
      y2: end.y
    });
  }, [addZone, drawState, getPitchSvgPoint, orientation, pitchViewBox]);

  const clearZones = () => {
    setZonesByMode({ start: [], end: [], relay: [] });
    setChains([]);
    setSelectedChainId(null);
    setFocusedEvent(null);
    setHoveredEvent(null);
  };

  const removeLastZone = () => {
    setZonesByMode(prev => ({
      ...prev,
      [mode]: prev[mode].slice(0, -1)
    }));
  };

  const detectChains = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setFocusedEvent(null);
    try {
      const payload = {
        startZones: zonesByMode.start,
        endZones: zonesByMode.end,
        relayZones: zonesByMode.relay.length > 0 ? zonesByMode.relay : undefined,
        matchIds: filters.matches || [],
        teamIds: filters.teams || [],
        playerIds: filters.players || filters.player_id || [],
        periodIds: filters.period_id || [],
        limit: 750
      };
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/chainboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || `CHAINBOARD_FAILURE: ${response.status}`);
      const nextChains = Array.isArray(json.chains) ? json.chains : [];
      setChains(nextChains);
      setSelectedChainId(nextChains[0]?.chain_id || null);
    } catch (err) {
      console.error('CHAINBOARD_FETCH_ERROR:', err);
      setError(err.message);
      setChains([]);
      setSelectedChainId(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedChain = chains.find(chain => chain.chain_id === selectedChainId);
  const selectedEvents = selectedChain?.events || [];

  const handleEventHover = (event, nativeEvent) => {
    setHoveredEvent(event);
    setMousePos({ x: nativeEvent.clientX, y: nativeEvent.clientY });
  };

  const handleEventFocus = (event, nativeEvent) => {
    setFocusedEvent(event);
    setHoveredEvent(event);
    setMousePos({ x: nativeEvent.clientX, y: nativeEvent.clientY });
  };

  return (
    <div className="w-full h-full max-h-[100dvh] min-h-0 min-w-0 bg-[#131313] overflow-y-auto overflow-x-hidden 2xl:overflow-hidden scrollbar-verge p-3 sm:p-5 lg:p-8">
      <div className="w-full min-w-0 min-h-full 2xl:h-full 2xl:min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(260px,18vw)_minmax(520px,1fr)_minmax(300px,22vw)] gap-4 lg:gap-6">
        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="p-4 2xl:p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#3cffd0] text-black flex items-center justify-center">
                <Network size={18} />
              </div>
              <div>
                <h3 className="verge-label-mono text-lg text-white font-black uppercase tracking-tight">ChainBoard</h3>
                <p className="verge-label-mono text-[8px] text-[#3cffd0] uppercase tracking-[0.25em] mt-1">API-first spatial chains</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 p-4 2xl:p-5 space-y-4 2xl:space-y-5 flex-1 overflow-y-auto scrollbar-verge">
            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Type de zone</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['start', 'Depart'],
                  ['end', 'Arrivee'],
                  ['relay', 'Relais']
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`px-3 py-2.5 rounded-[2px] border verge-label-mono text-[9px] font-black uppercase transition-all ${mode === value ? 'bg-[#3cffd0] text-black border-[#3cffd0]' : 'bg-black/30 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Outil</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShape('rectangle')}
                  className={`flex-1 px-4 py-2.5 rounded-[2px] border flex items-center justify-center gap-2 verge-label-mono text-[9px] font-black uppercase ${shape === 'rectangle' ? 'bg-white text-black border-white' : 'bg-black/30 border-white/10 text-[#949494]'}`}
                >
                  <Square size={13} />
                  Rect
                </button>
                <button
                  type="button"
                  onClick={() => setShape('circle')}
                  className={`flex-1 px-4 py-2.5 rounded-[2px] border flex items-center justify-center gap-2 verge-label-mono text-[9px] font-black uppercase ${shape === 'circle' ? 'bg-white text-black border-white' : 'bg-black/30 border-white/10 text-[#949494]'}`}
                >
                  <Circle size={13} />
                  Cercle
                </button>
              </div>
              {shape === 'circle' && (
                <div className="pt-2">
                  <div className="flex justify-between mb-2">
                    <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Rayon</span>
                    <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black">{brushSize.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="25"
                    step="0.5"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-[#3cffd0]"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(zonesByMode).map(([key, zones]) => (
                <div key={key} className="bg-black/30 border border-white/10 rounded-[2px] p-3 2xl:p-4">
                  <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black">{key}</div>
                  <div className="verge-label-mono text-2xl text-white font-black mt-2">{zones.length}</div>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 verge-label-mono text-[9px] font-black uppercase tracking-wider">
                {error}
              </div>
            )}
          </div>

          <div className="shrink-0 p-4 2xl:p-5 border-t border-white/10 space-y-3 bg-[#1a1a1a]">
            <button
              type="button"
              onClick={detectChains}
              disabled={!canRun}
              className="w-full bg-[#3cffd0] disabled:bg-white/10 disabled:text-white/25 text-black py-4 rounded-[2px] verge-label-mono text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Detecter
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={removeLastZone} className="bg-white/5 border border-white/10 py-3 rounded-[2px] verge-label-mono text-[9px] text-[#949494] hover:text-white uppercase font-black">
                Retirer
              </button>
              <button type="button" onClick={clearZones} className="bg-red-500/10 border border-red-500/20 py-3 rounded-[2px] verge-label-mono text-[9px] text-red-400 uppercase font-black flex items-center justify-center gap-2">
                <Trash2 size={12} />
                Reset
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden relative min-h-[360px] sm:min-h-[460px] lg:min-h-[560px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="absolute left-3 right-3 top-3 sm:left-6 sm:right-6 sm:top-6 z-20 flex flex-wrap items-center gap-2">
            <div className="bg-black/60 border border-white/10 rounded-[2px] px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 min-w-0">
              <MapPin size={13} className="text-[#3cffd0] shrink-0" />
              <span className="verge-label-mono text-[8px] sm:text-[9px] text-white font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
                {shape === 'rectangle' ? 'Glisser sur le terrain' : 'Cliquer pour poser un cercle'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOrientation(current => (current === 'horizontal' ? 'vertical' : 'horizontal'))}
              className="bg-black/70 border border-[#3cffd0]/30 rounded-[2px] px-3 py-2 flex items-center gap-2 text-[#3cffd0] hover:bg-[#3cffd0] hover:text-black transition-all"
              title="Rotation de la carte"
            >
              <RotateCw size={13} />
              <span className="verge-label-mono text-[8px] font-black uppercase tracking-[0.18em]">
                {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
              </span>
            </button>
          </div>
          <TacticalPitch
            style={{ grass: '#111827', line: 'rgba(255,255,255,0.16)', background: '#050505' }}
            orientation={orientation}
            view="full"
            onMouseDown={handlePitchMouseDown}
            onMouseMove={handlePitchMouseMove}
            onMouseUp={handlePitchMouseUp}
          >
            <ZoneOverlay zonesByMode={zonesByMode} draftZone={draftZone} projectPoint={projectPoint} orientation={orientation} />
            <ChainBoardLayer
              chains={chains}
              selectedChainId={selectedChainId}
              focusedEventId={focusedEvent?.opta_id || focusedEvent?.id}
              projectPoint={projectPoint}
              onEventFocus={handleEventFocus}
              onEventHover={handleEventHover}
              onEventLeave={() => setHoveredEvent(null)}
            />
          </TacticalPitch>
        </section>

        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:col-span-2 xl:min-h-[420px] 2xl:col-span-1 2xl:h-full 2xl:min-h-0">
          <div className="shrink-0 p-4 sm:p-6 pr-14 border-b border-white/10 flex items-center justify-between gap-4">
            <div>
              <h3 className="verge-label-mono text-sm text-white font-black uppercase tracking-widest">Chaines detectees</h3>
              <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] mt-1">{chains.length} resultats</p>
            </div>
            {selectedEvents.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayVideo?.({ id: selectedChainId, events: selectedEvents })}
                disabled={isVideoLoading}
                className="px-4 py-2 rounded-full border border-[#3cffd0]/40 text-[#3cffd0] hover:bg-[#3cffd0] hover:text-black verge-label-mono text-[8px] font-black uppercase flex items-center gap-2 disabled:opacity-40"
              >
                {isVideoLoading ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                Video
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-verge divide-y divide-white/[0.04]">
            {chains.length > 0 ? chains.map((chain, index) => {
              const first = normaliseEvent(chain.events?.[0]);
              const second = chain.events?.[1] ? normaliseEvent(chain.events[1]) : null;
              const isSelected = chain.chain_id === selectedChainId;
              return (
                <motion.button
                  key={chain.chain_id || index}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedChainId(chain.chain_id);
                    setFocusedEvent(first);
                  }}
                  className={`w-full text-left p-5 transition-all ${isSelected ? 'bg-[#3cffd0]/10 border-l-2 border-[#3cffd0]' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-widest">#{index + 1}</span>
                    <span className="verge-label-mono text-[8px] text-[#949494]">{first.minute}'{String(first.sec ?? 0).padStart(2, '0')}</span>
                  </div>
                  <div className="mt-3 verge-label-mono text-[11px] text-white font-black uppercase truncate">
                    {first.playerName || first.player_id || 'Joueur inconnu'} / {eventType(first)}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[8px] verge-label-mono uppercase text-[#949494]">
                    <span>xT {Number(first.xT || 0).toFixed(3)}</span>
                    <span>|</span>
                    <span>{Number(first.distance_m || 0).toFixed(1)}m</span>
                    {second && (
                      <>
                        <span>|</span>
                        <span className="text-[#ffd03c]">Relais</span>
                      </>
                    )}
                  </div>
                </motion.button>
              );
            }) : (
              <div className="h-full flex items-center justify-center p-10 text-center">
                <div>
                  <Network size={42} className="mx-auto text-white/10 mb-5" />
                  <p className="verge-label-mono text-[10px] text-[#949494] uppercase tracking-[0.25em] font-black">
                    Tracez depart et arrivee puis lancez la detection
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <EventTooltip
        hoveredEvent={hoveredEvent}
        focusedEvent={focusedEvent}
        mousePos={mousePos}
        globalPlayerMap={playerMap}
        onPlayVideo={onPlayVideo}
        isVideoLoading={isVideoLoading}
      />
    </div>
  );
};

export default ChainBoardExplorer;
