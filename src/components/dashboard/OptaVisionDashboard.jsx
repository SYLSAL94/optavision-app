import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  Target,
  Search,
  ChevronRight,
  Database,
  ShieldAlert,
  ArrowLeft,
  SlidersHorizontal,
  X,
  Settings,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown
} from 'lucide-react';
import ExplorationFilterPanel from './ExplorationFilterPanel';
import BuildUpFilterPanel from './BuildUpFilterPanel';
import ShotMapFilterPanel from './ShotMapFilterPanel';

import EventExplorer from './EventExplorer';
import BuildUpExplorer from './BuildUpExplorer';
import ShotMapExplorer from './ShotMapExplorer';
import VideoSettingsPanel from './VideoSettingsPanel';
import { API_BASE_URL, OPTAVISION_API_URL } from '../../config';

const SHOT_BODY_PART_IDS = {
  head: 15,
  right_foot: 20,
  left_foot: 72
};

const SHOT_SITUATION_IDS = {
  regular_play: 22,
  fast_break: 23,
  one_on_one: 89,
  out_of_box: 18
};

/**
 * OptaVisionDashboard - Squelette UI/UX Premium (Style The Verge)
 * Aligné sur le Design System du projet Scouting.
 */
const OptaVisionDashboard = ({ user }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalEvents, setTotalEvents] = useState(0);

  // Auto-Discovery States
  const [matchesList, setMatchesList] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [playersList, setPlayersList] = useState([]);
  const [activeTab, setActiveTab] = useState('exploration');
  const [activeTool, setActiveTool] = useState(null); // 'events', 'sequences', 'shots'
  const [view, setView] = useState('DASHBOARD');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [explorationFilters, setExplorationFilters] = useState({
    matches: [],
    types: [],
    players: [],
    teams: [],
    min_xt: 0.0,
    start_min: 0,
    end_min: 95,
    outcome: null,
    period_id: [],
    location: [],
    zone: [],
    competition: [],
    season: [],
    week: [],
    country: [],
    phase: [],
    stadium: [],
    stadium: [],
    advanced_tactics: [],
    startDate: '',
    endDate: '',
    player_id: [],
    receiver_id: [],
    opponent_id: []
  });
  const [shotFilters, setShotFilters] = useState({
    outcomes: [],
    bodyParts: [],
    situations: [],
    distanceMax: null
  });

  const appendShotMapParams = (params, filters) => {
    params.set('types', '13,14,15,16');

    const bodyParts = (filters?.bodyParts || [])
      .map(part => SHOT_BODY_PART_IDS[part] ?? part)
      .filter(Boolean);
    if (bodyParts.length > 0) params.append('body_parts', bodyParts.join(','));

    const situations = (filters?.situations || [])
      .map(situation => SHOT_SITUATION_IDS[situation] ?? situation)
      .filter(Boolean);
    if (situations.length > 0) params.append('situations', situations.join(','));

    if (filters?.outcomes?.length > 0) params.append('shot_outcomes', filters.outcomes.join(','));
    if (filters?.distanceMax !== null && filters?.distanceMax !== undefined) {
      params.append('distance_max', filters.distanceMax.toString());
    }
  };

  const fetchEvents = async (baseFilters = explorationFilters, nextShotFilters = shotFilters, tool = activeTool) => {
    setLoading(true);
    setError(null);

    // Construction dynamique des query params
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '1000'
    });

    if (baseFilters.startDate) params.append('start_date', baseFilters.startDate);
    if (baseFilters.endDate) params.append('end_date', baseFilters.endDate);

    if (baseFilters.matches?.length > 0) params.append('match_ids', baseFilters.matches.join(','));
    if (baseFilters.types?.length > 0) params.append('types', baseFilters.types.join(','));
    if (baseFilters.players?.length > 0) params.append('player_ids', baseFilters.players.join(','));
    if (baseFilters.player_id?.length > 0) params.append('player_id', baseFilters.player_id.join(','));
    if (baseFilters.receiver_id?.length > 0) params.append('receiver_id', baseFilters.receiver_id.join(','));
    if (baseFilters.opponent_id?.length > 0) params.append('opponent_id', baseFilters.opponent_id.join(','));
    if (baseFilters.teams?.length > 0) params.append('team_ids', baseFilters.teams.join(','));
    if (baseFilters.min_xt > 0) params.append('min_xt', baseFilters.min_xt.toString());
    if (baseFilters.start_min > 0) params.append('start_min', baseFilters.start_min.toString());
    if (baseFilters.end_min < 95) params.append('end_min', baseFilters.end_min.toString());
    if (baseFilters.outcome !== null) params.append('outcome', baseFilters.outcome.toString());
    if (baseFilters.period_id?.length > 0) params.append('period_id', baseFilters.period_id.join(','));
    if (baseFilters.location?.length > 0) params.append('location', baseFilters.location.join(','));
    if (baseFilters.zone?.length > 0) params.append('zone', baseFilters.zone.join(','));
    if (baseFilters.competition?.length > 0) params.append('competition', baseFilters.competition.join(','));
    if (baseFilters.season?.length > 0) params.append('season', baseFilters.season.join(','));
    if (baseFilters.week?.length > 0) params.append('week', baseFilters.week.join(','));
    if (baseFilters.country?.length > 0) params.append('country', baseFilters.country.join(','));
    if (baseFilters.phase?.length > 0) params.append('phase', baseFilters.phase.join(','));
    if (baseFilters.stadium?.length > 0) params.append('stadium', baseFilters.stadium.join(','));
    if (baseFilters.advanced_tactics?.length > 0) params.append('advanced_tactics', baseFilters.advanced_tactics.join(','));

    if (tool === 'shots') {
      appendShotMapParams(params, nextShotFilters);
    }

    const url = `${OPTAVISION_API_URL}/api/optavision/events?${params.toString()}`;
    console.log("🌐 Appel de l'API OptaVision vers :", url);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`MATCH_DATA_FAILURE: ${response.status}`);
      const json = await response.json();
      console.log("🚨 RÉPONSE API BRUTE :", json);

      // Data Binding : items pour le flux, total pour la pagination
      setData(json.items || []);
      setTotalEvents(json.total || 0);
    } catch (err) {
      console.error("❌ ERREUR DE FETCH :", err);
      setError(err.message);
      setData([]);
      setTotalEvents(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySingleVideo = async (event) => {
    const isSequence = Array.isArray(event?.events) && event.events.length > 0;
    const targetEvent = isSequence
      ? event.events[0]
      : event;
    const eventId = targetEvent?.opta_id || targetEvent?.id;
    const matchId = targetEvent?.match_id || targetEvent?.matchId || event?.match_id || event?.matchId || explorationFilters.matches?.[0];
    const parseClock = (value) => {
      if (!value) return null;
      const match = String(value).match(/(\d+)'(\d+)/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : null;
    };
    const firstSequenceEvent = isSequence ? event.events[0] : null;
    const lastSequenceEvent = isSequence ? event.events[event.events.length - 1] : null;
    const sequenceStartSeconds = isSequence
      ? (parseClock(event.start_time) ?? (Number(firstSequenceEvent?.min ?? firstSequenceEvent?.minute ?? 0) * 60 + Number(firstSequenceEvent?.sec ?? firstSequenceEvent?.second ?? 0)))
      : null;
    const sequenceEndSeconds = isSequence
      ? (parseClock(event.end_time) ?? (Number(lastSequenceEvent?.min ?? lastSequenceEvent?.minute ?? 0) * 60 + Number(lastSequenceEvent?.sec ?? lastSequenceEvent?.second ?? 0)))
      : null;

    if (!matchId || !eventId) {
      throw new Error("match_id et event_id requis pour générer la vidéo");
    }

    setIsVideoLoading(true);
    try {
      const requestPayload = {
        match_id: matchId,
        event_id: eventId,
        ...(isSequence ? {
          event_ids: event.events.map((item) => item.opta_id || item.id).filter(Boolean),
          sequence_id: event.sub_sequence_id || event.seq_uuid || event.id,
          sequence_start_seconds: sequenceStartSeconds,
          sequence_end_seconds: sequenceEndSeconds,
        } : {})
      };

      const response = await fetch(`${API_BASE_URL}/api/optavision/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      const payload = await response.json();
      if (!response.ok || !payload.video_url) {
        throw new Error(payload.detail || "Aucune URL vidéo retournée par l'API");
      }
      return payload.video_url;
    } finally {
      setIsVideoLoading(false);
    }
  };

  const fetchBuildup = async (filters) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    
    // 1. MACRO-ANALYSE : Support multi-matchs et contextes (Miroir Exploration)
    const matchIdsParam = Array.isArray(filters?.matches) ? filters.matches.join(',') : (filters?.matches || '');
    if (matchIdsParam) params.append('match_ids', matchIdsParam);

    if (filters.competition?.length > 0) params.append('competition', filters.competition.join(','));
    if (filters.season?.length > 0) params.append('season', filters.season.join(','));
    if (filters.week?.length > 0) params.append('week', filters.week.join(','));
    if (filters.country?.length > 0) params.append('country', filters.country.join(','));
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    if (filters.location?.length > 0) params.append('location', filters.location.join(','));

    // 2. FILTRES SÉQUENTIELS (Propres au Build-Up)
    if (filters.min_passes) params.append('min_passes', filters.min_passes.toString());
    if (filters.min_score) params.append('min_score', filters.min_score.toString());
    if (filters.min_actions) params.append('min_actions', filters.min_actions.toString());
    if (filters.min_prog) params.append('min_prog', filters.min_prog.toString());
    if (filters.has_shot) params.append('has_shot', 'true');
    if (filters.is_fast_break) params.append('is_fast_break', 'true');
    if (filters.starts_own) params.append('starts_own', 'true');
    if (filters.reaches_opp) params.append('reaches_opp', 'true');
    if (filters.involved_player_id?.length > 0) params.append('involved_player_id', filters.involved_player_id.join(','));
    if (filters.excluded_player_id?.length > 0) params.append('excluded_player_id', filters.excluded_player_id.join(','));
    if (filters.localTeam && filters.localTeam !== 'ALL') params.append('team_id', filters.localTeam);
    if (filters.silo) params.append('silo', filters.silo);

    const url = `${OPTAVISION_API_URL}/api/optavision/buildup?${params.toString()}`;
    console.log("🌐 Appel de l'API OptaVision vers :", url);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`BUILDUP_DATA_FAILURE: ${response.status}`);
      const json = await response.json();
      console.log("🚨 RÉPONSE API BUILDUP :", json);
      setData(json); // json contient { sequences: [...] }
    } catch (err) {
      console.error("❌ ERREUR DE FETCH BUILDUP :", err);
      setError(err.message);
      setData({ sequences: [] });
    } finally {
      setLoading(false);
    }
  };

  // Fetch Lookups (Auto-Discovery)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [meta, t, p] = await Promise.all([
          fetch(`${OPTAVISION_API_URL}/api/optavision/meta/summary`).then(r => r.json()),
          fetch(`${OPTAVISION_API_URL}/api/optavision/teams`).then(r => r.json()),
          fetch(`${OPTAVISION_API_URL}/api/optavision/players`).then(r => r.json())
        ]);

        // Structure de meta enrichie : { matches, teams, action_types, ... }
        setMatchesList(meta.matches || []);
        setAvailableActionTypes(meta.action_types || []);
        setCompetitionsList(meta.competitions || []);
        setSeasonsList(meta.seasons || []);
        setWeeksList(meta.weeks || []);
        setCountriesList(meta.countries || []);
        setPhasesList(meta.phases || []);
        setStadiumsList(meta.stadiums || []);
        setAdvancedMetricsList(meta.advanced_metrics_keys || []);
        
        // Unification du dictionnaire des équipes (ID -> Name)
        const teamObjects = meta.teams 
          ? Object.entries(meta.teams).map(([id, name]) => ({ id, name }))
          : t;
        setTeamsList(teamObjects);
        setPlayersList(p);


        // Initialisation avec le premier match si vide
        if (meta.matches?.length > 0 && explorationFilters.matches.length === 0) {
          setExplorationFilters(prev => ({ ...prev, matches: [meta.matches[0].id] }));
        }
      } catch (err) {
        console.error("META_FETCH_ERROR:", err);
      }
    };
    fetchMeta();
  }, []);

  const [availableActionTypes, setAvailableActionTypes] = useState([]);
  const [competitionsList, setCompetitionsList] = useState([]);
  const [seasonsList, setSeasonsList] = useState([]);
  const [weeksList, setWeeksList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [phasesList, setPhasesList] = useState([]);
  const [stadiumsList, setStadiumsList] = useState([]);
  const [advancedMetricsList, setAdvancedMetricsList] = useState([]);

  // Hydratation automatique
  useEffect(() => {
    fetchEvents();
  }, [page, limit, explorationFilters, activeTool]);

  return (
    <div className="min-h-screen bg-[#131313] text-white flex flex-col font-sans overflow-hidden">

      {/* HEADER : SCOUTING STYLE (3 COLS) - MASQUÉ SI OUTIL ACTIF */}
      {!activeTool && (
        <header className="sticky top-0 z-[100] w-full px-8 bg-[#131313] border-b border-white/10 h-24 flex items-center shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-full max-w-[1700px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center">

            {/* Logo - Colonne Gauche */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4 cursor-pointer group w-fit" onClick={() => { setView('DASHBOARD'); setActiveTool(null); setIsFilterOpen(false); }}>
                <div className="w-12 h-12 bg-white text-black rounded-[4px] flex items-center justify-center group-hover:bg-[#3cffd0] transition-colors">
                  <Activity size={24} />
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="verge-h3 text-white leading-none tracking-tighter uppercase font-black">The Analyst</span>
                  <span className="verge-label-mono text-[#3cffd0] text-[10px] mt-1 tracking-widest uppercase">OptaVision</span>
                </div>
              </div>
            </div>

            {/* Recherche Centrale (Intelligence Hub) */}
            <div className="flex justify-center order-3 md:order-2 col-span-2 md:col-span-1 mt-4 md:mt-0 px-4">
              <div className="w-full max-w-[500px] relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[#3cffd0]">
                  <Database size={16} />
                  <span className="verge-label-mono text-[9px] font-black uppercase">CROSS-MATCH ENGINE</span>
                </div>
                <div className="w-full bg-[#2d2d2d]/50 border border-white/10 rounded-full py-4 pl-40 pr-32 verge-label-mono text-[10px] text-white flex items-center overflow-hidden whitespace-nowrap opacity-60">
                  {explorationFilters.matches.length > 0
                    ? `${explorationFilters.matches.length} MATCHS SÉLECTIONNÉS`
                    : "AUCUN MATCH SÉLECTIONNÉ - UTILISEZ LE PANEL DE FILTRAGE"
                  }
                </div>

                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3cffd0] text-black px-6 py-2 verge-label-mono text-[9px] font-black hover:bg-white transition-all rounded-full flex items-center gap-2"
                >
                  <SlidersHorizontal size={14} />
                  FILTRER L'INTELLIGENCE
                </button>
              </div>
            </div>

            {/* Espace Droite - User & Settings */}
            <div className="hidden md:flex justify-end items-center gap-6 order-2 md:order-3">
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center text-[#949494] hover:text-white transition-colors relative">
                  <Bell size={20} />
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-[#131313] rounded-full" />
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-10 h-10 flex items-center justify-center text-[#949494] hover:text-[#3cffd0] transition-colors"
                >
                  <Settings size={20} />
                </button>
              </div>

              <div className="h-10 w-px bg-white/10 mx-2" />

              <div className="flex items-center gap-4 bg-white/5 pl-4 pr-2 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                <div className="flex flex-col items-end">
                  <span className="verge-label-mono text-[10px] text-white font-black leading-none">{user?.name || 'GUEST USER'}</span>
                  <span className="verge-label-mono text-[8px] text-[#3cffd0] mt-1 tracking-tighter uppercase">ANALYST PRO</span>
                </div>
                <div className="w-8 h-8 bg-[#2d2d2d] rounded-full flex items-center justify-center text-white group-hover:bg-[#3cffd0] group-hover:text-black transition-all">
                  <UserIcon size={16} />
                </div>
                <ChevronDown size={14} className="text-[#949494] mr-2" />
              </div>
            </div>

          </div>
        </header>
      )}

      {/* MAIN VIEW AREA */}
      <div className={`flex-1 flex flex-col overflow-hidden ${activeTool ? 'p-0' : 'p-8 md:p-12 lg:p-20 gap-12'}`}>

        {/* DASHBOARD VIEW */}
        {view === 'DASHBOARD' && (
          <div className="flex-1 flex overflow-hidden relative">

            <div className={`flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden ${activeTool ? '' : 'space-y-12 pr-4'}`}>

              {/* TABS NAVIGATION - MASQUÉ SI OUTIL ACTIF */}
              {!activeTool && (
                <div className="flex items-center justify-between">
                  <nav className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-full w-fit">
                    {[
                      { id: 'exploration', label: 'Exploration (Événements)', icon: Activity },
                      { id: 'buildup', label: 'Build-Up (Séquences)', icon: TrendingUp },
                      { id: 'shots', label: 'Shot Map (Tirs)', icon: Target },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setActiveTool(null); setIsFilterOpen(false); }}
                        className={`flex items-center gap-3 px-8 py-3 rounded-full verge-label-mono text-[10px] font-black transition-all ${activeTab === tab.id
                            ? 'bg-[#3cffd0] text-black'
                            : 'text-[#949494] hover:text-white'
                          }`}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </nav>

                  <div className="flex items-center gap-4">
                    <span className="verge-label-mono text-[10px] text-[#3cffd0] uppercase tracking-[0.2em] font-black animate-pulse">
                      GLOBAL DATA PLANE ACTIVE
                    </span>
                  </div>
                </div>
              )}

              {/* MAIN CONTENT : TILES OR INTERNAL VIEW */}
              <main className={`flex-1 overflow-y-auto scrollbar-verge ${activeTool ? '' : 'pb-32'}`}>
                <AnimatePresence mode="wait">
                  {!activeTool ? (
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                      {activeTab === 'exploration' && (
                        <TileSkeleton
                          title="Journal des Événements"
                          desc="Flux brut enrichi de métriques AI (xT, Prog, Angles)."
                          icon={<Activity />}
                          onClick={() => setActiveTool('events')}
                        />
                      )}
                      {activeTab === 'buildup' && (
                        <TileSkeleton
                          title="Chaînes de Possession"
                          desc="Regroupement des événements en séquences tactiques."
                          icon={<TrendingUp />}
                          color="text-[#5200ff]"
                          onClick={() => setActiveTool('sequences')}
                        />
                      )}
                      {activeTab === 'shots' && (
                        <TileSkeleton
                          title="Shot Map Analytique"
                          desc="Visualisation spatiale des tirs et zones de frappe."
                          icon={<Target />}
                          color="text-red-500"
                          onClick={() => setActiveTool('shots')}
                        />
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="active-tool"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-full bg-[#131313] relative overflow-hidden"
                    >
                      {/* CLOSE BUTTON */}
                      <button
                        onClick={() => { setActiveTool(null); setIsFilterOpen(false); }}
                        className="absolute top-10 right-10 z-[250] w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[#949494] hover:text-white hover:bg-red-500 transition-all group"
                      >
                        <X size={20} className="group-hover:rotate-90 transition-transform" />
                      </button>

                      {/* ROUTAGE IMMERSIF DES MODULES */}
                      {activeTool === 'events' ? (
                        <div className="w-full h-full p-8 overflow-hidden bg-[#131313] animate-in fade-in duration-700">
                          {/* HYDRATATION ET FILTRAGE DU JOURNAL DES ÉVÉNEMENTS */}
                          <EventExplorer
                            data={data}
                            matchIds={explorationFilters.matches}
                            loading={loading}
                            filters={explorationFilters}
                            advancedMetricsList={advancedMetricsList}
                            playersList={playersList}
                            onPlayVideo={handlePlaySingleVideo}
                            isVideoLoading={isVideoLoading}
                          />
                        </div>
                      ) : activeTool === 'sequences' ? (
                        <BuildUpExplorer 
                          data={data} 
                          loading={loading} 
                          matchIds={explorationFilters.matches}
                          playersList={playersList}
                          advancedMetricsList={advancedMetricsList}
                          onPlayVideo={handlePlaySingleVideo}
                          isVideoLoading={isVideoLoading}
                        />
                      ) : activeTool === 'shots' ? (
                        <ShotMapExplorer data={data} loading={loading} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#131313] text-white/20">
                          <div className="verge-label-mono text-[10px] uppercase tracking-[0.5em]">
                            MODULE {activeTool?.toUpperCase()} EN ATTENTE D'IMPLÉMENTATION
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>

            {/* LATERAL FILTER PANEL (DRAWER LEFT) */}
            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsFilterOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                  />
                  <motion.div
                    initial={{ x: -500, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -500, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 left-0 h-full z-[201]"
                  >
                    {activeTab === 'exploration' && (
                      <ExplorationFilterPanel
                        matchesList={matchesList}
                        availableActionTypes={availableActionTypes}
                        competitionsList={competitionsList}
                        seasonsList={seasonsList}
                        weeksList={weeksList}
                        countriesList={countriesList}
                        phasesList={phasesList}
                        stadiumsList={stadiumsList}
                        advancedMetricsList={advancedMetricsList}
                        teamsList={teamsList}
                        playersList={playersList}
                        filters={explorationFilters}
                        onFilterChange={setExplorationFilters}
                        onClose={() => setIsFilterOpen(false)}
                      />
                    )}
                    {activeTab === 'buildup' && (
                      <BuildUpFilterPanel 
                        matchIds={explorationFilters.matches} 
                        playersList={playersList} 
                        matchesList={matchesList}
                        competitionsList={competitionsList}
                        seasonsList={seasonsList}
                        weeksList={weeksList}
                        countriesList={countriesList}
                        phasesList={phasesList}
                        stadiumsList={stadiumsList}
                        teamsList={teamsList}
                        filters={explorationFilters}
                        onApply={(filters) => { setExplorationFilters(filters); fetchBuildup(filters); }} 
                        onClose={() => setIsFilterOpen(false)} 
                      />
                    )}
                    {activeTab === 'shots' && (
                      <ShotMapFilterPanel
                        filters={shotFilters}
                        onFilterChange={setShotFilters}
                        onApply={(nextFilters) => {
                          setShotFilters(nextFilters);
                          fetchEvents(explorationFilters, nextFilters, 'shots');
                          setIsFilterOpen(false);
                        }}
                        onClose={() => setIsFilterOpen(false)}
                      />
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* FLOATING TOGGLE BUTTON (BOTTOM LEFT) - CONDITIONNEL */}
            <AnimatePresence>
              {activeTool && (
                <motion.button
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  onClick={() => setIsFilterOpen(true)}
                  className="fixed bottom-10 left-10 z-[150] w-14 h-14 bg-black border border-[#3cffd0]/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(60,255,208,0.2)] hover:scale-110 hover:border-[#3cffd0] transition-all group"
                >
                  <SlidersHorizontal size={22} className="text-[#3cffd0] group-hover:rotate-90 transition-transform duration-500" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ADMIN PANEL : VIDEO SETTINGS */}
        <AnimatePresence>
          {isSettingsOpen && (
            <VideoSettingsPanel onClose={() => setIsSettingsOpen(false)} />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

const TileSkeleton = ({ title, desc, icon, dataCount, onClick, color = "text-[#3cffd0]" }) => (
  <div
    onClick={onClick}
    className="verge-card group cursor-pointer hover:border-[#3cffd0]/50 transition-all duration-300"
  >
    <div className="flex justify-between items-start mb-12">
      <div className={`w-12 h-12 bg-[#2d2d2d] border border-white/5 flex items-center justify-center rounded-[2px] ${color} group-hover:border-current transition-colors`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      {dataCount !== undefined && (
        <span className="verge-label-mono text-[9px] bg-white/5 px-3 py-1 rounded-[2px]">{dataCount} RECORDS</span>
      )}
    </div>

    <div className="space-y-4">
      <h3 className="text-3xl font-black text-white uppercase leading-none tracking-tighter group-hover:text-[#3cffd0] transition-colors">{title}</h3>
      <p className="verge-label-mono text-[10px] text-[#949494] lowercase italic opacity-60 leading-relaxed">{desc}</p>
    </div>

    <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
      <span className="verge-label-mono text-[8px] text-[#949494]">READY FOR RENDERING</span>
      <ChevronRight size={14} className="text-[#949494] group-hover:text-white transition-all group-hover:translate-x-1" />
    </div>
  </div>
);

export default OptaVisionDashboard;
