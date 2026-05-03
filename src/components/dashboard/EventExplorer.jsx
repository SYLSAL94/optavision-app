import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database,
  ArrowUpDown,
  Filter,
  Layers,
  Play,
  Loader2,
  X,
  Eye,
  EyeOff,
  Download,
  Palette, Square,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PlayCircle
} from 'lucide-react';

import { API_BASE_URL } from '../../config';
import { pollVideoJob } from '../../utils/videoJobs';
import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';
import { BuildUpLayer } from './BuildUpLayer';
import { ExplorationLayer } from './ExplorationLayer';
import { EventTooltip } from './EventTooltip';

const hasRenderablePlayerId = (event) => {
  const playerId = event?.player_id;
  return playerId !== null
    && playerId !== undefined
    && String(playerId).trim() !== '';
};

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

const SHOTS_PER_PAGE = 6;
const PITCH_STYLE_CONFIGS = {
  standard: { grass: 'transparent', line: 'rgba(255,255,255,0.08)', background: 'transparent' },
  dark: { grass: '#111827', line: 'rgba(255,255,255,0.16)', background: '#050505' },
  light: { grass: '#f8fafc', line: 'rgba(15,23,42,0.38)', background: '#e2e8f0' },
  blue: { grass: '#0f2a44', line: 'rgba(125,211,252,0.42)', background: '#071523' },
  tactical: { grass: '#1f2937', line: 'rgba(209,213,219,0.34)', background: '#111827' }
};

const LIVE_FLUX_PAGE_SIZE = 20;
const EMPTY_SELECTION_BOX = { startX: null, startY: null, endX: null, endY: null, isDrawing: false };
const MIN_SELECTION_SIZE = 0.6;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const countDisplayEvents = (items, sequenceMode) => (
  sequenceMode ? items.reduce((sum, seq) => sum + ((seq.events || []).length), 0) : items.length
);


