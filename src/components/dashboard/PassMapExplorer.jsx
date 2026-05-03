import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Network, PlayCircle, RefreshCw, RotateCw, SlidersHorizontal } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';
import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';
import { createExplorationSearchParams } from './optaFilterParams';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const PassMapLayer = ({ team, selectedLink, onSelectLink, projectPoint }) => {
  const players = team?.players || [];
  const links = team?.links || [];
  const maxCount = Math.max(1, ...links.map(link => Number(link.count || 0)));
  const maxTouches = Math.max(1, ...players.map(player => Number(player.touch_count || 0)));

  return (
    <g className="passmap-layer">
      <defs>
        <marker id="passmap-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#3cffd0" />
        </marker>
      </defs>

      {links.map((link, index) => {
        const source = projectPoint(link.source_x, link.source_y);
        const target = projectPoint(link.target_x, link.target_y);
        if (!source || !target) return null;
        const id = `${link.source}-${link.target}`;
        const isSelected = selectedLink?.id === id;
        const width = 0.45 + (Number(link.count || 0) / maxCount) * 1.45;
        const opacity = isSelected ? 1 : 0.32 + (Number(link.count || 0) / maxCount) * 0.48;

        return (
          <g key={id}>
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isSelected ? '#ffffff' : '#3cffd0'}
              strokeWidth={isSelected ? width + 0.45 : width}
              strokeOpacity={opacity}
              markerEnd="url(#passmap-arrow)"
            />
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="transparent"
              strokeWidth="4"
              className="cursor-pointer pointer-events-auto"
              onClick={() => onSelectLink({ ...link, id, index })}
            />
          </g>
        );
      })}

      {players.map((player) => {
        const point = projectPoint(player.x, player.y);
        if (!point) return null;
        const radius = clamp(1.35 + (Number(player.touch_count || 0) / maxTouches) * 2.15, 1.35, 3.5);

        return (
          <g key={player.player_id} pointerEvents="none">
            <circle
              cx={point.x}
              cy={point.y}
              r={radius}
              fill="#111827"
              stroke="#3cffd0"
              strokeWidth="0.5"
            />
            <text
              x={point.x}
              y={point.y + 0.45}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="1.7"
              fill="#ffffff"
              fontWeight="900"
            >
              {player.rank}
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

const PassMapExplorer = ({ filters = {}, onPlayVideo, isVideoLoading = false }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [playersPerTeam, setPlayersPerTeam] = useState(16);
  const [minLinkCount, setMinLinkCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orientation, setOrientation] = useState('horizontal');
  const { projectPoint } = usePitchProjection(orientation);

  const selectedTeam = useMemo(() => (
    teams.find(team => team.team_id === selectedTeamId) || teams[0] || null
  ), [teams, selectedTeamId]);

  const fetchPassMap = async () => {
    setLoading(true);
    setError(null);
    setSelectedLink(null);

    const params = createExplorationSearchParams(filters, {
      players_per_team: String(playersPerTeam),
      min_link_count: String(minLinkCount),
    });

    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/passmap?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || `PASSMAP_FAILURE: ${response.status}`);
      const nextTeams = Array.isArray(payload.teams) ? payload.teams : [];
      setTeams(nextTeams);
      setSelectedTeamId(current => (
        nextTeams.some(team => team.team_id === current) ? current : nextTeams[0]?.team_id || null
      ));
    } catch (err) {
      console.error('PASSMAP_FETCH_ERROR:', err);
      setError(err.message);
      setTeams([]);
      setSelectedTeamId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassMap();
  }, [filters]);

  const totals = selectedTeam?.totals || {};
  const block = selectedTeam?.blockMetrics;
  const topLinks = selectedTeam?.links || [];
  const topPlayers = selectedTeam?.players || [];

  const playSelectedLink = () => {
    if (!selectedLink?.sample_opta_id || !selectedLink?.sample_match_id) return;
    onPlayVideo?.({
      opta_id: selectedLink.sample_opta_id,
      match_id: selectedLink.sample_match_id,
      type: 'Pass',
      type_name: 'Pass',
      playerName: selectedLink.sourceName,
      x: selectedLink.source_x,
      y: selectedLink.source_y,
      end_x: selectedLink.target_x,
      end_y: selectedLink.target_y,
      receiver: selectedLink.target,
      advanced_metrics: {
        type_name: 'Pass',
        receiver: selectedLink.target,
        xT: selectedLink.xT,
        end_x: selectedLink.target_x,
        end_y: selectedLink.target_y,
        distance_m: selectedLink.avg_distance_m,
      },
    });
  };

  return (
    <div className="w-full h-full max-h-[100dvh] min-h-0 min-w-0 bg-[#131313] overflow-y-auto overflow-x-hidden 2xl:overflow-hidden scrollbar-verge p-3 sm:p-5 lg:p-8">
      <div className="w-full min-w-0 min-h-full 2xl:h-full 2xl:min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(270px,340px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(270px,18vw)_minmax(540px,1fr)_minmax(320px,22vw)] gap-4 lg:gap-6">
        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#3cffd0] text-black flex items-center justify-center">
                <Network size={18} />
              </div>
              <div>
                <h3 className="verge-label-mono text-lg text-white font-black uppercase tracking-tight">PassMap</h3>
                <p className="verge-label-mono text-[8px] text-[#3cffd0] uppercase tracking-[0.25em] mt-1">API-first network</p>
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
                      setSelectedLink(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-[2px] border transition-all ${selectedTeam?.team_id === team.team_id ? 'bg-[#3cffd0] text-black border-[#3cffd0]' : 'bg-black/30 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    <div className="verge-label-mono text-[9px] font-black uppercase truncate">{team.teamName}</div>
                    <div className="verge-label-mono text-[8px] mt-1 opacity-70">{team.totals?.passes || 0} passes / {team.totals?.links || 0} liens</div>
                  </button>
                )) : (
                  <div className="p-4 bg-black/30 border border-white/10 text-[#949494] verge-label-mono text-[9px] uppercase tracking-wider">
                    Aucun reseau disponible
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Joueurs</span>
                  <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black">{playersPerTeam}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={playersPerTeam}
                  onChange={(event) => setPlayersPerTeam(Number(event.target.value))}
                  className="w-full accent-[#3cffd0]"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="verge-label-mono text-[8px] text-[#949494] uppercase">Min lien</span>
                  <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black">{minLinkCount}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={minLinkCount}
                  onChange={(event) => setMinLinkCount(Number(event.target.value))}
                  className="w-full accent-[#3cffd0]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Joueurs" value={totals.players || 0} />
              <StatBox label="Liens" value={totals.links || 0} />
              <StatBox label="Passes" value={totals.passes || 0} />
              <StatBox label="xT" value={Number(totals.xT || 0).toFixed(3)} />
            </div>

            {block && (
              <div className="bg-black/30 border border-white/10 rounded-[2px] p-4">
                <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black mb-3">Bloc moyen</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="verge-label-mono text-white text-sm font-black">{Number(block.avgX || 0).toFixed(1)}</div>
                    <div className="verge-label-mono text-[7px] text-[#949494] uppercase">Hauteur</div>
                  </div>
                  <div>
                    <div className="verge-label-mono text-white text-sm font-black">{Number(block.height || 0).toFixed(1)}m</div>
                    <div className="verge-label-mono text-[7px] text-[#949494] uppercase">Long.</div>
                  </div>
                  <div>
                    <div className="verge-label-mono text-white text-sm font-black">{Number(block.width || 0).toFixed(1)}m</div>
                    <div className="verge-label-mono text-[7px] text-[#949494] uppercase">Larg.</div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 verge-label-mono text-[9px] font-black uppercase tracking-wider">
                {error}
              </div>
            )}
          </div>

          <div className="shrink-0 p-5 border-t border-white/10 bg-[#1a1a1a]">
            <button
              type="button"
              onClick={fetchPassMap}
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
              <SlidersHorizontal size={13} className="text-[#3cffd0] shrink-0" />
              <span className="verge-label-mono text-[8px] sm:text-[9px] text-white font-black uppercase tracking-[0.18em] truncate">
                {selectedTeam?.teamName || 'PassMap'}
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
              <PassMapLayer
                team={selectedTeam}
                selectedLink={selectedLink}
                onSelectLink={setSelectedLink}
                projectPoint={projectPoint}
              />
            )}
          </TacticalPitch>
        </section>

        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:col-span-2 xl:min-h-[420px] 2xl:col-span-1 2xl:h-full 2xl:min-h-0">
          <div className="shrink-0 p-5 pr-14 border-b border-white/10 flex items-center justify-between gap-4">
            <div>
              <h3 className="verge-label-mono text-sm text-white font-black uppercase tracking-widest">Connexions</h3>
              <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] mt-1">{topLinks.length} liens filtres</p>
            </div>
            {selectedLink && (
              <button
                type="button"
                onClick={playSelectedLink}
                disabled={isVideoLoading || !selectedLink.sample_opta_id}
                className="px-4 py-2 rounded-full border border-[#3cffd0]/40 text-[#3cffd0] hover:bg-[#3cffd0] hover:text-black verge-label-mono text-[8px] font-black uppercase flex items-center gap-2 disabled:opacity-40"
              >
                {isVideoLoading ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                Video
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-verge divide-y divide-white/[0.04]">
            {topLinks.length > 0 ? topLinks.map((link, index) => {
              const id = `${link.source}-${link.target}`;
              const isSelected = selectedLink?.id === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedLink({ ...link, id, index })}
                  className={`w-full text-left p-5 transition-all ${isSelected ? 'bg-[#3cffd0]/10 border-l-2 border-[#3cffd0]' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-widest">#{index + 1}</span>
                    <span className="verge-label-mono text-[8px] text-[#949494]">{link.count} passes</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 verge-label-mono text-[10px] text-white font-black uppercase">
                    <span className="truncate">{link.sourceName || link.source}</span>
                    <ArrowRight size={12} className="shrink-0 text-[#3cffd0]" />
                    <span className="truncate">{link.targetName || link.target}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[8px] verge-label-mono uppercase text-[#949494]">
                    <span>xT {Number(link.xT || 0).toFixed(3)}</span>
                    <span>|</span>
                    <span>{Number(link.avg_distance_m || 0).toFixed(1)}m</span>
                  </div>
                </motion.button>
              );
            }) : (
              <div className="h-full flex items-center justify-center p-10 text-center">
                <div>
                  <Network size={42} className="mx-auto text-white/10 mb-5" />
                  <p className="verge-label-mono text-[10px] text-[#949494] uppercase tracking-[0.25em] font-black">
                    Aucune connexion avec les filtres actifs
                  </p>
                </div>
              </div>
            )}
          </div>

          {topPlayers.length > 0 && (
            <div className="shrink-0 border-t border-white/10 p-4 bg-black/20">
              <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black mb-3">Legende joueurs</div>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto scrollbar-verge pr-1">
                {topPlayers.map(player => (
                  <div key={player.player_id} className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 shrink-0 bg-[#3cffd0] text-black rounded-[2px] flex items-center justify-center verge-label-mono text-[8px] font-black">{player.rank}</span>
                    <span className="verge-label-mono text-[8px] text-white/80 truncate uppercase">{player.playerName}</span>
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

export default PassMapExplorer;
