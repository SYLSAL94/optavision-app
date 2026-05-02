import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Target, PlayCircle, Loader2 } from 'lucide-react';
import GoalFrameSVG from './GoalFrameSVG';

import { TacticalPitch } from './TacticalPitch';
import TacticalPlot from './TacticalPlot';
import { usePitchProjection, PITCH_DIMENSIONS as GLOBAL_DIMENSIONS } from '../../hooks/usePitchProjection';

const SHOTS_PER_PAGE = 6;

const normalizeShotToAttackingGoal = (event) => {
  const x = Number(event?.x);
  const y = Number(event?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Normalisation : on ramène tous les tirs vers la même cage (x > 50)
  if (x < 50) return { x: 100 - x, y: 100 - y };
  return { x, y };
};

export const calculateShotDistance = (event) => {
  const normalized = normalizeShotToAttackingGoal(event);
  if (!normalized) return null;
  const { x, y } = normalized;
  // Distance basée sur les dimensions FIFA réelles centralisées
  const dist_x = (x - 100) * (GLOBAL_DIMENSIONS.width / 100);
  const dist_y = (y - 50) * (GLOBAL_DIMENSIONS.height / 100);
  return Math.sqrt(dist_x ** 2 + dist_y ** 2);
};

const isGoalShot = (shot) => {
  const typeId = Number(shot?.type_id);
  const typeName = String(shot?.type_name || shot?.type || '').trim().toLowerCase();
  return shot?.isGoal === true || typeId === 16 || typeName === 'goal' || typeName === 'own goal';
};

const ShotMapLayer = ({ shots, focusedShot, onShotFocus, projectPoint }) => (
  <>
    {shots.map((shot, index) => {
      const normalized = normalizeShotToAttackingGoal(shot);
      if (!normalized) return null;

      const shotId = shot.opta_id ?? shot.id;
      const focusedShotId = focusedShot ? (focusedShot.opta_id ?? focusedShot.id) : null;
      const isFocused = focusedShotId !== null && String(shotId) === String(focusedShotId);
      const isDimmed = focusedShotId !== null && !isFocused;

      return (
        <TacticalPlot 
          key={shot.id || shot.opta_id || index}
          event={normalized} // On passe les coordonnées normalisées
          mode="outcome"
          isFocused={isFocused}
          isDimmed={isDimmed}
          projectPoint={projectPoint}
          onClick={() => onShotFocus?.(shot)}
        />
      );
    })}
  </>
);

const ShotMapExplorer = ({ data = [], loading = false, onPlayVideo, isVideoLoading = false }) => {
  const [detailsPage, setDetailsPage] = useState(1);
  const [focusedShot, setFocusedShot] = useState(null);
  const { projectPoint } = usePitchProjection('vertical');

  const shotData = useMemo(() => {
    const events = Array.isArray(data) ? data : (data?.items || []);
    return events
      .filter(event =>
        event.isShot === true ||
        event.isShot === 1 ||
        (event.type_id >= 13 && event.type_id <= 16) ||
        ['Shot', 'Goal', 'MissedShots', 'SavedShot', 'ShotOnPost'].includes(event.type)
      )
      .map(shot => ({
        ...shot,
        isGoal: isGoalShot(shot),
        shotDistance: calculateShotDistance(shot),
      }));
  }, [data]);

  const totalDetailPages = Math.max(1, Math.ceil(shotData.length / SHOTS_PER_PAGE));
  const paginatedShots = useMemo(() => {
    const start = (detailsPage - 1) * SHOTS_PER_PAGE;
    return shotData.slice(start, start + SHOTS_PER_PAGE);
  }, [detailsPage, shotData]);

  useEffect(() => {
    setDetailsPage(1);
    setFocusedShot(null);
  }, [data]);

  return (
    <div className="w-full h-full p-8 bg-[#131313] flex flex-col lg:flex-row gap-8 overflow-hidden">
      <div className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-[4px] relative overflow-hidden shadow-2xl">
        <TacticalPitch 
          orientation="vertical" 
          view="offensive"
          style={{ grass: '#1a1a1a', line: '#333', background: '#131313' }}
        >
          <ShotMapLayer 
            shots={shotData} 
            focusedShot={focusedShot} 
            onShotFocus={setFocusedShot}
            projectPoint={projectPoint}
          />
        </TacticalPitch>
      </div>

      <aside className="w-full lg:w-[400px] flex flex-col gap-6">
        <div className="bg-[#1a1a1a] border border-white/10 rounded-[4px] p-6 shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-red-500 text-white rounded-[4px] flex items-center justify-center">
              <Target size={20} />
            </div>
            <div>
              <h2 className="verge-h3 text-white uppercase tracking-tighter font-black">Shot Map</h2>
              <p className="verge-label-mono text-[8px] text-red-500 uppercase tracking-[0.2em] font-black mt-1">Analyse des zones de frappe</p>
            </div>
          </div>

          <div className="space-y-4">
            {paginatedShots.map((shot) => (
              <div 
                key={shot.id}
                onClick={() => setFocusedShot(shot)}
                className={`p-4 border rounded-[2px] cursor-pointer transition-all ${focusedShot?.id === shot.id ? 'bg-red-500/20 border-red-500' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="verge-label-mono text-[11px] text-white font-black uppercase">{shot.playerName}</div>
                    <div className="verge-label-mono text-[8px] text-[#949494] mt-1">{shot.type_name} • {shot.shotDistance?.toFixed(1)}m</div>
                  </div>
                  <div className={`verge-label-mono text-[8px] px-2 py-1 rounded-[2px] font-black uppercase ${shot.isGoal ? 'bg-[#3cffd0] text-black' : 'bg-red-500 text-white'}`}>
                    {shot.isGoal ? 'But' : 'Échec'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-6">
            <button 
              disabled={detailsPage <= 1}
              onClick={() => setDetailsPage(p => p - 1)}
              className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="verge-label-mono text-[10px] text-[#949494] font-black uppercase">
              {detailsPage} / {totalDetailPages}
            </div>
            <button 
              disabled={detailsPage >= totalDetailPages}
              onClick={() => setDetailsPage(p => p + 1)}
              className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-full text-white transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {focusedShot && (
          <div className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-[4px] p-6 shadow-2xl overflow-y-auto styled-scrollbar-verge animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">Détails du Tir</h3>
              <button 
                onClick={async () => {
                  try {
                    await onPlayVideo?.(focusedShot);
                  } catch (err) {
                    console.error("Erreur vidéo:", err);
                  }
                }}
                disabled={isVideoLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-[2px] hover:bg-red-600 transition-all group"
              >
                {isVideoLoading ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={14} />}
                <span className="verge-label-mono text-[9px] font-black uppercase">Replay</span>
              </button>
            </div>

            <div className="aspect-[4/3] bg-black/40 rounded-[2px] border border-white/5 mb-6 relative overflow-hidden">
               <GoalFrameSVG shot={focusedShot} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-black/20 border border-white/5 rounded-[2px]">
                <div className="verge-label-mono text-[7px] text-[#949494] uppercase font-black">Probabilité (xG)</div>
                <div className="verge-label-mono text-xl text-white font-black mt-1">
                  {(Number(JSON.parse(focusedShot.advanced_metrics || "{}").xG) || 0).toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-black/20 border border-white/5 rounded-[2px]">
                <div className="verge-label-mono text-[7px] text-[#949494] uppercase font-black">Distance</div>
                <div className="verge-label-mono text-xl text-white font-black mt-1">
                  {focusedShot.shotDistance?.toFixed(1)}m
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default ShotMapExplorer;
