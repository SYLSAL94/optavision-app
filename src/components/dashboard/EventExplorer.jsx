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
  ChevronRight
} from 'lucide-react';

import { API_BASE_URL } from '../../config';
import { pollVideoJob } from '../../utils/videoJobs';
import { PitchSVG } from './PitchSVG';
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

const DUEL_EVENT_KEYS = new Set([
  'takeon',
  'tackle',
  'aerial',
  'challenge',
  'interception',
  'ballrecovery',
  'foul',
  'blockedpass',
  'dispossessed'
]);

const DUEL_EVENT_IDS = new Set(['4', '50', '74']);

const FORCED_DUEL_LOSS_KEYS = new Set(['blockedpass', 'dispossessed']);
const FORCED_DUEL_LOSS_IDS = new Set(['50', '74']);

const PITCH_DIMENSIONS = {
  width: 105,
  height: 68
};

const PITCH_STYLE_CONFIGS = {
  standard: { grass: 'transparent', line: 'rgba(255,255,255,0.08)', background: 'transparent' },
  dark: { grass: '#111827', line: 'rgba(255,255,255,0.16)', background: '#050505' },
  light: { grass: '#f8fafc', line: 'rgba(15,23,42,0.38)', background: '#e2e8f0' },
  blue: { grass: '#0f2a44', line: 'rgba(125,211,252,0.42)', background: '#071523' },
  tactical: { grass: '#1f2937', line: 'rgba(209,213,219,0.34)', background: '#111827' }
};

const getPitchViewBox = (orientation, view) => {
  const overlap = 7;
  if (orientation === 'vertical') {
    if (view === 'offensive') return { x: 0, y: 0, width: PITCH_DIMENSIONS.height, height: PITCH_DIMENSIONS.width / 2 + overlap };
    if (view === 'defensive') return { x: 0, y: PITCH_DIMENSIONS.width / 2 - overlap, width: PITCH_DIMENSIONS.height, height: PITCH_DIMENSIONS.width / 2 + overlap };
    return { x: 0, y: 0, width: PITCH_DIMENSIONS.height, height: PITCH_DIMENSIONS.width };
  }
  if (view === 'offensive') return { x: PITCH_DIMENSIONS.width / 2 - overlap, y: 0, width: PITCH_DIMENSIONS.width / 2 + overlap, height: PITCH_DIMENSIONS.height };
  if (view === 'defensive') return { x: 0, y: 0, width: PITCH_DIMENSIONS.width / 2 + overlap, height: PITCH_DIMENSIONS.height };
  return { x: 0, y: 0, width: PITCH_DIMENSIONS.width, height: PITCH_DIMENSIONS.height };
};

const toViewBoxString = ({ x, y, width, height }) => `${x} ${y} ${width} ${height}`;

const SIMPLEHEAT_SCRIPT_ID = 'simpleheat-script';
const SIMPLEHEAT_SRC = 'https://cdn.jsdelivr.net/npm/simpleheat@0.4.0/simpleheat.min.js';
const LIVE_FLUX_PAGE_SIZE = 20;
const EMPTY_SELECTION_BOX = {
  startX: null,
  startY: null,
  endX: null,
  endY: null,
  isDrawing: false
};
const MIN_SELECTION_SIZE = 0.6;
let simpleheatLoadPromise = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const countDisplayEvents = (items, sequenceMode) => (
  sequenceMode
    ? items.reduce((sum, seq) => sum + ((seq.events || []).length), 0)
    : items.length
);

const ensureSimpleheat = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.simpleheat) return Promise.resolve(window.simpleheat);
  if (simpleheatLoadPromise) return simpleheatLoadPromise;

  simpleheatLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(SIMPLEHEAT_SCRIPT_ID);
    const handleLoad = () => resolve(window.simpleheat || null);
    const handleError = () => reject(new Error('Impossible de charger simpleheat'));

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SIMPLEHEAT_SCRIPT_ID;
    script.src = SIMPLEHEAT_SRC;
    script.async = true;
    script.onload = handleLoad;
    script.onerror = handleError;
    document.body.appendChild(script);
  });

  return simpleheatLoadPromise;
};

