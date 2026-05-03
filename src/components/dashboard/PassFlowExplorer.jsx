import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, GitBranch, Loader2, RefreshCw, RotateCw } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';
import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';
import { createExplorationSearchParams } from './optaFilterParams';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const METRICS = [
  {
    id: 'count',
    label: 'Volume',
    color: '#3cffd0',
    help: 'Nombre de passes entre deux cellules. Une liaison forte indique un couloir de circulation souvent utilise.'
  },
  {
    id: 'xT',
    label: 'xT',
    color: '#ff4d4d',
    help: 'Menace totale ajoutee par les passes de ce flux. Une liaison forte signale un passage qui rapproche du danger.'
  },
  {
    id: 'total_distance_m',
    label: 'Distance',
    color: '#ffd03c',
    help: 'Distance cumulee parcourue par les passes du flux. Utile pour lire les renversements, sorties longues et progressions.'
  },
  {
    id: 'completion_rate',
    label: 'Reussite',
    color: '#8be9fd',
    help: 'Pourcentage de passes reussies sur cette liaison. Une valeur forte indique un flux stable et fiable.'
  },
];

const metricValue = (flow, metric) => {
  if (metric === 'completion_rate') return Number(flow?.completion_rate || 0);
  return Number(flow?.[metric] || 0);
};

const metricDenominator = (flows, metric, payload) => {
  if (metric === 'completion_rate') return 1;
  if (metric === 'xT') return Math.max(0.0001, Number(payload?.max_xT || 0));
  if (metric === 'total_distance_m') return Math.max(1, Number(payload?.max_distance_m || 0));
  return Math.max(1, Number(payload?.max_count || 0));
};

const formatMetric = (value, metric) => {
  if (metric === 'completion_rate') return `${Math.round(Number(value || 0) * 100)}%`;
  if (metric === 'xT') return Number(value || 0).toFixed(3);
  if (metric === 'total_distance_m') return `${Number(value || 0).toFixed(0)}m`;
  return String(Math.round(Number(value || 0)));
};

const flowLabel = (flow) => {
  if (!flow) return '';
  return `C${flow.start.cell_x + 1}-${flow.start.cell_y + 1} -> C${flow.end.cell_x + 1}-${flow.end.cell_y + 1}`;
};

const buildArrowGeometry = (start, end, intensity) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 0.1) return null;

  const ux = dx / length;
  const uy = dy / length;
  const headLength = 1.15 + intensity * 1.15;
  const headWidth = 0.9 + intensity * 0.85;
  const nodeRadius = 0.5;
  const lineStart = {
    x: start.x + ux * nodeRadius,
    y: start.y + uy * nodeRadius,
  };
  const tip = {
    x: end.x - ux * nodeRadius,
    y: end.y - uy * nodeRadius,
  };
  const lineEnd = {
    x: tip.x - ux * headLength,
    y: tip.y - uy * headLength,
  };
  const left = {
    x: lineEnd.x + (-uy) * headWidth,
    y: lineEnd.y + ux * headWidth,
  };
  const right = {
    x: lineEnd.x - (-uy) * headWidth,
    y: lineEnd.y - ux * headWidth,
  };

  return {
    lineStart,
    lineEnd,
    points: `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`,
  };
};

const StatBox = ({ label, value }) => (
  <div className="bg-black/30 border border-white/10 rounded-[2px] p-3">
    <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black">{label}</div>
    <div className="verge-label-mono text-xl text-white font-black mt-1">{value}</div>
  </div>
);

