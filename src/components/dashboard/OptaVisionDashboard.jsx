import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  Target,
  Trophy,
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
  ChevronDown,
  Shield,
  Play,
  GitBranch,
  Network,
  Map
} from 'lucide-react';
import ExplorationFilterPanel from './ExplorationFilterPanel';
import BuildUpFilterPanel from './BuildUpFilterPanel';
import ShotMapFilterPanel from './ShotMapFilterPanel';

import EventExplorer from './EventExplorer';
import BuildUpExplorer from './BuildUpExplorer';
import ShotMapExplorer from './ShotMapExplorer';
import RankingExplorer from './RankingExplorer';
import ChainBoardExplorer from './ChainBoardExplorer';
import PassMapExplorer from './PassMapExplorer';
import TerritoryExplorer from './TerritoryExplorer';
import GlobalVideoPlayer from './GlobalVideoPlayer';
import SettingsModal from '../layout/SettingsModal';
import { API_BASE_URL, OPTAVISION_API_URL } from '../../config';
import { appendExplorationFilterParams } from './optaFilterParams';
import { pollVideoJob } from '../../utils/videoJobs';

const DEFAULT_VIDEO_TITLE = "OptaVision Elite Video Feed";

/**
 * OptaVisionDashboard - Squelette UI/UX Premium (Style The Verge)
 * Aligné sur le Design System du projet Scouting.
 */
