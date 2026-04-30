import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Target } from 'lucide-react';
import GoalFrameSVG from './GoalFrameSVG';

const SHOTS_PER_PAGE = 6;
const HALF_PITCH_WIDTH = 68;
const HALF_PITCH_LENGTH = 52.5;
const PITCH_LINE = 'rgba(255,255,255,0.36)';

const normalizeShotToAttackingGoal = (event) => {
  const x = Number(event?.x);
  const y = Number(event?.y);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  if (x < 50) {
    return { x: 100 - x, y: 100 - y };
  }

  return { x, y };
};

export const calculateShotDistance = (event) => {
  const normalized = normalizeShotToAttackingGoal(event);

  if (!normalized) {
    return null;
  }

  const { x, y } = normalized;
  const dist_x = (x - 100) * 1.05;
  const dist_y = (y - 50) * 0.68;
  return Math.sqrt(dist_x ** 2 + dist_y ** 2);
};

const isGoalShot = (shot) => {
  const typeId = Number(shot?.type_id);
  const typeName = String(shot?.type_name || shot?.type || '').trim().toLowerCase();

  return shot?.isGoal === true || typeId === 16 || typeName === 'goal' || typeName === 'own goal';
};

const projectShotToVerticalHalfPitch = (shot) => {
  const normalized = normalizeShotToAttackingGoal(shot);

  if (!normalized) {
    return null;
  }

  const { x, y } = normalized;
  return {
    cx: HALF_PITCH_WIDTH - (y * 0.68),
    cy: (100 - x) * 1.05,
  };
};

const VerticalHalfPitch = ({ shots, focusedShot, onShotFocus, onClearFocus }) => (
  <svg
    viewBox="-5 -5 78 62"
    className="h-full w-full"
    preserveAspectRatio="xMidYMid meet"
    aria-label="Demi-terrain vertical des tirs"
    role="img"
    onClick={onClearFocus}
  >
    <rect x="-5" y="-5" width="78" height="62" fill="#101010" />
    <rect x="0" y="0" width={HALF_PITCH_WIDTH} height={HALF_PITCH_LENGTH} fill="none" stroke={PITCH_LINE} strokeWidth="0.28" />
    <line x1="0" y1={HALF_PITCH_LENGTH} x2={HALF_PITCH_WIDTH} y2={HALF_PITCH_LENGTH} stroke={PITCH_LINE} strokeWidth="0.22" />

    <rect x={HALF_PITCH_WIDTH / 2 - 20.16} y="0" width="40.32" height="16.5" fill="none" stroke={PITCH_LINE} strokeWidth="0.22" />
    <rect x={HALF_PITCH_WIDTH / 2 - 9.16} y="0" width="18.32" height="5.5" fill="none" stroke={PITCH_LINE} strokeWidth="0.22" />
    <circle cx={HALF_PITCH_WIDTH / 2} cy="11" r="0.35" fill={PITCH_LINE} />
    <path d="M 26.7 16.5 A 9.15 9.15 0 0 0 41.3 16.5" fill="none" stroke={PITCH_LINE} strokeWidth="0.22" />
    <rect x={HALF_PITCH_WIDTH / 2 - 3.66} y="-3" width="7.32" height="3" fill="rgba(255,255,255,0.04)" stroke={PITCH_LINE} strokeWidth="0.32" />

    {shots.map((shot, index) => {
      const position = projectShotToVerticalHalfPitch(shot);

      if (!position || position.cy > 58 || position.cy < -4) {
        return null;
      }

      const shotId = shot.opta_id ?? shot.id;
      const focusedShotId = focusedShot ? (focusedShot.opta_id ?? focusedShot.id) : null;
      const isFocused = focusedShotId !== null && String(shotId) === String(focusedShotId);
      const isDimmed = focusedShotId !== null && !isFocused;

      return (
        <circle
          key={shot.id || shot.opta_id || index}
          cx={position.cx}
          cy={position.cy}
          r={isFocused ? 1.15 : 0.85}
          fill="#6fa2db"
          fillOpacity={isDimmed ? 0.2 : 0.76}
          stroke="#9fc4f4"
          strokeWidth={isFocused ? 0.35 : 0.22}
          className="cursor-pointer pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onShotFocus?.(shot);
          }}
        />
      );
    })}
  </svg>
);

