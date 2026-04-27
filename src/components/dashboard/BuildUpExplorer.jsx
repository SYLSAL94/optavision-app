import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, Hash, Zap, TrendingUp } from 'lucide-react';

const BuildUpExplorer = ({ data = [], loading = false }) => {
  
  // Agrégation des séquences par possession_id
  const sequences = useMemo(() => {
    const groups = {};
    
    data.forEach(event => {
      const pid = event.possession_id || event.possessionId;
      if (!pid && pid !== 0) return;
      
      if (!groups[pid]) {
        groups[pid] = {
          id: pid,
          startTime: event.minute * 60 + (event.second || 0),
          endTime: event.minute * 60 + (event.second || 0),
          events: [],
          passCount: 0,
          threatScore: 0,
          teamName: event.teamName || event.team || 'Unknown Team',
        };
      }
      
      groups[pid].events.push(event);
      if (event.type === 'Pass' || event.type_id === 1) groups[pid].passCount++;
      
      // xT total de la séquence (généralement porté par le dernier événement ou sommé)
      // Ici on somme les xT individuels pour avoir le score de menace cumulé
      groups[pid].threatScore += (parseFloat(event.xT) || parseFloat(event.seq_score) || 0);
      
      const currentTime = event.minute * 60 + (event.second || 0);
      if (currentTime < groups[pid].startTime) groups[pid].startTime = currentTime;
      if (currentTime > groups[pid].endTime) groups[pid].endTime = currentTime;
    });

    return Object.values(groups)
      .filter(seq => seq.events.length >= 2) // Une séquence doit avoir au moins 2 événements
      .map(seq => ({
        ...seq,
        duration: Math.max(1, seq.endTime - seq.startTime),
      }))
      .sort((a, b) => b.threatScore - a.threatScore);
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
           {sequences.length > 0 ? sequences.map((seq, i) => (
             <motion.div 
               key={seq.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               className="bg-[#2d2d2d]/30 border border-white/5 p-6 rounded-[2px] group hover:border-[#3cffd0]/50 transition-all cursor-pointer relative overflow-hidden"
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

                {/* Progress Mini-Map visualization could go here */}
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
      </div>

      {/* STATS GLOBALES */}
      <div className="w-[350px] flex flex-col gap-6">
         <div className="bg-[#1a1a1a] border border-white/10 p-8 rounded-[4px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#3cffd0]/5 rounded-bl-full pointer-events-none" />
            <h4 className="verge-label-mono text-[10px] text-white font-black uppercase mb-8">Performance Indices</h4>
            <div className="space-y-8">
               <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8px] text-[#949494] uppercase font-black">
                     <span>Avg. Sequence Threat</span>
                     <span className="text-white">{(sequences.reduce((acc, s) => acc + s.threatScore, 0) / (sequences.length || 1)).toFixed(4)}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-[#3cffd0] w-[65%]" />
                  </div>
               </div>
               <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8px] text-[#949494] uppercase font-black">
                     <span>Pass Density</span>
                     <span className="text-white">{(sequences.reduce((acc, s) => acc + s.passCount, 0) / (sequences.length || 1)).toFixed(1)} / seq</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-[#3cffd0] w-[45%]" />
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default BuildUpExplorer;