const EventExplorer = ({ 
  data = [], 
  matchIds, 
  loading = false, 
  filters, 
  playersList = [], 
  selectedSequence,
  isSequenceMode = false,
  eventsData = [],
  onPlayVideo,
  onPlayPlaylist,
  isVideoLoading = false
}) => {
  const [generatingEventId, setGeneratingEventId] = useState(null);
  const [pitchView, setPitchView] = useState('full');
  const [orientation, setOrientation] = useState('horizontal');
  const [heatmapMode, setHeatmapMode] = useState('off');
  const [pitchStyle, setPitchStyle] = useState('standard');
  const [showEvents, setShowEvents] = useState(true);
  const [liveFluxPage, setLiveFluxPage] = useState(1);
  const [selectionBox, setSelectionBox] = useState(EMPTY_SELECTION_BOX);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMixMenuOpen, setIsMixMenuOpen] = useState(false);

  // --- MOTEUR GÉOMÉTRIQUE UNIFIÉ ---
  const { projectPoint, getPitchViewBox, getPitchSvgPoint } = usePitchProjection(orientation);
  const pitchViewBox = useMemo(() => getPitchViewBox(pitchView), [getPitchViewBox, pitchView]);
  const pitchViewBoxCenter = useMemo(() => ({
    x: pitchViewBox.x + pitchViewBox.width / 2,
    y: pitchViewBox.y + pitchViewBox.height / 2
  }), [pitchViewBox]);

  const selectedPitchStyle = useMemo(() => 
    PITCH_STYLE_CONFIGS[pitchStyle] || PITCH_STYLE_CONFIGS.standard
  , [pitchStyle]);

  // --- 1. MAPPAGES DE BASE ---
  const globalPlayerMap = useMemo(() => {
    const map = {};
    if (playersList && Array.isArray(playersList)) {
      playersList.forEach(p => { map[String(p.id || p.player_id)] = p.name || p.shortName || p.id; });
    }
    return map;
  }, [playersList]);

  const matchMap = useMemo(() => {
    const map = {};
    const base = Array.isArray(data) ? data : (data?.items || []);
    if (Array.isArray(base)) {
      base.forEach(e => {
        const mId = e.match_id || e.matchId;
        if (mId && e.matchName) map[mId] = e.matchName;
      });
    }
    return map;
  }, [data]);

  // --- 2. SOURCE DE VÉRITÉ (displayData) ---
  const displayData = useMemo(() => {
    if (isSequenceMode) {
      if (!selectedSequence || !eventsData) return [];
      const targetId = String(selectedSequence).includes('_') ? selectedSequence.split('_').pop() : selectedSequence;
      const sequenceEvents = eventsData.filter(e => {
        const metrics = typeof e.advanced_metrics === 'string' ? JSON.parse(e.advanced_metrics) : (e.advanced_metrics || {});
        const seqId = String(metrics.sub_sequence_id || metrics.possession_id || '');
        return seqId === String(targetId);
      }).filter(hasRenderablePlayerId);
      if (sequenceEvents.length === 0) return [];
      return [{ id: selectedSequence, team_id: sequenceEvents[0]?.team_id, events: sequenceEvents }];
    }
    const baseData = Array.isArray(data) ? data : (data?.items || []);
    let filtered = baseData.filter(e => 
      hasRenderablePlayerId(e) && 
      !['Out', 'Card', 'SubOff', 'SubOn'].includes(e.type) && 
      ![5, 17, 18, 19].includes(e.type_id)
    );
    const { localTeam, localOpponent } = filters || {};
    if (localTeam && localTeam !== 'ALL') filtered = filtered.filter(e => String(e.team_id) === String(localTeam));
    if (localOpponent && localOpponent !== 'ALL') filtered = filtered.filter(e => String(e.team_id) !== String(localOpponent));
    return filtered;
  }, [data, filters, isSequenceMode, selectedSequence, eventsData]);

  // --- 3. INTELLIGENCE SPATIALE & FILTRAGE ---
  const selectionBounds = useMemo(() => {
    const { startX, startY, endX, endY } = selectionBox;
    if (![startX, startY, endX, endY].every(Number.isFinite)) return null;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    if (width < MIN_SELECTION_SIZE || height < MIN_SELECTION_SIZE) return null;
    return { x, y, width, height, xMax: x + width, yMax: y + height };
  }, [selectionBox]);

  const spatialDisplayData = useMemo(() => {
    if (!selectionBounds) return displayData;
    const isInsideSelection = (event) => {
      const point = projectPoint(event.x, event.y);
      return point && point.x >= selectionBounds.x && point.x <= selectionBounds.xMax && point.y >= selectionBounds.y && point.y <= selectionBounds.yMax;
    };
    if (isSequenceMode && data && Array.isArray(data.sequences)) {
      return displayData.map(seq => ({ ...seq, events: (seq.events || []).filter(isInsideSelection) })).filter(seq => seq.events.length > 0);
    }
    return displayData.filter(isInsideSelection);
  }, [isSequenceMode, data, displayData, projectPoint, selectionBounds]);

  const liveEventRows = useMemo(() => (
    ((isSequenceMode && data && Array.isArray(data.sequences)) ? spatialDisplayData[0]?.events : spatialDisplayData) || []
  ), [isSequenceMode, data, spatialDisplayData]);
  const videoActionCount = liveEventRows.length;
  const isVideoActionDisabled = loading || videoActionCount === 0;

  const handlePitchMouseMove = useCallback((event) => {
    const point = getPitchSvgPoint(event, pitchViewBox);
    if (!point) return;

    const target = event.target.closest('[data-event-id]');
    if (target) {
      const eventId = target.getAttribute('data-event-id');
      const foundEvent = liveEventRows.find(e => String(e.opta_id ?? e.id) === String(eventId));
      if (foundEvent) {
        setHoveredEvent(foundEvent);
        setMousePos({ x: event.clientX, y: event.clientY });
      }
    } else {
      setHoveredEvent(null);
    }

    setSelectionBox(prev => {
      if (!prev.isDrawing) return prev;
      return { ...prev, endX: point.x, endY: point.y };
    });
  }, [getPitchSvgPoint, pitchViewBox, liveEventRows]);

  const handlePitchMouseUp = useCallback((event) => {
    const point = getPitchSvgPoint(event, pitchViewBox);

    const target = event.target.closest('[data-event-id]');
    if (target) {
      const eventId = target.getAttribute('data-event-id');
      const foundEvent = liveEventRows.find(e => String(e.opta_id ?? e.id) === String(eventId));
      if (foundEvent) {
        setFocusedEvent(foundEvent);
        setFocusedEventId(eventId);
        setHoveredEvent(foundEvent);
      }
    }

    setSelectionBox(prev => {
      if (!prev.isDrawing) return prev;
      const next = point ? { ...prev, endX: point.x, endY: point.y } : prev;
      const width = Math.abs(next.endX - next.startX);
      const height = Math.abs(next.endY - next.startY);
      if (width < MIN_SELECTION_SIZE || height < MIN_SELECTION_SIZE) {
        return { ...EMPTY_SELECTION_BOX };
      }
      return { ...next, isDrawing: false };
    });
  }, [getPitchSvgPoint, pitchViewBox, liveEventRows]);

  const handlePitchMouseDown = useCallback((event) => {
    if (event.button !== 0 || loading) return;
    if (event.target.closest?.('[data-event-id]')) return;

    const point = getPitchSvgPoint(event, pitchViewBox);
    if (!point) return;

    event.preventDefault();
    setFocusedEvent(null);
    setFocusedEventId(null);
    setHoveredEvent(null);
    setSelectionBox({
      startX: point.x,
      startY: point.y,
      endX: point.x,
      endY: point.y,
      isDrawing: true
    });
  }, [getPitchSvgPoint, pitchViewBox, loading]);

  // --- 4. MÉTRIQUES ET RENDU SPATIAL ---
  const mapEventCount = countDisplayEvents(spatialDisplayData, isSequenceMode && data && Array.isArray(data.sequences));
  const isEventLimitExceeded = mapEventCount > 1000;
  const shouldShowEvents = showEvents && !isEventLimitExceeded;
  const pitchDisplayData = shouldShowEvents
    ? spatialDisplayData
    : ((isSequenceMode && data && Array.isArray(data.sequences)) ? spatialDisplayData.map(seq => ({ ...seq, events: [] })) : []);
  const heatmapEvents = useMemo(() => {
    const events = (isSequenceMode && data && Array.isArray(data.sequences))
      ? spatialDisplayData.flatMap(seq => seq.events || [])
      : spatialDisplayData;
    return events.filter(hasRenderablePlayerId);
  }, [isSequenceMode, data, spatialDisplayData]);

  const handleDownloadMix = async (mixMode = 'standard') => {
    if (liveEventRows.length === 0) return;
    setIsMixMenuOpen(false);
    setIsDownloading(true);
    try {
      const savedConfig = localStorage.getItem('optavision_video_config');
      const videoCfg = savedConfig ? JSON.parse(savedConfig) : { before_buffer: 3, after_buffer: 5, min_clip_gap: 0.5 };
      
      const eventIds = liveEventRows.map(e => e.opta_id || e.id);
      const matchId = liveEventRows[0].match_id || liveEventRows[0].matchId || matchIds?.[0];

      const response = await fetch(`${API_BASE_URL}/api/optavision/download-mix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          event_ids: eventIds,
          before_buffer: videoCfg.before_buffer,
          after_buffer: videoCfg.after_buffer,
          min_clip_gap: videoCfg.min_clip_gap,
          mix_mode: mixMode
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Erreur lors du mixage vidéo');

      if (data.job_id) {
        const videoUrl = await pollVideoJob(data.job_id);
        fetch(videoUrl)
          .then(response => response.blob())
          .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = `OptaVision_Mixage_${mixMode}_${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
          })
          .catch(err => console.error("Erreur de téléchargement Blob :", err));
      } else {
        throw new Error("Aucun Job ID reçu de l'API");
      }
    } catch (err) {
      console.error("❌ Erreur téléchargement mix:", err);
      alert(err.message || "Erreur lors du mixage vidéo");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePlayFocusedVideo = async (event) => {
    if (!event) return;
    try {
      if (onPlayVideo) {
        await onPlayVideo(event);
        return;
      }
      console.log("Lecture vidéo pour l'événement :", event.id);
    } catch (err) {
      console.error("❌ Erreur génération clip:", err);
    }
  };

  const actualSequenceMode = isSequenceMode && data && Array.isArray(data.sequences);

  // États pour le Tooltip et Focus
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [focusedEvent, setFocusedEvent] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [focusedEventId, setFocusedEventId] = useState(null);
  const activeFocusedEventId = focusedEvent ? (focusedEvent.opta_id ?? focusedEvent.id) : focusedEventId;

  // HELPER : Extraction des coordonnées de fin
  const getEndCoordinates = useCallback((event) => {
    let metrics = event.advanced_metrics || {};
    if (typeof metrics === 'string') {
      try { metrics = JSON.parse(metrics); } catch { metrics = {}; }
    }
    const ex = metrics.end_x ?? metrics.endX ?? event.end_x ?? event.endX;
    const ey = metrics.end_y ?? metrics.endY ?? event.end_y ?? event.endY;
    
    if (ex !== undefined && ey !== undefined && ex !== null && ey !== null) {
      return { x: parseFloat(ex), y: parseFloat(ey) };
    }
    const quals = event.qualifiers || [];
    if (Array.isArray(quals)) {
      const qX = quals.find(q => [140, 212].includes(Number(q.type_id || q.id)));
      const qY = quals.find(q => [141, 213].includes(Number(q.type_id || q.id)));
      if (qX && qY) return { x: parseFloat(qX.value), y: parseFloat(qY.value) };
    }
    return null;
  }, []);






  const successfulEventCount = useMemo(() => (
    liveEventRows.filter(event => event.outcome === 1 || event.outcome === 'Successful').length
  ), [liveEventRows]);
  const globalSuccessRate = liveEventRows.length > 0
    ? Math.round((successfulEventCount / liveEventRows.length) * 100)
    : 0;
  const liveFluxTotalPages = Math.max(1, Math.ceil(liveEventRows.length / LIVE_FLUX_PAGE_SIZE));
  const currentLiveFluxPage = Math.min(liveFluxPage, liveFluxTotalPages);
  const paginatedLiveEventRows = useMemo(() => {
    const start = (currentLiveFluxPage - 1) * LIVE_FLUX_PAGE_SIZE;
    return liveEventRows.slice(start, start + LIVE_FLUX_PAGE_SIZE);
  }, [currentLiveFluxPage, liveEventRows]);

  React.useEffect(() => {
    setSelectionBox({ ...EMPTY_SELECTION_BOX });
  }, [matchIds]);

  React.useEffect(() => () => {
  }, []);

  // --- MOTEUR DE VIRTUALISATION (Optimisation DevOps / Lead Data) ---
  const scrollContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const ROW_HEIGHT = 82; // Hauteur fixe pour une virtualisation performante
  const VISIBLE_ROWS = 15; // Nombre de lignes visibles à l'écran
  const BUFFER_ROWS = 5;  // Lignes de tampon (haut/bas) pour éviter les flashs au scroll

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const virtualItems = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const end = Math.min(liveEventRows.length, Math.ceil((scrollTop + 800) / ROW_HEIGHT) + BUFFER_ROWS);
    
    return liveEventRows.slice(start, end).map((event, index) => ({
      event,
      index: start + index,
      top: (start + index) * ROW_HEIGHT
    }));
  }, [scrollTop, liveEventRows]);

  const renderLiveFlux = (className = "h-full bg-[#1a1a1a] border border-white/10 rounded-[4px] flex flex-col overflow-hidden") => (
    <div className={className}>
      <div className="px-6 py-4 border-b border-white/10 bg-[#2d2d2d] flex justify-between items-center shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-[#3cffd0] animate-pulse'}`} />
          <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">Flux Live Analyst (Virtualized)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isVideoActionDisabled || generatingEventId === 'batch'}
            onClick={async () => {
              if (liveEventRows.length === 0) return;
              setGeneratingEventId('batch');
              try {
                if (onPlayPlaylist) {
                  await onPlayPlaylist(liveEventRows);
                } else {
                  await handlePlayFocusedVideo(liveEventRows[0]);
                }
              } finally {
                setGeneratingEventId(null);
              }
            }}
            className={`px-3 py-1.5 rounded-[2px] verge-label-mono text-[9px] font-black uppercase flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(60,255,208,0.3)] ${isVideoActionDisabled ? 'bg-[#3cffd0]/10 text-[#3cffd0]/35 cursor-not-allowed shadow-none' : generatingEventId === 'batch' ? 'bg-[#3cffd0]/20 text-[#3cffd0] cursor-wait' : 'bg-[#3cffd0] hover:bg-[#2edeb4] text-black cursor-pointer'}`}
            title={selectionBounds ? 'Lancer une rafale sur la sélection spatiale' : 'Lancer une rafale sur le résultat filtré'}
          >
            {generatingEventId === 'batch' ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
            Rafale ({videoActionCount})
          </button>
          <div className="relative">
            <button
              type="button"
              disabled={isVideoActionDisabled || isDownloading}
              onClick={() => setIsMixMenuOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-[2px] verge-label-mono text-[9px] font-black uppercase flex items-center gap-2 transition-all border border-white/10 ${isVideoActionDisabled ? 'bg-black/20 text-white/25 cursor-not-allowed' : isDownloading ? 'bg-white/10 text-[#949494] cursor-wait' : 'bg-black/40 hover:bg-white/10 text-white cursor-pointer'}`}
              title={selectionBounds ? 'Télécharger le mixage de la sélection spatiale' : 'Télécharger le mixage du résultat filtré'}
            >
              {isDownloading ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
              Mixage
              <ChevronDown size={10} className={`transition-transform ${isMixMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isMixMenuOpen && !isVideoActionDisabled && !isDownloading && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-[calc(100%+6px)] z-50 w-40 overflow-hidden rounded-[2px] border border-white/10 bg-[#0b0b0b] shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => handleDownloadMix('standard')}
                    className="w-full px-3 py-2 text-left verge-label-mono text-[9px] font-black uppercase text-white hover:bg-white/10"
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadMix('advanced')}
                    className="w-full border-t border-white/10 px-3 py-2 text-left verge-label-mono text-[9px] font-black uppercase text-[#3cffd0] hover:bg-[#3cffd0]/10"
                  >
                    Avancé
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="verge-label-mono text-[9px] text-[#949494] bg-white/5 px-3 py-1.5 rounded-[2px] border border-white/5">
            {liveEventRows.length.toLocaleString()} TOTAL
          </span>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto styled-scrollbar-verge bg-black/20 relative"
      >
        {/* Container fantôme pour simuler la hauteur totale du scroll */}
        <div style={{ height: `${liveEventRows.length * ROW_HEIGHT}px`, width: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
        
        {!loading && liveEventRows.length > 0 ? (
          virtualItems.map(({ event: e, index, top }) => {
            const parsedMetrics = parseAdvancedMetrics(e);
            const typeLabel = parsedMetrics?.type_name || e.type_name || e.type_id;
            const typeKey = String(typeLabel || '').replace(/\s+/g, '').toLowerCase();
            const typeId = String(parsedMetrics?.type_id ?? e.type_id ?? '');
            
            const getPlayerName = (id) => id ? (globalPlayerMap[String(id)] || String(id)) : null;
            const receiverName = getPlayerName(parsedMetrics?.receiver || e.receiver_id || e.receiver);
            const opponentName = getPlayerName(parsedMetrics?.opponent_id);
            const xTLabel = formatSignedMetric(parsedMetrics?.xT_credit ?? e.xT_credit ?? parsedMetrics?.xT);
            
            const isProgressive = parsedMetrics?.is_progressive === true || parsedMetrics?.is_progressive === 'true';
            const duelWon = (parsedMetrics?.duel_won === true || parsedMetrics?.duel_won === 'true') && !FORCED_DUEL_LOSS_KEYS.has(typeKey);
            const duelLost = parsedMetrics?.duel_lost === true || parsedMetrics?.duel_lost === 'true';
            
            const isPassLike = ['pass', 'carry', 'ballreceipt'].includes(typeKey);
            const isDuelLike = DUEL_EVENT_KEYS.has(typeKey) || DUEL_EVENT_IDS.has(typeId);
            const isShotLike = ['shot', 'goal', 'savedshot', 'missedshots'].includes(typeKey);

            return (
              <div
                key={e.opta_id || e.id || `v-${index}`}
                style={{ position: 'absolute', top: `${top}px`, left: 0, right: 0, height: `${ROW_HEIGHT}px` }}
                onClick={() => {
                  const eventId = e.opta_id ?? e.id;
                  const nextFocused = eventId === activeFocusedEventId ? null : e;
                  setFocusedEvent(nextFocused);
                  setFocusedEventId(nextFocused ? eventId : null);
                  setHoveredEvent(nextFocused);
                }}
                className={`flex items-center justify-between py-3 border-b border-white/[0.03] hover:bg-[#3cffd0]/5 transition-colors px-5 group cursor-pointer ${(e.opta_id ?? e.id) === activeFocusedEventId ? 'bg-[#3cffd0]/10 border-l-2 border-l-[#3cffd0]' : ''}`}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black w-14 shrink-0">
                    {(e.cumulative_mins ?? 0).toFixed(1)}'
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="verge-label-mono text-[10px] text-white uppercase font-black truncate">{typeLabel}</span>
                      {isProgressive && <span className="verge-label-mono text-[7px] px-1.5 py-0.5 rounded-[2px] bg-[#3cffd0] text-black font-black uppercase">Prog</span>}
                    </div>
                    <div className="verge-label-mono text-[9px] text-[#949494] group-hover:text-white transition-colors truncate mt-1">
                      {e.playerName || globalPlayerMap[e.player_id] || e.player_id}
                    </div>
                    <div className="mt-1 flex items-center gap-2 overflow-hidden">
                      {isPassLike && receiverName && <span className="verge-label-mono text-[8px] text-[#949494] truncate">Vers: <span className="text-white/80">{receiverName}</span></span>}
                      {isPassLike && xTLabel && <span className="verge-label-mono text-[8px] text-[#3cffd0] font-black">xTc {xTLabel}</span>}
                      {isDuelLike && (parsedMetrics?.duel_won || duelLost) && (
                        <span className={`verge-label-mono text-[7px] px-1.5 py-0.5 rounded-[2px] text-black font-black uppercase ${duelWon ? 'bg-[#3cffd0]' : 'bg-[#ff4d4d]'}`}>
                          {duelWon ? 'Gagné' : 'Perdu'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={async (evt) => {
                    evt.stopPropagation();
                    const eventId = e.opta_id || e.id;
                    setGeneratingEventId(eventId);
                    try { await onPlayVideo?.(e); } finally { setGeneratingEventId(null); }
                  }}
                  disabled={generatingEventId === (e.opta_id || e.id)}
                  className="text-slate-400 hover:text-[#3cffd0] transition-all transform hover:scale-110 disabled:opacity-30"
                >
                  {generatingEventId === (e.opta_id || e.id) ? <Loader2 size={14} className="animate-spin text-[#3cffd0]" /> : <PlayCircle size={20} />}
                </button>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center opacity-10"><Database size={32} /></div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden">
      <div className="max-w-[1800px] mx-auto flex flex-col h-full w-full gap-4 lg:gap-6 animate-in fade-in zoom-in-95 duration-500 overflow-hidden p-6 lg:p-8">
      
      {/* ÉTAGE SUPÉRIEUR : MAP + FLUX (75% ou Full) */}
      <div className={`${isSequenceMode ? 'h-full' : 'h-[75%]'} flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-0`}>
        <div className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-[4px] p-4 lg:p-8 flex flex-col gap-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3cffd0]/2 to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-6">
            <div className="flex items-center gap-6">
              <div className="w-1 h-8 bg-[#3cffd0]" />
              <div>
                <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Visualisation Spatiale</h3>
                <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.3em] font-bold mt-1">
                  EVENT ANALYSIS ({mapEventCount} SELECTED)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-5 py-2.5 bg-black border border-white/10 rounded-[2px] verge-label-mono text-[10px] text-[#949494] font-black tracking-widest">
                SESSION: <span className="text-[#3cffd0]">
                  {Array.isArray(matchIds) && matchIds.length > 1 
                    ? `${matchIds.length} MATCHS` 
                    : (matchMap[matchIds?.[0]] || matchIds?.[0] || 'ANALYST_PRO')}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-white/10 bg-white/[0.06] px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-[4px] border border-white/10 bg-black/25 p-1">
                {[
                  ['full', 'Full'],
                  ['offensive', 'Off'],
                  ['defensive', 'Def']
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPitchView(value);
                      setSelectionBox({ ...EMPTY_SELECTION_BOX });
                    }}
                    className={`verge-label-mono rounded-[3px] px-3 py-1.5 text-[9px] font-black uppercase transition-all ${pitchView === value ? 'bg-[#3cffd0] text-black' : 'text-[#949494] hover:bg-white/10 hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
                  setSelectionBox({ ...EMPTY_SELECTION_BOX });
                }}
                className="verge-label-mono flex items-center gap-2 rounded-[4px] border border-white/10 bg-black/25 px-3 py-2 text-[9px] font-black uppercase text-[#d8d8d8] transition-all hover:border-[#3cffd0]/50 hover:text-[#3cffd0]"
              >
                <ArrowUpDown size={13} />
                {orientation}
              </button>

              <label className="verge-label-mono flex items-center gap-2 rounded-[4px] border border-white/10 bg-black/25 px-3 py-2 text-[9px] font-black uppercase text-[#949494]">
                <Layers size={13} className="text-[#3cffd0]" />
                <select
                  value={heatmapMode}
                  onChange={(event) => setHeatmapMode(event.target.value)}
                  className="bg-transparent text-white outline-none"
                  title="Mode Heatmap"
                >
                  <option value="off" className="bg-[#131313] text-white">Heatmap off</option>
                  <option value="start" className="bg-[#131313] text-white">Start x/y</option>
                  <option value="end" className="bg-[#131313] text-white">End x/y</option>
                  <option value="both" className="bg-[#131313] text-white">Both</option>
                </select>
              </label>

              <label className="verge-label-mono flex items-center gap-2 rounded-[4px] border border-white/10 bg-black/25 px-3 py-2 text-[9px] font-black uppercase text-[#949494]">
                <Palette size={13} className="text-[#3cffd0]" />
                <select
                  value={pitchStyle}
                  onChange={(event) => setPitchStyle(event.target.value)}
                  className="bg-transparent text-white outline-none"
                  title="Style terrain"
                >
                  <option value="standard" className="bg-[#131313] text-white">Standard</option>
                  <option value="dark" className="bg-[#131313] text-white">Dark</option>
                  <option value="light" className="bg-[#131313] text-white">Light</option>
                  <option value="blue" className="bg-[#131313] text-white">Blue</option>
                  <option value="tactical" className="bg-[#131313] text-white">Tactical</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`verge-label-mono rounded-[3px] border px-3 py-2 text-[9px] font-black uppercase ${isEventLimitExceeded ? 'border-[#ff4d4d]/40 bg-[#ff4d4d]/10 text-[#ff8a8a]' : 'border-white/10 bg-black/25 text-[#949494]'}`}>
                {mapEventCount.toLocaleString()} events
              </span>
              <button
                type="button"
                onClick={() => setShowEvents(prev => !prev)}
                disabled={isEventLimitExceeded}
                className={`verge-label-mono flex items-center gap-2 rounded-[4px] border px-3 py-2 text-[9px] font-black uppercase transition-all ${shouldShowEvents ? 'border-[#3cffd0]/60 bg-[#3cffd0]/15 text-[#3cffd0]' : 'border-white/10 bg-black/25 text-[#949494]'} disabled:cursor-not-allowed disabled:border-[#ff4d4d]/30 disabled:bg-[#ff4d4d]/10 disabled:text-[#ff8a8a]`}
              >
                {showEvents ? <Eye size={13} /> : <EyeOff size={13} />}
                {isEventLimitExceeded ? 'Shield on' : 'Events'}
              </button>
              <div
                className={`verge-label-mono flex items-center gap-2 rounded-[4px] border px-3 py-2 text-[9px] font-black uppercase transition-all ${selectionBounds ? 'border-[#5200ff]/60 bg-[#5200ff]/10 text-[#b9a7ff]' : 'border-white/5 bg-black/10 text-[#444]'}`}
              >
                <Square size={13} className={selectionBounds ? "text-[#b9a7ff]" : "text-[#333]"} />
                Sélecteur {selectionBounds ? 'Actif' : 'Prêt'}
              </div>
              {selectionBounds && (
                <button
                  type="button"
                  onClick={() => setSelectionBox({ ...EMPTY_SELECTION_BOX })}
                  className="verge-label-mono flex items-center gap-2 rounded-[4px] border border-white/10 bg-black/25 px-3 py-2 text-[9px] font-black uppercase text-[#949494] transition-all hover:border-[#5200ff]/60 hover:text-white"
                  title="Effacer la sélection spatiale"
                >
                  <X size={13} />
                  Zone
                </button>
              )}
              <button
                type="button"
                disabled
                className="verge-label-mono flex cursor-not-allowed items-center gap-2 rounded-[4px] border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-black uppercase text-[#555]"
                title="Export PNG a activer dans une prochaine etape"
              >
                <Download size={13} />
                PNG
              </button>
            </div>
          </div>

          <TacticalPitch 
            style={selectedPitchStyle}
            orientation={orientation}
            view={pitchView}
            heatmapMode={heatmapMode}
            heatmapData={heatmapEvents}
            onMouseDown={handlePitchMouseDown}
            onMouseMove={handlePitchMouseMove}
            onMouseUp={handlePitchMouseUp}
            onClick={(event) => {
              if (event.target.closest?.('[data-event-id]')) return;

              setFocusedEvent(null);
              setFocusedEventId(null);
              setHoveredEvent(null);
            }}
          >
            {isSequenceMode ? (
              <>
                <BuildUpLayer 
                  displayData={pitchDisplayData}
                  focusedEventId={activeFocusedEventId} 
                  getEndCoordinates={getEndCoordinates}
                  setHoveredEvent={setHoveredEvent}
                  setMousePos={setMousePos}
                  selectedSequence={selectedSequence}
                  setFocusedEvent={setFocusedEvent}
                  setFocusedEventId={setFocusedEventId}
                  projectPoint={projectPoint}
                />
                {!selectedSequence && (
                  <g>
                    <text x={pitchViewBoxCenter.x} y={pitchViewBoxCenter.y - 4} textAnchor="middle" fill="#3cffd0" fontSize="2" fontWeight="900" className="animate-pulse uppercase tracking-widest">
                      AUCUNE SÉQUENCE SÉLECTIONNÉE
                    </text>
                    <text x={pitchViewBoxCenter.x} y={pitchViewBoxCenter.y} textAnchor="middle" fill="#949494" fontSize="1.2" className="uppercase tracking-wider">
                      Veuillez appliquer un filtre dans le panneau latéral gauche
                    </text>
                  </g>
                )}
              </>
            ) : (
              <ExplorationLayer 
                displayData={pitchDisplayData}
                focusedEventId={activeFocusedEventId} 
                getEndCoordinates={getEndCoordinates}
                setHoveredEvent={setHoveredEvent}
                setMousePos={setMousePos}
                setFocusedEvent={setFocusedEvent}
                setFocusedEventId={setFocusedEventId}
                projectPoint={projectPoint}
              />
            )}
            {selectionBounds && (
              <rect
                x={selectionBounds.x}
                y={selectionBounds.y}
                width={selectionBounds.width}
                height={selectionBounds.height}
                fill="rgba(82, 0, 255, 0.2)"
                stroke="#5200ff"
                strokeWidth="0.45"
                strokeDasharray="1.4 0.8"
                pointerEvents="none"
                className="transition-all duration-75"
              />
            )}
          </TacticalPitch>

          <EventTooltip 
            hoveredEvent={hoveredEvent} 
            focusedEvent={focusedEvent}
            mousePos={mousePos} 
            globalPlayerMap={globalPlayerMap} 
            onPlayVideo={handlePlayFocusedVideo}
            isVideoLoading={isVideoLoading}
          />

          {(loading || (Array.isArray(data) ? data.length === 0 : (!data?.items?.length && !data?.sequences?.length))) && (
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px] z-50">
              <div className="bg-black/90 border border-white/10 p-8 rounded-[2px] text-center max-w-sm shadow-2xl">
                <div className="w-16 h-16 bg-[#3cffd0]/10 border border-[#3cffd0]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  {loading ? <div className="w-8 h-8 border-2 border-[#3cffd0] border-t-transparent rounded-full animate-spin" /> : <Filter className="text-[#3cffd0]" size={24} />}
                </div>
                <h4 className="verge-label-mono text-white text-[12px] font-black uppercase mb-2">
                  {loading ? 'Hyrdratation en cours' : 'Synchronisation prête'}
                </h4>
              </div>
            </div>
          )}
        </div>
        {!isSequenceMode && renderLiveFlux("w-full lg:w-[40%] h-full shrink-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] flex flex-col overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)]")}
      </div>

      {/* ÉTAGE INFÉRIEUR : KPIs GLOBAUX (20% Hauteur) - Uniquement en mode Exploration */}
      {!isSequenceMode && (
        <div className="h-[20%] bg-[#1a1a1a] border border-white/10 rounded-[4px] grid grid-cols-1 md:grid-cols-3 overflow-hidden shrink-0 shadow-2xl">
          {[
            ['Total Evenements', liveEventRows.length.toLocaleString(), 'text-white'],
            ['Actions Reussies', successfulEventCount.toLocaleString(), 'text-[#3cffd0]'],
            ['Taux Reussite', `${globalSuccessRate}%`, globalSuccessRate >= 60 ? 'text-[#3cffd0]' : 'text-[#ff4d4d]']
          ].map(([label, value, color]) => (
            <div key={label} className="p-6 border-r border-white/5 last:border-r-0 bg-black/20 flex flex-col justify-center">
              <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] font-black">{label}</div>
              <div className={`verge-label-mono text-3xl font-black mt-3 ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

export default EventExplorer;
