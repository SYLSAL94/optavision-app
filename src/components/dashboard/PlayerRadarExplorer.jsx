import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Loader2, Radar, RefreshCw, UserRound } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';
import { createExplorationSearchParams } from './optaFilterParams';

const COLORS = {
  Activite: '#3cffd0',
  Creation: '#ff4d4d',
  Distribution: '#8be9fd',
  Progression: '#ffd03c',
  Finition: '#ff7a7a',
  'Sans ballon': '#b4ff3c',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const polarToCartesian = (center, radius, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(rad),
    y: center + radius * Math.sin(rad),
  };
};

const describeArc = (center, innerRadius, outerRadius, startAngle, endAngle) => {
  const startOuter = polarToCartesian(center, outerRadius, startAngle);
  const endOuter = polarToCartesian(center, outerRadius, endAngle);
  const startInner = polarToCartesian(center, innerRadius, endAngle);
  const endInner = polarToCartesian(center, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
};

const formatValue = (metric) => {
  const value = Number(metric?.value || 0);
  if (metric?.suffix === '%') return `${Math.round(value)}%`;
  if (metric?.suffix === 'm') return `${Math.round(value)}m`;
  if ((metric?.digits || 0) >= 3) return value.toFixed(3);
  return String(Math.round(value));
};

const categoryColor = (category) => COLORS[category] || '#3cffd0';

const hexToRgb = (hex) => {
  const clean = String(hex || '').replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean, 16);
  if (!Number.isFinite(value)) return { r: 255, g: 255, b: 255 };
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const readableTextForFill = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#050505' : '#ffffff';
};