const ShotMapExplorer = ({ data = [], loading = false, onPlayVideo, isVideoLoading = false }) => {
  const [detailsPage, setDetailsPage] = useState(1);
  const [focusedShot, setFocusedShot] = useState(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

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
  }, [shotData.length]);

  useEffect(() => {
    setDetailsPage(page => Math.min(page, totalDetailPages));
  }, [totalDetailPages]);

  const stats = useMemo(() => {
    const goals = shotData.filter(s => s.isGoal).length;
    return {
      total: shotData.length,
      goals,
      conversion: shotData.length > 0 ? ((goals / shotData.length) * 100).toFixed(1) : 0
    };
  }, [shotData]);

  const handleFocusedShotVideo = async () => {
    if (!focusedShot || !onPlayVideo) return;
    const videoUrl = await onPlayVideo(focusedShot);
    if (videoUrl) setActiveVideoUrl(videoUrl);
  };

  return (
    <div className="flex h-full min-h-0 w-full gap-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden p-8">
      <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-6 bg-[#1a1a1a] border border-white/10 rounded-[4px] p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/2 to-transparent pointer-events-none" />

        <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-6 shrink-0">
          <div className="flex items-center gap-6 min-w-0">
            <div className="w-1 h-8 bg-red-500 shrink-0" />
            <div className="min-w-0">
              <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Shot Map Analytique</h3>
              <p className="verge-label-mono text-[9px] text-red-400 uppercase tracking-[0.3em] font-bold mt-1">Localisation précise des frappes</p>
            </div>
          </div>
          <div className="flex gap-4 shrink-0">
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

        <div className="flex-1 min-h-0 bg-[#101010] border border-white/5 relative rounded-[2px] flex items-center justify-center overflow-hidden">
           <div className="w-full h-full max-w-[820px] max-h-[680px] relative">
              {!loading && (
                <VerticalHalfPitch
                  shots={shotData}
                  focusedShot={focusedShot}
                  onShotFocus={setFocusedShot}
                  onClearFocus={() => setFocusedShot(null)}
                />
              )}
           </div>

           {focusedShot && (
             <div className="absolute right-6 top-6 z-20 w-72 rounded-lg border border-white/10 bg-[#131313]/90 p-4 text-white shadow-2xl backdrop-blur-xl">
               <div className="mb-3 border-b border-white/10 pb-2">
                 <div className="verge-label-mono text-[8px] uppercase tracking-widest text-red-400">Tir selectionne</div>
                 <div className="mt-1 truncate text-sm font-black">{focusedShot.playerName || 'Joueur inconnu'}</div>
               </div>
               <div className="space-y-2 verge-label-mono text-[9px] uppercase text-[#d7d7d7]">
                 <div className="flex justify-between gap-4">
                   <span className="text-[#949494]">Resultat</span>
                   <span className={focusedShot.isGoal ? 'text-[#3cffd0]' : 'text-white'}>{focusedShot.isGoal ? 'Goal' : focusedShot.type_name || focusedShot.type || 'Tir'}</span>
                 </div>
                 <div className="flex justify-between gap-4">
                   <span className="text-[#949494]">Minute</span>
                   <span>{focusedShot.minute ?? focusedShot.min ?? '-'}'</span>
                 </div>
                 <div className="flex justify-between gap-4">
                   <span className="text-[#949494]">Distance</span>
                   <span>{focusedShot.shotDistance !== null ? `${focusedShot.shotDistance.toFixed(1)}m` : '-'}</span>
                 </div>
               </div>
               <button
                 type="button"
                 onClick={(e) => {
                   e.stopPropagation();
                   handleFocusedShotVideo();
                 }}
                 disabled={isVideoLoading}
                 className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#3cffd0] bg-[#131313]/80 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#3cffd0] shadow-[0_0_10px_rgba(60,255,208,0.2)] backdrop-blur-md transition-all duration-300 hover:bg-[#3cffd0] hover:text-[#131313] hover:shadow-[0_0_20px_rgba(60,255,208,0.6)] disabled:cursor-wait disabled:opacity-50"
               >
                 {isVideoLoading ? (
                   <>
                     <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#3cffd0] border-t-transparent" />
                     <span>Decoupe en cours...</span>
                   </>
                 ) : (
                   <span>🎬 Lancer la vidéo</span>
                 )}
               </button>
             </div>
           )}

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

      <div className="w-[320px] min-h-0 flex flex-col gap-4">
         <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-[4px] shrink-0">
            <h4 className="verge-label-mono text-[10px] text-white font-black uppercase mb-4 flex items-center gap-3">
              <Target size={14} className="text-red-400" />
              Vue Cage
            </h4>
            <div className="h-[170px] bg-black/40 border border-white/5 rounded-[2px] p-3">
              <GoalFrameSVG shots={shotData} focusedShot={focusedShot} onShotFocus={setFocusedShot} />
            </div>
         </div>

         <div className="bg-[#1a1a1a] border border-white/10 p-5 rounded-[4px] shrink-0">
            <h4 className="verge-label-mono text-[10px] text-white font-black uppercase mb-5 flex items-center gap-3">
              <Info size={14} className="text-[#3cffd0]" />
              Légende Tactique
            </h4>
            <div className="space-y-3">
               <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-[#3cffd0] rounded-full shadow-[0_0_8px_#3cffd0]" />
                  <span className="verge-label-mono text-[9px] text-[#949494] uppercase font-black">But (Goal)</span>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-[#ff4d4d] rounded-full" />
                  <span className="verge-label-mono text-[9px] text-[#949494] uppercase font-black">Tir manqué / arrêté</span>
               </div>
            </div>
         </div>

         <div className="flex-1 min-h-0 bg-[#1a1a1a] border border-white/10 p-5 rounded-[4px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
              <h4 className="verge-label-mono text-[10px] text-[#949494] uppercase">Détails des frappes</h4>
              <span className="verge-label-mono text-[8px] text-[#3cffd0] uppercase font-black">
                {shotData.length} tirs
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden space-y-2">
               {paginatedShots.map((shot, i) => (
                 <div key={shot.id || shot.opta_id || `${detailsPage}-${i}`} className="bg-black/20 p-3 border-l-2 border-white/5 hover:border-[#3cffd0] transition-all">
                    <div className="flex justify-between items-center gap-3 mb-1">
                       <span className="verge-label-mono text-[10px] text-white font-black truncate">{shot.playerName || 'Joueur inconnu'}</span>
                       <span className={`verge-label-mono text-[8px] font-black shrink-0 ${shot.isGoal ? 'text-[#3cffd0]' : 'text-[#949494]'}`}>
                         {shot.isGoal ? 'GOAL' : 'MISS'}
                       </span>
                    </div>
                    <div className="verge-label-mono text-[8px] text-[#949494] uppercase truncate">
                      {shot.minute}' • {shot.bodyPart || 'Pied'}
                      {shot.shotDistance !== null ? ` • ${shot.shotDistance.toFixed(1)}m` : ''}
                    </div>
                 </div>
               ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-white/5 shrink-0">
              <button
                type="button"
                disabled={detailsPage === 1}
                onClick={() => setDetailsPage(page => Math.max(1, page - 1))}
                className="h-8 w-8 inline-flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-[2px] text-white transition-colors"
                aria-label="Page précédente"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="verge-label-mono text-[9px] text-[#949494] font-black tracking-widest uppercase">
                Page <span className="text-[#3cffd0]">{detailsPage}</span> / {totalDetailPages}
              </div>
              <button
                type="button"
                disabled={detailsPage === totalDetailPages}
                onClick={() => setDetailsPage(page => Math.min(totalDetailPages, page + 1))}
                className="h-8 w-8 inline-flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-[2px] text-white transition-colors"
                aria-label="Page suivante"
              >
                <ChevronRight size={14} />
              </button>
            </div>
         </div>
      </div>
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-8 backdrop-blur-sm" onClick={() => setActiveVideoUrl(null)}>
          <div className="w-full max-w-5xl rounded-[4px] border border-white/10 bg-[#131313] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="verge-label-mono text-[10px] uppercase tracking-widest text-[#949494]">Clip Shot Map</div>
              <button type="button" onClick={() => setActiveVideoUrl(null)} className="text-sm font-black uppercase text-white/60 hover:text-white">Fermer</button>
            </div>
            <video src={activeVideoUrl} controls autoPlay className="max-h-[78vh] w-full bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ShotMapExplorer;
