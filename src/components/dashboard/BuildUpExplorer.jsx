import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Hash, Zap, TrendingUp } from 'lucide-react';
import EventExplorer from './EventExplorer';

const BuildUpExplorer = ({ data = {}, loading = false, playersList = [], advancedMetricsList = [], matchIds }) => {
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Nombre de séquences par page pour garder un layout aéré
  
  // Lecture pure des séquences du Back-End (Zéro-Calcul)
  const sequences = useMemo(() => {
    if (!data.sequences) return [];
    return data.sequences.map(seq => ({
      ...seq,
      // Mapping pour la compatibilité avec la vue existante
      id: seq.seq_uuid || seq.sub_sequence_id,
      teamName: seq.team_id,
      passCount: seq.seq_pass_count,
      threatScore: seq.seq_score || 0,
      duration: seq.start_time ? `${seq.start_time} - ${seq.end_time}` : "N/A"
    })).sort((a, b) => b.threatScore - a.threatScore);
  }, [data]);

  const totalPages = Math.ceil(sequences.length / itemsPerPage);
  const paginatedSequences = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sequences.slice(start, start + itemsPerPage);
  }, [sequences, currentPage]);

  // Reset page quand les données changent
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);


  return (
    <div className="flex h-full w-full gap-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden p-8">
      
      {/* LISTE DES SÉQUENCES */}
      <div className="flex-1 flex flex-col gap-6 bg-[#1a1a1a] border border-white/10 rounded-[4px] p-10 overflow-hidden">
        <div className="flex justify-between items-center border-b border-white/5 pb-8">
           <div className="flex items-center gap-6">
              <div className="w-1 h-8 bg-[#3cffd0]" />
              <div>
                <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Analyse Build-Up</h3>
                <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.3em] font-bold mt-1">Chaînes de possession & menace</p>
              </div>
           </div>
           <div className="verge-label-mono text-[9px] text-[#949494] bg-white/5 px-4 py-2 rounded-[2px]">
             {sequences.length} SÉQUENCES DÉTECTÉES
           </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-verge pr-4 space-y-4 pt-4">
           {paginatedSequences.length > 0 ? paginatedSequences.map((seq, i) => (
             <motion.div 
               key={seq.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               onClick={() => setSelectedSequence(seq.id)}
               className={`border p-6 rounded-[2px] group hover:border-[#3cffd0]/50 transition-all cursor-pointer relative overflow-hidden ${selectedSequence === seq.id ? 'bg-[#3cffd0]/10 border-[#3cffd0]' : 'bg-[#2d2d2d]/30 border-white/5'}`}
             >
                {/* Threat Indicator Bar */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#3cffd0]" 
                  style={{ opacity: Math.min(1, seq.threatScore * 10) }}
                />

                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-4">
                      <span className="verge-label-mono text-[10px] text-[#949494] uppercase">SEQ #{seq.id.toString().slice(-4)}</span>
                      <span className="verge-label-mono text-[11px] text-white font-black uppercase tracking-tight">{seq.teamName}</span>
                   </div>
                   <div className="flex items-center gap-2">
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
                      <span className="verge-label-mono text-sm text-white font-black">{seq.duration}s</span>
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
                      <span className="verge-label-mono text-sm text-white font-black">{seq.events.length}</span>
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-8 border-t border-white/5">
             <button 
               disabled={currentPage === 1}
               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
               className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black disabled:opacity-20 transition-all flex items-center gap-2"
             >
               Précédent
             </button>
             <div className="verge-label-mono text-[9px] text-[#3cffd0] font-black tracking-widest">
               PAGE {currentPage} / {totalPages}
             </div>
             <button 
               disabled={currentPage === totalPages}
               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
               className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black disabled:opacity-20 transition-all flex items-center gap-2"
             >
               Suivant
             </button>
          </div>
        )}
      </div>

      {/* MAP ET STATS GLOBALES */}
      <div className="flex-[2] flex flex-col gap-6">
         {/* Carte Spatiale Isolée */}
         <div className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden">
            <EventExplorer 
              data={data} 
              isSequenceMode={true}
              selectedSequence={selectedSequence}
              matchIds={matchIds} 
              loading={loading} 
              playersList={playersList} 
              advancedMetricsList={advancedMetricsList} 
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
                  {sequences.filter(s => s.has_shot).length}
                </span>
             </div>
             <div className="flex-1 py-10 flex flex-col items-center justify-center gap-6">
                <span className="verge-label-mono text-[9px] text-[#3cffd0] font-black uppercase tracking-[0.3em]">Avec But</span>
                <span className="verge-label-mono text-4xl text-white font-black tabular-nums">
                  {sequences.filter(s => s.events.some(e => e.type === 'Goal' || (e.type === 'Shot' && e.outcome === 1))).length}
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
  );
};

export default BuildUpExplorer;