const PizzaChart = ({ player }) => {
  const metrics = player?.metrics || [];
  const center = 50;
  const innerRadius = 12;
  const maxRadius = 35;
  const gap = 1.2;
  const step = 360 / Math.max(1, metrics.length);

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full max-w-[760px] max-h-[62vh]" role="img" aria-label="Player pizza chart">
      <circle cx={center} cy={center} r={maxRadius} fill="#090909" stroke="rgba(255,255,255,0.12)" strokeWidth="0.35" />
      {[20, 40, 60, 80, 100].map((tick) => (
        <circle
          key={tick}
          cx={center}
          cy={center}
          r={innerRadius + ((maxRadius - innerRadius) * tick) / 100}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.25"
        />
      ))}
      {metrics.map((metric, index) => {
        const start = index * step + gap;
        const end = (index + 1) * step - gap;
        const percentile = clamp(Number(metric.percentile || 0), 0, 100);
        const radius = innerRadius + ((maxRadius - innerRadius) * percentile) / 100;
        const color = categoryColor(metric.category);
        const valueTextColor = readableTextForFill(color);
        const valueStrokeColor = valueTextColor === '#ffffff' ? '#050505' : '#ffffff';
        const labelPoint = polarToCartesian(center, maxRadius + 5, start + step / 2);
        const valuePoint = polarToCartesian(center, Math.max(innerRadius + 6, radius - 5), start + step / 2);

        return (
          <g key={metric.id}>
            <path
              d={describeArc(center, innerRadius, radius, start, end)}
              fill={color}
              fillOpacity="0.78"
              stroke="#050505"
              strokeWidth="0.35"
            >
              <title>{`${metric.label}: percentile ${percentile} - valeur ${formatValue(metric)}`}</title>
            </path>
            <line
              x1={center}
              y1={center}
              x2={polarToCartesian(center, maxRadius, start).x}
              y2={polarToCartesian(center, maxRadius, start).y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.2"
            />
            <text
              x={valuePoint.x}
              y={valuePoint.y + 0.8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="2.4"
              fill={valueTextColor}
              stroke={valueStrokeColor}
              strokeWidth="0.18"
              paintOrder="stroke"
              fontWeight="900"
            >
              {percentile}
            </text>
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor={labelPoint.x > center + 3 ? 'start' : labelPoint.x < center - 3 ? 'end' : 'middle'}
              dominantBaseline="middle"
              fontSize="1.85"
              fill="#d7d7d7"
              fontWeight="900"
            >
              {metric.label}
            </text>
          </g>
        );
      })}
      <circle cx={center} cy={center} r={innerRadius - 1} fill="#050505" stroke="rgba(255,255,255,0.16)" strokeWidth="0.3" />
      <text x={center} y={center - 2.5} textAnchor="middle" fontSize="3.1" fill="#ffffff" fontWeight="900">
        {player?.summary?.actions || 0}
      </text>
      <text x={center} y={center + 2.4} textAnchor="middle" fontSize="1.8" fill="#949494" fontWeight="900">
        ACTIONS
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

const PlayerRadarExplorer = ({ filters = {} }) => {
  const [payload, setPayload] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [minActions, setMinActions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedPlayer = useMemo(() => (
    players.find(player => String(player.player_id) === String(selectedPlayerId)) || players[0] || null
  ), [players, selectedPlayerId]);

  const fetchRadar = async () => {
    setLoading(true);
    setError(null);
    const params = createExplorationSearchParams(filters, {
      min_actions: String(minActions),
      limit: '100',
    });

    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playerradar?${params.toString()}`);
      const rawPayload = await response.text();
      let nextPayload = null;
      try {
        nextPayload = rawPayload ? JSON.parse(rawPayload) : {};
      } catch {
        nextPayload = { detail: rawPayload || `PLAYERRADAR_FAILURE: ${response.status}` };
      }
      if (!response.ok) throw new Error(nextPayload.detail || `PLAYERRADAR_FAILURE: ${response.status}`);
      const nextPlayers = Array.isArray(nextPayload.players) ? nextPayload.players : [];
      setPayload(nextPayload);
      setPlayers(nextPlayers);
      setSelectedPlayerId(current => (
        nextPlayers.some(player => String(player.player_id) === String(current)) ? current : nextPlayers[0]?.player_id || null
      ));
    } catch (err) {
      console.error('PLAYERRADAR_FETCH_ERROR:', err);
      setError(err.message);
      setPayload(null);
      setPlayers([]);
      setSelectedPlayerId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, [filters, minActions]);

  const categories = useMemo(() => {
    const seen = new Set();
    return (payload?.metrics || []).filter(metric => {
      if (seen.has(metric.category)) return false;
      seen.add(metric.category);
      return true;
    });
  }, [payload]);

  return (
    <div className="w-full h-full max-h-[100dvh] min-h-0 min-w-0 bg-[#131313] overflow-y-auto overflow-x-hidden 2xl:overflow-hidden scrollbar-verge p-3 sm:p-5 lg:p-8">
      <div className="w-full min-w-0 min-h-full 2xl:h-full 2xl:min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(280px,19vw)_minmax(540px,1fr)_minmax(320px,22vw)] gap-4 lg:gap-6">
        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#3cffd0] text-black flex items-center justify-center">
                <Radar size={18} />
              </div>
              <div>
                <h3 className="verge-label-mono text-lg text-white font-black uppercase tracking-tight">Player Radar</h3>
                <p className="verge-label-mono text-[8px] text-[#3cffd0] uppercase tracking-[0.25em] mt-1">API-first pizza chart</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 p-5 space-y-5 flex-1 overflow-y-auto scrollbar-verge">
            <div>
              <div className="flex justify-between mb-2">
                <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Actions min.</span>
                <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black">{minActions}</span>
              </div>
              <input type="range" min="1" max="60" value={minActions} onChange={(event) => setMinActions(Number(event.target.value))} className="w-full accent-[#3cffd0]" />
            </div>

            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Joueur</label>
              <div className="space-y-2">
                {players.length > 0 ? players.map(player => (
                  <button
                    key={player.player_id}
                    type="button"
                    onClick={() => setSelectedPlayerId(player.player_id)}
                    className={`w-full text-left px-4 py-3 rounded-[2px] border transition-all ${selectedPlayer?.player_id === player.player_id ? 'bg-[#3cffd0] text-black border-[#3cffd0]' : 'bg-black/30 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    <div className="verge-label-mono text-[9px] font-black uppercase truncate">{player.playerName}</div>
                    <div className="verge-label-mono text-[8px] mt-1 opacity-70 truncate">{player.teamName} - xT {Number(player.summary?.xT || 0).toFixed(3)}</div>
                  </button>
                )) : (
                  <div className="p-4 bg-black/30 border border-white/10 text-[#949494] verge-label-mono text-[9px] uppercase tracking-wider">
                    Aucun joueur disponible
                  </div>
                )}
              </div>
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
              onClick={fetchRadar}
              disabled={loading}
              className="w-full bg-[#3cffd0] disabled:bg-white/10 disabled:text-white/25 text-black py-4 rounded-[2px] verge-label-mono text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Actualiser
            </button>
          </div>
        </aside>

        <section className="min-w-0 bg-[#080808] border border-white/10 rounded-[4px] overflow-hidden relative min-h-[520px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          {loading && (
            <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Loader2 size={28} className="text-[#3cffd0] animate-spin" />
            </div>
          )}
          {selectedPlayer ? (
            <div className="w-full h-full min-h-[520px] flex flex-col p-5 sm:p-8">
              <div className="shrink-0 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.28em] font-black">Player pizza</div>
                  <h2 className="text-3xl sm:text-4xl text-white font-black uppercase tracking-tight mt-2">{selectedPlayer.playerName}</h2>
                  <p className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-[0.2em] mt-2">{selectedPlayer.teamName}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
                  <StatBox label="Actions" value={selectedPlayer.summary?.actions || 0} />
                  <StatBox label="Reussite" value={`${Number(selectedPlayer.summary?.success_rate || 0).toFixed(0)}%`} />
                  <StatBox label="xT" value={Number(selectedPlayer.summary?.xT || 0).toFixed(3)} />
                  <StatBox label="xG" value={Number(selectedPlayer.summary?.xG || 0).toFixed(3)} />
                </div>
              </div>

              <div className="flex-1 min-h-0 flex items-center justify-center py-3 sm:py-5 overflow-hidden">
                <PizzaChart player={selectedPlayer} />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-10 text-center">
              <div>
                <UserRound size={42} className="mx-auto text-white/10 mb-5" />
                <p className="verge-label-mono text-[10px] text-[#949494] uppercase tracking-[0.25em] font-black">
                  Aucun joueur avec les filtres actifs
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:col-span-2 xl:min-h-[420px] 2xl:col-span-1 2xl:h-full 2xl:min-h-0">
          <div className="shrink-0 p-5 pr-14 border-b border-white/10">
            <h3 className="verge-label-mono text-sm text-white font-black uppercase tracking-widest">Percentiles</h3>
            <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] mt-1">compare aux joueurs filtres</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-verge p-5 space-y-4">
            {categories.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {categories.map(category => (
                  <div key={category.category} className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-[2px] px-3 py-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColor(category.category) }} />
                    <span className="verge-label-mono text-[8px] text-[#d7d7d7] uppercase tracking-wider truncate">{category.category}</span>
                  </div>
                ))}
              </div>
            )}

            {(selectedPlayer?.metrics || []).map(metric => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/25 border border-white/10 rounded-[2px] p-3"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="verge-label-mono text-[9px] text-white font-black uppercase">{metric.label}</div>
                    <div className="verge-label-mono text-[7px] text-[#949494] uppercase tracking-widest mt-1">{metric.category}</div>
                  </div>
                  <div className="verge-label-mono text-[10px] text-[#3cffd0] font-black">{metric.percentile}</div>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${metric.percentile}%`, backgroundColor: categoryColor(metric.category) }}
                  />
                </div>
                <div className="verge-label-mono text-[8px] text-[#949494] mt-2">Valeur brute: {formatValue(metric)}</div>
              </motion.div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PlayerRadarExplorer;
