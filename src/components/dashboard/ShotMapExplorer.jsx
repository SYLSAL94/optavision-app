import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Info, Target, PlayCircle, Loader2, Download, Database, ListPlus } from 'lucide-react';
import GoalFrameSVG from './GoalFrameSVG';

import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection, PITCH_DIMENSIONS as GLOBAL_DIMENSIONS } from '../../hooks/usePitchProjection';

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
  const status = String(shot?.shot_status || shot?.advanced_metrics?.shot_status || '').trim().toLowerCase();
  return shot?.isGoal === true || typeId === 16 || typeName === 'goal' || typeName === 'own goal' || status === 'goal';
};

const parseAdvancedMetrics = (event) => {
  const raw = event?.advanced_metrics || event?.advancedMetrics || {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw && typeof raw === 'object' ? raw : {};
};

const firstMetric = (event, metrics, keys) => {
  for (const key of keys) {
    const value = event?.[key] ?? metrics?.[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const hasMetricFlag = (metrics, key) => (
  metrics?.[key] === true || metrics?.[key] === 1 || metrics?.[key] === 'true'
);

const deriveBodyPart = (shot, metrics) => {
  const explicit = firstMetric(shot, metrics, ['body_part_name', 'bodyPart', 'body_part']);
  if (explicit) return explicit;
  if (hasMetricFlag(metrics, 'is_shot_head')) return 'Tete';
  if (hasMetricFlag(metrics, 'is_shot_left_footed')) return 'Pied gauche';
  if (hasMetricFlag(metrics, 'is_shot_right_footed')) return 'Pied droit';
  if (hasMetricFlag(metrics, 'is_shot_overhead')) return 'Retourne';
  return 'Non renseigne';
};

const deriveShotTags = (metrics) => {
  const tags = [];
  if (hasMetricFlag(metrics, 'is_shot_big_chance')) tags.push('Big chance');
  if (hasMetricFlag(metrics, 'is_shot_one_on_one')) tags.push('1v1');
  if (hasMetricFlag(metrics, 'is_shot_fast_break')) tags.push('Transition');
  if (hasMetricFlag(metrics, 'is_shot_from_corner')) tags.push('Corner');
  if (hasMetricFlag(metrics, 'is_shot_free_kick') || hasMetricFlag(metrics, 'is_shot_direct_free_kick')) tags.push('Coup franc');
  if (hasMetricFlag(metrics, 'is_shot_penalty')) tags.push('Penalty');
  if (hasMetricFlag(metrics, 'is_shot_assisted')) tags.push('Assiste');
  if (hasMetricFlag(metrics, 'is_shot_volley')) tags.push('Volee');
  if (hasMetricFlag(metrics, 'is_shot_first_touch')) tags.push('1ere touche');
  if (hasMetricFlag(metrics, 'is_shot_follows_dribble')) tags.push('Apres dribble');
  if (hasMetricFlag(metrics, 'is_shot_deflection')) tags.push('Deviation');
  return tags;
};

const statusLabel = (shot) => {
  const status = String(shot?.shot_status || shot?.type_name || shot?.type || 'Tir').trim();
  const normalized = status.toLowerCase();
  if (normalized === 'goal') return 'But';
  if (normalized === 'saved') return 'Arret';
  if (normalized === 'blocked') return 'Bloque';
  if (normalized === 'post') return 'Poteau';
  if (normalized === 'missed') return 'Manque';
  return status;
};

const formatMetric = (value, digits = 2) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : '-';
};

const ShotMapLayer = ({ shots, focusedShot, onShotFocus, projectPoint }) => {
  const focusedShotId = focusedShot ? (focusedShot.opta_id ?? focusedShot.id) : null;
  
  const renderShot = (shot, index, isFocused) => {
    const normalized = normalizeShotToAttackingGoal(shot);
    const position = normalized ? projectPoint(normalized.x, normalized.y) : null;
    if (!position) return null;

    const isDimmed = focusedShotId !== null && !isFocused;

    return (
      <circle
        key={shot.id || shot.opta_id || index}
        cx={position.x}
        cy={position.y}
        r={isFocused ? 1.6 : 1}
        fill={shot.isGoal ? "#3cffd0" : "#ff4d4d"}
        fillOpacity={isDimmed ? 0.2 : 0.8}
        stroke={isFocused ? "white" : "white"}
        strokeWidth={isFocused ? 0.6 : 0.1}
        className="cursor-pointer pointer-events-auto transition-all duration-300"
        onClick={(e) => {
          e.stopPropagation();
          onShotFocus?.(shot);
        }}
        style={{ filter: isFocused ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none' }}
      >
        <title>{shot.playerName} - {shot.type_name}</title>
      </circle>
    );
  };

  // Séparation pour garantir le rendu au-dessus (Z-index SVG)
  const regularShots = shots.filter(s => String(s.opta_id ?? s.id) !== String(focusedShotId));
  const activeShot = shots.find(s => String(s.opta_id ?? s.id) === String(focusedShotId));

  return (
    <>
      {regularShots.map((s, idx) => renderShot(s, idx, false))}
      {activeShot && renderShot(activeShot, 'active', true)}
    </>
  );
};

const ShotMapExplorer = ({ data = [], loading = false, onPlayVideo, onAddToPlaylist, isVideoLoading = false }) => {
  const [focusedShot, setFocusedShot] = useState(null);
  const [generatingEventId, setGeneratingEventId] = useState(null);
  const { projectPoint } = usePitchProjection('vertical');

  const handleToggleShot = (shot) => {
    const shotId = shot.opta_id ?? shot.id;
    const currentId = focusedShot ? (focusedShot.opta_id ?? focusedShot.id) : null;
    if (String(shotId) === String(currentId)) {
      setFocusedShot(null);
    } else {
      setFocusedShot(shot);
    }
  };

  const shotData = useMemo(() => {
    const events = Array.isArray(data) ? data : (data?.items || []);
    return events
      .filter(event =>
        event.isShot === true ||
        event.isShot === 1 ||
        (event.type_id >= 13 && event.type_id <= 16) ||
        ['Shot', 'Goal', 'MissedShots', 'SavedShot', 'ShotOnPost'].includes(event.type)
      )
      .map(shot => {
        const metrics = parseAdvancedMetrics(shot);
        const xG = firstMetric(shot, metrics, ['xG', 'xg']);
        const xGOT = firstMetric(shot, metrics, ['xGOT', 'xgot', 'psxg']);
        const xT = firstMetric(shot, metrics, ['xT', 'xT_credit']);
        const shotStatus = firstMetric(shot, metrics, ['shot_status']);
        const bodyPart = deriveBodyPart(shot, metrics);
        const shotTags = deriveShotTags(metrics);

        return {
          ...shot,
          advanced_metrics: metrics,
          xG: xG !== null ? Number(xG) : null,
          xGOT: xGOT !== null ? Number(xGOT) : null,
          xT: xT !== null ? Number(xT) : Number(shot.xT ?? 0),
          shot_status: shotStatus || shot.shot_status,
          body_part_name: bodyPart,
          shot_tags: shotTags,
          isGoal: isGoalShot({ ...shot, advanced_metrics: metrics, shot_status: shotStatus }),
          shotDistance: calculateShotDistance(shot),
        };
      });
  }, [data]);

  // --- MOTEUR DE VIRTUALISATION (Optimisation Shot Map) ---
  const scrollContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const ROW_HEIGHT = 102; 
  const BUFFER_ROWS = 5;

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const virtualShots = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const end = Math.min(shotData.length, Math.ceil((scrollTop + 800) / ROW_HEIGHT) + BUFFER_ROWS);
    
    return shotData.slice(start, end).map((shot, index) => ({
      shot,
      index: start + index,
      top: (start + index) * ROW_HEIGHT
    }));
  }, [scrollTop, shotData]);

  useEffect(() => {
    setFocusedShot(null);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [data]);

  const handleFocusedShotVideo = async () => {
    if (!focusedShot || !onPlayVideo) return;
    const shotId = focusedShot.opta_id || focusedShot.id;
    setGeneratingEventId(shotId);
    try {
      await onPlayVideo(focusedShot);
    } finally {
      setGeneratingEventId(null);
    }
  };

  return (
    <div className="w-full h-screen bg-[#050505] overflow-hidden">
      <div className="max-w-[1800px] mx-auto w-full h-full flex flex-col lg:flex-row gap-6 p-8 overflow-hidden">
      {/* COLONNE GAUCHE : CONSOLE TACTIQUE UNIFIÉE (MAP + CAGE) */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#3cffd0]/2 to-transparent pointer-events-none" />
        
        {/* HEADER UNIFIÉ */}
        <div className="px-6 py-4 border-b border-white/5 bg-black/20 flex justify-between items-center z-10">
          <div className="flex items-center gap-6">
            <div className="w-1 h-8 bg-[#3cffd0]" />
            <div>
              <h3 className="verge-h3 text-white uppercase tracking-tighter font-black">Console de Finition</h3>
              <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.3em] font-bold mt-1">
                IMMERSION SPATIALE & TARGET 2D
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-[2px] border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3cffd0]" />
              <span className="verge-label-mono text-[8px] text-[#949494] uppercase font-black">Buts</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-[2px] border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff4d4d]" />
              <span className="verge-label-mono text-[8px] text-[#949494] uppercase font-black">Échecs</span>
            </div>
            <div className="verge-label-mono text-[9px] text-white font-black bg-[#3cffd0]/10 px-3 py-1.5 rounded-[2px] border border-[#3cffd0]/20">
              {shotData.length} FRAPPES
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative z-10 gap-0">
          {/* ZONE 2D TARGET (Intégration Premium) */}
          <div className="h-[260px] w-full flex items-end justify-center shrink-0 relative z-20">
             {/* Effet de lueur diffuse derrière la cage */}
             <div className="absolute inset-0 bg-[#3cffd0]/5 blur-[100px] rounded-full scale-150 pointer-events-none" />
             <div className="absolute top-4 left-1/2 -translate-x-1/2 verge-label-mono text-[7px] text-[#3cffd0]/40 uppercase tracking-[0.5em] font-black">Performance Target (Target 2D)</div>
             
             {/* Conteneur Invisible de Précision */}
             <div className="w-full max-w-[800px] h-full flex items-center justify-center relative">
               <GoalFrameSVG 
                 shots={shotData} 
                 focusedShot={focusedShot}
                 onShotFocus={setFocusedShot}
               />
             </div>
          </div>

          {/* MAP TACTIQUE (Shot Map) */}
          <div className="flex-1 px-8 pb-8 pt-0 relative min-h-0 z-10 overflow-hidden bg-gradient-to-t from-black/20 to-transparent">
            <div className="w-full h-full max-w-[800px] mx-auto">
              <TacticalPitch 
                mode="vertical-half" 
                orientation="vertical"
                view="offensive"
                style={{ grass: 'transparent', line: '#333', background: 'transparent' }}
                onClick={() => setFocusedShot(null)}
              >
                <ShotMapLayer 
                  shots={shotData} 
                  focusedShot={focusedShot} 
                  onShotFocus={handleToggleShot}
                  projectPoint={projectPoint}
                />
              </TacticalPitch>
            </div>

            {focusedShot && (
              <div className="absolute right-8 top-8 z-[100] w-72 rounded-lg border border-[#3cffd0]/30 bg-[#131313]/95 p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 ring-1 ring-white/5">
                <div className="mb-4 border-b border-white/10 pb-3 flex justify-between items-start">
                  <div>
                    <div className="verge-label-mono text-[7px] uppercase tracking-widest text-[#3cffd0]">Analytique Individuel</div>
                    <div className="mt-1 truncate text-xs font-black uppercase">{focusedShot.playerName || 'Joueur'}</div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-[2px] verge-label-mono text-[7px] font-black uppercase ${focusedShot.isGoal ? 'bg-[#3cffd0] text-black' : 'bg-white/10 text-white'}`}>
                    {statusLabel(focusedShot)}
                  </div>
                </div>
                <div className="space-y-2 verge-label-mono text-[8px] uppercase text-[#949494]">
                  <div className="flex justify-between font-bold">
                    <span>Minute</span>
                    <span className="text-white">{focusedShot.min ?? focusedShot.minute ?? '-'}'</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Distance</span>
                    <span className="text-white">{focusedShot.shotDistance?.toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Surface</span>
                    <span className="text-white">{focusedShot.body_part_name || 'Non renseigne'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-black/30 border border-white/10 rounded-[2px] p-2">
                      <div className="text-[7px] text-[#666]">xG</div>
                      <div className="text-white text-[10px] mt-1">{formatMetric(focusedShot.xG)}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-[2px] p-2">
                      <div className="text-[7px] text-[#666]">xGOT</div>
                      <div className="text-white text-[10px] mt-1">{formatMetric(focusedShot.xGOT)}</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-[2px] p-2">
                      <div className="text-[7px] text-[#666]">xT</div>
                      <div className="text-white text-[10px] mt-1">{formatMetric(focusedShot.xT)}</div>
                    </div>
                  </div>
                  {focusedShot.shot_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {focusedShot.shot_tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-white/5 border border-white/10 rounded-[2px] text-[7px] text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist?.(focusedShot);
                    }}
                    className="flex items-center justify-center rounded-[2px] border border-white/10 bg-black/50 px-3 text-[#949494] transition-all hover:border-[#3cffd0]/50 hover:text-[#3cffd0]"
                    title="Ajouter a une playlist"
                  >
                    <ListPlus size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocusedShotVideo();
                    }}
                    disabled={generatingEventId !== null || isVideoLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-[#3cffd0]/40 bg-black/50 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-[#3cffd0] hover:bg-[#3cffd0] hover:text-black transition-all disabled:opacity-50 disabled:cursor-wait"
                  >
                    {generatingEventId !== null || isVideoLoading ? (
                      <Loader2 size={12} className="animate-spin text-[#3cffd0]" />
                    ) : (
                      <PlayCircle size={12} />
                    )}
                    <span>{generatingEventId !== null || isVideoLoading ? 'Extraction...' : 'Visualiser'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <Loader2 className="animate-spin text-[#3cffd0]" size={32} />
          </div>
        )}
      </div>

      {/* COLONNE DROITE : SIDEBAR (FLUX SEUL) */}
      <aside className="w-full lg:w-[400px] flex flex-col gap-6 min-h-0 bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10 bg-[#2d2d2d] flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-[#3cffd0] animate-pulse'}`} />
            <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">Flux Analytique (Tirs)</span>
          </div>
          <div className="verge-label-mono text-[9px] text-[#949494] bg-white/5 px-3 py-1.5 rounded-[2px] border border-white/5">
            {shotData.length} TOTAL
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto styled-scrollbar-verge bg-black/20 relative"
        >
          {/* Container fantôme pour simuler la hauteur totale du scroll */}
          <div style={{ height: `${shotData.length * ROW_HEIGHT}px`, width: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
          
          {shotData.length > 0 ? (
            virtualShots.map(({ shot: s, index, top }) => {
              const shotId = s.opta_id ?? s.id;
              const isFocused = focusedShot && String(shotId) === String(focusedShot.opta_id ?? focusedShot.id);
              
              return (
                <div
                  key={shotId || index}
                  style={{ position: 'absolute', top: `${top}px`, left: 0, right: 0, height: `${ROW_HEIGHT}px` }}
                  onClick={() => handleToggleShot(s)}
                  className={`flex items-center justify-between py-3 border-b border-white/[0.03] hover:bg-[#3cffd0]/5 transition-colors px-6 group cursor-pointer ${isFocused ? 'bg-[#3cffd0]/10 border-l-2 border-l-[#3cffd0]' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <span className="verge-label-mono text-[10px] text-[#3cffd0] font-black w-12 shrink-0">
                      {s.min ?? s.minute ?? 0}'
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="verge-label-mono text-[11px] text-white uppercase font-black truncate">
                          {statusLabel(s)}
                        </span>
                        {s.isGoal && (
                          <span className="verge-label-mono text-[7px] px-1.5 py-0.5 rounded-[2px] bg-[#3cffd0] text-black font-black uppercase shadow-[0_0_10px_rgba(60,255,208,0.4)]">
                            But
                          </span>
                        )}
                      </div>
                      <div className="verge-label-mono text-[10px] text-[#949494] group-hover:text-white transition-colors truncate mt-1">
                        {s.playerName || 'Joueur inconnu'}
                      </div>
                      <div className="mt-1 flex items-center gap-3 overflow-hidden">
                        <span className="verge-label-mono text-[8px] text-[#666]">
                          <span className="text-white/60">{s.shotDistance?.toFixed(1)}m</span> • {s.body_part_name || s.bodyPart || 'Pied'}
                        </span>
                        {Number.isFinite(Number(s.xG)) && (
                          <span className="verge-label-mono text-[8px] text-[#3cffd0] font-black">
                            xG {Number(s.xG).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist?.(s);
                    }}
                    className="p-2 text-slate-400 transition-all transform hover:scale-110 hover:text-[#3cffd0]"
                    title="Ajouter a une playlist"
                  >
                    <ListPlus size={18} />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const evId = s.opta_id || s.id;
                      setGeneratingEventId(evId);
                      try {
                        await onPlayVideo?.(s);
                      } finally {
                        setGeneratingEventId(null);
                      }
                    }}
                    disabled={generatingEventId === (s.opta_id || s.id)}
                    className={`p-2 transition-all transform hover:scale-110 ${
                      generatingEventId === (s.opta_id || s.id) ? 'text-[#3cffd0]' : 'text-slate-400 hover:text-[#3cffd0]'
                    }`}
                  >
                    {generatingEventId === (s.opta_id || s.id) ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <PlayCircle size={20} />
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center opacity-10">
              <Database size={32} />
            </div>
          )}
        </div>
      </aside>
    </div>
  </div>
  );
};

export default ShotMapExplorer;