const EventExplorer = ({ 
  data = [], 
  matchIds, 
  loading = false, 
  filters, 
  playersList = [], 
  selectedSequence,
  isSequenceMode = false,
  onPlayVideo,
  isVideoLoading = false
}) => {
  const [generatingEventId, setGeneratingEventId] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [pitchView, setPitchView] = useState('full');
  const [orientation, setOrientation] = useState('horizontal');
  const [heatmapMode, setHeatmapMode] = useState('off');
  const [pitchStyle, setPitchStyle] = useState('standard');
  const [showEvents, setShowEvents] = useState(true);
  const [liveFluxPage, setLiveFluxPage] = useState(1);
  const [selectionBox, setSelectionBox] = useState(EMPTY_SELECTION_BOX);
  const heatmapCanvasRef = useRef(null);
  const heatmapInstanceRef = useRef(null);
  const [playlist, setPlaylist] = useState([]);
  const [playlistIndex, setPlaylistIndex] = useState(-1);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadMix = async () => {
    if (liveEventRows.length === 0) return;
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
          min_clip_gap: videoCfg.min_clip_gap
        })
      });

      if (!response.ok) throw new Error('Erreur lors du mixage vidéo');

      // Récupération du fichier binaire
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OptaVision_Mix_${matchId}_${eventIds.length}_clips.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("❌ Erreur téléchargement mix:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleGenerateClip = async (e, event) => {
    e.stopPropagation();
    const eventId = event.opta_id || event.id;
    const matchId = event.match_id || event.matchId || matchIds?.[0];
    
    if (!matchId || !eventId) return;

    setGeneratingEventId(eventId);
    try {
      // Récupération de la config globale (buffers FFmpeg)
      const savedConfig = localStorage.getItem('optavision_video_config');
      const videoCfg = savedConfig ? JSON.parse(savedConfig) : { before_buffer: 3, after_buffer: 5, min_clip_gap: 0.5 };

      const response = await fetch(`${API_BASE_URL}/api/optavision/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          match_id: matchId, 
          event_id: eventId,
          before_buffer: videoCfg.before_buffer,
          after_buffer: videoCfg.after_buffer,
          min_clip_gap: videoCfg.min_clip_gap
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Erreur lancement generation video");
      }
      if (data.job_id) {
        const videoUrl = await pollVideoJob(data.job_id);
        setActiveVideoUrl(videoUrl);
      } else if (data.video_url) {
        setActiveVideoUrl(data.video_url);
      } else {
        throw new Error(data.detail || "Aucune URL video retournee par l'API");
      }
    } catch (err) {
      console.error("❌ Erreur génération clip:", err);
      alert(err.message || "Erreur generation video");
    } finally {
      setGeneratingEventId(null);
    }
  };

  const handlePlayFocusedVideo = async (event) => {
    if (!event) return;
    try {
      if (onPlayVideo) {
        const videoUrl = await onPlayVideo(event);
        if (videoUrl) setActiveVideoUrl(videoUrl);
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

  const displayData = useMemo(() => {
    if (isSequenceMode) {
      if (!selectedSequence || !data?.sequences) return [];
      return data.sequences
        .filter(seq => seq.seq_uuid === selectedSequence || seq.sub_sequence_id === selectedSequence)
        .map(seq => ({
          ...seq,
          events: (seq.events || []).filter(hasRenderablePlayerId)
        }))
        .filter(seq => seq.events.length > 0);
    }
    const baseData = Array.isArray(data) ? data : (data?.items || []);
    let filtered = baseData.filter(e => hasRenderablePlayerId(e) && e.type !== 'Out' && e.type_id !== 5);

    const { localTeam, localOpponent } = filters || {};
    if (localTeam && localTeam !== 'ALL') {
      filtered = filtered.filter(e => String(e.team_id) === String(localTeam));
    }
    if (localOpponent && localOpponent !== 'ALL') {
      filtered = filtered.filter(e => String(e.team_id) !== String(localOpponent));
    }
    return filtered;
  }, [data, filters, isSequenceMode, selectedSequence]);

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

  const selectedPitchStyle = PITCH_STYLE_CONFIGS[pitchStyle] || PITCH_STYLE_CONFIGS.standard;
  const pitchViewBox = useMemo(() => getPitchViewBox(orientation, pitchView), [orientation, pitchView]);
  const pitchViewBoxString = useMemo(() => toViewBoxString(pitchViewBox), [pitchViewBox]);
  const pitchViewBoxCenter = useMemo(() => ({
    x: pitchViewBox.x + pitchViewBox.width / 2,
    y: pitchViewBox.y + pitchViewBox.height / 2
  }), [pitchViewBox]);
  const projectPoint = useCallback((x, y) => {
    const numericX = Number(x);
    const numericY = Number(y);
    if (!Number.isFinite(numericX) || !Number.isFinite(numericY)) return null;

    if (orientation === 'vertical') {
      return {
        x: PITCH_DIMENSIONS.height - (numericY / 100) * PITCH_DIMENSIONS.height,
        y: PITCH_DIMENSIONS.width - (numericX / 100) * PITCH_DIMENSIONS.width
      };
    }

    return {
      x: (numericX / 100) * PITCH_DIMENSIONS.width,
      y: ((100 - numericY) / 100) * PITCH_DIMENSIONS.height
    };
  }, [orientation]);

  const getPitchSvgPoint = useCallback((event) => {
    const svg = event.currentTarget;
    if (!svg?.createSVGPoint) return null;

    const matrix = svg.getScreenCTM();
    if (!matrix) return null;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const svgPoint = point.matrixTransform(matrix.inverse());
    return {
      x: clamp(svgPoint.x, pitchViewBox.x, pitchViewBox.x + pitchViewBox.width),
      y: clamp(svgPoint.y, pitchViewBox.y, pitchViewBox.y + pitchViewBox.height)
    };
  }, [pitchViewBox]);

  const handlePitchMouseDown = useCallback((event) => {
    if (event.button !== 0 || loading) return;
    const point = getPitchSvgPoint(event);
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
  }, [getPitchSvgPoint, loading]);

  const handlePitchMouseMove = useCallback((event) => {
    const point = getPitchSvgPoint(event);
    if (!point) return;

    setSelectionBox(prev => {
      if (!prev.isDrawing) return prev;
      return { ...prev, endX: point.x, endY: point.y };
    });
  }, [getPitchSvgPoint]);

  const handlePitchMouseUp = useCallback((event) => {
    const point = getPitchSvgPoint(event);

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
  }, [getPitchSvgPoint]);

  const selectionBounds = useMemo(() => {
    const { startX, startY, endX, endY } = selectionBox;
    if (![startX, startY, endX, endY].every(Number.isFinite)) return null;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    if (width < MIN_SELECTION_SIZE || height < MIN_SELECTION_SIZE) return null;
    return {
      x,
      y,
      width,
      height,
      xMax: x + width,
      yMax: y + height
    };
  }, [selectionBox]);

  const spatialDisplayData = useMemo(() => {
    if (!selectionBounds) return displayData;

    const isInsideSelection = (event) => {
      const point = projectPoint(event.x, event.y);
      return point
        && point.x >= selectionBounds.x
        && point.x <= selectionBounds.xMax
        && point.y >= selectionBounds.y
        && point.y <= selectionBounds.yMax;
    };

    if (actualSequenceMode) {
      return displayData
        .map(seq => ({
          ...seq,
          events: (seq.events || []).filter(isInsideSelection)
        }))
        .filter(seq => seq.events.length > 0);
    }

    return displayData.filter(isInsideSelection);
  }, [actualSequenceMode, displayData, projectPoint, selectionBounds]);

  const mapEventCount = countDisplayEvents(spatialDisplayData, actualSequenceMode);
  const selectedSpatialEventCount = selectionBounds ? mapEventCount : 0;
  const isEventLimitExceeded = mapEventCount > 1000;
  const shouldShowEvents = showEvents && !isEventLimitExceeded;
  const pitchDisplayData = shouldShowEvents
    ? spatialDisplayData
    : (actualSequenceMode ? spatialDisplayData.map(seq => ({ ...seq, events: [] })) : []);
  const heatmapEvents = useMemo(() => {
    const events = actualSequenceMode
      ? spatialDisplayData.flatMap(seq => seq.events || [])
      : spatialDisplayData;
    return events.filter(hasRenderablePlayerId);
  }, [actualSequenceMode, spatialDisplayData]);
  const liveEventRows = useMemo(() => (
    (actualSequenceMode ? spatialDisplayData[0]?.events : spatialDisplayData) || []
  ), [actualSequenceMode, spatialDisplayData]);
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
    setPlaylist([]);
    setPlaylistIndex(-1);
  }, [matchIds]);

  React.useEffect(() => {
    if (playlistIndex >= 0 && playlistIndex < playlist.length) {
      const playNext = async () => {
        setGeneratingEventId('batch');
        await handlePlayFocusedVideo(playlist[playlistIndex]);
        setGeneratingEventId(null);
      };
      playNext();
    }
  }, [playlistIndex, playlist]);

  React.useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;

    const clearHeatmap = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
      heatmapInstanceRef.current?.clear?.();
    };

    if (heatmapMode === 'off' || !heatmapEvents.length) {
      clearHeatmap();
      return;
    }

    let cancelled = false;

    ensureSimpleheat()
      .then((simpleheat) => {
        if (cancelled || !simpleheat || !heatmapCanvasRef.current) return;

        const activeCanvas = heatmapCanvasRef.current;
        const rect = activeCanvas.getBoundingClientRect();
        const cssWidth = Math.max(1, Math.round(rect.width));
        const cssHeight = Math.max(1, Math.round(rect.height));
        const pixelRatio = window.devicePixelRatio || 1;

        activeCanvas.width = Math.round(cssWidth * pixelRatio);
        activeCanvas.height = Math.round(cssHeight * pixelRatio);
        activeCanvas.style.width = `${cssWidth}px`;
        activeCanvas.style.height = `${cssHeight}px`;

        const scale = Math.min(cssWidth / pitchViewBox.width, cssHeight / pitchViewBox.height);
        const offsetX = (cssWidth - pitchViewBox.width * scale) / 2;
        const offsetY = (cssHeight - pitchViewBox.height * scale) / 2;
        const points = [];

        const pushCanvasPoint = (pitchPoint) => {
          if (!pitchPoint) return;
          const canvasX = (pitchPoint.x - pitchViewBox.x) * scale + offsetX;
          const canvasY = (pitchPoint.y - pitchViewBox.y) * scale + offsetY;
          if (
            Number.isFinite(canvasX)
            && Number.isFinite(canvasY)
            && canvasX >= 0
            && canvasX <= cssWidth
            && canvasY >= 0
            && canvasY <= cssHeight
          ) {
            points.push([canvasX * pixelRatio, canvasY * pixelRatio, 1]);
          }
        };

        heatmapEvents.forEach(event => {
          if (heatmapMode === 'start' || heatmapMode === 'both') {
            pushCanvasPoint(projectPoint(event.x, event.y));
          }
          if (heatmapMode === 'end' || heatmapMode === 'both') {
            const endCoords = getEndCoordinates(event);
            if (endCoords) pushCanvasPoint(projectPoint(endCoords.x, endCoords.y));
          }
        });

        const ctx = activeCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
        if (!points.length) return;

        heatmapInstanceRef.current = simpleheat(activeCanvas);
        const heat = heatmapInstanceRef.current;
        heat.clear();
        heat.data(points);
        const radius = Math.max(14 * pixelRatio, Math.min(activeCanvas.width, activeCanvas.height) / 18);
        heat.radius(radius, radius / 2.5);
        heat.max(5);
        heat.draw();
      })
      .catch((error) => {
        console.error('Erreur heatmap simpleheat:', error);
        clearHeatmap();
      });

    return () => {
      cancelled = true;
    };
  }, [heatmapMode, heatmapEvents, pitchViewBox, projectPoint, getEndCoordinates]);
  React.useEffect(() => () => {
    heatmapInstanceRef.current?.clear?.();
    heatmapInstanceRef.current = null;
  }, []);

  const renderLiveFlux = (className = "h-full bg-[#1a1a1a] border border-white/10 rounded-[4px] flex flex-col overflow-hidden") => (
    <div className={className}>
      <div className="px-6 py-4 border-b border-white/10 bg-[#2d2d2d] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-[#3cffd0] animate-pulse'}`} />
          <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">Flux Live Analyst</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedSpatialEventCount > 0 && (
            <button
              type="button"
              disabled={generatingEventId === 'batch'}
              onClick={() => {
                if (liveEventRows.length > 0) {
                  setPlaylist(liveEventRows);
                  setPlaylistIndex(0);
                }
              }}
              className={`px-3 py-1.5 rounded-[2px] verge-label-mono text-[9px] font-black uppercase flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(60,255,208,0.3)] ${generatingEventId === 'batch' ? 'bg-[#3cffd0]/20 text-[#3cffd0] cursor-wait' : 'bg-[#3cffd0] hover:bg-[#2edeb4] text-black cursor-pointer'}`}
              title="Lancer la lecture en rafale"
            >
              {generatingEventId === 'batch' ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Play size={10} fill="currentColor" />
              )}
              Rafale ({selectedSpatialEventCount})
            </button>
          )}
          {selectedSpatialEventCount > 0 && (
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadMix}
              className={`px-3 py-1.5 rounded-[2px] verge-label-mono text-[9px] font-black uppercase flex items-center gap-2 transition-all border border-white/10 ${isDownloading ? 'bg-white/10 text-[#949494] cursor-wait' : 'bg-black/40 hover:bg-white/10 text-white cursor-pointer'}`}
              title="Télécharger le mixage physique (MP4)"
            >
              {isDownloading ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Download size={10} />
              )}
              Mixage
            </button>
          )}
          <span className="verge-label-mono text-[9px] text-[#949494] bg-white/5 px-3 py-1.5 rounded-[2px] border border-white/5">
            {liveEventRows.length.toLocaleString()} SELECTED
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto styled-scrollbar-verge bg-black/20">
        {!loading && liveEventRows.length > 0 ? (
          paginatedLiveEventRows.map((e, i) => {
            const parsedMetrics = parseAdvancedMetrics(e);
            const typeLabel = parsedMetrics?.type_name || e.type_name || e.type_id;
            const typeKey = String(typeLabel || '').replace(/\s+/g, '').toLowerCase();
            const typeId = String(parsedMetrics?.type_id ?? e.type_id ?? '');
            const getPlayerName = (id) => {
              if (!id) return null;
              return globalPlayerMap[String(id)] || String(id);
            };
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
              <div
                key={e.opta_id || e.id || `${currentLiveFluxPage}-${i}`}
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
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="verge-label-mono text-[10px] text-white uppercase font-black tracking-tight truncate">{typeLabel}</span>
                      {isProgressive && (
                        <span className="verge-label-mono text-[7px] px-1.5 py-0.5 rounded-[2px] bg-[#3cffd0] text-black font-black uppercase">Prog</span>
                      )}
                    </div>
                    <div className="verge-label-mono text-[9px] text-[#949494] group-hover:text-white transition-colors truncate mt-1">
                      {e.playerName || globalPlayerMap[e.player_id] || e.player_id}
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
                          {duelWon ? 'Gagne' : 'Perdu'}
                        </span>
                      )}
                      {isShotLike && shotQuality && (
                        <span className="verge-label-mono text-[8px] text-[#ff4d4d] font-black truncate">{shotQuality}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(evt) => handleGenerateClip(evt, e)}
                  disabled={generatingEventId === (e.opta_id || e.id)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all shrink-0 ${generatingEventId === (e.opta_id || e.id) ? 'bg-[#3cffd0]/20 border-[#3cffd0]' : 'border-white/10 hover:border-[#3cffd0] hover:bg-[#3cffd0] hover:text-black text-[#949494]'}`}
                >
                  {generatingEventId === (e.opta_id || e.id) ? (
                    <Loader2 size={12} className="animate-spin text-[#3cffd0]" />
                  ) : (
                    <Play size={12} fill="currentColor" />
                  )}
                </button>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center opacity-10"><Database size={32} /></div>
        )}
      </div>
      {liveEventRows.length > LIVE_FLUX_PAGE_SIZE && (
        <div className="px-5 py-3 border-t border-white/10 bg-[#131313] flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={currentLiveFluxPage <= 1}
            onClick={() => setLiveFluxPage(page => Math.max(1, page - 1))}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-[2px] verge-label-mono text-[9px] text-white font-black uppercase tracking-widest transition-all"
          >
            Prec
          </button>
          <div className="verge-label-mono text-[8px] text-[#949494] font-black tracking-widest">
            PAGE <span className="text-[#3cffd0]">{currentLiveFluxPage}</span> / {liveFluxTotalPages}
            <span className="ml-2 text-white/40">{liveEventRows.length.toLocaleString()} EVENTS</span>
          </div>
          <button
            type="button"
            disabled={currentLiveFluxPage >= liveFluxTotalPages}
            onClick={() => setLiveFluxPage(page => Math.min(liveFluxTotalPages, page + 1))}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-[2px] verge-label-mono text-[9px] text-white font-black uppercase tracking-widest transition-all"
          >
            Suiv
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-full gap-4 lg:gap-6 animate-in fade-in zoom-in-95 duration-500 overflow-hidden p-0 bg-[#050505]">
      
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

          <PitchSVG
            loading={loading}
            hasData={spatialDisplayData.length > 0 || isSequenceMode}
            orientation={orientation}
            pitchStyleConfig={selectedPitchStyle}
            viewBox={pitchViewBoxString}
            canvasRef={heatmapCanvasRef}
            heatmapVisible={heatmapMode !== 'off' && heatmapEvents.length > 0}
            onMouseDown={handlePitchMouseDown}
            onMouseMove={handlePitchMouseMove}
            onMouseUp={handlePitchMouseUp}
            className="cursor-crosshair"
            onClearFocus={() => {
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
          </PitchSVG>

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
      {/* MODALE LECTEUR VIDÉO (GLASSMORPHISM) */}
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
              {/* HEADER MODALE */}
              <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">Live Video Feed</span>
                </div>
                <button 
                  onClick={() => {
                    setActiveVideoUrl(null);
                    setPlaylist([]);
                    setPlaylistIndex(-1);
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500 rounded-full text-white transition-all group"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* LECTEUR VIDÉO */}
              <div className="aspect-video bg-black flex items-center justify-center relative">
                <video 
                  src={activeVideoUrl} 
                  controls 
                  autoPlay 
                  onEnded={() => {
                    if (playlistIndex >= 0 && playlistIndex < playlist.length - 1) {
                      setPlaylistIndex(prev => prev + 1);
                    }
                  }}
                  className="w-full h-full object-contain"
                />
                
                {playlist.length > 0 && (
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none z-30">
                    <button
                      onClick={() => setPlaylistIndex(prev => Math.max(0, prev - 1))}
                      disabled={playlistIndex === 0}
                      className="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-[#3cffd0] hover:text-black text-white rounded-full border border-white/10 pointer-events-auto transition-all disabled:opacity-0 disabled:pointer-events-none group"
                    >
                      <ChevronLeft size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => setPlaylistIndex(prev => Math.min(playlist.length - 1, prev + 1))}
                      disabled={playlistIndex === playlist.length - 1}
                      className="w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-[#3cffd0] hover:text-black text-white rounded-full border border-white/10 pointer-events-auto transition-all disabled:opacity-0 disabled:pointer-events-none group"
                    >
                      <ChevronRight size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                )}

                {playlist.length > 0 && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-black/80 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-4 z-20 shadow-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#3cffd0] rounded-full animate-pulse" />
                      <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">
                        RAFALE ACTIVE
                      </span>
                    </div>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <span className="verge-label-mono text-[10px] text-[#3cffd0] font-black uppercase">
                      CLIP {playlistIndex + 1} / {playlist.length}
                    </span>
                    <div className="w-[1px] h-4 bg-white/10" />
                    <div className="flex gap-1">
                      {playlist.slice(0, 20).map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`w-1.5 h-1.5 rounded-full transition-all ${idx === playlistIndex ? 'bg-[#3cffd0] scale-125' : 'bg-white/20'}`} 
                        />
                      ))}
                      {playlist.length > 20 && <span className="text-white/40 text-[8px] ml-1">...</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER MODALE */}
              <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
                <span className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest">
                  Powered by OptaVision R2 Zero-Disk Engine
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default EventExplorer;
