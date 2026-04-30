import React from 'react';

export const EventTooltip = ({ hoveredEvent, focusedEvent, mousePos, globalPlayerMap, onPlayVideo, isVideoLoading = false }) => {
  const activeEvent = focusedEvent || hoveredEvent;
  const isFocused = Boolean(focusedEvent);
  if (!activeEvent) return null;

  let parsed = activeEvent.advanced_metrics;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch(e) { parsed = {}; }
  }
  const typeName = parsed?.type_name || activeEvent.type || activeEvent.type_id;
  const typeStr = String(typeName);
  
  const getPlayerName = (id) => {
    if (!id) return null;
    const strId = String(id);
    return globalPlayerMap[strId] || strId;
  };

  const opponentName = getPlayerName(parsed?.opponent_id);
  const receiverId = parsed?.receiver || activeEvent.receiver || activeEvent.receiverName;
  const receiverNameTooltip = getPlayerName(receiverId);
  
  const isProgressive = parsed?.is_progressive;
  const duelWon = parsed?.duel_won;
  const hasDuelResult = typeof duelWon !== 'undefined';
  
  const isPass = typeStr === 'Pass';
  const isDuel = ['TakeOn', 'Tackle', 'Aerial', 'Challenge'].includes(typeStr);
  const isShot = ['Shot', 'Goal', 'SavedShot', 'MissedShots'].includes(typeStr);

  return (
    <div 
      style={{ left: mousePos.x + 15, top: mousePos.y + 15 }} 
      className={`fixed z-50 w-64 p-3 rounded-lg shadow-2xl backdrop-blur-xl bg-[#131313]/95 border border-slate-700 text-white text-xs flex flex-col gap-2 ${isFocused ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className="font-bold border-b border-white/10 pb-1 mb-1">
        {activeEvent.playerName || 'Joueur inconnu'} <span className="text-[#949494]">| {typeStr}</span>
      </div>
      
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
      {isFocused && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlayVideo?.(focusedEvent);
          }}
          disabled={isVideoLoading}
          className="mt-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-900 disabled:text-sky-200 text-white font-bold py-1 px-3 rounded text-center cursor-pointer disabled:cursor-wait transition-colors"
        >
          {isVideoLoading ? "Découpe en cours..." : "🎬 Lancer la vidéo"}
        </button>
      )}
    </div>
  );
};
