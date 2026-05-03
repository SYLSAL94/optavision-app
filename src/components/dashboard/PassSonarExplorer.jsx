import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Loader2, Radar, RefreshCw, RotateCw } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';
import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';
import { createExplorationSearchParams } from './optaFilterParams';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const METRICS = [
  { id: 'count', label: 'Volume', color: '#3cffd0' },
  { id: 'xT', label: 'xT', color: '#ff4d4d' },
  { id: 'avg_distance_m', label: 'Longueur', color: '#ffd03c' },
  { id: 'completion_rate', label: 'Reussite', color: '#8be9fd' },
];

const getInitials = (name) => {
  const safeName = String(name || '').trim();
  if (!safeName) return '--';
  const parts = safeName
    .split(/\s+/)
    .map(part => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  return safeName.slice(0, 2).toUpperCase();
};

const metricValue = (bin, metric) => {
  if (metric === 'completion_rate') return Number(bin?.completion_rate || 0);
  return Number(bin?.[metric] || 0);
};

const metricDenominator = (players, metric, payload) => {
  if (metric === 'completion_rate') return 1;
  if (metric === 'xT') return Math.max(0.0001, Number(payload?.max_bin_xT || 0));
  if (metric === 'avg_distance_m') return Math.max(1, ...players.flatMap(player => (player.bins || []).map(bin => Number(bin.avg_distance_m || 0))));
  return Math.max(1, Number(payload?.max_bin_count || 0));
};

const formatMetric = (value, metric) => {
  if (metric === 'completion_rate') return `${Math.round(value * 100)}%`;
  if (metric === 'xT') return Number(value || 0).toFixed(3);
  if (metric === 'avg_distance_m') return `${Number(value || 0).toFixed(1)}m`;
  return String(Math.round(value || 0));
};

const vectorForAngle = (angleDeg, orientation) => {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  if (orientation === 'vertical') {
    return { x: -sin, y: -cos };
  }
  return { x: cos, y: -sin };
};

const arcPoint = (center, radius, angleDeg, orientation) => {
  const vector = vectorForAngle(angleDeg, orientation);
  return {
    x: center.x + vector.x * radius,
    y: center.y + vector.y * radius,
  };
};

const wedgePath = (center, innerRadius, outerRadius, startAngle, endAngle, orientation) => {
  const startOuter = arcPoint(center, outerRadius, startAngle, orientation);
  const endOuter = arcPoint(center, outerRadius, endAngle, orientation);
  const startInner = arcPoint(center, innerRadius, endAngle, orientation);
  const endInner = arcPoint(center, innerRadius, startAngle, orientation);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const sweepOuter = orientation === 'vertical' ? 0 : 0;
  const sweepInner = orientation === 'vertical' ? 1 : 1;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} ${sweepOuter} ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} ${sweepInner} ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
};

