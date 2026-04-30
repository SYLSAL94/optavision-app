import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  ChevronRight, 
  ChevronDown,
  BarChart2, 
  User, 
  Target, 
  Activity, 
  Database,
  ArrowUpDown,
  Filter,
  Layers,
  ShieldAlert,
  Play,
  Loader2,
  X
} from 'lucide-react';

import { API_BASE_URL } from '../../config';
import { PitchSVG } from './PitchSVG';
import { BuildUpLayer } from './BuildUpLayer';
import { ExplorationLayer } from './ExplorationLayer';
import { EventTooltip } from './EventTooltip';

const ACTION_TYPES = [
  { id: 'ALL', label: 'Toutes les actions', icon: <Layers size={14} />, color: '#ffffff' },
  { id: 'Pass', label: 'Passes', icon: <Activity size={14} />, color: '#3cffd0' },
  { id: 'BallReceipt', label: 'Réceptions', icon: <ChevronRight size={14} />, color: '#ffd03c' },
  { id: 'Shot', label: 'Tirs', icon: <Target size={14} />, color: '#ff4d4d' },
  { id: 'TakeOn', label: 'Dribbles (TakeOn)', icon: <Layers size={14} />, color: '#5200ff' },
  { id: 'Interception', label: 'Interceptions', icon: <Database size={14} />, color: '#ffd03c' },
  { id: 'Tackle', label: 'Tacles', icon: <ShieldAlert size={14} />, color: '#5200ff' },
];

const RankBadge = ({ rank }) => {
  if (rank === 1) return (
    <div className="w-10 h-10 bg-[#3cffd0] text-black flex items-center justify-center text-xs font-black rounded-[4px] shadow-[4px_4px_0px_rgba(60,255,208,0.2)]">
      {rank}
    </div>
  );
  if (rank <= 3) return (
    <div className="w-10 h-10 bg-[#5200ff] text-white flex items-center justify-center text-xs font-black rounded-[4px] shadow-[4px_4px_0px_rgba(82,0,255,0.2)]">
      {rank}
    </div>
  );
  return (
    <div className="w-10 h-10 bg-[#2d2d2d] text-[#949494] flex items-center justify-center text-xs font-black rounded-[4px] border border-white/5">
      {rank}
    </div>
  );
};

