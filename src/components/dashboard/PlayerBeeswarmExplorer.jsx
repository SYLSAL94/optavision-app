import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Loader2, RefreshCw, UsersRound } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';
import { createExplorationSearchParams } from './optaFilterParams';

const METRIC_COLORS = {
  Activite: '#3cffd0',
  Creation: '#ff4d4d',
  Distribution: '#8be9fd',
  Progression: '#ffd03c',
  Finition: '#ff7a7a',
  'Sans ballon': '#b4ff3c',
};

const TEAM_COLORS = ['#3cffd0', '#ffd03c', '#8be9fd', '#ff7a7a', '#b4ff3c', '#c792ea'];

const DEFAULT_METRICS = [
  { id: 'xT', label: 'xT', category: 'Creation', digits: 3 },
  { id: 'actions', label: 'Volume', category: 'Activite', digits: 0 },
  { id: 'success_rate', label: 'Reussite', category: 'Activite', digits: 0, suffix: '%' },
  { id: 'progressive_actions', label: 'Progression', category: 'Creation', digits: 0 },
  { id: 'passes', label: 'Passes', category: 'Distribution', digits: 0 },
  { id: 'pass_success_rate', label: 'Passes reussies', category: 'Distribution', digits: 0, suffix: '%' },
  { id: 'carry_distance_m', label: 'Carry distance', category: 'Progression', digits: 0, suffix: 'm' },
  { id: 'shots', label: 'Tirs', category: 'Finition', digits: 0 },
  { id: 'xG', label: 'xG', category: 'Finition', digits: 3 },
  { id: 'defensive_actions', label: 'Defense', category: 'Sans ballon', digits: 0 },
  { id: 'recoveries', label: 'Recups', category: 'Sans ballon', digits: 0 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const metricColor = (metric) => METRIC_COLORS[metric?.category] || '#3cffd0';

const formatValue = (value, metric) => {
  const numeric = safeNumber(value);
  if (metric?.suffix === '%') return `${Math.round(numeric)}%`;
  if (metric?.suffix === 'm') return `${Math.round(numeric)}m`;
  if ((metric?.digits || 0) >= 3) return numeric.toFixed(metric.digits);
  return String(Math.round(numeric));
};

const buildTicks = (minValue, maxValue) => {
  if (maxValue <= minValue) return [minValue];
  return Array.from({ length: 5 }, (_, index) => minValue + ((maxValue - minValue) * index) / 4);
};

const BeeswarmChart = ({ players, metric, selectedPlayerId, onSelect, groupMode, orientation }) => {
  const chart = useMemo(() => {
    const isVertical = orientation === 'vertical';
    const cleanPlayers = (players || [])
      .map((player) => ({
        ...player,
        numericValue: safeNumber(player.raw_value ?? player.value),
      }))
      .filter((player) => Number.isFinite(player.numericValue));

    const groupMap = new Map();
    if (groupMode === 'team') {
      cleanPlayers.forEach((player) => {
        const key = player.teamName || player.category || 'Equipe inconnue';
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key).push(player);
      });
    } else {
      groupMap.set('Population', cleanPlayers);
    }

    const groups = Array.from(groupMap.entries()).map(([label, groupPlayers], index) => ({
      id: label,
      label,
      color: TEAM_COLORS[index % TEAM_COLORS.length],
      players: groupPlayers,
    }));

    const values = cleanPlayers.map((player) => player.numericValue);
    const rawMin = values.length ? Math.min(...values) : 0;
    const rawMax = values.length ? Math.max(...values) : 1;
    const span = Math.max(1, rawMax - rawMin);
    const minValue = Math.max(0, rawMin - span * 0.08);
    const maxValue = rawMax + span * 0.08;
    const margin = isVertical
      ? { left: 82, right: 46, top: 58, bottom: 76 }
      : { left: 96, right: 56, top: 54, bottom: 70 };
    const width = isVertical
      ? Math.max(820, margin.left + margin.right + Math.max(1, groups.length) * 250)
      : 940;
    const height = isVertical
      ? 660
      : margin.top + margin.bottom + Math.max(1, groups.length) * 108;
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const valueScale = isVertical
      ? (value) => height - margin.bottom - ((value - minValue) / Math.max(0.0001, maxValue - minValue)) * plotHeight
      : (value) => margin.left + ((value - minValue) / Math.max(0.0001, maxValue - minValue)) * plotWidth;
    const groupBand = isVertical
      ? plotWidth / Math.max(1, groups.length)
      : 108;

    const dots = groups.flatMap((group, groupIndex) => {
      const bins = new Map();
      const groupCenter = isVertical
        ? margin.left + groupBand * groupIndex + groupBand / 2
        : margin.top + groupIndex * groupBand + groupBand / 2;
      return [...group.players]
        .sort((a, b) => a.numericValue - b.numericValue || String(a.playerName).localeCompare(String(b.playerName)))
        .map((player) => {
          const valuePosition = valueScale(player.numericValue);
          const bin = Math.round((valuePosition - (isVertical ? margin.top : margin.left)) / 17);
          const count = bins.get(bin) || 0;
          bins.set(bin, count + 1);
          const ring = Math.ceil(count / 2);
          const direction = count % 2 === 0 ? 1 : -1;
          const spread = direction * ring * 13;
          const x = isVertical
            ? clamp(groupCenter + spread, groupCenter - groupBand / 2 + 24, groupCenter + groupBand / 2 - 24)
            : valuePosition;
          const y = isVertical
            ? valuePosition
            : clamp(groupCenter + spread, groupCenter - groupBand / 2 + 24, groupCenter + groupBand / 2 - 20);
          return {
            ...player,
            x,
            y,
            groupCenter,
            groupLabel: group.label,
            groupColor: group.color,
          };
        });
    });

    return {
      width,
      height,
      margin,
      groups,
      dots,
      minValue,
      maxValue,
      ticks: buildTicks(minValue, maxValue),
      valueScale,
      groupBand,
      orientation,
      isVertical,
    };
  }, [players, groupMode, orientation]);

  if (!chart.dots.length) {
    return (
      <div className="h-full flex items-center justify-center p-10 text-center">
        <div>
          <UsersRound size={42} className="mx-auto text-white/10 mb-5" />
          <p className="verge-label-mono text-[10px] text-[#949494] uppercase tracking-[0.25em] font-black">
            Aucun joueur avec les filtres actifs
          </p>
        </div>
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      className={`w-full ${chart.isVertical ? 'min-w-[640px]' : 'min-w-[720px]'}`}
      role="img"
      aria-label="Beeswarm player comparison"
    >
      <rect x="0" y="0" width={chart.width} height={chart.height} fill="#080808" />
      {chart.ticks.map((tick) => {
        const valuePosition = chart.valueScale(tick);
        return (
          <g key={tick}>
            {chart.isVertical ? (
              <>
                <line
                  x1={chart.margin.left - 8}
                  x2={chart.width - chart.margin.right}
                  y1={valuePosition}
                  y2={valuePosition}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
                <text x={chart.margin.left - 16} y={valuePosition + 4} textAnchor="end" fill="#949494" fontSize="10" fontWeight="900" letterSpacing="2">
                  {formatValue(tick, metric)}
                </text>
              </>
            ) : (
              <>
                <line
                  x1={valuePosition}
                  x2={valuePosition}
                  y1={chart.margin.top - 14}
                  y2={chart.height - chart.margin.bottom + 18}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
                <text x={valuePosition} y={chart.height - chart.margin.bottom + 42} textAnchor="middle" fill="#949494" fontSize="10" fontWeight="900" letterSpacing="2">
                  {formatValue(tick, metric)}
                </text>
              </>
            )}
          </g>
        );
      })}
      {chart.isVertical ? (
        <line
          x1={chart.margin.left - 8}
          x2={chart.margin.left - 8}
          y1={chart.margin.top}
          y2={chart.height - chart.margin.bottom}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
        />
      ) : (
        <line
          x1={chart.margin.left}
          x2={chart.width - chart.margin.right}
          y1={chart.height - chart.margin.bottom + 18}
          y2={chart.height - chart.margin.bottom + 18}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
        />
      )}
      {chart.groups.map((group, index) => {
        const groupCenter = chart.isVertical
          ? chart.margin.left + index * chart.groupBand + chart.groupBand / 2
          : chart.margin.top + index * chart.groupBand + chart.groupBand / 2;
        return (
          <g key={group.id}>
            {chart.isVertical ? (
              <>
                <line x1={groupCenter} x2={groupCenter} y1={chart.margin.top} y2={chart.height - chart.margin.bottom} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
                <text x={groupCenter} y={chart.height - chart.margin.bottom + 48} fill={group.color} fontSize="10" fontWeight="900" letterSpacing="2" textAnchor="middle">
                  {group.label.toUpperCase()}
                </text>
              </>
            ) : (
              <>
                <line x1={chart.margin.left} x2={chart.width - chart.margin.right} y1={groupCenter} y2={groupCenter} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
                <text x="24" y={groupCenter + 4} fill={group.color} fontSize="10" fontWeight="900" letterSpacing="2" textAnchor="start">
                  {group.label.toUpperCase()}
                </text>
              </>
            )}
          </g>
        );
      })}
      {chart.dots.map((dot) => {
        const isSelected = String(selectedPlayerId) === String(dot.player_id);
        const fill = groupMode === 'team' ? dot.groupColor : metricColor(metric);
        return (
          <g key={dot.player_id}>
            <circle
              cx={dot.x}
              cy={dot.y}
              r={isSelected ? 10 : 7}
              fill={fill}
              fillOpacity={isSelected ? 1 : 0.78}
              stroke={isSelected ? '#ffffff' : '#050505'}
              strokeWidth={isSelected ? 3 : 2}
              className="cursor-pointer transition-all"
              onClick={() => onSelect(isSelected ? null : dot.player_id)}
            >
              <title>{`${dot.playerName} - ${formatValue(dot.numericValue, metric)} - pct ${dot.percentile}`}</title>
            </circle>
            {isSelected && (
              <text
                x={dot.x}
                y={dot.y - 18}
                textAnchor="middle"
                fill="#ffffff"
                stroke="#050505"
                strokeWidth="2.5"
                paintOrder="stroke"
                fontSize="10"
                fontWeight="900"
                letterSpacing="1"
              >
                {dot.playerName.toUpperCase()}
              </text>
            )}
          </g>
        );
      })}
      <text x={chart.margin.left} y="28" fill="#d7d7d7" fontSize="11" fontWeight="900" letterSpacing="3">
        {`${metric?.label?.toUpperCase() || 'METRIQUE'} - ${chart.isVertical ? 'AXE VERTICAL' : 'AXE HORIZONTAL'}`}
      </text>
    </svg>
  );
};

const StatBox = ({ label, value }) => (
  <div className="bg-black/30 border border-white/10 rounded-[2px] p-3">
    <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black">{label}</div>
    <div className="verge-label-mono text-lg text-white font-black mt-1">{value}</div>
  </div>
);

const PlayerBeeswarmExplorer = ({ filters = {} }) => {
  const [payload, setPayload] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [metricId, setMetricId] = useState('xT');
  const [minActions, setMinActions] = useState(5);
  const [limit, setLimit] = useState(160);
  const [groupMode, setGroupMode] = useState('team');
  const [orientation, setOrientation] = useState('vertical');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const metrics = payload?.metrics?.length ? payload.metrics : DEFAULT_METRICS;
  const selectedMetric = metrics.find((metric) => metric.id === metricId) || metrics[0] || DEFAULT_METRICS[0];
  const selectedPlayer = useMemo(() => (
    players.find((player) => String(player.player_id) === String(selectedPlayerId)) || null
  ), [players, selectedPlayerId]);

  const fetchBeeswarm = async () => {
    setLoading(true);
    setError(null);
    const params = createExplorationSearchParams(filters, {
      metric: metricId,
      min_actions: String(minActions),
      limit: String(limit),
    });

    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playerbeeswarm?${params.toString()}`);
      const rawPayload = await response.text();
      let nextPayload = null;
      try {
        nextPayload = rawPayload ? JSON.parse(rawPayload) : {};
      } catch {
        nextPayload = { detail: rawPayload || `PLAYERBEESWARM_FAILURE: ${response.status}` };
      }
      if (!response.ok) throw new Error(nextPayload.detail || `PLAYERBEESWARM_FAILURE: ${response.status}`);
      const nextPlayers = Array.isArray(nextPayload.players) ? nextPayload.players : [];
      setPayload(nextPayload);
      setPlayers(nextPlayers);
      setSelectedPlayerId((current) => (
        nextPlayers.some((player) => String(player.player_id) === String(current)) ? current : nextPlayers[0]?.player_id || null
      ));
    } catch (err) {
      console.error('PLAYERBEESWARM_FETCH_ERROR:', err);
      setError(err.message);
      setPayload(null);
      setPlayers([]);
      setSelectedPlayerId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeeswarm();
  }, [filters, metricId, minActions, limit]);

  const topPlayers = useMemo(() => players.slice(0, 10), [players]);

  return (
    <div className="w-full h-full max-h-[100dvh] min-h-0 min-w-0 bg-[#131313] overflow-y-auto overflow-x-hidden 2xl:overflow-hidden scrollbar-verge p-3 sm:p-5 lg:p-8">
      <div className="w-full min-w-0 min-h-full 2xl:h-full 2xl:min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(280px,19vw)_minmax(540px,1fr)_minmax(320px,22vw)] gap-4 lg:gap-6">
        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[420px] xl:min-h-[660px] 2xl:h-full 2xl:min-h-0">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#8be9fd] text-black flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <h3 className="verge-label-mono text-lg text-white font-black uppercase tracking-tight">Beeswarm</h3>
                <p className="verge-label-mono text-[8px] text-[#8be9fd] uppercase tracking-[0.25em] mt-1">player comparison</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 p-5 space-y-5 flex-1 overflow-y-auto scrollbar-verge">
            <div>
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Mesure</label>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {metrics.map((metric) => (
                  <button
                    key={metric.id}
                    type="button"
                    onClick={() => setMetricId(metric.id)}
                    className={`min-h-[42px] px-3 py-2 rounded-[2px] border text-left transition-all ${metricId === metric.id ? 'bg-white text-black border-white' : 'bg-black/30 border-white/10 text-[#d7d7d7] hover:border-white/30'}`}
                  >
                    <div className="verge-label-mono text-[8px] uppercase font-black truncate">{metric.label}</div>
                    <div className="verge-label-mono text-[7px] uppercase mt-1 opacity-60 truncate">{metric.category}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Actions min.</span>
                <span className="verge-label-mono text-[9px] text-[#8be9fd] font-black">{minActions}</span>
              </div>
              <input type="range" min="1" max="80" value={minActions} onChange={(event) => setMinActions(Number(event.target.value))} className="w-full accent-[#8be9fd]" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Population max.</span>
                <span className="verge-label-mono text-[9px] text-[#8be9fd] font-black">{limit}</span>
              </div>
              <input type="range" min="20" max="300" step="10" value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="w-full accent-[#8be9fd]" />
            </div>

            <div>
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Groupement</label>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  ['team', 'Equipes'],
                  ['population', 'Global'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGroupMode(id)}
                    className={`py-3 rounded-[2px] border verge-label-mono text-[8px] uppercase font-black tracking-widest ${groupMode === id ? 'bg-[#8be9fd] text-black border-[#8be9fd]' : 'bg-black/30 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Orientation</label>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {[
                  ['vertical', 'Vertical'],
                  ['horizontal', 'Horizontal'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOrientation(id)}
                    className={`py-3 rounded-[2px] border verge-label-mono text-[8px] uppercase font-black tracking-widest ${orientation === id ? 'bg-[#8be9fd] text-black border-[#8be9fd]' : 'bg-black/30 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Joueurs" value={players.length} />
              <StatBox label="Metric" value={selectedMetric?.label || '-'} />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 verge-label-mono text-[9px] font-black uppercase tracking-wider">
                {error}
              </div>
            )}
          </div>

          <div className="shrink-0 p-5 border-t border-white/10 bg-[#1a1a1a]">
            <button
              type="button"
              onClick={fetchBeeswarm}
              disabled={loading}
              className="w-full bg-[#8be9fd] disabled:bg-white/10 disabled:text-white/25 text-black py-4 rounded-[2px] verge-label-mono text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Actualiser
            </button>
          </div>
        </aside>

        <section className="min-w-0 bg-[#080808] border border-white/10 rounded-[4px] overflow-hidden relative min-h-[540px] xl:min-h-[660px] 2xl:h-full 2xl:min-h-0">
          {loading && (
            <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Loader2 size={28} className="text-[#8be9fd] animate-spin" />
            </div>
          )}
          <div className="h-full min-h-[540px] flex flex-col">
            <div className="shrink-0 p-5 sm:p-7 border-b border-white/10 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="verge-label-mono text-[9px] text-[#8be9fd] uppercase tracking-[0.28em] font-black">Distribution population</div>
                <h2 className="text-2xl sm:text-4xl text-white font-black uppercase tracking-tight mt-2">
                  {selectedMetric?.label || 'Beeswarm'}
                </h2>
                <p className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-[0.2em] mt-2">
                  Rang, percentile et dispersion par joueur
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
                <StatBox label="Population" value={players.length} />
                <StatBox label="Min actions" value={minActions} />
                <StatBox label="Mode" value={groupMode === 'team' ? 'Equipe' : 'Global'} />
                <StatBox label="Axe" value={orientation === 'vertical' ? 'Vertical' : 'Horizontal'} />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto scrollbar-verge p-4 sm:p-6">
              <BeeswarmChart
                players={players}
                metric={selectedMetric}
                selectedPlayerId={selectedPlayerId}
                onSelect={setSelectedPlayerId}
                groupMode={groupMode}
                orientation={orientation}
              />
            </div>
          </div>
        </section>

        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[380px] xl:col-span-2 xl:min-h-[420px] 2xl:col-span-1 2xl:h-full 2xl:min-h-0">
          <div className="shrink-0 p-5 pr-14 border-b border-white/10">
            <h3 className="verge-label-mono text-sm text-white font-black uppercase tracking-widest">Lecture</h3>
            <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] mt-1">selection et top population</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-verge p-5 space-y-4">
            {selectedPlayer ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-black/25 border border-[#8be9fd]/40 rounded-[2px] p-4">
                <div className="verge-label-mono text-[8px] text-[#8be9fd] uppercase tracking-[0.25em] font-black">Joueur selectionne</div>
                <h4 className="text-2xl text-white font-black uppercase mt-2">{selectedPlayer.playerName}</h4>
                <div className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest mt-1">{selectedPlayer.teamName}</div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <StatBox label="Rang" value={`#${selectedPlayer.rank || '-'}`} />
                  <StatBox label="Percentile" value={selectedPlayer.percentile ?? '-'} />
                  <StatBox label={selectedMetric?.label || 'Valeur'} value={formatValue(selectedPlayer.raw_value ?? selectedPlayer.value, selectedMetric)} />
                  <StatBox label="Actions" value={selectedPlayer.summary?.actions || 0} />
                </div>
              </motion.div>
            ) : (
              <div className="p-4 bg-black/25 border border-white/10 text-[#949494] verge-label-mono text-[9px] uppercase tracking-wider">
                Clique sur un point pour isoler un joueur.
              </div>
            )}

            <div>
              <div className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black mb-3">Top 10</div>
              <div className="space-y-2">
                {topPlayers.map((player) => (
                  <button
                    key={player.player_id}
                    type="button"
                    onClick={() => setSelectedPlayerId((current) => (String(current) === String(player.player_id) ? null : player.player_id))}
                    className={`w-full text-left p-3 rounded-[2px] border transition-all ${String(selectedPlayerId) === String(player.player_id) ? 'bg-[#8be9fd] text-black border-[#8be9fd]' : 'bg-black/25 border-white/10 text-[#d7d7d7] hover:border-white/30'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="verge-label-mono text-[9px] font-black uppercase truncate">{player.rank}. {player.playerName}</span>
                      <span className="verge-label-mono text-[9px] font-black">{formatValue(player.raw_value ?? player.value, selectedMetric)}</span>
                    </div>
                    <div className="verge-label-mono text-[7px] uppercase tracking-wider mt-1 opacity-60 truncate">{player.teamName} - pct {player.percentile}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PlayerBeeswarmExplorer;
