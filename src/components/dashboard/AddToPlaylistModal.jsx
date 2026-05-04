import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Database, ListPlus, Loader2, Plus, X } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';

const parseAdvancedMetrics = (item) => {
  const raw = item?.advanced_metrics || {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw && typeof raw === 'object' ? raw : {};
};

const getPlaylistPayload = (item) => {
  const metrics = parseAdvancedMetrics(item);
  const isSequence = item?.item_kind === 'sequence'
    || item?.seq_uuid
    || (Array.isArray(item?.events) && item.events.length > 0);
  const matchId = item?.match_id || item?.matchId || item?.events?.[0]?.match_id || item?.events?.[0]?.matchId;
  const optaId = item?.opta_id || item?.event_id || (!isSequence ? item?.id : null);
  const subSequenceId = item?.sub_sequence_id || metrics?.sub_sequence_id || metrics?.possession_id || (isSequence ? item?.id : null);

  return {
    match_id: matchId ? String(matchId) : '',
    opta_id: !isSequence && optaId ? String(optaId) : null,
    sub_sequence_id: isSequence && subSequenceId ? String(subSequenceId) : null,
    type_action: item?.type_action || item?.type_name || item?.type || (isSequence ? 'Sequence' : 'Event')
  };
};

const getPlaylistPayloads = (item) => {
  if (item?.item_kind === 'event_batch') {
    const events = Array.isArray(item?.events) ? item.events : [];
    return events.map(getPlaylistPayload);
  }
  return [getPlaylistPayload(item)];
};

const isValidPlaylistPayload = (payload) => (
  payload?.match_id && (payload?.opta_id || payload?.sub_sequence_id)
);

const AddToPlaylistModal = ({ isOpen, item, onClose, onAdded }) => {
  const [playlists, setPlaylists] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [error, setError] = useState(null);
  const [successId, setSuccessId] = useState(null);

  const payloads = useMemo(() => getPlaylistPayloads(item), [item]);
  const isBatch = item?.item_kind === 'event_batch';
  const itemLabel = isBatch
    ? `${payloads.length} events selectionnes`
    : (item?.playerName || item?.type_name || item?.type_action || item?.type || 'Action');

  const fetchPlaylists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || 'PLAYLISTS_FETCH_FAILED');
      setPlaylists(json.playlists || []);
    } catch (err) {
      setError(err.message || 'Erreur chargement playlists');
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setSuccessId(null);
    fetchPlaylists();
  }, [isOpen]);

  const postPayload = async (playlistId, payload) => {
    const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists/${playlistId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.detail || 'PLAYLIST_ITEM_ADD_FAILED');
    return json;
  };

  const addItem = async (playlistId) => {
    const validPayloads = payloads.filter(isValidPlaylistPayload);
    if (validPayloads.length === 0) {
      setError('Item invalide: match_id et opta_id/sub_sequence_id requis.');
      return;
    }

    setSubmittingId(playlistId);
    setError(null);
    try {
      const added = [];
      const failed = [];
      const chunkSize = 6;
      for (let start = 0; start < validPayloads.length; start += chunkSize) {
        const chunk = validPayloads.slice(start, start + chunkSize);
        const results = await Promise.allSettled(chunk.map((payload) => postPayload(playlistId, payload)));
        results.forEach((result) => {
          if (result.status === 'fulfilled') added.push(result.value);
          else failed.push(result.reason);
        });
      }

      if (added.length === 0) {
        throw new Error(failed[0]?.message || 'PLAYLIST_ITEM_ADD_FAILED');
      }

      setSuccessId(playlistId);
      onAdded?.({ playlist_id: playlistId, added_count: added.length, failed_count: failed.length, items: added });
      await fetchPlaylists();
      if (failed.length > 0) {
        setError(`${added.length} ajoutes, ${failed.length} ignores.`);
      }
    } catch (err) {
      setError(err.message || 'Erreur ajout playlist');
    } finally {
      setSubmittingId(null);
    }
  };

  const createAndAdd = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Nom de playlist requis.');
      return;
    }

    setSubmittingId('new');
    setError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName })
      });
      const playlist = await response.json();
      if (!response.ok) throw new Error(playlist.detail || 'PLAYLIST_CREATE_FAILED');
      setName('');
      await addItem(playlist.id);
    } catch (err) {
      setError(err.message || 'Erreur creation playlist');
      setSubmittingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[700] bg-black/70 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="fixed left-1/2 top-1/2 z-[701] w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[8px] border border-white/15 bg-[#151515]/90 text-white shadow-[0_40px_140px_rgba(0,0,0,0.75)] backdrop-blur-2xl ring-1 ring-[#3cffd0]/10"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#3cffd0] text-black">
                  <ListPlus size={18} />
                </div>
                <div>
                  <div className="verge-label-mono text-[10px] font-black uppercase tracking-[0.25em] text-white">Ajouter a une playlist</div>
                  <div className="mt-1 truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494]">{itemLabel}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#949494] transition-all hover:bg-red-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nouvelle playlist"
                  className="h-12 rounded-[3px] border border-white/10 bg-black/40 px-4 verge-label-mono text-[10px] font-black uppercase tracking-[0.18em] text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#3cffd0]/70"
                />
                <button
                  type="button"
                  onClick={createAndAdd}
                  disabled={submittingId !== null}
                  className="flex h-12 items-center gap-2 rounded-[3px] border border-[#3cffd0]/40 bg-[#3cffd0] px-5 verge-label-mono text-[9px] font-black uppercase tracking-[0.2em] text-black transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {submittingId === 'new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Creer
                </button>
              </div>

              <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1 styled-scrollbar-verge">
                {loading ? (
                  <div className="flex h-32 items-center justify-center text-[#3cffd0]">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                ) : playlists.length > 0 ? (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => addItem(playlist.id)}
                      disabled={submittingId !== null}
                      className="group flex w-full items-center justify-between rounded-[3px] border border-white/10 bg-black/30 px-4 py-3 text-left transition-all hover:border-[#3cffd0]/60 hover:bg-[#3cffd0]/10 disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <div className="truncate verge-label-mono text-[10px] font-black uppercase tracking-[0.2em] text-white group-hover:text-[#3cffd0]">{playlist.name}</div>
                        <div className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#666]">{playlist.item_count || 0} items</div>
                      </div>
                      {submittingId === playlist.id ? (
                        <Loader2 size={16} className="animate-spin text-[#3cffd0]" />
                      ) : successId === playlist.id ? (
                        <Check size={16} className="text-[#3cffd0]" />
                      ) : (
                        <ListPlus size={16} className="text-[#949494] group-hover:text-[#3cffd0]" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center rounded-[3px] border border-white/10 bg-black/20 text-[#444]">
                    <Database size={22} />
                    <div className="mt-3 verge-label-mono text-[8px] font-black uppercase tracking-[0.25em]">Aucune playlist</div>
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-[3px] border border-[#ff4d4d]/30 bg-[#ff4d4d]/10 px-4 py-3 verge-label-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#ff8a8a]">
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddToPlaylistModal;