const OptaVisionDashboard = ({ user }) => {
  const [eventsData, setEventsData] = useState([]);
  const [buildupSequences, setBuildupSequences] = useState([]);
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
  const [activeTool, setActiveTool] = useState(null); // 'events', 'chainboard', 'passmap', 'territory', 'sequences', 'shots'
  const [globalVideoUrl, setGlobalVideoUrl] = useState(null);
  const [videoQueue, setVideoQueue] = useState([]);
  const [videoQueueIndex, setVideoQueueIndex] = useState(-1);
  const [videoPlayerTitle, setVideoPlayerTitle] = useState(DEFAULT_VIDEO_TITLE);
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
    next_action_types: [],
    previous_action_types: [],
    exclude_types: [],
    tactical_positions: [],
    exclude_positions: [],
    start_zones: [],
    end_zones: [],
    advanced_tactics: [],
    startDate: '',
    endDate: '',
    player_id: [],
    receiver_id: [],
    opponent_id: [],
    pass_distance_min: null,
    pass_distance_max: null,
    carry_distance_min: null,
    carry_distance_max: null
  });
  const [shotFilters, setShotFilters] = useState({
    outcomes: [],
    bodyParts: [],
    situations: [],
    distanceMax: null,
    matches: [],
    competition: [],
    season: [],
    week: [],
    country: [],
    phase: [],
    stadium: [],
    startDate: '',
    endDate: '',
    start_min: 0,
    end_min: 95,
    player_id: []
  });

  const appendShotMapParams = (params, filters) => {
    params.set('types', '13,14,15,16');

    const bodyParts = (filters?.bodyParts || []).filter(Boolean);
    if (bodyParts.length > 0) params.append('body_parts', bodyParts.join(','));

    const situations = (filters?.situations || []).filter(Boolean);
    if (situations.length > 0) params.append('situations', situations.join(','));

    if (filters?.outcomes?.length > 0) params.append('shot_outcomes', filters.outcomes.join(','));
    if (filters?.distanceMax !== null && filters?.distanceMax !== undefined) {
      params.append('distance_max', filters.distanceMax.toString());
    }
  };

  const fetchEvents = async (baseFilters = explorationFilters, nextShotFilters = shotFilters, tool = activeTool) => {
    setLoading(true);
    setError(null);
    const requestFilters = tool === 'shots'
      ? { ...baseFilters, ...nextShotFilters }
      : baseFilters;

    // Construction dynamique des query params
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '1000'
    });

    appendExplorationFilterParams(params, requestFilters);

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
      setEventsData(json.items || []);
      setTotalEvents(json.total || 0);
    } catch (err) {
      console.error("❌ ERREUR DE FETCH :", err);
      setError(err.message);
      setEventsData([]);
      setTotalEvents(0);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySingleVideo = async (event, options = {}) => {
    if (!options.preserveQueue) {
      setVideoQueue([]);
      setVideoQueueIndex(-1);
      setVideoPlayerTitle(DEFAULT_VIDEO_TITLE);
    }

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
    const numericSequenceStart = Number(event.start_seconds ?? event.sequence_start_seconds);
    const numericSequenceEnd = Number(event.end_seconds ?? event.sequence_end_seconds);
    const sequenceStartSeconds = isSequence
      ? (Number.isFinite(numericSequenceStart)
        ? numericSequenceStart
        : (parseClock(event.start_time) ?? (Number(firstSequenceEvent?.min ?? firstSequenceEvent?.minute ?? 0) * 60 + Number(firstSequenceEvent?.sec ?? firstSequenceEvent?.second ?? 0))))
      : null;
    const sequenceEndSeconds = isSequence
      ? (Number.isFinite(numericSequenceEnd)
        ? numericSequenceEnd
        : (parseClock(event.end_time) ?? (Number(lastSequenceEvent?.min ?? lastSequenceEvent?.minute ?? 0) * 60 + Number(lastSequenceEvent?.sec ?? lastSequenceEvent?.second ?? 0))))
      : null;

    if (!matchId || !eventId) {
      throw new Error("match_id et event_id requis pour générer la vidéo");
    }

    setIsVideoLoading(true);
    try {
      // Récupération de la config globale (buffers FFmpeg)
      const savedConfig = localStorage.getItem('optavision_video_config');
      const videoCfg = savedConfig ? JSON.parse(savedConfig) : { before_buffer: 3, after_buffer: 5, min_clip_gap: 0.5 };

      const requestPayload = {
        match_id: matchId,
        event_id: eventId,
        before_buffer: videoCfg.before_buffer,
        after_buffer: videoCfg.after_buffer,
        min_clip_gap: videoCfg.min_clip_gap,
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
      if (!response.ok) {
        throw new Error(payload.detail || "Aucune URL vidéo retournée par l'API");
      }
      if (payload.job_id) {
        const videoUrl = await pollVideoJob(payload.job_id);
        if (videoUrl) setGlobalVideoUrl(videoUrl);
        return videoUrl;
      }
      if (!payload.video_url) {
        throw new Error(payload.detail || "Aucune URL video retournee par l'API");
      }
      setGlobalVideoUrl(payload.video_url);
      return payload.video_url;
    } catch (err) {
      console.error("Erreur generation video:", err);
      alert(err.message || "Erreur generation video");
      return null;
    } finally {
      setIsVideoLoading(false);
    }
  };

  const handlePlayPlaylist = async (events = []) => {
    const nextQueue = Array.isArray(events) ? events.filter(Boolean) : [];
    if (nextQueue.length === 0) return null;

    setVideoQueue(nextQueue);
    setVideoQueueIndex(0);
    setVideoPlayerTitle(`Rafale 1/${nextQueue.length}`);
    return handlePlaySingleVideo(nextQueue[0], { preserveQueue: true });
  };

  const handleVideoEnded = async () => {
    if (videoQueueIndex < 0 || videoQueue.length === 0 || isVideoLoading) return;

    const nextIndex = videoQueueIndex + 1;
    if (nextIndex >= videoQueue.length) {
      setVideoQueue([]);
      setVideoQueueIndex(-1);
      setVideoPlayerTitle(DEFAULT_VIDEO_TITLE);
      return;
    }

    setVideoQueueIndex(nextIndex);
    setVideoPlayerTitle(`Rafale ${nextIndex + 1}/${videoQueue.length}`);
    await handlePlaySingleVideo(videoQueue[nextIndex], { preserveQueue: true });
  };

  const handleCloseGlobalVideo = () => {
    setGlobalVideoUrl(null);
    setVideoQueue([]);
    setVideoQueueIndex(-1);
    setVideoPlayerTitle(DEFAULT_VIDEO_TITLE);
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
      setBuildupSequences(json.sequences || []);
    } catch (err) {
      console.error("❌ ERREUR DE FETCH BUILDUP :", err);
      setError(err.message);
      setBuildupSequences([]);
    } finally {
      setLoading(false);
    }
  };



  const [availableActionTypes, setAvailableActionTypes] = useState([]);
  const [availableNextActionTypes, setAvailableNextActionTypes] = useState([]);
  const [availablePreviousActionTypes, setAvailablePreviousActionTypes] = useState([]);
  const [competitionsList, setCompetitionsList] = useState([]);
  const [seasonsList, setSeasonsList] = useState([]);
  const [weeksList, setWeeksList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [phasesList, setPhasesList] = useState([]);
  const [stadiumsList, setStadiumsList] = useState([]);
  const [advancedMetricsList, setAdvancedMetricsList] = useState([]);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('profile');

  // Fetch Lookups (Auto-Discovery)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [meta, t, p] = await Promise.all([
          fetch(`${OPTAVISION_API_URL}/api/optavision/meta/summary`).then(r => r.json()),
          fetch(`${OPTAVISION_API_URL}/api/optavision/teams`).then(r => r.json()),
          fetch(`${OPTAVISION_API_URL}/api/optavision/players`).then(r => r.json())
        ]);

        setMatchesList(meta.matches || []);
        setAvailableActionTypes(meta.action_types || []);
        setCompetitionsList(meta.competitions || []);
        setSeasonsList(meta.seasons || []);
        setWeeksList(meta.weeks || []);
        setCountriesList(meta.countries || []);
        setPhasesList(meta.phases || []);
        setStadiumsList(meta.stadiums || []);
        setAdvancedMetricsList(meta.advanced_metrics_keys || []);
        setAvailableNextActionTypes(meta.next_action_types || meta.action_types || []);
        setAvailablePreviousActionTypes(meta.previous_action_types || meta.action_types || []);
        
        const teamObjects = meta.teams 
          ? Object.entries(meta.teams).map(([id, name]) => ({ id, name }))
          : t;
        setTeamsList(teamObjects);
        setPlayersList(p);

        if (meta.matches?.length > 0 && explorationFilters.matches.length === 0) {
          setExplorationFilters(prev => ({ ...prev, matches: [meta.matches[0].id] }));
        }
      } catch (err) {
        console.error("META_FETCH_ERROR:", err);
      }
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    // On charge les événements de base même en mode séquences pour le cache spatial (Zero-Download)
    if (activeTool === 'ranking') return;
    if (activeTool === 'chainboard') return;
    if (activeTool === 'passmap') return;
    if (activeTool === 'territory') return;
    if (activeTool === 'sequences') {
      Promise.resolve().then(() => fetchBuildup(explorationFilters));
      return;
    }
    fetchEvents();
  }, [page, limit, explorationFilters, activeTool]);

  const openSettings = (tab) => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
    setIsUserMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#131313] text-white flex flex-col font-sans overflow-hidden">

      {!activeTool && (
        <header className="sticky top-0 z-[100] w-full px-8 bg-[#131313] border-b border-white/10 h-24 flex items-center shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-full max-w-[1700px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center">

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

            <div className="hidden md:flex justify-end items-center gap-6 order-2 md:order-3">
              <button className="w-10 h-10 flex items-center justify-center text-secondary-text hover:text-white bg-white/5 border border-white/10 rounded-full transition-all">
                <Activity size={18} className="rotate-45" />
              </button>

              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-4 pl-5 pr-2 py-1.5 rounded-full border transition-all cursor-pointer group ${isUserMenuOpen ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:border-white/20'}`}
                >
                  <div className={`flex flex-col items-end ${isUserMenuOpen ? 'text-black' : 'text-white'}`}>
                    <span className="verge-label-mono text-[10px] font-black leading-none uppercase">{user?.username || 'ADMIN'}</span>
                    <span className={`verge-label-mono text-[8px] mt-1 tracking-tighter uppercase ${isUserMenuOpen ? 'text-black/60' : 'text-[#3cffd0]'}`}>ANALYST PRO</span>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isUserMenuOpen ? 'bg-black text-[#3cffd0]' : 'bg-[#2d2d2d] text-white group-hover:bg-[#3cffd0] group-hover:text-black'}`}>
                    <UserIcon size={16} />
                  </div>
                  <ChevronDown size={14} className={`transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180 text-black' : 'text-[#949494]'}`} />
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="fixed inset-0 z-[-1]"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-72 bg-[#1a1a1a] border border-white/10 rounded-[4px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[110] backdrop-blur-xl"
                      >
                        <div className="p-6 border-b border-white/5 bg-black/20">
                          <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.2em] mb-1">Session Active</p>
                          <p className="verge-label-mono text-sm font-black text-white uppercase">{user?.username || 'ADMIN'}</p>
                        </div>
                        
                        <div className="p-2">
                          <button onClick={() => openSettings('profile')} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 rounded-[2px] transition-all group">
                            <Settings size={16} className="text-[#949494] group-hover:text-[#3cffd0]" />
                            <span className="verge-label-mono text-[10px] font-black text-[#949494] group-hover:text-white uppercase tracking-widest">Paramètres du compte</span>
                          </button>
                          
                          <button onClick={() => openSettings('security')} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 rounded-[2px] transition-all group">
                            <Shield size={16} className="text-[#949494] group-hover:text-[#3cffd0]" />
                            <span className="verge-label-mono text-[10px] font-black text-[#949494] group-hover:text-white uppercase tracking-widest">Sécurité & Accès</span>
                          </button>

                          <button onClick={() => openSettings('video-r2')} className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 rounded-[2px] transition-all group">
                            <Play size={16} className="text-[#949494] group-hover:text-[#3cffd0]" />
                            <span className="verge-label-mono text-[10px] font-black text-[#949494] group-hover:text-white uppercase tracking-widest">Config Video R2</span>
                          </button>
                        </div>

                        <div className="p-2 border-t border-white/5 bg-black/10">
                          <button className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-red-500/10 rounded-[2px] transition-all group">
                            <LogOut size={16} className="text-[#949494] group-hover:text-red-500" />
                            <span className="verge-label-mono text-[10px] font-black text-[#949494] group-hover:text-white uppercase tracking-widest">Déconnexion</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </header>
      )}

      <div className={`flex-1 flex flex-col overflow-hidden ${activeTool ? 'p-0' : 'p-8 md:p-12 lg:p-20 gap-12'}`}>

        {view === 'DASHBOARD' && (
          <div className="flex-1 flex overflow-hidden relative">

            <div className={`flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden ${activeTool ? '' : 'max-w-[1600px] mx-auto w-full space-y-12'}`}>

              {!activeTool && (
                <div className="flex items-center justify-between">
                  <nav className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-full w-fit">
                    {[
                      { id: 'exploration', label: 'Exploration (Événements)', icon: Activity },
                      { id: 'ranking', label: 'Ranking Performance', icon: Trophy },
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
                      {activeTab === 'exploration' && (
                        <TileSkeleton
                          title="ChainBoard"
                          desc="Detection API-first des chaines par zones de depart, arrivee et relais."
                          icon={<GitBranch />}
                          color="text-[#ffd03c]"
                          onClick={() => setActiveTool('chainboard')}
                        />
                      )}
                      {activeTab === 'exploration' && (
                        <TileSkeleton
                          title="PassMap"
                          desc="Reseau de passes API-first avec positions moyennes, liens et metriques de bloc."
                          icon={<Network />}
                          color="text-[#3cffd0]"
                          onClick={() => setActiveTool('passmap')}
                        />
                      )}
                      {activeTab === 'exploration' && (
                        <TileSkeleton
                          title="Territory"
                          desc="Carte de territoire API-first par zones, domination et recuperations."
                          icon={<Map />}
                          color="text-[#8be9fd]"
                          onClick={() => setActiveTool('territory')}
                        />
                      )}
                      {activeTab === 'ranking' && (
                        <TileSkeleton
                          title="Ranking Performance"
                          desc="Classement API-first des joueurs selon les filtres contextuels."
                          icon={<Trophy />}
                          color="text-[#ffd03c]"
                          onClick={() => setActiveTool('ranking')}
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
                      <button
                        onClick={() => { setActiveTool(null); setIsFilterOpen(false); }}
                        className="absolute top-10 right-10 z-[250] w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[#949494] hover:text-white hover:bg-red-500 transition-all group"
                      >
                        <X size={20} className="group-hover:rotate-90 transition-transform" />
                      </button>

                      {activeTool === 'events' ? (
                        <div className="w-full h-full p-8 overflow-hidden bg-[#131313] animate-in fade-in duration-700">
                          <EventExplorer
                            data={eventsData}
                            eventsData={eventsData}
                            matchIds={explorationFilters.matches}
                            loading={loading}
                            filters={explorationFilters}
                            advancedMetricsList={advancedMetricsList}
                            playersList={playersList}
                            onPlayVideo={handlePlaySingleVideo}
                            onPlayPlaylist={handlePlayPlaylist}
                            isVideoLoading={isVideoLoading}
                          />
                        </div>
                      ) : activeTool === 'sequences' ? (
                        <BuildUpExplorer 
                          data={{ sequences: buildupSequences }} 
                          loading={loading} 
                          matchIds={explorationFilters.matches}
                          playersList={playersList}
                          teamsList={teamsList}
                          advancedMetricsList={advancedMetricsList}
                          onPlayVideo={handlePlaySingleVideo}
                          isVideoLoading={isVideoLoading}
                        />
                      ) : activeTool === 'shots' ? (
                        <ShotMapExplorer
                          data={eventsData}
                          loading={loading}
                          onPlayVideo={handlePlaySingleVideo}
                          isVideoLoading={isVideoLoading}
                        />
                      ) : activeTool === 'chainboard' ? (
                        <ChainBoardExplorer
                          filters={explorationFilters}
                          playersList={playersList}
                          onPlayVideo={handlePlaySingleVideo}
                          isVideoLoading={isVideoLoading}
                        />
                      ) : activeTool === 'passmap' ? (
                        <PassMapExplorer
                          filters={explorationFilters}
                          onPlayVideo={handlePlaySingleVideo}
                          onPlayPlaylist={handlePlayPlaylist}
                          isVideoLoading={isVideoLoading}
                        />
                      ) : activeTool === 'territory' ? (
                        <TerritoryExplorer
                          filters={explorationFilters}
                        />
                      ) : activeTool === 'ranking' ? (
                        <RankingExplorer
                          filters={explorationFilters}
                          onFiltersChange={setExplorationFilters}
                          matchesList={matchesList}
                          availableActionTypes={availableActionTypes}
                          availableNextActionTypes={availableNextActionTypes}
                          availablePreviousActionTypes={availablePreviousActionTypes}
                          competitionsList={competitionsList}
                          seasonsList={seasonsList}
                          weeksList={weeksList}
                          countriesList={countriesList}
                          phasesList={phasesList}
                          stadiumsList={stadiumsList}
                          advancedMetricsList={advancedMetricsList}
                          teamsList={teamsList}
                          playersList={playersList}
                          onPlayVideo={handlePlaySingleVideo}
                        />
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
                        availableNextActionTypes={availableNextActionTypes}
                        availablePreviousActionTypes={availablePreviousActionTypes}
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
                    {activeTab === 'ranking' && (
                      <ExplorationFilterPanel
                        matchesList={matchesList}
                        availableActionTypes={availableActionTypes}
                        availableNextActionTypes={availableNextActionTypes}
                        availablePreviousActionTypes={availablePreviousActionTypes}
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
                        onApply={(filters) => { 
                          setExplorationFilters(filters); 
                        }} 
                        onClose={() => setIsFilterOpen(false)} 
                      />
                    )}
                    {activeTab === 'shots' && (
                      <ShotMapFilterPanel
                        matchesList={matchesList}
                        competitionsList={competitionsList}
                        seasonsList={seasonsList}
                        weeksList={weeksList}
                        countriesList={countriesList}
                        phasesList={phasesList}
                        stadiumsList={stadiumsList}
                        playersList={playersList}
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

            <AnimatePresence>
              {activeTool && activeTool !== 'ranking' && (
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

        <AnimatePresence>
          {isSettingsOpen && (
            <SettingsModal 
              isOpen={isSettingsOpen} 
              onClose={() => setIsSettingsOpen(false)} 
              user={user}
              initialTab={settingsTab}
            />
          )}
        </AnimatePresence>

      </div>

      <GlobalVideoPlayer 
        url={globalVideoUrl} 
        onClose={handleCloseGlobalVideo}
        onEnded={handleVideoEnded}
        title={videoPlayerTitle}
      />
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