const PassSonarLayer = ({ team, metric, payload, orientation, projectPoint, selectedPlayerId, onSelectPlayer }) => {
  const players = team?.players || [];
  const denominator = metricDenominator(players, metric, payload);
  const maxPlayerPasses = Math.max(1, Number(payload?.max_player_passes || 0));
  const metricConfig = METRICS.find(item => item.id === metric) || METRICS[0];

  return (
    <g className="passsonar-layer">
      {players.map((player) => {
        const center = projectPoint(player.x, player.y);
        if (!center) return null;
        const isSelected = selectedPlayerId && String(selectedPlayerId) === String(player.player_id);
        const baseRadius = 1.1 + (Number(player.pass_count || 0) / maxPlayerPasses) * 1.8;
        const bins = player.bins || [];

        return (
          <g key={player.player_id} className="cursor-pointer pointer-events-auto" onClick={() => onSelectPlayer(isSelected ? null : player.player_id)}>
            {bins.map((bin) => {
              const value = metricValue(bin, metric);
              const intensity = clamp(value / denominator, 0, 1);
              const outerRadius = baseRadius + 1.2 + intensity * 4.5;
              const innerRadius = baseRadius + 0.25;
              const pad = 1.2;
              const start = Number(bin.angle_start || 0) + pad;
              const end = Number(bin.angle_end || 0) - pad;
              const opacity = isSelected ? 0.9 : 0.24 + intensity * 0.5;

              return (
                <path
                  key={bin.bin}
                  d={wedgePath(center, innerRadius, outerRadius, start, end, orientation)}
                  fill={metricConfig.color}
                  fillOpacity={opacity}
                  stroke={isSelected ? '#ffffff' : metricConfig.color}
                  strokeOpacity={isSelected ? 0.9 : 0.35}
                  strokeWidth={isSelected ? 0.28 : 0.12}
                >
                  <title>{`${player.playerName} - ${formatMetric(value, metric)} - ${bin.count} passes`}</title>
                </path>
              );
            })}
            <circle
              cx={center.x}
              cy={center.y}
              r={isSelected ? baseRadius + 0.7 : baseRadius}
              fill={isSelected ? '#ffffff' : '#111827'}
              stroke="#3cffd0"
              strokeWidth={isSelected ? 0.5 : 0.35}
            />
            <text
              x={center.x}
              y={center.y + 0.45}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isSelected ? '1.55' : '1.35'}
              fill={isSelected ? '#050505' : '#ffffff'}
              fontWeight="900"
              pointerEvents="none"
            >
              {getInitials(player.playerName)}
            </text>
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

const PassSonarExplorer = ({ filters = {} }) => {
  const [payload, setPayload] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [playersPerTeam, setPlayersPerTeam] = useState(14);
  const [directionBins, setDirectionBins] = useState(12);
  const [successfulOnly, setSuccessfulOnly] = useState(false);
  const [metric, setMetric] = useState('count');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orientation, setOrientation] = useState('horizontal');
  const { projectPoint } = usePitchProjection(orientation);

  const selectedTeam = useMemo(() => (
    teams.find(team => team.team_id === selectedTeamId) || teams[0] || null
  ), [teams, selectedTeamId]);

  const selectedPlayer = useMemo(() => (
    (selectedTeam?.players || []).find(player => String(player.player_id) === String(selectedPlayerId)) || null
  ), [selectedTeam, selectedPlayerId]);

  const fetchPassSonar = async () => {
    setLoading(true);
    setError(null);
    setSelectedPlayerId(null);
    const params = createExplorationSearchParams(filters, {
      players_per_team: String(playersPerTeam),
      direction_bins: String(directionBins),
      successful_only: successfulOnly ? 'true' : 'false',
    });

    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/passsonar?${params.toString()}`);
      const nextPayload = await response.json();
      if (!response.ok) throw new Error(nextPayload.detail || `PASSSONAR_FAILURE: ${response.status}`);
      const nextTeams = Array.isArray(nextPayload.teams) ? nextPayload.teams : [];
      setPayload(nextPayload);
      setTeams(nextTeams);
      setSelectedTeamId(current => (
        nextTeams.some(team => team.team_id === current) ? current : nextTeams[0]?.team_id || null
      ));
    } catch (err) {
      console.error('PASSSONAR_FETCH_ERROR:', err);
      setError(err.message);
      setPayload(null);
      setTeams([]);
      setSelectedTeamId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassSonar();
  }, [filters, playersPerTeam, directionBins, successfulOnly]);

  const totals = selectedTeam?.totals || {};
  const topPlayers = selectedTeam?.players || [];

  return (
    <div className="w-full h-full max-h-[100dvh] min-h-0 min-w-0 bg-[#131313] overflow-y-auto overflow-x-hidden 2xl:overflow-hidden scrollbar-verge p-3 sm:p-5 lg:p-8">
      <div className="w-full min-w-0 min-h-full 2xl:h-full 2xl:min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(270px,340px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(270px,18vw)_minmax(540px,1fr)_minmax(320px,22vw)] gap-4 lg:gap-6">
        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#3cffd0] text-black flex items-center justify-center">
                <Radar size={18} />
              </div>
              <div>
                <h3 className="verge-label-mono text-lg text-white font-black uppercase tracking-tight">PassSonar</h3>
                <p className="verge-label-mono text-[8px] text-[#3cffd0] uppercase tracking-[0.25em] mt-1">API-first directional passing</p>
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
                      setSelectedPlayerId(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-[2px] border transition-all ${selectedTeam?.team_id === team.team_id ? 'bg-[#3cffd0] text-black border-[#3cffd0]' : 'bg-black/30 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    <div className="verge-label-mono text-[9px] font-black uppercase truncate">{team.teamName}</div>
                    <div className="verge-label-mono text-[8px] mt-1 opacity-70">{team.totals?.passes || 0} passes</div>
                  </button>
                )) : (
                  <div className="p-4 bg-black/30 border border-white/10 text-[#949494] verge-label-mono text-[9px] uppercase tracking-wider">
                    Aucun sonar disponible
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Mesure</label>
              <div className="grid grid-cols-2 gap-2">
                {METRICS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMetric(item.id)}
                    className={`px-3 py-2.5 rounded-[2px] border verge-label-mono text-[9px] font-black uppercase transition-all ${metric === item.id ? 'bg-white text-black border-white' : 'bg-black/20 text-[#949494] border-white/10 hover:text-white hover:border-white/20'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Joueurs</span>
                  <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black">{playersPerTeam}</span>
                </div>
                <input type="range" min="5" max="25" value={playersPerTeam} onChange={(event) => setPlayersPerTeam(Number(event.target.value))} className="w-full accent-[#3cffd0]" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Secteurs</span>
                  <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black">{directionBins}</span>
                </div>
                <input type="range" min="8" max="24" step="4" value={directionBins} onChange={(event) => setDirectionBins(Number(event.target.value))} className="w-full accent-[#3cffd0]" />
              </div>
              <button
                type="button"
                onClick={() => setSuccessfulOnly(current => !current)}
                className={`w-full px-4 py-3 rounded-[2px] border verge-label-mono text-[9px] font-black uppercase transition-all ${successfulOnly ? 'bg-[#3cffd0] text-black border-[#3cffd0]' : 'bg-black/20 text-[#949494] border-white/10 hover:text-white'}`}
              >
                {successfulOnly ? 'Passes reussies seulement' : 'Toutes les passes'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Joueurs" value={totals.players || 0} />
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
              onClick={fetchPassSonar}
              disabled={loading}
              className="w-full bg-[#3cffd0] disabled:bg-white/10 disabled:text-white/25 text-black py-4 rounded-[2px] verge-label-mono text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Actualiser
            </button>
          </div>
        </aside>

        <section className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden relative min-h-[360px] sm:min-h-[460px] lg:min-h-[560px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="absolute left-3 right-3 top-3 sm:left-6 sm:right-6 sm:top-6 z-20 flex flex-wrap items-center gap-2">
            <div className="bg-black/60 border border-white/10 rounded-[2px] px-4 py-2 flex items-center gap-3 min-w-0">
              <Activity size={13} className="text-[#3cffd0] shrink-0" />
              <span className="verge-label-mono text-[8px] sm:text-[9px] text-white font-black uppercase tracking-[0.18em] truncate">
                {selectedTeam?.teamName || 'PassSonar'}
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
          {loading && (
            <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Loader2 size={28} className="text-[#3cffd0] animate-spin" />
            </div>
          )}
          <TacticalPitch
            style={{ grass: '#111827', line: 'rgba(255,255,255,0.16)', background: '#050505' }}
            orientation={orientation}
            view="full"
          >
            {selectedTeam && (
              <PassSonarLayer
                team={selectedTeam}
                metric={metric}
                payload={payload}
                orientation={orientation}
                projectPoint={projectPoint}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
              />
            )}
          </TacticalPitch>
        </section>

        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:col-span-2 xl:min-h-[420px] 2xl:col-span-1 2xl:h-full 2xl:min-h-0">
          <div className="shrink-0 p-5 pr-14 border-b border-white/10">
            <h3 className="verge-label-mono text-sm text-white font-black uppercase tracking-widest">Joueurs</h3>
            <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] mt-1">{topPlayers.length} sonars filtres</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-verge divide-y divide-white/[0.04]">
            {topPlayers.length > 0 ? topPlayers.map((player, index) => {
              const isSelected = String(selectedPlayerId) === String(player.player_id);
              return (
                <motion.button
                  key={player.player_id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedPlayerId(current => String(current) === String(player.player_id) ? null : player.player_id)}
                  className={`w-full text-left p-5 transition-all ${isSelected ? 'bg-[#3cffd0]/10 border-l-2 border-[#3cffd0]' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-widest">#{index + 1}</span>
                    <span className="verge-label-mono text-[8px] text-[#949494]">{player.pass_count} passes</span>
                  </div>
                  <div className="mt-3 verge-label-mono text-[10px] text-white font-black uppercase truncate">
                    {player.playerName}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[8px] verge-label-mono uppercase text-[#949494]">
                    <span>{Math.round(Number(player.completion_rate || 0) * 100)}%</span>
                    <span>|</span>
                    <span>{Number(player.avg_distance_m || 0).toFixed(1)}m</span>
                    <span>|</span>
                    <span>xT {Number(player.xT || 0).toFixed(3)}</span>
                  </div>
                </motion.button>
              );
            }) : (
              <div className="h-full flex items-center justify-center p-10 text-center">
                <div>
                  <Radar size={42} className="mx-auto text-white/10 mb-5" />
                  <p className="verge-label-mono text-[10px] text-[#949494] uppercase tracking-[0.25em] font-black">
                    Aucun joueur avec les filtres actifs
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedPlayer && (
            <div className="shrink-0 border-t border-white/10 p-5 bg-black/20">
              <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black mb-3">Details directionnels</div>
              <div className="grid grid-cols-2 gap-2">
                {(selectedPlayer.bins || []).map(bin => (
                  <div key={bin.bin} className="bg-black/30 border border-white/10 rounded-[2px] p-3">
                    <div className="verge-label-mono text-[8px] text-[#3cffd0] font-black">{Math.round(bin.angle_start)}-{Math.round(bin.angle_end)} deg</div>
                    <div className="verge-label-mono text-[9px] text-white font-black mt-1">{formatMetric(metricValue(bin, metric), metric)}</div>
                    <div className="verge-label-mono text-[7px] text-[#949494] uppercase mt-1">{bin.count} passes</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PassSonarExplorer;
