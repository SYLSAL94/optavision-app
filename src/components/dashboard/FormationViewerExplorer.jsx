import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Loader2, RefreshCw, RotateCw, Shield, UsersRound } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';
import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';
import { createExplorationSearchParams } from './optaFilterParams';

const IMPORTANT_SOURCES = {
  FormationSet: '#3cffd0',
  FormationChange: '#ffd03c',
  SubstitutionSlot: '#8be9fd',
  CoordinateInferenceAfterSubstitution: '#ff4d4d',
  SubstitutionOff: '#ff7a7a',
  InitialSnapshot: '#3cffd0',
};

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

const sourceColor = (source = '') => {
  const parts = String(source).split(',').map(item => item.trim()).filter(Boolean);
  const key = parts.find(part => IMPORTANT_SOURCES[part]) || parts[0] || 'InitialSnapshot';
  return IMPORTANT_SOURCES[key] || '#3cffd0';
};

const StatBox = ({ label, value }) => (
  <div className="bg-black/30 border border-white/10 rounded-[2px] p-3">
    <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black">{label}</div>
    <div className="verge-label-mono text-lg text-white font-black mt-1">{value}</div>
  </div>
);

const FormationLayer = ({ moment, selectedChangePlayerId, projectPoint }) => {
  const players = moment?.players || [];
  const groupedPlayers = players.reduce((acc, player) => {
    const key = `${Number(player.x || 0).toFixed(1)}:${Number(player.y || 0).toFixed(1)}`;
    acc[key] = acc[key] || [];
    acc[key].push(player);
    return acc;
  }, {});
  const positionedPlayers = Object.values(groupedPlayers).flatMap((group) => (
    group.map((player) => ({
      ...player,
      render_x: Number(player.x || 50),
      render_y: Number(player.y || 50),
      collision_count: group.length,
    }))
  ));

  return (
    <g className="formation-layer">
      {positionedPlayers.map((player) => {
        const point = projectPoint(player.render_x, player.render_y);
        if (!point) return null;
        const isHighlighted = selectedChangePlayerId && String(selectedChangePlayerId) === String(player.player_id);
        const fill = isHighlighted ? '#ffffff' : sourceColor(player.source);
        const textFill = isHighlighted ? '#050505' : '#050505';

        return (
          <g key={`${player.player_id}-${player.position_name}`} pointerEvents="none">
            <circle
              cx={point.x}
              cy={point.y}
              r={isHighlighted ? 2.65 : 2.25}
              fill={fill}
              fillOpacity="0.95"
              stroke={player.collision_count > 1 ? '#ff4d4d' : '#050505'}
              strokeWidth={player.collision_count > 1 ? '0.65' : '0.45'}
            />
            <text
              x={point.x}
              y={point.y + 0.12}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="1.3"
              fill={textFill}
              fontWeight="900"
            >
              {getInitials(player.playerName)}
            </text>
            <text
              x={point.x}
              y={point.y + 4.1}
              textAnchor="middle"
              fontSize="1.45"
              fill="#ffffff"
              fontWeight="900"
            >
              {player.position_name}
            </text>
            <text
              x={point.x}
              y={point.y + 6.25}
              textAnchor="middle"
              fontSize="1.05"
              fill="#949494"
              fontWeight="800"
            >
              {player.playerName}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const FormationViewerExplorer = ({ filters = {} }) => {
  const [payload, setPayload] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedMomentId, setSelectedMomentId] = useState(null);
  const [selectedChangePlayerId, setSelectedChangePlayerId] = useState(null);
  const [orientation, setOrientation] = useState('horizontal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { projectPoint } = usePitchProjection(orientation);

  const selectedTeam = useMemo(() => (
    teams.find(team => team.team_id === selectedTeamId) || teams[0] || null
  ), [teams, selectedTeamId]);

  const selectedMoment = useMemo(() => (
    (selectedTeam?.moments || []).find(moment => String(moment.moment_id) === String(selectedMomentId)) || selectedTeam?.moments?.[0] || null
  ), [selectedTeam, selectedMomentId]);

  const fetchFormation = async () => {
    setLoading(true);
    setError(null);
    setSelectedChangePlayerId(null);
    const macroFilters = {
      matches: filters.matches,
      teams: filters.teams,
      competition: filters.competition,
      season: filters.season,
      week: filters.week,
      country: filters.country,
      phase: filters.phase,
      stadium: filters.stadium,
      startDate: filters.startDate,
      endDate: filters.endDate,
      start_min: filters.start_min,
      end_min: filters.end_min,
      period_id: filters.period_id,
      min_xt: filters.min_xt,
    };
    const params = createExplorationSearchParams(macroFilters);

    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/formationviewer?${params.toString()}`);
      const rawPayload = await response.text();
      let nextPayload = null;
      try {
        nextPayload = rawPayload ? JSON.parse(rawPayload) : {};
      } catch {
        nextPayload = { detail: rawPayload || `FORMATIONVIEWER_FAILURE: ${response.status}` };
      }
      if (!response.ok) throw new Error(nextPayload.detail || `FORMATIONVIEWER_FAILURE: ${response.status}`);
      const nextTeams = Array.isArray(nextPayload.teams) ? nextPayload.teams : [];
      setPayload(nextPayload);
      setTeams(nextTeams);
      setSelectedTeamId(current => (
        nextTeams.some(team => team.team_id === current) ? current : nextTeams[0]?.team_id || null
      ));
      setSelectedMomentId(current => {
        const currentStillExists = nextTeams.some(team => (team.moments || []).some(moment => moment.moment_id === current));
        return currentStillExists ? current : nextTeams[0]?.moments?.[0]?.moment_id || null;
      });
    } catch (err) {
      console.error('FORMATIONVIEWER_FETCH_ERROR:', err);
      setError(err.message);
      setPayload(null);
      setTeams([]);
      setSelectedTeamId(null);
      setSelectedMomentId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormation();
  }, [filters]);

  const moments = selectedTeam?.moments || [];
  const changes = selectedMoment?.changes || [];

  return (
    <div className="w-full h-full max-h-[100dvh] min-h-0 min-w-0 bg-[#131313] overflow-y-auto overflow-x-hidden 2xl:overflow-hidden scrollbar-verge p-3 sm:p-5 lg:p-8">
      <div className="w-full min-w-0 min-h-full 2xl:h-full 2xl:min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(280px,19vw)_minmax(540px,1fr)_minmax(320px,22vw)] gap-4 lg:gap-6">
        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#ffd03c] text-black flex items-center justify-center">
                <UsersRound size={18} />
              </div>
              <div>
                <h3 className="verge-label-mono text-lg text-white font-black uppercase tracking-tight">Formation Viewer</h3>
                <p className="verge-label-mono text-[8px] text-[#ffd03c] uppercase tracking-[0.25em] mt-1">structures & roles</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 p-5 space-y-5 flex-1 overflow-y-auto scrollbar-verge">
            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Equipe</label>
              <div className="space-y-2">
                {teams.length > 0 ? teams.map(team => (
                  <button
                    key={`${team.match_id}-${team.team_id}`}
                    type="button"
                    onClick={() => {
                      setSelectedTeamId(team.team_id);
                      setSelectedMomentId(team.moments?.[0]?.moment_id || null);
                      setSelectedChangePlayerId(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-[2px] border transition-all ${selectedTeam?.team_id === team.team_id ? 'bg-[#ffd03c] text-black border-[#ffd03c]' : 'bg-black/30 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    <div className="verge-label-mono text-[9px] font-black uppercase truncate">{team.teamName}</div>
                    <div className="verge-label-mono text-[8px] mt-1 opacity-70">{team.totals?.moments || 0} moments</div>
                  </button>
                )) : (
                  <div className="p-4 bg-black/30 border border-white/10 text-[#949494] verge-label-mono text-[9px] uppercase tracking-wider">
                    Aucune formation disponible
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Moments" value={selectedTeam?.totals?.moments || 0} />
              <StatBox label="Changements" value={selectedTeam?.totals?.changes || 0} />
              <StatBox label="Joueurs" value={selectedMoment?.players?.length || 0} />
              <StatBox label="Schema" value={selectedMoment?.formation || '--'} />
            </div>

            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest font-black">Timeline</label>
              <div className="space-y-2">
                {moments.map(moment => (
                  <button
                    key={moment.moment_id}
                    type="button"
                    onClick={() => {
                      setSelectedMomentId(moment.moment_id);
                      setSelectedChangePlayerId(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-[2px] border transition-all ${selectedMoment?.moment_id === moment.moment_id ? 'bg-white text-black border-white' : 'bg-black/20 border-white/10 text-[#949494] hover:text-white'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="verge-label-mono text-[9px] font-black uppercase">{moment.label}</span>
                      <span className="verge-label-mono text-[8px] font-black">{moment.formation}</span>
                    </div>
                    <div className="verge-label-mono text-[7px] uppercase tracking-widest mt-1 opacity-70 truncate">{moment.source || 'Snapshot'}</div>
                  </button>
                ))}
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
              onClick={fetchFormation}
              disabled={loading}
              className="w-full bg-[#ffd03c] disabled:bg-white/10 disabled:text-white/25 text-black py-4 rounded-[2px] verge-label-mono text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Actualiser
            </button>
          </div>
        </aside>

        <section className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden relative min-h-[420px] sm:min-h-[520px] xl:min-h-[620px] 2xl:h-full 2xl:min-h-0">
          <div className="absolute left-3 right-3 top-3 sm:left-6 sm:right-6 sm:top-6 z-20 flex flex-wrap items-center gap-2">
            <div className="bg-black/60 border border-white/10 rounded-[2px] px-4 py-2 flex items-center gap-3 min-w-0">
              <Shield size={13} className="text-[#ffd03c] shrink-0" />
              <span className="verge-label-mono text-[8px] sm:text-[9px] text-white font-black uppercase tracking-[0.18em] truncate">
                {selectedTeam?.teamName || 'Formation Viewer'} - {selectedMoment?.formation || '--'}
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
            {selectedMoment && (
              <FormationLayer
                moment={selectedMoment}
                selectedChangePlayerId={selectedChangePlayerId}
                projectPoint={projectPoint}
              />
            )}
          </TacticalPitch>
        </section>

        <aside className="min-w-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden flex flex-col min-h-[360px] xl:col-span-2 xl:min-h-[420px] 2xl:col-span-1 2xl:h-full 2xl:min-h-0">
          <div className="shrink-0 p-5 pr-14 border-b border-white/10">
            <h3 className="verge-label-mono text-sm text-white font-black uppercase tracking-widest">Changements</h3>
            <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] mt-1">{changes.length} actions structurelles</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-verge divide-y divide-white/[0.04]">
            {changes.length > 0 ? changes.map((change, index) => (
              <motion.button
                key={`${change.player_id}-${index}-${change.to}-${change.change_type}`}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedChangePlayerId(current => String(current) === String(change.player_id) ? null : change.player_id)}
                className={`w-full text-left p-5 transition-all ${String(selectedChangePlayerId) === String(change.player_id) ? 'bg-[#ffd03c]/10 border-l-2 border-[#ffd03c]' : 'hover:bg-white/5 border-l-2 border-transparent'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="verge-label-mono text-[9px] text-[#ffd03c] font-black uppercase tracking-widest">{change.change_type}</span>
                  <span className="verge-label-mono text-[8px] text-[#949494]">{change.source || 'Source inconnue'}</span>
                </div>
                <div className="mt-3 verge-label-mono text-[10px] text-white font-black uppercase truncate">
                  {change.playerName}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[8px] verge-label-mono uppercase text-[#949494]">
                  {change.from && <span>{change.from}</span>}
                  {change.from && <span>|</span>}
                  <span>{change.to || 'Sortie'}</span>
                  {change.slot && <span>| slot {change.slot}</span>}
                </div>
              </motion.button>
            )) : (
              <div className="h-full flex items-center justify-center p-10 text-center">
                <div>
                  <GitBranch size={42} className="mx-auto text-white/10 mb-5" />
                  <p className="verge-label-mono text-[10px] text-[#949494] uppercase tracking-[0.25em] font-black">
                    Selectionne un moment de timeline
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/10 p-5 bg-black/20">
            <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black mb-3">Legende sources</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-1 gap-2">
              {Object.entries(IMPORTANT_SOURCES).map(([label, color]) => (
                <div key={label} className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-[2px] px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="verge-label-mono text-[8px] text-[#d7d7d7] uppercase tracking-wider truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FormationViewerExplorer;