const EventExplorer = ({ 
  data = [], 
  matchIds, 
  loading = false, 
  filters, 
  advancedMetricsList = [], 
  playersList = [], 
  selectedSequence,
  isSequenceMode = false,
  onPlayVideo,
  isVideoLoading = false
}) => {
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const [generatingEventId, setGeneratingEventId] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  const handleGenerateClip = async (e, event) => {
    e.stopPropagation();
    const eventId = event.opta_id || event.id;
    const matchId = event.match_id || event.matchId || matchIds?.[0];
    
    if (!matchId || !eventId) return;

    setGeneratingEventId(eventId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, event_id: eventId })
      });
      const data = await response.json();
      if (response.ok && data.video_url) {
        setActiveVideoUrl(data.video_url);
      }
    } catch (err) {
      console.error("❌ Erreur génération clip:", err);
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
  const getEndCoordinates = (event) => {
    let metrics = event.advanced_metrics || {};
    if (typeof metrics === 'string') {
      try { metrics = JSON.parse(metrics); } catch (e) { metrics = {}; }
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
  };

  const combinedActions = useMemo(() => {
    const advanced = advancedMetricsList.map(tag => ({
      id: tag,
      label: tag.replace(/^(is_|seq_)/, '').replace(/_/g, ' ').toUpperCase(),
      icon: <Activity size={14} />,
      color: '#949494'
    }));
    return [...ACTION_TYPES, ...advanced];
  }, [advancedMetricsList]);

  const displayData = useMemo(() => {
    if (isSequenceMode) {
      if (!selectedSequence || !data?.sequences) return [];
      return data.sequences.filter(seq => seq.seq_uuid === selectedSequence || seq.sub_sequence_id === selectedSequence);
    }
    const baseData = Array.isArray(data) ? data : (data?.items || []);
    let filtered = baseData.filter(e => e.type !== 'Out' && e.type_id !== 5);

    if (selectedAction && selectedAction !== 'ALL') {
      const normalizedSelected = String(selectedAction).replace(/\s+/g, '').toLowerCase();
      filtered = filtered.filter(event => {
        if (selectedAction.startsWith('is_') || selectedAction.startsWith('seq_')) {
          let m = event.advanced_metrics;
          if (typeof m === 'string') try { m = JSON.parse(m); } catch(e) { m = {}; }
          return m?.[selectedAction] === true || m?.[selectedAction] === 'true';
        }
        const eventType = event.type_name || event.type || String(event.type_id || '');
        const normalizedEvent = String(eventType).replace(/\s+/g, '').toLowerCase();
        return normalizedEvent === normalizedSelected || String(event.type_id) === String(selectedAction);
      });
    }
    const { localTeam, localOpponent } = filters || {};
    if (localTeam && localTeam !== 'ALL') {
      filtered = filtered.filter(e => String(e.team_id) === String(localTeam));
    }
    if (localOpponent && localOpponent !== 'ALL') {
      filtered = filtered.filter(e => String(e.team_id) !== String(localOpponent));
    }
    return filtered;
  }, [data, filters, isSequenceMode, selectedSequence, selectedAction]);

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

  const playerRanking = useMemo(() => {
    if (actualSequenceMode || !displayData || displayData.length === 0) return [];
    const counts = {};
    const playerTeams = {};
    const normalizedSelected = String(selectedAction).replace(/\s+/g, '').toLowerCase();

    displayData.forEach(event => {
      let isMatch = false;
      if (selectedAction.startsWith('is_') || selectedAction.startsWith('seq_')) {
        let m = event.advanced_metrics;
        if (typeof m === 'string') try { m = JSON.parse(m); } catch(e) { m = {}; }
        isMatch = m?.[selectedAction] === true || m?.[selectedAction] === 'true';
      } else {
        const eventType = event.type_name || event.type || String(event.type_id || '');
        const normalizedEvent = String(eventType).replace(/\s+/g, '').toLowerCase();
        isMatch = normalizedEvent === normalizedSelected || String(event.type_id) === String(selectedAction);
      }
      if (isMatch) {
        const playerName = event.playerName || event.player_id;
        if (playerName && playerName !== 'N/A') {
          counts[playerName] = (counts[playerName] || 0) + 1;
          playerTeams[playerName] = event.teamName || 'Unknown Team';
        }
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, team: playerTeams[name] }))
      .sort((a, b) => sortOrder === 'desc' ? b.count - a.count : a.count - b.count)
      .map(p => ({ ...p, count: typeof p.count === 'number' && !Number.isInteger(p.count) ? p.count.toFixed(3) : p.count }));
  }, [displayData, selectedAction, sortOrder, actualSequenceMode]);

  const totalPages = actualSequenceMode ? 0 : Math.ceil(playerRanking.length / itemsPerPage);
  const paginatedRanking = actualSequenceMode ? [] : playerRanking.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  React.useEffect(() => { setPage(1); }, [selectedAction, sortOrder, displayData]);

  return (
    <div className="flex h-full w-full gap-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-[4px] p-8 flex flex-col gap-6 relative overflow-hidden group flex-1">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3cffd0]/2 to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-6">
            <div className="flex items-center gap-6">
              <div className="w-1 h-8 bg-[#3cffd0]" />
              <div>
                <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Visualisation Spatiale</h3>
                <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.3em] font-bold mt-1">
                  {selectedAction} ANALYSIS ({displayData.length} SELECTED)
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

          <PitchSVG
            loading={loading}
            hasData={displayData.length > 0 || isSequenceMode}
            onClearFocus={() => {
              setFocusedEvent(null);
              setFocusedEventId(null);
              setHoveredEvent(null);
            }}
          >
            {isSequenceMode ? (
              <>
                <BuildUpLayer 
                  displayData={displayData} 
                  focusedEventId={activeFocusedEventId} 
                  getEndCoordinates={getEndCoordinates}
                  setHoveredEvent={setHoveredEvent}
                  setMousePos={setMousePos}
                  selectedSequence={selectedSequence}
                  setFocusedEvent={setFocusedEvent}
                  setFocusedEventId={setFocusedEventId}
                />
                {!selectedSequence && (
                  <g>
                    <text x="52.5" y="30" textAnchor="middle" fill="#3cffd0" fontSize="2" fontWeight="900" className="animate-pulse uppercase tracking-widest">
                      AUCUNE SÉQUENCE SÉLECTIONNÉE
                    </text>
                    <text x="52.5" y="34" textAnchor="middle" fill="#949494" fontSize="1.2" className="uppercase tracking-wider">
                      Veuillez appliquer un filtre dans le panneau latéral gauche
                    </text>
                  </g>
                )}
              </>
            ) : (
              <ExplorationLayer 
                displayData={displayData} 
                focusedEventId={activeFocusedEventId} 
                getEndCoordinates={getEndCoordinates}
                setHoveredEvent={setHoveredEvent}
                setMousePos={setMousePos}
                setFocusedEvent={setFocusedEvent}
                setFocusedEventId={setFocusedEventId}
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

        {/* FLUX LIVE ANALYST */}
        <div className="h-56 bg-[#1a1a1a] border border-white/10 rounded-[4px] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-[#2d2d2d] flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-[#3cffd0] animate-pulse'}`} />
               <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">Flux Live Analyst</span>
             </div>
             <span className="verge-label-mono text-[9px] text-[#949494] bg-white/5 px-3 py-1 rounded-[2px] border border-white/5">
                {displayData.length.toLocaleString()} SELECTED
              </span>
          </div>
          <div className="flex-1 overflow-y-auto styled-scrollbar-verge bg-black/20">
             {!loading && (actualSequenceMode ? (displayData[0]?.events || []) : displayData).length > 0 ? (
               ((actualSequenceMode ? displayData[0]?.events : displayData) || []).slice(0, 100).map((e, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      const eventId = e.opta_id ?? e.id;
                      const nextFocused = eventId === activeFocusedEventId ? null : e;
                      setFocusedEvent(nextFocused);
                      setFocusedEventId(nextFocused ? eventId : null);
                      setHoveredEvent(nextFocused);
                    }}
                    className={`flex items-center justify-between py-2 border-b border-white/[0.03] hover:bg-[#3cffd0]/5 transition-colors px-6 group cursor-pointer ${(e.opta_id ?? e.id) === activeFocusedEventId ? 'bg-[#3cffd0]/10 border-l-2 border-l-[#3cffd0]' : ''}`}
                  >
                   <div className="flex items-center gap-6 flex-1">
                     <span className="verge-label-mono text-[10px] text-[#3cffd0] font-black w-20 shrink-0">
                       {(e.cumulative_mins ?? 0).toFixed(1)}'
                     </span>
                     <span className="verge-label-mono text-[10px] text-white uppercase font-black tracking-tight w-28 shrink-0 truncate">
                       {e.type_name || e.type || e.type_id}
                     </span>
                     <span className="verge-label-mono text-[10px] text-[#949494] group-hover:text-white transition-colors w-32 shrink-0 truncate">
                       {e.playerName || globalPlayerMap[e.player_id] || e.player_id}
                     </span>
                   </div>
                   <div className="flex items-center gap-4 shrink-0">
                      <div className="verge-label-mono text-[8px] text-[#2d2d2d] group-hover:text-[#3cffd0] transition-colors font-black">ID:{e.opta_id || e.id}</div>
                      <button 
                        onClick={(evt) => handleGenerateClip(evt, e)}
                        disabled={generatingEventId === (e.opta_id || e.id)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all ${generatingEventId === (e.opta_id || e.id) ? 'bg-[#3cffd0]/20 border-[#3cffd0]' : 'border-white/10 hover:border-[#3cffd0] hover:bg-[#3cffd0] hover:text-black text-[#949494]'}`}
                      >
                        {generatingEventId === (e.opta_id || e.id) ? (
                          <Loader2 size={12} className="animate-spin text-[#3cffd0]" />
                        ) : (
                          <Play size={12} fill="currentColor" />
                        )}
                      </button>
                    </div>
                 </div>
               ))
             ) : (
               <div className="h-full flex items-center justify-center opacity-10"><Database size={32} /></div>
             )}
          </div>
        </div>
      </div>

      {!isSequenceMode && (
        <div className="w-[450px] flex flex-col gap-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
          <div className="p-8 border-b border-white/10 bg-[#2d2d2d]">
            <div className="flex items-center gap-4 mb-8">
              <Trophy className="text-[#3cffd0]" size={20} /><h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Ranking Performance</h3>
            </div>
            <div className="relative">
              <button onClick={() => setIsSelectOpen(!isSelectOpen)} className="w-full flex items-center justify-between px-6 py-4 bg-[#131313] border border-white/10 rounded-[2px] verge-label-mono text-[10px] text-white font-black hover:border-[#3cffd0]/50 transition-all">
                <div className="flex items-center gap-4">
                  {combinedActions.find(a => a.id === selectedAction)?.icon}
                  <span className="uppercase tracking-widest">{combinedActions.find(a => a.id === selectedAction)?.label}</span>
                </div>
                <ChevronDown className={`text-[#949494] transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} size={16} />
              </button>
              <AnimatePresence>
                {isSelectOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-[2px] shadow-2xl z-[100] max-h-[300px] overflow-y-auto styled-scrollbar-verge">
                    {combinedActions.map(type => (
                      <button 
                        key={type.id} 
                        onClick={() => { 
                          setSelectedAction(type.id); 
                          setIsSelectOpen(false);
                        }} 
                        className={`w-full flex items-center gap-4 px-6 py-4 verge-label-mono text-[10px] font-black uppercase tracking-widest text-left transition-all border-b border-white/[0.03] ${selectedAction === type.id ? 'bg-[#3cffd0] text-black' : 'text-[#949494] hover:bg-white/5 hover:text-white'}`}
                      >
                        {type.icon}<span className="truncate">{type.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col bg-[#131313]">
            <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-black/40">
               <span className="verge-label-mono text-[9px] text-[#949494] font-black uppercase tracking-widest">Leaderboard</span>
               <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="flex items-center gap-2 text-[#949494] hover:text-[#3cffd0] transition-colors">
                  <ArrowUpDown size={12} /><span className="verge-label-mono text-[8px] uppercase font-black">Sort</span>
               </button>
            </div>
            <div className="flex-1 overflow-y-auto styled-scrollbar-verge divide-y divide-white/[0.03] flex flex-col">
               {paginatedRanking.length > 0 ? (
                 <AnimatePresence mode="popLayout">
                    {paginatedRanking.map((player, index) => (
                      <motion.div key={player.name} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="group flex items-center gap-6 p-6 hover:bg-[#3cffd0]/5 transition-all cursor-pointer relative">
                        <RankBadge rank={(page - 1) * itemsPerPage + index + 1} />
                        <div className="flex-1 min-w-0">
                           <div className="verge-label-mono text-[13px] text-white font-black group-hover:text-[#3cffd0] transition-colors truncate uppercase tracking-tight">{player.name}</div>
                           <div className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest mt-1 opacity-60">{player.team}</div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                           <span className="verge-label-mono text-3xl font-black text-[#3cffd0] leading-none tracking-tighter">{player.count}</span>
                        </div>
                      </motion.div>
                    ))}
                 </AnimatePresence>
               ) : <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-20"><BarChart2 size={48} /><div className="verge-label-mono text-[11px] font-black uppercase tracking-[0.3em]">No Data Profile</div></div>}
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-white/10 bg-[#131313] flex items-center justify-between">
                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-[2px] verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">Prev</button>
                <div className="verge-label-mono text-[9px] text-[#949494] font-black tracking-widest">PAGE <span className="text-[#3cffd0]">{page}</span> / {totalPages}</div>
                <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-[2px] verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">Next</button>
              </div>
            )}
          </div>
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
                  onClick={() => setActiveVideoUrl(null)}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500 rounded-full text-white transition-all group"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {/* LECTEUR VIDÉO */}
              <div className="aspect-video bg-black flex items-center justify-center">
                <video 
                  src={activeVideoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain"
                />
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