const GridOverlay = ({ grid, projectPoint }) => {
  const cols = Number(grid?.x || 8);
  const rows = Number(grid?.y || 6);
  const verticalLines = Array.from({ length: cols - 1 }, (_, index) => ((index + 1) / cols) * 100);
  const horizontalLines = Array.from({ length: rows - 1 }, (_, index) => ((index + 1) / rows) * 100);

  return (
    <g opacity="0.18" pointerEvents="none">
      {verticalLines.map((x) => {
        const a = projectPoint(x, 0);
        const b = projectPoint(x, 100);
        if (!a || !b) return null;
        return <line key={`vx-${x}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeWidth="0.08" />;
      })}
      {horizontalLines.map((y) => {
        const a = projectPoint(0, y);
        const b = projectPoint(100, y);
        if (!a || !b) return null;
        return <line key={`hy-${y}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff" strokeWidth="0.08" />;
      })}
    </g>
  );
};

const PassFlowLayer = ({ team, payload, metric, selectedFlowId, onSelectFlow, projectPoint, maxRendered }) => {
  const flows = [...(team?.flows || [])]
    .sort((a, b) => metricValue(b, metric) - metricValue(a, metric))
    .slice(0, maxRendered);
  const denominator = metricDenominator(flows, metric, payload);
  const metricConfig = METRICS.find(item => item.id === metric) || METRICS[0];

  return (
    <g className="passflow-layer">
      <GridOverlay grid={payload?.grid} projectPoint={projectPoint} />
      {flows.map((flow) => {
        const start = projectPoint(flow.start.x, flow.start.y);
        const end = projectPoint(flow.end.x, flow.end.y);
        if (!start || !end) return null;
        const isSelected = selectedFlowId && String(selectedFlowId) === String(flow.id);
        const value = metricValue(flow, metric);
        const intensity = clamp(value / denominator, 0, 1);
        const strokeWidth = isSelected ? 0.7 + intensity * 0.75 : 0.16 + intensity * 0.62;
        const opacity = isSelected ? 0.92 : 0.18 + intensity * 0.45;
        const color = isSelected ? '#ffffff' : metricConfig.color;
        const arrow = buildArrowGeometry(start, end, intensity);
        if (!arrow) return null;

        return (
          <g key={flow.id} className="cursor-pointer pointer-events-auto">
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="transparent"
              strokeWidth="5"
              strokeLinecap="round"
              onClick={() => onSelectFlow(isSelected ? null : flow.id)}
            />
            <line
              x1={arrow.lineStart.x}
              y1={arrow.lineStart.y}
              x2={arrow.lineEnd.x}
              y2={arrow.lineEnd.y}
              stroke={color}
              strokeOpacity={opacity}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              pointerEvents="none"
            >
              <title>{`${flowLabel(flow)} - ${formatMetric(value, metric)} - ${flow.count} passes`}</title>
            </line>
            <polygon
              points={arrow.points}
              fill={color}
              fillOpacity={opacity}
              stroke={isSelected ? '#ffffff' : color}
              strokeOpacity={isSelected ? 0.75 : 0}
              strokeWidth="0.1"
              pointerEvents="none"
            />
            <circle
              cx={start.x}
              cy={start.y}
              r={isSelected ? 0.9 : 0.35 + intensity * 0.35}
              fill="#050505"
              stroke={color}
              strokeWidth={isSelected ? 0.32 : 0.16}
              strokeOpacity={0.9}
              pointerEvents="none"
            />
            {isSelected && (
              <circle
                cx={end.x}
                cy={end.y}
                r="0.95"
                fill={metricConfig.color}
                fillOpacity="0.95"
                stroke="#ffffff"
                strokeWidth="0.22"
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

const PassFlowExplorer = ({ filters = {} }) => {
  const [payload, setPayload] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [gridX, setGridX] = useState(8);
  const [gridY, setGridY] = useState(6);
  const [minCount, setMinCount] = useState(2);
  const [maxRendered, setMaxRendered] = useState(80);
  const [successfulOnly, setSuccessfulOnly] = useState(false);
  const [metric, setMetric] = useState('count');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orientation, setOrientation] = useState('horizontal');
  const { projectPoint } = usePitchProjection(orientation);

  const selectedTeam = useMemo(() => (
    teams.find(team => team.team_id === selectedTeamId) || teams[0] || null
  ), [teams, selectedTeamId]);

  const selectedFlow = useMemo(() => (
    (selectedTeam?.flows || []).find(flow => String(flow.id) === String(selectedFlowId)) || null
  ), [selectedTeam, selectedFlowId]);

  const sortedFlows = useMemo(() => {
    const flows = selectedTeam?.flows || [];
    return [...flows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
  }, [selectedTeam, metric]);

  const fetchPassFlow = async () => {
    setLoading(true);
    setError(null);
    setSelectedFlowId(null);
    const params = createExplorationSearchParams(filters, {
      grid_x: String(gridX),
      grid_y: String(gridY),
      min_count: String(minCount),
      successful_only: successfulOnly ? 'true' : 'false',
      limit: '350',
    });

    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/passflow?${params.toString()}`);
      const nextPayload = await response.json();
      if (!response.ok) throw new Error(nextPayload.detail || `PASSFLOW_FAILURE: ${response.status}`);
      const nextTeams = Array.isArray(nextPayload.teams) ? nextPayload.teams : [];
      setPayload(nextPayload);
      setTeams(nextTeams);
      setSelectedTeamId(current => (
        nextTeams.some(team => team.team_id === current) ? current : nextTeams[0]?.team_id || null
      ));
    } catch (err) {
      console.error('PASSFLOW_FETCH_ERROR:', err);
      setError(err.message);
      setPayload(null);
      setTeams([]);
      setSelectedTeamId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassFlow();
  }, [filters, gridX, gridY, minCount, successfulOnly]);

  const totals = selectedTeam?.totals || {};

  return (
    <div className="w-full h-full max-h-[100dvh] min-h-0 min-w-0 bg-[#131313] overflow-y-auto overflow-x-hidden 2xl:overflow-hidden scrollbar-verge p-3 sm:p-5 lg:p-8">
      <div className="w-full min-w-0 min-h-full 2xl:h-full 2xl:min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(270px,340px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(270px,18vw)_minmax(540px,1fr)_minmax(320px,22vw)] gap-4 lg:gap-6">
        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#ffd03c] text-black flex items-center justify-center">
                <GitBranch size={18} />
              </div>
              <div>
                <h3 className="verge-label-mono text-lg text-white font-black uppercase tracking-tight">PassFlow</h3>
                <p className="verge-label-mono text-[8px] text-[#ffd03c] uppercase tracking-[0.25em] mt-1">API-first passing lanes</p>
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
                    type="button"
                    onClick={() => {
                      setSelectedTeamId(team.team_id);
                      setSelectedFlowId(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-[2px] border transition-all ${selectedTeam?.team_id === team.team_id ? 'bg-[#ffd03c] text-black border-[#ffd03c]' : 'bg-black/30 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    <div className="verge-label-mono text-[9px] font-black uppercase truncate">{team.teamName}</div>
                    <div className="verge-label-mono text-[8px] mt-1 opacity-70">{team.totals?.flows || 0} flux</div>
                  </button>
                )) : (
                  <div className="p-4 bg-black/30 border border-white/10 text-[#949494] verge-label-mono text-[9px] uppercase tracking-wider">
                    Aucun flux disponible
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
                      type="button"
                      onClick={() => setMetric(item.id)}
                      aria-describedby={`passflow-metric-${item.id}`}
                      className={`w-full px-3 py-2.5 rounded-[2px] border verge-label-mono text-[9px] font-black uppercase transition-all ${metric === item.id ? 'bg-white text-black border-white' : 'bg-black/20 text-[#949494] border-white/10 hover:text-white hover:border-white/20'}`}
                    >
                      {item.label}
                    </button>
                    <div
                      id={`passflow-metric-${item.id}`}
                      className={`pointer-events-none absolute top-[calc(100%+8px)] z-[80] w-[min(280px,calc(100vw-48px))] opacity-0 translate-y-1 group-hover/metric:opacity-100 group-hover/metric:translate-y-0 transition-all duration-150 ${index % 2 === 0 ? 'left-0' : 'right-0'}`}
                    >
                      <div className="bg-[#050505] border border-[#ffd03c]/30 shadow-[0_12px_30px_rgba(0,0,0,0.45)] rounded-[3px] p-3">
                        <div className="verge-label-mono text-[8px] text-[#ffd03c] uppercase tracking-[0.22em] font-black mb-2">
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

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Colonnes</span>
                  <span className="verge-label-mono text-[9px] text-[#ffd03c] font-black">{gridX}</span>
                </div>
                <input type="range" min="4" max="16" value={gridX} onChange={(event) => setGridX(Number(event.target.value))} className="w-full accent-[#ffd03c]" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Lignes</span>
                  <span className="verge-label-mono text-[9px] text-[#ffd03c] font-black">{gridY}</span>
                </div>
                <input type="range" min="4" max="12" value={gridY} onChange={(event) => setGridY(Number(event.target.value))} className="w-full accent-[#ffd03c]" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Seuil flux</span>
                  <span className="verge-label-mono text-[9px] text-[#ffd03c] font-black">{minCount}</span>
                </div>
                <input type="range" min="1" max="20" value={minCount} onChange={(event) => setMinCount(Number(event.target.value))} className="w-full accent-[#ffd03c]" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Flux affiches</span>
                  <span className="verge-label-mono text-[9px] text-[#ffd03c] font-black">{maxRendered}</span>
                </div>
                <input type="range" min="20" max="180" step="10" value={maxRendered} onChange={(event) => setMaxRendered(Number(event.target.value))} className="w-full accent-[#ffd03c]" />
              </div>
              <button
                type="button"
                onClick={() => setSuccessfulOnly(current => !current)}
                className={`w-full px-4 py-3 rounded-[2px] border verge-label-mono text-[9px] font-black uppercase transition-all ${successfulOnly ? 'bg-[#ffd03c] text-black border-[#ffd03c]' : 'bg-black/20 text-[#949494] border-white/10 hover:text-white'}`}
              >
                {successfulOnly ? 'Passes reussies seulement' : 'Toutes les passes'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Flux" value={totals.flows || 0} />
              <StatBox label="Passes" value={totals.passes || 0} />
              <StatBox label="Reussies" value={totals.completed || 0} />
              <StatBox label="xT" value={Number(totals.xT || 0).toFixed(3)} />
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
              onClick={fetchPassFlow}
              disabled={loading}
              className="w-full bg-[#ffd03c] disabled:bg-white/10 disabled:text-white/25 text-black py-4 rounded-[2px] verge-label-mono text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Actualiser
            </button>
          </div>
        </aside>

        <section className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden relative min-h-[360px] sm:min-h-[460px] lg:min-h-[560px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="absolute left-3 right-3 top-3 sm:left-6 sm:right-6 sm:top-6 z-20 flex flex-wrap items-center gap-2">
            <div className="bg-black/60 border border-white/10 rounded-[2px] px-4 py-2 flex items-center gap-3 min-w-0">
              <Activity size={13} className="text-[#ffd03c] shrink-0" />
              <span className="verge-label-mono text-[8px] sm:text-[9px] text-white font-black uppercase tracking-[0.18em] truncate">
                {selectedTeam?.teamName || 'PassFlow'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOrientation(current => (current === 'horizontal' ? 'vertical' : 'horizontal'))}
              className="bg-black/70 border border-[#ffd03c]/30 rounded-[2px] px-3 py-2 flex items-center gap-2 text-[#ffd03c] hover:bg-[#ffd03c] hover:text-black transition-all"
              title="Rotation de la carte"
            >
              <RotateCw size={13} />
              <span className="verge-label-mono text-[8px] font-black uppercase tracking-[0.18em]">
                {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
              </span>
            </button>
          </div>
          {loading && (
            <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Loader2 size={28} className="text-[#ffd03c] animate-spin" />
            </div>
          )}
          <TacticalPitch
            style={{ grass: '#111827', line: 'rgba(255,255,255,0.16)', background: '#050505' }}
            orientation={orientation}
            view="full"
          >
            {selectedTeam && (
              <PassFlowLayer
                team={selectedTeam}
                payload={payload}
                metric={metric}
                selectedFlowId={selectedFlowId}
                onSelectFlow={setSelectedFlowId}
                projectPoint={projectPoint}
                maxRendered={maxRendered}
              />
            )}
          </TacticalPitch>
        </section>

        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:col-span-2 xl:min-h-[420px] 2xl:col-span-1 2xl:h-full 2xl:min-h-0">
          <div className="shrink-0 p-5 pr-14 border-b border-white/10">
            <h3 className="verge-label-mono text-sm text-white font-black uppercase tracking-widest">Flux</h3>
            <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] mt-1">{sortedFlows.length} liaisons filtrees</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-verge divide-y divide-white/[0.04]">
            {sortedFlows.length > 0 ? sortedFlows.map((flow, index) => {
              const isSelected = String(selectedFlowId) === String(flow.id);
              return (
                <motion.button
                  key={flow.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedFlowId(current => String(current) === String(flow.id) ? null : flow.id)}
                  className={`w-full text-left p-5 transition-all ${isSelected ? 'bg-[#ffd03c]/10 border-l-2 border-[#ffd03c]' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="verge-label-mono text-[9px] text-[#ffd03c] font-black uppercase tracking-widest">#{index + 1}</span>
                    <span className="verge-label-mono text-[8px] text-[#949494]">{flow.count} passes</span>
                  </div>
                  <div className="mt-3 verge-label-mono text-[10px] text-white font-black uppercase truncate">
                    {flowLabel(flow)}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[8px] verge-label-mono uppercase text-[#949494]">
                    <span>{Math.round(Number(flow.completion_rate || 0) * 100)}%</span>
                    <span>|</span>
                    <span>{Number(flow.avg_distance_m || 0).toFixed(1)}m moy.</span>
                    <span>|</span>
                    <span>xT {Number(flow.xT || 0).toFixed(3)}</span>
                  </div>
                </motion.button>
              );
            }) : (
              <div className="h-full flex items-center justify-center p-10 text-center">
                <div>
                  <GitBranch size={42} className="mx-auto text-white/10 mb-5" />
                  <p className="verge-label-mono text-[10px] text-[#949494] uppercase tracking-[0.25em] font-black">
                    Aucun flux avec les filtres actifs
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedFlow && (
            <div className="shrink-0 border-t border-white/10 p-5 bg-black/20">
              <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black mb-3">Flux selectionne</div>
              <div className="verge-label-mono text-sm text-white font-black uppercase">{flowLabel(selectedFlow)}</div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <StatBox label="Passes" value={selectedFlow.count} />
                <StatBox label="Reussite" value={`${Math.round(Number(selectedFlow.completion_rate || 0) * 100)}%`} />
                <StatBox label="Distance" value={`${Number(selectedFlow.total_distance_m || 0).toFixed(0)}m`} />
                <StatBox label="xT" value={Number(selectedFlow.xT || 0).toFixed(3)} />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PassFlowExplorer;
