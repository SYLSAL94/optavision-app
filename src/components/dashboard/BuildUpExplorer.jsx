import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Hash, Zap, TrendingUp, Loader2, PlayCircle, ListPlus } from 'lucide-react';
import EventExplorer from './EventExplorer';
import { OPTAVISION_API_URL } from '../../config';

const BuildUpExplorer = ({
  data = {},
  loading = false,
  playersList = [],
  teamsList = [],
  advancedMetricsList = [],
  matchIds,
  onPlayVideo,
  onAddToPlaylist,
  isVideoLoading = false,
  pagination = {},
  onPageChange,
}) => {
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [sequenceEvents, setSequenceEvents] = useState([]);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [loadingSequenceId, setLoadingSequenceId] = useState(null);
  const currentPage = Number(pagination.page || 1);
  const totalPages = Number(pagination.total_pages || pagination.totalPages || 0);
  const hasMore = Boolean(pagination.has_more ?? pagination.hasMore);
  const canGoPrevious = currentPage > 1 && !loading;
  const canGoNext = !loading && (totalPages > 0 ? currentPage < totalPages : hasMore);
  const showPagination = currentPage > 1 || canGoNext || totalPages > 1;
  
  // Mapping des noms d'équipes pour éradiquer les IDs parasites
  const teamMap = useMemo(() => {
    const map = {};
    if (teamsList) teamsList.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [teamsList]);

  // Lecture pure des séquences du Back-End (Zéro-Calcul)
  const sequences = useMemo(() => {
    if (!data.sequences) return [];
    const toBool = value => value === true || value === 'true';
    return data.sequences.map(seq => {
      const eventCount = Number(seq.seq_actions_count ?? seq.event_count ?? (seq.events || []).length ?? 0);
      return ({
      ...seq,
      // Mapping pour la compatibilité avec la vue existante
      id: seq.seq_uuid || seq.sub_sequence_id,
      shortId: String(seq.seq_uuid || seq.sub_sequence_id || '').split('-').pop(),
      matchName: seq.match_name || seq.match_id,
      matchDate: seq.match_date,
      teamName: teamMap[seq.team_id] || seq.team_id,
      passCount: Number(seq.seq_pass_count || 0),
      threatScore: Number(seq.seq_score || 0),
      eventCount,
      hasGoal: toBool(seq.has_goal ?? seq.seq_has_goal),
      hasShot: toBool(seq.has_shot ?? seq.seq_has_shot),
      duration: seq.start_time && seq.end_time ? `${seq.start_time} - ${seq.end_time}` : "N/A"
    });
    });
  }, [data, teamMap]);

  const sequenceTotalLabel = pagination.total !== null && pagination.total !== undefined
    ? pagination.total
    : `${sequences.length}${hasMore ? '+' : ''}`;

  /**
   * LAZY-LOADING : Fetch dédié des événements d'une séquence via la route /buildup/{seq_id}/events
   * Architecture validée par l'Architecte DevOps (remplace le cache global eventsData)
   */
  const fetchSequenceEventsLazy = async (seq) => {
    const seqId = seq.sub_sequence_id;
    const matchId = seq.match_id || (Array.isArray(matchIds) ? matchIds[0] : matchIds);
    if (!seqId || !matchId) {
      console.warn("BUILDUP_SEQUENCE_EVENTS_SKIPPED: match_id is required");
      return [];
    }

    setSequenceLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('match_id', matchId);
      const url = `${OPTAVISION_API_URL}/api/optavision/buildup/${encodeURIComponent(seqId)}/events?${params.toString()}`;
      console.log("🌐 Lazy-Loading séquence :", url);

      const response = await fetch(url);
      if (!response.ok) throw new Error(`SEQUENCE_EVENTS_FAILURE: ${response.status}`);
      const json = await response.json();
      const events = json.events || [];
      setSequenceEvents(events);
      return events;
    } catch (err) {
      console.error("❌ Erreur Lazy-Loading séquence :", err);
      setSequenceEvents([]);
      return [];
    } finally {
      setSequenceLoading(false);
    }
  };

  const handleSelectSequence = async (seq) => {
    const newId = seq.id;
    setSelectedSequence(newId);
    await fetchSequenceEventsLazy(seq);
  };

  const handleSequenceVideo = async (seq) => {
    if (!onPlayVideo) return;
    setLoadingSequenceId(seq.id);
    try {
      // 1. Charger les événements frais (garantie zéro stale closure)
      let events = sequenceEvents;
      if (events.length === 0 || selectedSequence !== seq.id) {
        events = await fetchSequenceEventsLazy(seq);
      }

      if (events.length > 0) {
        // Construction d'un objet séquence enrichi avec les vrais événements
        const sequencePayload = {
          ...seq,
          events: events,
          match_id: events[0]?.match_id || seq.match_id,
        };
        await onPlayVideo(sequencePayload);
      } else {
        // Fallback direct sur l'objet séquence brut
        await onPlayVideo(seq);
      }
    } catch (err) {
      console.error("❌ Erreur génération clip Build-Up:", err);
    } finally {
      setLoadingSequenceId(null);
    }
  };


  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] min-h-0 bg-[#131313] overflow-hidden">
      <div className="max-w-[1800px] mx-auto flex h-full max-h-full min-h-0 w-full gap-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden p-8">
      
      {/* LISTE DES SÉQUENCES */}
      <div className="flex-1 min-h-0 flex flex-col gap-6 bg-[#1a1a1a] border border-white/10 rounded-[4px] p-10 overflow-hidden">
        <div className="flex shrink-0 justify-between items-center border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <div className="w-1 h-8 bg-[#3cffd0]" />
              <div>
                <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Analyse Build-Up</h3>
                <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.3em] font-bold mt-1">Chaînes de possession & menace</p>
              </div>
           </div>
           <div className="verge-label-mono text-[9px] text-[#949494] bg-white/5 px-4 py-2 rounded-[2px]">
             {sequenceTotalLabel} SÉQUENCES DÉTECTÉES
           </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-verge pr-4 space-y-4 pt-4">
           {sequences.length > 0 ? sequences.map((seq, i) => (
             <motion.div 
               key={seq.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               onClick={() => handleSelectSequence(seq)}
               className={`border p-6 rounded-[2px] group hover:border-[#3cffd0]/50 transition-all cursor-pointer relative overflow-hidden ${selectedSequence === seq.id ? 'bg-[#3cffd0]/10 border-[#3cffd0]' : 'bg-[#2d2d2d]/30 border-white/5'}`}
             >
                {/* Threat Indicator Bar */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#3cffd0]" 
                  style={{ opacity: Math.min(1, seq.threatScore * 10) }}
                />

                <div className="flex justify-between items-start gap-4 mb-6">
                   <div className="flex flex-col min-w-0 flex-1">
                      <span className="verge-label-mono text-[10px] text-[#3cffd0] font-black uppercase tracking-widest truncate">
                        {seq.matchName}
                      </span>
                      {seq.matchDate && (
                        <span className="text-[#949494] text-[9px] font-medium italic mt-0.5">
                          {new Date(seq.matchDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                         <span className="verge-label-mono text-[11px] text-white font-black uppercase tracking-tight truncate">
                           {seq.teamName}
                         </span>
                         <div className="w-1 h-1 rounded-full bg-[#3cffd0]/50" />
                         <span className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-tighter">
                           Séquence #{seq.shortId || seq.id}
                         </span>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToPlaylist?.({
                            ...seq,
                            item_kind: 'sequence',
                            sub_sequence_id: seq.sub_sequence_id,
                            type_action: 'Sequence Build-Up'
                          });
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black text-[#949494] transition-all hover:border-[#3cffd0] hover:text-[#3cffd0]"
                        title="Ajouter a une playlist"
                      >
                        <ListPlus size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSequenceVideo(seq);
                        }}
                        disabled={loadingSequenceId !== null}
                        className="flex items-center justify-center gap-2 px-4 py-1.5 min-w-[110px] text-[9px] font-black tracking-[0.2em] uppercase rounded-full transition-all duration-300 backdrop-blur-md bg-black border border-[#3cffd0]/40 text-[#3cffd0] hover:bg-[#3cffd0] hover:text-black hover:border-[#3cffd0] shadow-[0_0_15px_rgba(60,255,208,0.2)] hover:shadow-[0_0_25px_rgba(60,255,208,0.5)] disabled:opacity-50 disabled:cursor-wait verge-label-mono"
                      >
                        {loadingSequenceId === seq.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <PlayCircle size={12} />
                        )}
                        <span>{loadingSequenceId === seq.id ? 'Extraction' : 'Visualiser'}</span>
                      </button>
                      <TrendingUp size={14} className="text-[#3cffd0]" />
                      <span className="verge-label-mono text-xl font-black text-[#3cffd0]">{seq.threatScore.toFixed(3)}</span>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-8">
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[#949494]">
                         <Clock size={12} />
                         <span className="verge-label-mono text-[8px] uppercase">Durée</span>
                      </div>
                      <span className="verge-label-mono text-sm text-white font-black">{seq.duration}</span>
                   </div>
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[#949494]">
                         <Hash size={12} />
                         <span className="verge-label-mono text-[8px] uppercase">Passes</span>
                      </div>
                      <span className="verge-label-mono text-sm text-white font-black">{seq.passCount}</span>
                   </div>
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[#949494]">
                         <Zap size={12} />
                         <span className="verge-label-mono text-[8px] uppercase">Events</span>
                      </div>
                       <span className="verge-label-mono text-sm text-white font-black">{seq.eventCount}</span>
                   </div>
                </div>
             </motion.div>
           )) : (
             <div className="h-full flex items-center justify-center opacity-10">
                <div className="text-center">
                  <Activity size={48} className="mx-auto mb-4" />
                  <div className="verge-label-mono text-[10px] uppercase font-black tracking-widest">
                    {loading ? 'Extraction des séquences...' : 'No Build-up Data Detected'}
                  </div>
                </div>
             </div>
           )}
        </div>

        {/* CONTROLES DE PAGINATION SIDEBAR */}
        {showPagination && (
          <div className="flex shrink-0 items-center justify-between pt-8 border-t border-white/5">
             <button 
               disabled={!canGoPrevious}
               onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
               className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black disabled:opacity-20 transition-all flex items-center gap-2"
             >
               Précédent
             </button>
             <div className="verge-label-mono text-[9px] text-[#3cffd0] font-black tracking-widest">
               PAGE {currentPage}{totalPages > 0 ? ` / ${totalPages}` : hasMore ? ' / ...' : ''}
             </div>
             <button 
               disabled={!canGoNext}
               onClick={() => onPageChange?.(currentPage + 1)}
               className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black disabled:opacity-20 transition-all flex items-center gap-2"
             >
               Suivant
             </button>
          </div>
        )}
      </div>

      {/* MAP ET STATS GLOBALES */}
      <div className="flex-[2] min-h-0 flex flex-col gap-6">
         {/* Carte Spatiale Isolée */}
         <div className="min-h-0 flex-1 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden">
            <EventExplorer 
              data={data} 
              isSequenceMode={true}
              selectedSequence={selectedSequence}
              eventsData={sequenceEvents}
              matchIds={matchIds} 
              loading={loading || sequenceLoading} 
              playersList={playersList} 
              advancedMetricsList={advancedMetricsList} 
              onPlayVideo={onPlayVideo}
              onAddToPlaylist={onAddToPlaylist}
              isVideoLoading={isVideoLoading}
            />
         </div>
         
         {/* BANDEAU DE PERFORMANCE (Horizontal Grid Style) */}
          <div className="bg-[#131313] border border-white/10 rounded-[2px] flex divide-x divide-white/10 overflow-hidden shrink-0">
             <div className="flex-1 py-10 flex flex-col items-center justify-center gap-6">
                <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-[0.3em]">Séquences</span>
                <span className="verge-label-mono text-4xl text-white font-black tabular-nums">{sequences.length}</span>
             </div>
             <div className="flex-1 py-10 flex flex-col items-center justify-center gap-6">
                <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-[0.3em]">Avec Tir</span>
                <span className="verge-label-mono text-4xl text-white font-black tabular-nums">
                  {sequences.filter(s => s.hasShot).length}
                </span>
             </div>
             <div className="flex-1 py-10 flex flex-col items-center justify-center gap-6">
                <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-[0.3em]">Avec But</span>
                 <span className="verge-label-mono text-4xl text-white font-black tabular-nums">
                   {sequences.filter(s => s.hasGoal).length}
                 </span>
             </div>
             <div className="flex-1 py-10 flex flex-col items-center justify-center gap-6">
                <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-[0.3em]">Contre-Att.</span>
                <span className="verge-label-mono text-4xl text-white font-black tabular-nums">
                  {sequences.filter(s => s.is_fast_break).length}
                </span>
             </div>
             <div className="flex-1 py-10 flex flex-col items-center justify-center gap-6">
                <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-[0.3em]">Moy. Passes</span>
                <span className="verge-label-mono text-4xl text-white font-black tabular-nums">
                   {(sequences.reduce((acc, s) => acc + s.passCount, 0) / (sequences.length || 1)).toFixed(1)}
                </span>
             </div>
          </div>
      </div>
    </div>
  </div>
  );
};

export default BuildUpExplorer;
