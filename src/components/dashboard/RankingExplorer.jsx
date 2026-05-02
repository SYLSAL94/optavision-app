import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronLeft, ChevronRight, Database, Eye, Filter, Loader2, Map, Play, PlayCircle, RotateCcw, SlidersHorizontal, Trophy, X } from 'lucide-react';
import ExplorationFilterPanel from './ExplorationFilterPanel';
import { FootballPitch } from './FootballPitch';
import { OPTAVISION_API_URL } from '../../config';
import { createExplorationSearchParams } from './optaFilterParams';

const parseAdvancedMetrics = (event) => {
  let parsed = event?.advanced_metrics;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
  }
  return parsed && typeof parsed === 'object' ? parsed : {};
};

const formatSignedMetric = (value, digits = 3) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(digits)}`;
};

const DUEL_EVENT_KEYS = new Set(['takeon', 'tackle', 'aerial', 'challenge', 'interception', 'ballrecovery', 'foul', 'blockedpass', 'dispossessed']);
const DUEL_EVENT_IDS = new Set(['4', '50', '74']);
const FORCED_DUEL_LOSS_KEYS = new Set(['blockedpass', 'dispossessed']);
const FORCED_DUEL_LOSS_IDS = new Set(['50', '74']);

const RankBadge = ({ rank }) => {
  if (rank === 1) {
    return <div className="w-8 h-8 bg-[#3cffd0] text-black flex items-center justify-center text-[10px] font-black rounded-[3px] shadow-[3px_3px_0px_rgba(60,255,208,0.2)]">{rank}</div>;
  }
  if (rank <= 3) {
    return <div className="w-8 h-8 bg-[#5200ff] text-white flex items-center justify-center text-[10px] font-black rounded-[3px] shadow-[3px_3px_0px_rgba(82,0,255,0.2)]">{rank}</div>;
  }
  return <div className="w-8 h-8 bg-[#2d2d2d] text-[#949494] flex items-center justify-center text-[10px] font-black rounded-[3px] border border-white/5">{rank}</div>;
};

const RANKING_PAGE_SIZE = 12;

const RankingExplorer = ({
  filters,
  onFiltersChange,
  matchesList = [],
  availableActionTypes = [],
  availableNextActionTypes = [],
  competitionsList = [],
  seasonsList = [],
  weeksList = [],
  countriesList = [],
  phasesList = [],
  stadiumsList = [],
  advancedMetricsList = [],
  teamsList = [],
  playersList = [],
  onPlayVideo
}) => {
  const [ranking, setRanking] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [generatingEventId, setGeneratingEventId] = useState(null);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- DRILL-DOWN PLAYER EVENTS STATE ---
  const [selectedPlayerForEvents, setSelectedPlayerForEvents] = useState(null);
  const [playerEvents, setPlayerEvents] = useState([]);
  const [playerEventsLoading, setPlayerEventsLoading] = useState(false);
  const [playerEventsPage, setPlayerEventsPage] = useState(1);
  const [playerEventsTotal, setPlayerEventsTotal] = useState(0);
  const PLAYER_EVENTS_PAGE_SIZE = 10;

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [playerEventsForMap, setPlayerEventsForMap] = useState([]);
  const [playerEventsForMapLoading, setPlayerEventsForMapLoading] = useState(false);

  // Mapping des noms d'équipes pour éradiquer les IDs parasites
  const teamMap = useMemo(() => {
    const map = {};
    if (teamsList) teamsList.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [teamsList]);

  const globalPlayerMap = useMemo(() => {
    const map = {};
    if (playersList && Array.isArray(playersList)) {
      playersList.forEach(p => { map[String(p.id || p.player_id)] = p.name || p.shortName || p.id; });
    }
    return map;
  }, [playersList]);

  const fetchRanking = async (nextFilters = filters, nextPage = page) => {
    setLoading(true);
    setError(null);
    const params = createExplorationSearchParams(nextFilters, {
      page: String(nextPage),
      limit: String(RANKING_PAGE_SIZE)
    });
    const url = `${OPTAVISION_API_URL}/api/optavision/ranking?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`RANKING_DATA_FAILURE: ${response.status}`);
      const payload = await response.json();
      if (Array.isArray(payload)) {
        setRanking(payload);
        setTotal(payload.length);
      } else {
        setRanking(Array.isArray(payload.items) ? payload.items : []);
        setTotal(Number(payload.total || 0));
        setPage(Number(payload.page || nextPage));
      }
    } catch (err) {
      console.error('RANKING_FETCH_ERROR:', err);
      setError(err.message);
      setRanking([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerEvents = async (playerId, nextPage = 1) => {
    if (!playerId) return;
    setPlayerEventsLoading(true);
    
    // On clone les filtres globaux mais on force le player_id
    const drillDownFilters = { ...filters, player_id: [playerId] };
    const params = createExplorationSearchParams(drillDownFilters, {
      page: String(nextPage),
      limit: String(PLAYER_EVENTS_PAGE_SIZE)
    });
    
    const url = `${OPTAVISION_API_URL}/api/optavision/events?${params.toString()}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`PLAYER_EVENTS_FAILURE: ${response.status}`);
      const payload = await response.json();
      
      const items = Array.isArray(payload) ? payload : (payload.items || []);
      const totalItems = Array.isArray(payload) ? payload.length : (payload.total || 0);
      
      setPlayerEvents(items);
      setPlayerEventsTotal(totalItems);
      setPlayerEventsPage(nextPage);
    } catch (err) {
      console.error('PLAYER_EVENTS_FETCH_ERROR:', err);
      setPlayerEvents([]);
    } finally {
      setPlayerEventsLoading(false);
    }
  };

  const fetchAllPlayerEventsForMap = async (playerId) => {
    if (!playerId) return;
    setPlayerEventsForMapLoading(true);
    
    // Pour la map, on veut TOUT (on met une limite haute de 1000 pour couvrir une session d'analyse)
    const drillDownFilters = { ...filters, player_id: [playerId] };
    const params = createExplorationSearchParams(drillDownFilters, {
      page: '1',
      limit: '1000'
    });
    
    const url = `${OPTAVISION_API_URL}/api/optavision/events?${params.toString()}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`PLAYER_MAP_EVENTS_FAILURE: ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : (payload.items || []);
      setPlayerEventsForMap(items);
    } catch (err) {
      console.error('PLAYER_MAP_EVENTS_FETCH_ERROR:', err);
      setPlayerEventsForMap([]);
    } finally {
      setPlayerEventsForMapLoading(false);
    }
  };

  const handleTargetPlayer = (player) => {
    if (selectedPlayerForEvents?.player_id === player.player_id) {
      setSelectedPlayerForEvents(null);
      setPlayerEvents([]);
    } else {
      setSelectedPlayerForEvents(player);
      fetchPlayerEvents(player.player_id, 1);
    }
  };

  const handleOpenMap = (e, player) => {
    e.stopPropagation();
    setSelectedPlayerForEvents(player);
    fetchAllPlayerEventsForMap(player.player_id);
    setIsMapModalOpen(true);
  };

  useEffect(() => {
    fetchRanking(filters);
  }, []);

  const totals = useMemo(() => {
    const totalActions = ranking.reduce((sum, row) => sum + Number(row.total_actions || 0), 0);
    const successfulActions = ranking.reduce((sum, row) => sum + Number(row.successful_actions || 0), 0);
    const successRate = totalActions > 0 ? Math.round((successfulActions / totalActions) * 100) : 0;
    return { totalActions, successfulActions, successRate };
  }, [ranking]);

  const applyRankingFilters = (nextFilters) => {
    onFiltersChange?.(nextFilters);
    setPage(1);
    fetchRanking(nextFilters, 1);
  };

  const totalPages = Math.max(1, Math.ceil(total / RANKING_PAGE_SIZE));

  const goToPage = (nextPage) => {
    const boundedPage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(boundedPage);
    fetchRanking(filters, boundedPage);
  };

  return (
    <div className="w-full h-full p-8 bg-[#131313] overflow-hidden">
      <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8">
        <section className="relative min-h-0 flex flex-col bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.35)]">
          <div className="p-6 border-b border-white/10 bg-[#2d2d2d] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#3cffd0] text-black rounded-[4px] flex items-center justify-center">
                <Trophy size={18} />
              </div>
              <div>
                <h2 className="verge-h3 text-white uppercase tracking-tighter font-black text-lg">Ranking Performance</h2>
                <p className="verge-label-mono text-[8px] text-[#3cffd0] uppercase tracking-[0.25em] font-black mt-0.5">API-first player aggregation</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 border-b border-white/5 bg-black/30">
            {[
              ['Actions', totals.totalActions.toLocaleString()],
              ['Reussies', totals.successfulActions.toLocaleString()],
              ['Reussite', `${totals.successRate}%`]
            ].map(([label, value]) => (
              <div key={label} className="p-3 border-r border-white/5 last:border-r-0 text-center">
                <div className="verge-label-mono text-[7px] text-[#949494] uppercase tracking-[0.25em] font-black">{label}</div>
                <div className="verge-label-mono text-xl text-white font-black mt-1">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[70px_minmax(0,1fr)_130px_130px_110px] gap-4 px-6 py-4 border-b border-white/5 bg-[#131313] verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black">
            <span>Rank</span>
            <span>Joueur</span>
            <span className="text-right">Actions</span>
            <span className="text-right">Reussies</span>
            <span className="text-right">Taux</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto styled-scrollbar-verge divide-y divide-white/[0.03]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-[#3cffd0]">
                <Loader2 size={30} className="animate-spin" />
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 text-[#ff4d4d]">
                <Database size={40} className="mb-4 opacity-40" />
                <div className="verge-label-mono text-[10px] uppercase font-black tracking-widest">{error}</div>
              </div>
            ) : ranking.length > 0 ? (
              ranking.map((player, index) => {
                const totalActions = Number(player.total_actions || 0);
                const successfulActions = Number(player.successful_actions || 0);
                const successRate = totalActions > 0 ? Math.round((successfulActions / totalActions) * 100) : 0;
                return (
                  <motion.div
                    key={`${player.player_id || 'unknown'}-${index}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleTargetPlayer(player)}
                    className={`grid grid-cols-[70px_minmax(0,1fr)_130px_130px_110px] gap-4 items-center px-6 py-2.5 border-l-2 cursor-pointer transition-all group ${selectedPlayerForEvents?.player_id === player.player_id ? 'bg-[#3cffd0]/10 border-[#3cffd0]' : 'hover:bg-[#3cffd0]/5 border-transparent'}`}
                  >
                    <RankBadge rank={(page - 1) * RANKING_PAGE_SIZE + index + 1} />
                    <div className="min-w-0 flex items-center justify-between pr-4">
                      <div className="min-w-0">
                        <div className="verge-label-mono text-[12px] text-white font-black group-hover:text-[#3cffd0] uppercase truncate">
                          {player.playerName || player.player_id || 'Joueur inconnu'}
                        </div>
                        <div className="verge-label-mono text-[7px] text-[#3cffd0] uppercase tracking-widest mt-0.5 font-bold">
                          {player.teamName || teamMap[player.team_id] || 'Équipe Inconnue'}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleOpenMap(e, player)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-[#949494] hover:border-[#3cffd0] hover:text-[#3cffd0] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Visualisation Spatiale"
                      >
                        <Map size={12} />
                      </button>
                    </div>
                    <div className="text-right verge-label-mono text-xl text-[#3cffd0] font-black">{totalActions}</div>
                    <div className="text-right verge-label-mono text-lg text-white font-black">{successfulActions}</div>
                    <div className="text-right">
                      <span className={`verge-label-mono text-[10px] px-3 py-1 rounded-[3px] font-black ${successRate >= 70 ? 'bg-[#3cffd0] text-black' : successRate >= 45 ? 'bg-[#ffd03c] text-black' : 'bg-[#ff4d4d] text-black'}`}>
                        {successRate}%
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-20">
                <Activity size={48} />
                <div className="verge-label-mono text-[11px] font-black uppercase tracking-[0.3em] mt-4">No Ranking Data</div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-white/10 bg-[#131313] flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-[2px] verge-label-mono text-[10px] text-white font-black uppercase tracking-widest transition-all"
            >
              Prec
            </button>
            <div className="verge-label-mono text-[9px] text-[#949494] font-black tracking-widest">
              PAGE <span className="text-[#3cffd0]">{page}</span> / {totalPages}
              <span className="ml-3 text-white/40">{total.toLocaleString()} JOUEURS</span>
            </div>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => goToPage(page + 1)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-[2px] verge-label-mono text-[10px] text-white font-black uppercase tracking-widest transition-all"
            >
              Suiv
            </button>
          </div>

          {/* Floating Filter Button - Premium Visualisation Spatiale Design */}
          <div className="absolute bottom-16 left-6 z-40">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="w-12 h-12 flex items-center justify-center bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-full text-white hover:text-[#3cffd0] hover:border-[#3cffd0] hover:shadow-[0_0_25px_rgba(60,255,208,0.4)] transition-all duration-300 group shadow-2xl"
              title="Filtrer l'intelligence"
            >
              <SlidersHorizontal size={20} className="group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </section>

        <aside className="hidden xl:flex min-h-0 flex-col gap-6">
          {selectedPlayerForEvents ? (
            <div className="flex-1 flex flex-col bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/10 bg-[#2d2d2d] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#3cffd0] text-black rounded-[4px] flex items-center justify-center">
                    <Activity size={16} />
                  </div>
                  <div>
                    <h3 className="verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">Flux Analyste</h3>
                    <p className="verge-label-mono text-[8px] text-[#3cffd0] font-black mt-0.5 truncate max-w-[150px] uppercase">{selectedPlayerForEvents.playerName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedPlayerForEvents(null); setPlayerEvents([]); }}
                  className="p-2 text-[#949494] hover:text-white hover:bg-white/5 rounded-full transition-all"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto styled-scrollbar-verge divide-y divide-white/[0.03] bg-black/10">
                {playerEventsLoading ? (
                  <div className="h-full flex items-center justify-center text-[#3cffd0]">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                ) : playerEvents.length > 0 ? (
                  playerEvents.map((e, idx) => {
                    const parsedMetrics = parseAdvancedMetrics(e);
                    const typeLabel = parsedMetrics?.type_name || e.type_name || e.type || e.type_id;
                    const typeKey = String(typeLabel || '').replace(/\s+/g, '').toLowerCase();
                    const typeId = String(parsedMetrics?.type_id ?? e.type_id ?? '');
                    
                    const getPlayerName = (id) => id ? (globalPlayerMap[String(id)] || String(id)) : null;
                    const receiverName = getPlayerName(parsedMetrics?.receiver || e.receiver_id || e.receiver);
                    const opponentName = getPlayerName(parsedMetrics?.opponent_id);
                    const xTLabel = formatSignedMetric(parsedMetrics?.xT);
                    const isProgressive = parsedMetrics?.is_progressive === true || parsedMetrics?.is_progressive === 'true';
                    
                    const rawDuelWon = parsedMetrics?.duel_won === true || parsedMetrics?.duel_won === 'true';
                    const duelLost = parsedMetrics?.duel_lost === true || parsedMetrics?.duel_lost === 'true';
                    const isForcedDuelLoss = FORCED_DUEL_LOSS_KEYS.has(typeKey) || FORCED_DUEL_LOSS_IDS.has(typeId);
                    const duelWon = isForcedDuelLoss ? false : rawDuelWon;
                    const hasDuelResult = isForcedDuelLoss || rawDuelWon || duelLost;

                    const shotQuality = parsedMetrics?.shot_status
                      || parsedMetrics?.quality
                      || parsedMetrics?.chance_quality
                      || (parsedMetrics?.is_shot_big_chance ? 'Big Chance' : null)
                      || (Number.isFinite(Number(parsedMetrics?.xG)) ? `xG ${Number(parsedMetrics.xG).toFixed(2)}` : null);

                    const isPassLike = ['pass', 'carry', 'ballreceipt'].includes(typeKey);
                    const isDuelLike = DUEL_EVENT_KEYS.has(typeKey) || DUEL_EVENT_IDS.has(typeId);
                    const isShotLike = ['shot', 'goal', 'savedshot', 'missedshots'].includes(typeKey);

                    return (
                      <div key={e.opta_id || idx} className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-all group">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black w-10 shrink-0">
                            {(e.cumulative_mins ?? e.min ?? 0).toFixed(1)}'
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="verge-label-mono text-[10px] text-white uppercase font-black tracking-tight truncate">{typeLabel}</span>
                              {isProgressive && (
                                <span className="verge-label-mono text-[7px] px-1.5 py-0.5 rounded-[2px] bg-[#3cffd0] text-black font-black uppercase">Prog</span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 overflow-hidden">
                              {isPassLike && receiverName && (
                                <span className="verge-label-mono text-[8px] text-[#949494] truncate">Vers: <span className="text-white/80">{receiverName}</span></span>
                              )}
                              {isPassLike && xTLabel && (
                                <span className="verge-label-mono text-[8px] text-[#3cffd0] font-black">xT {xTLabel}</span>
                              )}
                              {isDuelLike && opponentName && (
                                <span className="verge-label-mono text-[8px] text-[#949494] truncate">Contre: <span className="text-white/80">{opponentName}</span></span>
                              )}
                              {isDuelLike && hasDuelResult && (
                                <span className={`verge-label-mono text-[7px] px-1.5 py-0.5 rounded-[2px] text-black font-black uppercase ${duelWon ? 'bg-[#3cffd0]' : 'bg-[#ff4d4d]'}`}>
                                  {duelWon ? 'Gagné' : 'Perdu'}
                                </span>
                              )}
                              {isShotLike && shotQuality && (
                                <span className="verge-label-mono text-[8px] text-[#ff4d4d] font-black truncate">{shotQuality}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={async (evt) => {
                            evt.stopPropagation();
                            const eventId = e.opta_id || e.id;
                            setGeneratingEventId(eventId);
                            try {
                              const videoUrl = await onPlayVideo?.(e);
                              if (videoUrl) setActiveVideoUrl(videoUrl);
                            } finally {
                              setGeneratingEventId(null);
                            }
                          }}
                          disabled={generatingEventId === (e.opta_id || e.id)}
                          className="text-slate-400 hover:text-[#3cffd0] transition-all duration-300 transform hover:scale-110 shrink-0 disabled:opacity-30"
                          title="Lancer la vidéo"
                        >
                          {generatingEventId === (e.opta_id || e.id) ? (
                            <Loader2 size={14} className="animate-spin text-[#3cffd0]" />
                          ) : (
                            <PlayCircle size={18} />
                          )}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-20">
                    <Database size={24} />
                    <div className="verge-label-mono text-[9px] font-black uppercase mt-3 tracking-widest">Aucun event</div>
                  </div>
                )}
              </div>

              {playerEventsTotal > PLAYER_EVENTS_PAGE_SIZE && (
                <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
                  <button
                    disabled={playerEventsPage <= 1 || playerEventsLoading}
                    onClick={() => fetchPlayerEvents(selectedPlayerForEvents.player_id, playerEventsPage - 1)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="verge-label-mono text-[8px] text-[#949494] font-black">
                    {playerEventsPage} / {Math.ceil(playerEventsTotal / PLAYER_EVENTS_PAGE_SIZE)}
                  </div>
                  <button
                    disabled={playerEventsPage >= Math.ceil(playerEventsTotal / PLAYER_EVENTS_PAGE_SIZE) || playerEventsLoading}
                    onClick={() => fetchPlayerEvents(selectedPlayerForEvents.player_id, playerEventsPage + 1)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-[4px] p-6">
              <div className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-[0.25em] font-black">Exploration Target</div>
              <div className="verge-label-mono text-[11px] text-white font-black uppercase mt-3">Targeting spatial actif</div>
              <p className="text-xs text-[#949494] leading-relaxed mt-4">
                Cliquez sur l'icone <span className="text-[#3cffd0]">Map</span> d'un joueur pour isoler ses actions et lancer les flux video.
              </p>
            </div>
          )}
        </aside>
      </div>

      <AnimatePresence>
        {isMapModalOpen && selectedPlayerForEvents && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMapModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500]"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-10 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-[0_50px_150px_rgba(0,0,0,0.7)] z-[501] flex flex-col"
            >
              <div className="p-6 border-b border-white/10 bg-[#2d2d2d] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#3cffd0] text-black rounded-[4px] flex items-center justify-center">
                    <Map size={20} />
                  </div>
                  <div>
                    <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Visualisation Tactique</h3>
                    <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.2em] font-black mt-1">
                      {selectedPlayerForEvents.playerName} • {playerEventsForMap.length} ACTIONS TOTALES
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { setIsMapModalOpen(false); setPlayerEventsForMap([]); }}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-[#949494] hover:text-white hover:bg-red-500 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 relative bg-black p-12 overflow-hidden">
                {playerEventsForMapLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                    <Loader2 size={48} className="animate-spin text-[#3cffd0]" />
                  </div>
                ) : null}

                <FootballPitch 
                  orientation="horizontal"
                  style={{ grass: '#131313', line: '#333', background: '#000' }}
                >
                  {/* Rendu des événements globaux du joueur */}
                  {playerEventsForMap.map((e, idx) => {
                    const x = (Number(e.x) / 100) * 105;
                    const y = ((100 - Number(e.y)) / 100) * 68;
                    return (
                      <g key={e.opta_id || idx} className="group/dot">
                        <circle 
                          cx={x} 
                          cy={y} 
                          r="0.7" 
                          fill={e.outcome === 1 ? '#3cffd0' : '#ff4d4d'} 
                          className="opacity-80"
                        />
                        <circle 
                          cx={x} 
                          cy={y} 
                          r="2.2" 
                          fill="transparent" 
                          stroke={e.outcome === 1 ? '#3cffd0' : '#ff4d4d'} 
                          strokeWidth="0.1"
                          className="opacity-10 group-hover/dot:opacity-100 transition-opacity"
                        />
                      </g>
                    );
                  })}
                </FootballPitch>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-[#1a1a1a]/80 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 shadow-2xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#3cffd0]" />
                    <span className="verge-label-mono text-[9px] text-white font-black uppercase tracking-widest">Succès</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#ff4d4d]" />
                    <span className="verge-label-mono text-[9px] text-white font-black uppercase tracking-widest">Échec</span>
                  </div>
                  <div className="w-[1px] h-4 bg-white/10" />
                  <span className="verge-label-mono text-[9px] text-[#949494] font-black uppercase tracking-widest">
                    {playerEventsForMap.length} points projetés (Zero-Calcul)
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {isFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
            />
            <motion.div
              initial={{ x: -500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -500, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full z-[301]"
            >
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="absolute top-6 right-6 z-10 w-9 h-9 rounded-full border border-white/10 bg-white/5 text-[#949494] hover:text-white hover:bg-red-500 transition-all flex items-center justify-center"
              >
                <X size={16} />
              </button>
              <ExplorationFilterPanel
                matchesList={matchesList}
                availableActionTypes={availableActionTypes}
                availableNextActionTypes={availableNextActionTypes}
                competitionsList={competitionsList}
                seasonsList={seasonsList}
                weeksList={weeksList}
                countriesList={countriesList}
                phasesList={phasesList}
                stadiumsList={stadiumsList}
                advancedMetricsList={advancedMetricsList}
                teamsList={teamsList}
                playersList={playersList}
                filters={filters}
                onFilterChange={applyRankingFilters}
                onClose={() => setIsFilterOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-12"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">Ranking Video Feed</span>
                </div>
                <button
                  onClick={() => setActiveVideoUrl(null)}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500 rounded-full text-white transition-all group"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>
              <div className="aspect-video bg-black flex items-center justify-center">
                <video
                  src={activeVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RankingExplorer;
