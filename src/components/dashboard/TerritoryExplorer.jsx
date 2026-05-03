import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Grid3X3, Loader2, Map, RefreshCw, RotateCw } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';
import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';
import { createExplorationSearchParams } from './optaFilterParams';

const METRICS = [
  {
    id: 'event_count',
    label: 'Volume',
    color: '#3cffd0',
    help: 'Nombre total d actions de l equipe dans chaque zone. Plus la cellule est intense, plus l equipe y agit souvent.'
  },
  {
    id: 'territory_share',
    label: 'Domination',
    color: '#ffffff',
    help: 'Part des actions de l equipe dans la cellule face au total des deux equipes. 70% signifie que cette equipe controle fortement cette zone.'
  },
  {
    id: 'recoveries',
    label: 'Recups',
    color: '#ffd03c',
    help: 'Zones ou l equipe recupere le ballon. Sert a lire le pressing, les pertes adverses forcees et les points de regain.'
  },
  {
    id: 'defensive_actions',
    label: 'Defense',
    color: '#8be9fd',
    help: 'Volume d actions defensives par zone. Utile pour reperer le bloc, les duels, interceptions et zones de protection.'
  },
  {
    id: 'possession_actions',
    label: 'Possession',
    color: '#3cffd0',
    help: 'Actions de circulation et conduite du ballon. Montre les zones d occupation active avec ballon.'
  },
  {
    id: 'xT',
    label: 'xT',
    color: '#ff4d4d',
    help: 'Menace ajoutee depuis chaque zone. Une cellule forte indique que les actions dans cette zone creent beaucoup de danger.'
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map(char => char + char).join('') : clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const getCellValue = (cell, metric) => {
  const value = Number(cell?.[metric] ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const getDenominator = (team, metric, maxCellEvents, maxXT) => {
  if (metric === 'territory_share') return 1;
  if (metric === 'xT') return Math.max(0.0001, Number(maxXT || 0));
  return Math.max(1, ...((team?.cells || []).map(cell => getCellValue(cell, metric))), Number(maxCellEvents || 0));
};

const formatCellValue = (value, metric) => {
  if (metric === 'territory_share') return `${Math.round(value * 100)}%`;
  if (metric === 'xT') return value >= 1 ? value.toFixed(1) : value.toFixed(2);
  return String(Math.round(value));
};

const TerritoryLayer = ({ team, grid, metric, maxCellEvents, maxXT, projectPoint }) => {
  const cells = team?.cells || [];
  const binsX = Number(grid?.bins_x || 12);
  const binsY = Number(grid?.bins_y || 8);
  const metricConfig = METRICS.find(item => item.id === metric) || METRICS[0];
  const rgb = hexToRgb(metricConfig.color);
  const denominator = getDenominator(team, metric, maxCellEvents, maxXT);

  return (
    <g className="territory-layer">
      {cells.map((cell) => {
        const x0 = (Number(cell.x) / binsX) * 100;
        const x1 = ((Number(cell.x) + 1) / binsX) * 100;
        const y0 = (Number(cell.y) / binsY) * 100;
        const y1 = ((Number(cell.y) + 1) / binsY) * 100;
        const corners = [
          projectPoint(x0, y0),
          projectPoint(x1, y0),
          projectPoint(x1, y1),
          projectPoint(x0, y1),
        ];
        if (corners.some(point => !point)) return null;

        const center = projectPoint((x0 + x1) / 2, (y0 + y1) / 2);
        const rawValue = getCellValue(cell, metric);
        const intensity = clamp(rawValue / denominator, 0, 1);
        const opacity = rawValue > 0 ? 0.12 + intensity * 0.68 : 0.035;
        const points = corners.map(point => `${point.x},${point.y}`).join(' ');
        const fill = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

        return (
          <g key={`${cell.x}-${cell.y}`} pointerEvents="none">
            <polygon
              points={points}
              fill={fill}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="0.18"
            />
            {center && intensity >= 0.42 && (
              <text
                x={center.x}
                y={center.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="1.8"
                fill="#ffffff"
                fontWeight="900"
              >
                {formatCellValue(rawValue, metric)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

const StatBox = ({ label, value }) => (
  <div className="bg-black/30 border border-white/10 rounded-[2px] p-3">
    <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black">{label}</div>
    <div className="verge-label-mono text-xl text-white font-black mt-1">{value}</div>
  </div>
);

const TerritoryExplorer = ({ filters = {} }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [grid, setGrid] = useState({ bins_x: 12, bins_y: 8 });
  const [binsX, setBinsX] = useState(12);
  const [binsY, setBinsY] = useState(8);
  const [metric, setMetric] = useState('event_count');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [maxCellEvents, setMaxCellEvents] = useState(0);
  const [maxXT, setMaxXT] = useState(0);
  const [orientation, setOrientation] = useState('horizontal');
  const { projectPoint } = usePitchProjection(orientation);

  const selectedTeam = useMemo(() => (
    teams.find(team => team.team_id === selectedTeamId) || teams[0] || null
  ), [teams, selectedTeamId]);

  const fetchTerritory = async () => {
    setLoading(true);
    setError(null);

    const params = createExplorationSearchParams(filters, {
      bins_x: String(binsX),
      bins_y: String(binsY),
    });

    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/territory?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || `TERRITORY_FAILURE: ${response.status}`);

      const nextTeams = Array.isArray(payload.teams) ? payload.teams : [];
      setTeams(nextTeams);
      setGrid(payload.grid || { bins_x: binsX, bins_y: binsY });
      setMaxCellEvents(Number(payload.max_cell_events || 0));
      setMaxXT(Number(payload.max_xT || 0));
      setSelectedTeamId(current => (
        nextTeams.some(team => team.team_id === current) ? current : nextTeams[0]?.team_id || null
      ));
    } catch (err) {
      console.error('TERRITORY_FETCH_ERROR:', err);
      setError(err.message);
      setTeams([]);
      setSelectedTeamId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerritory();
  }, [filters, binsX, binsY]);

  const totals = selectedTeam?.totals || {};
  const topCells = useMemo(() => (
    [...(selectedTeam?.cells || [])]
      .sort((a, b) => getCellValue(b, metric) - getCellValue(a, metric))
      .slice(0, 8)
  ), [selectedTeam, metric]);

  return (
    <div className="w-full h-full max-h-[100dvh] min-h-0 min-w-0 bg-[#131313] overflow-y-auto overflow-x-hidden 2xl:overflow-hidden scrollbar-verge p-3 sm:p-5 lg:p-8">
      <div className="w-full min-w-0 min-h-full 2xl:h-full 2xl:min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(270px,340px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(270px,18vw)_minmax(540px,1fr)_minmax(320px,22vw)] gap-4 lg:gap-6">
        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#3cffd0] text-black flex items-center justify-center">
                <Map size={18} />
              </div>
              <div>
                <h3 className="verge-label-mono text-lg text-white font-black uppercase tracking-tight">Territory</h3>
                <p className="verge-label-mono text-[8px] text-[#3cffd0] uppercase tracking-[0.25em] mt-1">API-first spatial grid</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 p-5 space-y-5 flex-1 overflow-y-auto scrollbar-verge">
            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Equipe</label>
              <div className="space-y-2">
                {teams.length > 0 ? teams.map(team => (
                  <button
                    key={team.team_id}
                    onClick={() => setSelectedTeamId(team.team_id)}
                    className={`w-full px-3 py-3 text-left rounded-[2px] border verge-label-mono text-[10px] font-black uppercase transition-all ${selectedTeamId === team.team_id
                      ? 'bg-[#3cffd0] text-black border-[#3cffd0]'
                      : 'bg-black/20 text-[#949494] border-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {team.teamName}
                  </button>
                )) : (
                  <div className="px-3 py-4 bg-black/20 border border-white/10 text-[#666] verge-label-mono text-[9px] uppercase">
                    Aucune equipe
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Mesure</label>
              <div className="grid grid-cols-2 gap-2">
                {METRICS.map((item, index) => (
                  <div key={item.id} className="relative group/metric">
                    <button
                      onClick={() => setMetric(item.id)}
                      aria-describedby={`territory-metric-${item.id}`}
                      className={`w-full px-3 py-2.5 rounded-[2px] border verge-label-mono text-[9px] font-black uppercase transition-all ${metric === item.id
                        ? 'bg-white text-black border-white'
                        : 'bg-black/20 text-[#949494] border-white/10 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {item.label}
                    </button>
                    <div
                      id={`territory-metric-${item.id}`}
                      className={`pointer-events-none absolute top-[calc(100%+8px)] z-[80] w-[min(280px,calc(100vw-48px))] opacity-0 translate-y-1 group-hover/metric:opacity-100 group-hover/metric:translate-y-0 transition-all duration-150 ${index % 2 === 0 ? 'left-0' : 'right-0'}`}
                    >
                      <div className="bg-[#050505] border border-[#3cffd0]/30 shadow-[0_12px_30px_rgba(0,0,0,0.45)] rounded-[3px] p-3">
                        <div className="verge-label-mono text-[8px] text-[#3cffd0] uppercase tracking-[0.22em] font-black mb-2">
                          Comment lire
                        </div>
                        <p className="verge-label-mono text-[9px] leading-relaxed text-[#d7d7d7] normal-case tracking-normal font-bold">
                          {item.help}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Maille</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="bg-black/20 border border-white/10 rounded-[2px] p-3">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Colonnes</span>
                  <input
                    type="number"
                    min="4"
                    max="24"
                    value={binsX}
                    onChange={(event) => setBinsX(clamp(Number(event.target.value || 12), 4, 24))}
                    className="w-full bg-transparent text-white verge-label-mono text-lg font-black outline-none mt-1"
                  />
                </label>
                <label className="bg-black/20 border border-white/10 rounded-[2px] p-3">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Lignes</span>
                  <input
                    type="number"
                    min="4"
                    max="18"
                    value={binsY}
                    onChange={(event) => setBinsY(clamp(Number(event.target.value || 8), 4, 18))}
                    className="w-full bg-transparent text-white verge-label-mono text-lg font-black outline-none mt-1"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOrientation(current => current === 'horizontal' ? 'vertical' : 'horizontal')}
                className="flex items-center justify-center gap-2 px-3 py-3 bg-black/30 border border-white/10 rounded-[2px] text-[#949494] hover:text-white hover:border-white/20 transition-all verge-label-mono text-[9px] font-black uppercase"
              >
                <RotateCw size={14} />
                Rotation
              </button>
              <button
                onClick={fetchTerritory}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3 py-3 bg-[#3cffd0] text-black rounded-[2px] disabled:opacity-50 transition-all verge-label-mono text-[9px] font-black uppercase"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Recharger
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 min-h-[460px] sm:min-h-[560px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0 bg-[#0f1724] border border-white/10 rounded-[4px] overflow-hidden relative">
          <TacticalPitch
            orientation={orientation}
            style={{ grass: '#0f1724', line: '#384154', background: '#0f1724' }}
            className="w-full h-full min-h-[460px] sm:min-h-[560px] xl:min-h-[620px] 2xl:min-h-0"
          >
            {selectedTeam && (
              <TerritoryLayer
                team={selectedTeam}
                grid={grid}
                metric={metric}
                maxCellEvents={maxCellEvents}
                maxXT={maxXT}
                projectPoint={projectPoint}
              />
            )}
          </TacticalPitch>

          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-black/45 border border-white/10 rounded-[2px] backdrop-blur">
            <Grid3X3 size={13} className="text-[#3cffd0]" />
            <span className="verge-label-mono text-[8px] text-white uppercase tracking-[0.25em] font-black">
              {grid.bins_x}x{grid.bins_y}
            </span>
          </div>

          {loading && (
            <div className="absolute inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center">
              <Loader2 size={34} className="text-[#3cffd0] animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 verge-label-mono text-[10px] uppercase">
              {error}
            </div>
          )}
        </section>

        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:col-span-2 2xl:col-span-1 2xl:h-full 2xl:min-h-0">
          <div className="p-5 border-b border-white/10">
            <div className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-[0.25em] font-black">Synthese territoire</div>
            <div className="verge-label-mono text-lg text-white font-black uppercase mt-2 truncate">
              {selectedTeam?.teamName || 'Aucune equipe'}
            </div>
          </div>

          <div className="min-h-0 p-5 space-y-5 flex-1 overflow-y-auto scrollbar-verge">
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Actions" value={totals.events || 0} />
              <StatBox label="xT" value={Number(totals.xt_credit || 0).toFixed(2)} />
              <StatBox label="Recups" value={totals.recoveries || 0} />
              <StatBox label="Tirs" value={totals.shots || 0} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-[#3cffd0]" />
                <span className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Zones fortes</span>
              </div>
              <div className="space-y-2">
                {topCells.length > 0 ? topCells.map((cell, index) => (
                  <motion.div
                    key={`${cell.x}-${cell.y}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025 }}
                    className="flex items-center justify-between gap-3 bg-black/25 border border-white/10 rounded-[2px] px-3 py-3"
                  >
                    <div>
                      <div className="verge-label-mono text-[10px] text-white font-black uppercase">Zone {cell.x + 1}.{cell.y + 1}</div>
                      <div className="verge-label-mono text-[8px] text-[#666] uppercase mt-1">
                        {cell.event_count} actions / {Math.round((cell.territory_share || 0) * 100)}% cellule
                      </div>
                    </div>
                    <div className="verge-label-mono text-sm text-[#3cffd0] font-black">
                      {formatCellValue(getCellValue(cell, metric), metric)}
                    </div>
                  </motion.div>
                )) : (
                  <div className="h-40 flex items-center justify-center border border-dashed border-white/10 text-[#666] verge-label-mono text-[9px] uppercase text-center px-6">
                    Aucun evenement spatial pour les filtres actifs
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TerritoryExplorer;
