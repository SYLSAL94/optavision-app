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
  Layers
} from 'lucide-react';
import { FootballPitch } from './FootballPitch';

const ACTION_TYPES = [
  { id: 'Pass', label: 'Passes', icon: <Activity size={14} />, color: '#3cffd0' },
  { id: 'BallReceipt', label: 'Réceptions', icon: <ChevronRight size={14} />, color: '#ffd03c' },
  { id: 'Shot', label: 'Tirs', icon: <Target size={14} />, color: '#ff4d4d' },
  { id: 'Duel', label: 'Duels', icon: <Layers size={14} />, color: '#5200ff' },
  { id: 'Interception', label: 'Interceptions', icon: <Database size={14} />, color: '#ffd03c' },
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

const EventExplorer = ({ data = [], matchId, loading = false, filters, advancedMetricsList = [], playersList = [] }) => {
  const [selectedAction, setSelectedAction] = useState('Pass');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // États pour le Tooltip Premium
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });



  const combinedActions = useMemo(() => {
    const advanced = advancedMetricsList.map(tag => ({
      id: tag,
      label: tag.replace(/^(is_|seq_)/, '').replace(/_/g, ' ').toUpperCase(),
      icon: <Activity size={14} />,
      color: '#949494'
    }));
    return [...ACTION_TYPES, ...advanced];
  }, [advancedMetricsList]);

  // LE FILTRAGE EST DÉSORMAIS SERVEUR-SIDE (Dette technique purgée)
  // Ajout du filtre de purge visuelle anti-pollution (Out events)
  // LE FILTRAGE EST DÉSORMAIS SERVEUR-SIDE (Dette technique purgée)
  // Ajout du filtre de purge visuelle anti-pollution (Out events)
  // LE FILTRAGE EST DÉSORMAIS SERVEUR-SIDE (Dette technique purgée)
  // Ajout du filtre de purge visuelle anti-pollution (Out events)
  const displayData = useMemo(() => {
    let filtered = data.filter(e => e.type !== 'Out' && e.type_id !== 5);
    
    const { localTeam, localOpponent } = filters || {};
    
    if (localTeam && localTeam !== 'ALL') {
      filtered = filtered.filter(e => e.team_id === localTeam);
    }
    
    if (localOpponent && localOpponent !== 'ALL') {
      // Logique Adversaire : On affiche les actions de l'autre équipe
      filtered = filtered.filter(e => e.team_id !== localOpponent);
    }
    
    return filtered;
  }, [data, filters]);



  // DICTIONNAIRES DE MAPPING DYNAMIQUE (Auto-résolution des IDs en noms explicites)
  const globalPlayerMap = useMemo(() => {
    const map = {};
    if (playersList && Array.isArray(playersList)) {
      playersList.forEach(p => { 
        map[String(p.id || p.player_id)] = p.name || p.shortName || p.id; 
      });
    }
    return map;
  }, [playersList]);

  const matchMap = useMemo(() => {
    const map = {};
    data.forEach(e => {
      const mId = e.match_id || e.matchId;
      if (mId && e.matchName) map[mId] = e.matchName;
    });
    return map;
  }, [data]);



  const teamMap = useMemo(() => {
    const map = {};
    data.forEach(e => {
      if (e.team_id) map[e.team_id] = e.teamName || `Team ${e.team_id}`;
    });
    return map;
  }, [data]);

  const teamList = Object.keys(teamMap);

  // Calcul du classement des joueurs basé sur l'action sélectionnée dans le sélecteur DROIT
  const playerRanking = useMemo(() => {
    if (!displayData || displayData.length === 0) return [];

    const counts = {};
    const playerTeams = {};

    displayData.forEach(event => {
      let isMatch = false;
      
      if (selectedAction.startsWith('is_') || selectedAction.startsWith('seq_')) {
        let parsedMetrics = event.advanced_metrics;
        if (typeof parsedMetrics === 'string') {
          try { parsedMetrics = JSON.parse(parsedMetrics); } catch(e) { parsedMetrics = {}; }
        }
        isMatch = parsedMetrics?.[selectedAction] === true || parsedMetrics?.[selectedAction] === 'true';
      } else {
        isMatch = event.type === selectedAction || event.type_id === selectedAction;
      }

      if (isMatch) {
        const playerName = event.playerName || 'Unknown Player';
        counts[playerName] = (counts[playerName] || 0) + 1;
        playerTeams[playerName] = event.teamName || 'Unknown Team';
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        team: playerTeams[name],
      }))
      .sort((a, b) => sortOrder === 'desc' ? b.count - a.count : a.count - b.count);
  }, [displayData, selectedAction, sortOrder]);


  // Reset de la pagination en cas de changement de filtre
  React.useEffect(() => {
    setPage(1);
  }, [selectedAction, sortOrder, displayData]);

  const totalPages = Math.ceil(playerRanking.length / itemsPerPage);
  const paginatedRanking = playerRanking.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="flex h-full w-full gap-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      
      {/* ZONE CENTRALE : TERRAIN TACTIQUE */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-[4px] p-8 flex flex-col gap-6 relative overflow-hidden group flex-1">
          <div className="absolute inset-0 bg-gradient-to-b from-[#3cffd0]/2 to-transparent pointer-events-none" />
          
          {/* Corner Markers (Scouting Style) */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/5 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-white/5 pointer-events-none" />

          <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-6">
            <div className="flex items-center gap-6">
              <div className="w-1 h-8 bg-[#3cffd0]" />
              <div>
                <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Visualisation Spatiale</h3>
                <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.3em] font-bold mt-1">
                  Aperçu tactique des {selectedAction}s ({displayData.length} sélectionnés)
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-5 py-2.5 bg-black border border-white/10 rounded-[2px] verge-label-mono text-[10px] text-[#949494] font-black tracking-widest">
                SESSION: <span className="text-[#3cffd0]">{matchMap[matchId] || matchId || 'ANALYST_PRO'}</span>
              </div>
            </div>


          </div>

          {/* Terrain Svg */}
          <div className="flex-1 min-h-0 bg-black/40 rounded-[2px] border border-white/5 p-8 shadow-inner relative flex items-center justify-center overflow-hidden">
             <div className="w-full h-full max-w-[1000px] max-h-[700px] relative">
               <FootballPitch 
                  orientation="horizontal" 
                  style={{ grass: 'transparent', line: 'rgba(255,255,255,0.08)', background: 'transparent' }} 
               />
               
                {/* Affichage des points (Events) sur le terrain avec SCALING CORRECT & RENDU CONDITIONNEL */}
                {!loading && displayData.length > 0 && (
                  <svg viewBox="0 0 105 68" className="absolute inset-0 w-full h-full">
                    {displayData.slice(0, 1000).map((event, i) => {
                    const cx = (event.x / 100) * 105;
                    const cy = ((100 - event.y) / 100) * 68; // Inversion Y pour standard Opta (y=0 à droite/bas)
                    const isSuccess = event.outcome === 1;
                    const color = isSuccess ? '#3cffd0' : '#ff4d4d'; // Vert/Cyan pour succès, Rouge pour échec
                    const opacity = isSuccess ? 0.9 : 0.4;
                    let parsedMetrics = event.advanced_metrics;
                    if (typeof parsedMetrics === 'string') {
                      try { parsedMetrics = JSON.parse(parsedMetrics); } catch(e) { parsedMetrics = {}; }
                    }
                    
                    const displayType = parsedMetrics?.type_name || event.type || event.type_id;
                    const receiverId = parsedMetrics?.receiver || event.receiver || event.receiverName || 'N/A';
                    
                    // Résolution des noms explicites
                    const receiverName = globalPlayerMap[receiverId] || receiverId;
                    const currentMatchId = event.match_id || (typeof matchId === 'string' ? matchId : matchId?.match_id);
                    const finalMatchName = matchMap[currentMatchId] || currentMatchId || 'ANALYST_PRO';
                    
                    // 3. Vérification de type stricte (Mission Lead Data)
                    const endX = parsedMetrics?.end_x;
                    const endY = parsedMetrics?.end_y;
                    const hasValidEnd = typeof endX === 'number' && typeof endY === 'number';

                      return (
                        <g 
                          key={i} 
                          className="cursor-help pointer-events-auto"
                          onMouseMove={(e) => {
                            setHoveredEvent(event);
                            setMousePos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredEvent(null)}
                        >
                          {/* Trajectoire (Ligne) - Rendu Conditionnel Strict */}
                          {hasValidEnd && (
                            <line 
                              x1={cx} y1={cy} 
                              x2={(endX / 100) * 105} 
                              y2={((100 - endY) / 100) * 68} 
                              stroke={color} 
                              strokeWidth="0.2" 
                              strokeOpacity={opacity * 0.6}
                              strokeDasharray={isSuccess ? "none" : "1,1"}
                              className="animate-in fade-in duration-500"
                            />
                          )}

                          {/* Forme de l'action */}
                          {event.type === 'Shot' || event.type === 'Goal' ? (
                            <circle 
                              cx={cx} cy={cy} r="1.4" 
                              fill={color} fillOpacity={opacity}
                              stroke="white" strokeWidth="0.2"
                              className="animate-in fade-in zoom-in duration-300"
                            />
                          ) : event.type === 'Carry' ? (
                            <rect 
                              x={cx - 0.7} y={cy - 0.7} width="1.4" height="1.4"
                              fill={color} fillOpacity={opacity}
                              transform={`rotate(45, ${cx}, ${cy})`}
                              className="animate-in fade-in zoom-in duration-300"
                            />
                          ) : (
                            <circle 
                              cx={cx} cy={cy} r="0.7" 
                              fill={color} fillOpacity={opacity}
                              className="animate-in fade-in zoom-in duration-300"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                )}
             </div>
             
             {/* Tooltip Premium (HTML flottant) */}
             {hoveredEvent && (
               <div 
                 style={{ left: mousePos.x + 15, top: mousePos.y + 15 }} 
                 className="fixed z-50 w-64 p-3 rounded-lg shadow-2xl backdrop-blur-xl bg-[#131313]/95 border border-slate-700 text-white pointer-events-none text-xs flex flex-col gap-2"
               >
                 {(() => {
                    let parsed = hoveredEvent.advanced_metrics;
                    if (typeof parsed === 'string') {
                      try { parsed = JSON.parse(parsed); } catch(e) { parsed = {}; }
                    }
                    const typeName = parsed?.type_name || hoveredEvent.type || hoveredEvent.type_id;
                    const typeStr = String(typeName);
                    
                    const getPlayerName = (id) => {
                      if (!id) return null;
                      const strId = String(id);
                      const mapped = globalPlayerMap[strId];
                      return mapped?.name || mapped?.shortName || mapped || strId;
                    };

                    const opponentName = getPlayerName(parsed?.opponent_id);
                    const receiverId = parsed?.receiver || hoveredEvent.receiver || hoveredEvent.receiverName;
                    const receiverNameTooltip = getPlayerName(receiverId);
                    
                    const isProgressive = parsed?.is_progressive;
                    const duelWon = parsed?.duel_won;
                    const hasDuelResult = typeof duelWon !== 'undefined';
                    
                    const isPass = typeStr === 'Pass';
                    const isDuel = ['TakeOn', 'Tackle', 'Aerial', 'Challenge'].includes(typeStr);
                    const isShot = ['Shot', 'Goal', 'SavedShot', 'MissedShots'].includes(typeStr);

                    return (
                      <>
                        <div className="font-bold border-b border-white/10 pb-1 mb-1">
                          {hoveredEvent.playerName || 'Joueur inconnu'} <span className="text-[#949494]">| {typeStr}</span>
                        </div>
                        
                        {/* 1. Mode Passe */}
                        {isPass && (
                          <>
                            {receiverNameTooltip && receiverNameTooltip !== 'N/A' && (
                              <div className="flex justify-between">
                                <span className="text-[#949494]">Receveur :</span>
                                <span>{receiverNameTooltip}</span>
                              </div>
                            )}
                            {(parsed?.xT !== undefined && parsed?.xT !== null) && (
                              <div className="flex justify-between">
                                <span className="text-[#949494]">xT :</span>
                                <span className={parsed.xT > 0 ? "text-[#3cffd0]" : ""}>
                                  {Number(parsed.xT).toFixed(4)}
                                </span>
                              </div>
                            )}
                            {(parsed?.prog_dist !== undefined && parsed?.prog_dist !== null) && (
                              <div className="flex justify-between">
                                <span className="text-[#949494]">Progression :</span>
                                <span>{Number(parsed.prog_dist).toFixed(1)}m</span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* 2. Mode Duel/Défense */}
                        {isDuel && (
                          <>
                            {opponentName && (
                              <div className="flex justify-between">
                                <span className="text-[#949494]">Adversaire :</span>
                                <span>{opponentName}</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* 3. Mode Tir */}
                        {isShot && (
                          <>
                            {(parsed?.xG !== undefined && parsed?.xG !== null) && (
                              <div className="flex justify-between">
                                <span className="text-[#949494]">xG :</span>
                                <span>{Number(parsed.xG).toFixed(2)}</span>
                              </div>
                            )}
                            {parsed?.shot_status && (
                              <div className="flex justify-between">
                                <span className="text-[#949494]">Statut :</span>
                                <span>{parsed.shot_status}</span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Badges Dynamiques */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {isProgressive && (
                            <span className="bg-[#3cffd0] text-black px-1.5 py-0.5 rounded-[2px] font-black text-[9px] uppercase tracking-wider">
                              Progressif
                            </span>
                          )}
                          {isDuel && hasDuelResult && (
                            <span className={`px-1.5 py-0.5 rounded-[2px] font-black text-[9px] uppercase tracking-wider text-black ${duelWon ? 'bg-[#3cffd0]' : 'bg-[#ff4d4d]'}`}>
                              Duel {duelWon ? 'Gagné' : 'Perdu'}
                            </span>
                          )}
                        </div>
                      </>
                    );
                 })()}
               </div>
             )}

             {/* Overlay de message si chargement ou pas de données */}
             {(loading || data.length === 0) && (
               <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px] z-50">
                 <div className="bg-black/90 border border-white/10 p-8 rounded-[2px] text-center max-w-sm shadow-2xl">
                   <div className="w-16 h-16 bg-[#3cffd0]/10 border border-[#3cffd0]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                     {loading ? (
                       <div className="w-8 h-8 border-2 border-[#3cffd0] border-t-transparent rounded-full animate-spin" />
                     ) : (
                       <Filter className="text-[#3cffd0]" size={24} />
                     )}
                   </div>
                   <h4 className="verge-label-mono text-white text-[12px] font-black uppercase mb-2">
                     {loading ? 'Hyrdratation en cours' : 'Synchronisation prête'}
                   </h4>
                   <p className="verge-label-mono text-[9px] text-[#949494] leading-relaxed uppercase tracking-widest">
                     {loading ? 'Récupération du flux JSONB depuis le serveur...' : 'En attente de réception du flux pour le Match ID fourni.'}
                   </p>
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* LOG DES ÉVÉNEMENTS (Filtré) */}
        <div className="h-56 bg-[#1a1a1a] border border-white/10 rounded-[4px] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-[#2d2d2d] flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-[#3cffd0] animate-pulse'}`} />
               <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">
                 {loading ? 'Receiving Data...' : 'Flux Live Analyst'}
               </span>
             </div>
              <span className="verge-label-mono text-[9px] text-[#949494] bg-white/5 px-3 py-1 rounded-[2px] border border-white/5">
                {displayData.length.toLocaleString()} SELECTED
              </span>
          </div>
          <div className="flex-1 overflow-y-auto styled-scrollbar-verge bg-black/20">
             {!loading && displayData.length > 0 ? (
               displayData.slice(0, 100).map((e, i) => (
                 <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.03] hover:bg-[#3cffd0]/5 transition-colors px-6 group">
                   <div className="flex items-center gap-6">
                     <span className="verge-label-mono text-[10px] text-[#3cffd0] font-black">{e.minute || '00'}'</span>
                     <span className="verge-label-mono text-[10px] text-white uppercase font-black tracking-tight">{e.type}</span>
                     <span className="verge-label-mono text-[10px] text-[#949494] group-hover:text-white transition-colors">{e.playerName}</span>
                   </div>
                    <div className="verge-label-mono text-[8px] text-[#2d2d2d] group-hover:text-[#3cffd0] transition-colors font-black">
                      {/* NETTOYAGE : Suppression de l'affichage de l'ID brut polluant */}
                    </div>
                 </div>
               ))
             ) : (
               <div className="h-full flex items-center justify-center opacity-10">
                 <div className="text-center">
                   {loading ? (
                      <div className="verge-label-mono text-[10px] uppercase font-black tracking-[0.5em] animate-pulse">Streaming Jsonb...</div>
                   ) : (
                     <>
                       <Database size={32} className="mx-auto mb-4" />
                       <div className="verge-label-mono text-[10px] uppercase font-black tracking-widest">No Active Stream</div>
                     </>
                   )}
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* COLONNE DROITE : RANKING PERFORMANCE (Filtré) */}
      <div className="w-[450px] flex flex-col gap-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)]">
        
        {/* Header Ranking Section */}
        <div className="p-8 border-b border-white/10 bg-[#2d2d2d]">
          <div className="flex items-center gap-4 mb-8">
            <Trophy className="text-[#3cffd0]" size={20} />
            <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Ranking Performance</h3>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-4">
                <div className="w-1 h-4 bg-[#3cffd0]" />
                <span className="verge-label-mono text-[10px] font-black text-white uppercase tracking-widest">Order By</span>
             </div>
             
             {/* Custom Select - Style Scouting */}
             <div className="relative">
                <button 
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-[#131313] border border-white/10 rounded-[2px] verge-label-mono text-[10px] text-white font-black hover:border-[#3cffd0]/50 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    {combinedActions.find(a => a.id === selectedAction)?.icon}
                    <span className="uppercase tracking-widest truncate max-w-[200px]">
                      {combinedActions.find(a => a.id === selectedAction)?.label || 'SELECT METRIC...'}
                    </span>
                  </div>
                  <ChevronDown className={`text-[#949494] transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} size={16} />
                </button>

                <AnimatePresence>
                  {isSelectOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-[2px] shadow-2xl z-[100] max-h-[300px] overflow-y-auto styled-scrollbar-verge"
                    >
                      {combinedActions.map(type => (
                        <button
                          key={type.id}
                          onClick={() => {
                            setSelectedAction(type.id);
                            setIsSelectOpen(false);
                          }}
                          className={`w-full flex items-center gap-4 px-6 py-4 verge-label-mono text-[10px] font-black uppercase tracking-widest text-left transition-all border-b border-white/[0.03] ${
                            selectedAction === type.id 
                            ? 'bg-[#3cffd0] text-black' 
                            : 'text-[#949494] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {type.icon}
                          <span className="truncate">{type.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>

        {/* Ranking List Table-Style (Basé sur filteredData) */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#131313]">
          <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-black/40">
             <span className="verge-label-mono text-[9px] text-[#949494] font-black uppercase tracking-widest">Leaderboard</span>
             <button 
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-2 text-[#949494] hover:text-[#3cffd0] transition-colors"
             >
                <ArrowUpDown size={12} />
                <span className="verge-label-mono text-[8px] uppercase font-black">Sort</span>
             </button>
          </div>

          <div className="flex-1 overflow-y-auto styled-scrollbar-verge divide-y divide-white/[0.03] flex flex-col">
             {paginatedRanking.length > 0 ? (
               <AnimatePresence mode="popLayout">
                  {paginatedRanking.map((player, index) => (
                    <motion.div
                      key={player.name}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group flex items-center gap-6 p-6 hover:bg-[#3cffd0]/5 transition-all cursor-pointer relative"
                    >
                      <RankBadge rank={(page - 1) * itemsPerPage + index + 1} />
                      <div className="flex-1 min-w-0">
                         <div className="verge-label-mono text-[13px] text-white font-black group-hover:text-[#3cffd0] transition-colors truncate uppercase tracking-tight">
                           {player.name}
                         </div>
                         <div className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest mt-1 opacity-60">
                           {player.team}
                         </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                         <span className="verge-label-mono text-3xl font-black text-[#3cffd0] leading-none tabular-nums tracking-tighter">
                           {player.count}
                         </span>
                         <span className="verge-label-mono text-[7px] text-[#949494] uppercase font-black tracking-widest mt-1">
                           {combinedActions.find(a => a.id === selectedAction)?.label || selectedAction}S
                       </span>
                      </div>
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#3cffd0] scale-y-0 group-hover:scale-y-100 transition-transform origin-center" />
                    </motion.div>
                  ))}
               </AnimatePresence>
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-20">
                  <BarChart2 size={48} className="mb-6" />
                  <div className="verge-label-mono text-[11px] font-black uppercase tracking-[0.3em]">No Data Profile</div>
                  <p className="verge-label-mono text-[8px] mt-4 uppercase tracking-[0.2em] opacity-50">Waiting for analyst stream...</p>
                </div>
             )}
          </div>

          {/* Contrôles de Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-white/10 bg-[#131313] flex items-center justify-between">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-[2px] verge-label-mono text-[10px] text-white font-black uppercase transition-colors"
              >
                Précédent
              </button>
              <div className="verge-label-mono text-[9px] text-[#949494] font-black tracking-widest">
                PAGE <span className="text-[#3cffd0]">{page}</span> SUR {totalPages}
              </div>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-[2px] verge-label-mono text-[10px] text-white font-black uppercase transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventExplorer;
