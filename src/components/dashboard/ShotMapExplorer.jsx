import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Filter, Info } from 'lucide-react';
import { FootballPitch } from './FootballPitch';

const ShotMapExplorer = ({ data = [], loading = false }) => {
  
  // Filtrage des tirs avec code couleur
  const shotData = useMemo(() => {
    return data
      .filter(event => 
        event.isShot === true || 
        event.isShot === 1 ||
        (event.type_id >= 13 && event.type_id <= 16) ||
        ['Shot', 'Goal', 'MissedShots', 'SavedShot', 'ShotOnPost'].includes(event.type)
      )
      .map(shot => ({
        ...shot,
        isGoal: shot.type === 'Goal' || shot.type_id === 16 || shot.isGoal === true || shot.outcome === 1,
      }));
  }, [data]);


  const stats = useMemo(() => {
    const goals = shotData.filter(s => s.isGoal).length;
    return {
      total: shotData.length,
      goals: goals,
      conversion: shotData.length > 0 ? ((goals / shotData.length) * 100).toFixed(1) : 0
    };
  }, [shotData]);

  return (
    <div className="flex h-full w-full gap-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden p-8">
      
      {/* TERRAIN ANALYTIQUE */}
      <div className="flex-1 flex flex-col gap-6 bg-[#1a1a1a] border border-white/10 rounded-[4px] p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/2 to-transparent pointer-events-none" />
        
        <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-6">
          <div className="flex items-center gap-6">
            <div className="w-1 h-8 bg-red-500" />
            <div>
              <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Shot Map Analytique</h3>
              <p className="verge-label-mono text-[9px] text-red-400 uppercase tracking-[0.3em] font-bold mt-1">Localisation précise des frappes</p>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-[2px] text-center">
                <div className="verge-label-mono text-[8px] text-[#949494] uppercase">Tirs</div>
                <div className="verge-label-mono text-xs text-white font-black">{stats.total}</div>
             </div>
             <div className="bg-black/40 border border-white/5 px-4 py-2 rounded-[2px] text-center">
                <div className="verge-label-mono text-[8px] text-[#949494] uppercase">Buts</div>
                <div className="verge-label-mono text-xs text-[#3cffd0] font-black">{stats.goals}</div>
             </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-black/40 border border-white/5 relative rounded-[2px] flex items-center justify-center">
           <div className="w-full h-full max-w-[1000px] max-h-[700px] relative">
              <FootballPitch 
                orientation="horizontal" 
                style={{ grass: 'transparent', line: 'rgba(255,255,255,0.08)', background: 'transparent' }} 
              />
              
              {!loading && (
                <svg viewBox="0 0 105 68" className="absolute inset-0 w-full h-full pointer-events-none">
                  {shotData.map((shot, i) => (
                    <g key={i}>
                      <circle 
                        cx={(shot.x / 100) * 105} 
                        cy={(shot.y / 100) * 68} 
                        r={shot.isGoal ? "1.2" : "0.8"} 
                        fill={shot.isGoal ? "#3cffd0" : "#ff4d4d"}
                        className="animate-in zoom-in duration-500"
                        style={{ filter: shot.isGoal ? 'drop-shadow(0 0 4px #3cffd0)' : 'none' }}
                      />
                      {shot.isGoal && (
                        <circle 
                          cx={(shot.x / 100) * 105} 
                          cy={(shot.y / 100) * 68} 
                          r="2.5" 
                          fill="none" 
                          stroke="#3cffd0" 
                          strokeWidth="0.2" 
                          className="animate-ping"
                        />
                      )}
                    </g>
                  ))}
                </svg>
              )}
           </div>

           {(loading || shotData.length === 0) && (
             <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
                <div className="text-center opacity-30">
                  <Target size={48} className="mx-auto mb-4" />
                  <div className="verge-label-mono text-[10px] uppercase font-black tracking-widest">
                    {loading ? 'Extraction des frappes...' : 'Aucun tir détecté dans ce flux'}
                  </div>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* LÉGENDE & INFO */}
      <div className="w-[300px] flex flex-col gap-6">
         <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-[4px]">
            <h4 className="verge-label-mono text-[10px] text-white font-black uppercase mb-6 flex items-center gap-3">
              <Info size={14} className="text-[#3cffd0]" />
              Légende Tactique
            </h4>
            <div className="space-y-4">
               <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-[#3cffd0] rounded-full shadow-[0_0_8px_#3cffd0]" />
                  <span className="verge-label-mono text-[9px] text-[#949494] uppercase font-black">But (Goal)</span>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-[#ff4d4d] rounded-full" />
                  <span className="verge-label-mono text-[9px] text-[#949494] uppercase font-black">Tir Manqué / Arrêté</span>
               </div>
            </div>
         </div>

         <div className="flex-1 bg-[#1a1a1a] border border-white/10 p-6 rounded-[4px] overflow-hidden flex flex-col">
            <h4 className="verge-label-mono text-[10px] text-[#949494] uppercase mb-6">Détails des frappes</h4>
            <div className="flex-1 overflow-y-auto scrollbar-verge space-y-2 pr-2">
               {shotData.map((shot, i) => (
                 <div key={i} className="bg-black/20 p-3 border-l-2 border-white/5 hover:border-[#3cffd0] transition-all">
                    <div className="flex justify-between items-center mb-1">
                       <span className="verge-label-mono text-[10px] text-white font-black truncate">{shot.playerName}</span>
                       <span className={`verge-label-mono text-[8px] font-black ${shot.isGoal ? 'text-[#3cffd0]' : 'text-[#949494]'}`}>
                         {shot.isGoal ? 'GOAL' : 'MISS'}
                       </span>
                    </div>
                    <div className="verge-label-mono text-[8px] text-[#949494] uppercase">{shot.minute}' • {shot.bodyPart || 'Pied'}</div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default ShotMapExplorer;
