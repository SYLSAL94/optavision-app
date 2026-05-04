import React, { useEffect, useMemo, useState } from 'react';
import { Database, Film, ListMusic, Loader2, Map, PlayCircle, RefreshCcw, Save, Scissors, Search, Trash2 } from 'lucide-react';
import { TacticalPitch } from './TacticalPitch';
import { usePitchProjection } from '../../hooks/usePitchProjection';
import { API_BASE_URL, OPTAVISION_API_URL } from '../../config';
import { pollVideoJob } from '../../utils/videoJobs';

const DEFAULT_TRIM_BEFORE = 5;
const DEFAULT_TRIM_AFTER = 8;

const parseAdvancedMetrics = (item) => {
  const raw = item?.advanced_metrics || {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw && typeof raw === 'object' ? raw : {};
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const getEndCoordinates = (item) => {
  const metrics = parseAdvancedMetrics(item);
  const x = toNumber(item?.end_x ?? metrics.end_x ?? metrics.endX);
  const y = toNumber(item?.end_y ?? metrics.end_y ?? metrics.endY);
  return x !== null && y !== null ? { x, y } : null;
};

const getItemLabel = (item) => (
  item?.type_action
  || item?.type_name
  || item?.type
  || (item?.item_kind === 'sequence' ? 'Sequence' : 'Action')
);

const getItemPlayer = (item) => (
  item?.playerName
  || item?.seq_team
  || item?.teamName
  || item?.team_id
  || 'Collectif'
);

const getItemClock = (item) => {
  if (item?.start_time && item?.end_time) return `${item.start_time} - ${item.end_time}`;
  const minute = item?.minute ?? item?.min;
  const sec = item?.sec ?? item?.second;
  if (minute === null || minute === undefined) return '--';
  return `${minute}'${sec ? String(sec).padStart(2, '0') : ''}`;
};

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const parseClockSeconds = (value) => {
  if (!value) return null;
  const match = String(value).match(/(\d+)'(\d+)/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const formatSecondsClock = (seconds) => {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) return '--';
  const safeSeconds = Math.max(0, Math.round(numeric));
  const minute = Math.floor(safeSeconds / 60);
  const second = safeSeconds % 60;
  return `${minute}'${String(second).padStart(2, '0')}`;
};

const formatMetric = (value, digits = 2, suffix = '') => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(digits)}${suffix}` : '--';
};

const getItemMatch = (item) => (
  item?.match_name
  || item?.matchName
  || item?.match_id
  || 'Match inconnu'
);

const getMetricValue = (item, keys) => {
  const metrics = parseAdvancedMetrics(item);
  for (const key of keys) {
    const value = item?.[key] ?? metrics?.[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const getItemDetails = (item) => {
  const end = getEndCoordinates(item);
  const startX = toNumber(item?.x);
  const startY = toNumber(item?.y);
  const details = [];

  if (item?.item_kind === 'sequence') {
    details.push(['Score', formatMetric(item?.seq_score, 3)]);
    details.push(['Passes', item?.seq_pass_count ?? '--']);
    details.push(['Actions', item?.seq_actions_count ?? item?.events?.length ?? '--']);
    details.push(['xT', formatMetric(item?.seq_total_xt, 3)]);
  } else {
    details.push(['xT', formatMetric(getMetricValue(item, ['xT_credit', 'xT', 'xT_raw']), 3)]);
    details.push(['Dist.', formatMetric(getMetricValue(item, ['distance_m', 'pass_distance_m', 'carry_distance_m']), 1, 'm')]);
    details.push(['Prog.', formatMetric(getMetricValue(item, ['prog_dist', 'progressive_distance']), 1, 'm')]);
    details.push(['Resultat', String(item?.outcome ?? '--')]);
  }

  if (startX !== null && startY !== null) {
    details.push(['Start', `${startX.toFixed(1)}, ${startY.toFixed(1)}`]);
  }
  if (end) {
    details.push(['End', `${end.x.toFixed(1)}, ${end.y.toFixed(1)}`]);
  }
  if (item?.trim_before_seconds !== null && item?.trim_before_seconds !== undefined) {
    details.push(['Trim', `-${Number(item.trim_before_seconds).toFixed(0)}s/+${Number(item.trim_after_seconds ?? 0).toFixed(0)}s`]);
  }

  return details.filter(([, value]) => value !== null && value !== undefined && value !== '');
};

const getVideoEventId = (event) => event?.opta_id || event?.event_id || event?.id || null;

const getItemVideoPayload = (item, trim) => {
  if (!item) return null;
  const isSequence = Array.isArray(item.events) && item.events.length > 0;
  const firstEvent = isSequence ? item.events[0] : item;
  const lastEvent = isSequence ? item.events[item.events.length - 1] : null;
  const eventId = getVideoEventId(firstEvent);
  const matchId = firstEvent?.match_id || firstEvent?.matchId || item?.match_id || item?.matchId;

  if (!matchId || !eventId) return null;

  const numericStart = Number(item.start_seconds ?? item.sequence_start_seconds);
  const numericEnd = Number(item.end_seconds ?? item.sequence_end_seconds);
  const sequenceStart = Number.isFinite(numericStart)
    ? numericStart
    : (parseClockSeconds(item.start_time) ?? (Number(firstEvent?.minute ?? firstEvent?.min ?? 0) * 60 + Number(firstEvent?.sec ?? firstEvent?.second ?? 0)));
  const sequenceEnd = Number.isFinite(numericEnd)
    ? numericEnd
    : (parseClockSeconds(item.end_time) ?? (Number(lastEvent?.minute ?? lastEvent?.min ?? 0) * 60 + Number(lastEvent?.sec ?? lastEvent?.second ?? 0)));

  return {
    match_id: matchId,
    event_id: eventId,
    before_buffer: Number(trim.before || 0),
    after_buffer: Number(trim.after || 0),
    min_clip_gap: 0.5,
    force_rebuild: true,
    ...(isSequence ? {
      event_ids: item.events.map(getVideoEventId).filter(Boolean),
      sequence_id: item.sub_sequence_id || item.seq_uuid || item.playlist_item_id || item.id,
      sequence_start_seconds: sequenceStart,
      sequence_end_seconds: sequenceEnd,
    } : {})
  };
};

const itemColor = (item) => {
  const label = String(getItemLabel(item)).toLowerCase();
  if (item?.item_kind === 'sequence') return '#ffd03c';
  if (label.includes('shot') || label.includes('goal') || label.includes('tir')) return '#ff4d4d';
  if (label.includes('carry')) return '#8be9fd';
  return '#3cffd0';
};

const PlaylistSpatialLayer = ({ items, selectedItem, onSelect, projectPoint }) => (
  <g>
    {items.map((item, index) => {
      const x = toNumber(item.x);
      const y = toNumber(item.y);
      if (x === null || y === null) return null;
      const start = projectPoint(x, y);
      const endRaw = getEndCoordinates(item);
      const end = endRaw ? projectPoint(endRaw.x, endRaw.y) : null;
      if (!start) return null;

      const selected = String(selectedItem?.playlist_item_id || selectedItem?.id) === String(item.playlist_item_id || item.id);
      const color = itemColor(item);
      return (
        <g
          key={item.playlist_item_id || item.id || index}
          className="cursor-pointer pointer-events-auto"
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(item);
          }}
        >
          {end && (
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={color}
              strokeWidth={selected ? 0.85 : 0.45}
              strokeOpacity={selected ? 0.95 : 0.42}
              strokeLinecap="round"
            />
          )}
          <circle
            cx={start.x}
            cy={start.y}
            r={selected ? 1.8 : 1.15}
            fill={color}
            fillOpacity={selected ? 1 : 0.74}
            stroke={selected ? '#ffffff' : '#050505'}
            strokeWidth={selected ? 0.45 : 0.25}
          />
          {selected && (
            <circle
              cx={start.x}
              cy={start.y}
              r="3"
              fill="transparent"
              stroke={color}
              strokeWidth="0.28"
              strokeOpacity="0.55"
            />
          )}
        </g>
      );
    })}
  </g>
);

const PlaylistExplorer = ({ onPlayVideo, isVideoLoading = false }) => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [playingItemId, setPlayingItemId] = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [activeSurface, setActiveSurface] = useState('map');
  const [trimBefore, setTrimBefore] = useState(DEFAULT_TRIM_BEFORE);
  const [trimAfter, setTrimAfter] = useState(DEFAULT_TRIM_AFTER);
  const [savingTrim, setSavingTrim] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState(null);
  const [localVideoLoading, setLocalVideoLoading] = useState(false);
  const [localVideoError, setLocalVideoError] = useState(null);
  const [error, setError] = useState(null);
  const { projectPoint } = usePitchProjection('horizontal');

  const selectedPlaylist = useMemo(
    () => playlists.find((playlist) => String(playlist.id) === String(selectedPlaylistId)),
    [playlists, selectedPlaylistId]
  );

  const filteredPlaylists = useMemo(() => {
    const query = playlistSearch.trim().toLowerCase();
    if (!query) return playlists;
    return playlists.filter((playlist) => String(playlist.name || '').toLowerCase().includes(query));
  }, [playlists, playlistSearch]);

  const selectOptions = useMemo(() => {
    if (!selectedPlaylist) return filteredPlaylists;
    const hasSelected = filteredPlaylists.some((playlist) => String(playlist.id) === String(selectedPlaylist.id));
    return hasSelected ? filteredPlaylists : [selectedPlaylist, ...filteredPlaylists];
  }, [filteredPlaylists, selectedPlaylist]);

  const playlistTotals = useMemo(() => ({
    playlists: playlists.length,
    totalItems: playlists.reduce((sum, playlist) => sum + Number(playlist.item_count || 0), 0),
    selectedItems: Number(selectedPlaylist?.item_count || items.length || 0),
    hydratedItems: items.length,
  }), [items.length, playlists, selectedPlaylist]);

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    setError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || 'PLAYLISTS_FETCH_FAILED');
      const nextPlaylists = json.playlists || [];
      setPlaylists(nextPlaylists);
      setSelectedPlaylistId((current) => (
        nextPlaylists.some((playlist) => String(playlist.id) === String(current))
          ? current
          : nextPlaylists[0]?.id || null
      ));
    } catch (err) {
      setError(err.message || 'Erreur playlists');
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const fetchItems = async (playlistId) => {
    if (!playlistId) {
      setItems([]);
      setSelectedItem(null);
      return;
    }

    setLoadingItems(true);
    setError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists/${playlistId}/items`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || 'PLAYLIST_ITEMS_FETCH_FAILED');
      const nextItems = json.items || [];
      setItems(nextItems);
      setSelectedItem(nextItems[0] || null);
    } catch (err) {
      setError(err.message || 'Erreur items playlist');
      setItems([]);
      setSelectedItem(null);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    fetchItems(selectedPlaylistId);
  }, [selectedPlaylistId]);

  useEffect(() => {
    setLocalVideoUrl(null);
    setLocalVideoError(null);
    setTrimBefore(Number(selectedItem?.trim_before_seconds ?? DEFAULT_TRIM_BEFORE));
    setTrimAfter(Number(selectedItem?.trim_after_seconds ?? DEFAULT_TRIM_AFTER));
  }, [selectedItem?.playlist_item_id, selectedItem?.id]);

  const hasSavedTrim = selectedItem?.trim_before_seconds !== null
    && selectedItem?.trim_before_seconds !== undefined
    && selectedItem?.trim_after_seconds !== null
    && selectedItem?.trim_after_seconds !== undefined;
  const hasTrimChanges = Boolean(selectedItem) && (
    Number(trimBefore) !== Number(selectedItem?.trim_before_seconds ?? DEFAULT_TRIM_BEFORE)
    || Number(trimAfter) !== Number(selectedItem?.trim_after_seconds ?? DEFAULT_TRIM_AFTER)
  );

  const selectedVideoPayload = useMemo(
    () => getItemVideoPayload(selectedItem, { before: trimBefore, after: trimAfter }),
    [selectedItem, trimAfter, trimBefore]
  );

  const previewStart = selectedItem?.item_kind === 'sequence'
    ? toNumber(selectedItem?.start_seconds ?? selectedItem?.sequence_start_seconds)
    : (Number(selectedItem?.minute ?? selectedItem?.min ?? 0) * 60 + Number(selectedItem?.sec ?? selectedItem?.second ?? 0));
  const previewEnd = selectedItem?.item_kind === 'sequence'
    ? toNumber(selectedItem?.end_seconds ?? selectedItem?.sequence_end_seconds)
    : previewStart;
  const finalPreviewStart = Number.isFinite(previewStart) ? Math.max(0, previewStart - Number(trimBefore || 0)) : null;
  const finalPreviewEnd = Number.isFinite(previewEnd) ? previewEnd + Number(trimAfter || 0) : null;

  const handleGenerateLocalVideo = async (item = selectedItem, event) => {
    event?.stopPropagation();
    const itemId = item?.playlist_item_id || item?.id;
    const payload = getItemVideoPayload(item, { before: trimBefore, after: trimAfter });
    if (!payload) {
      setLocalVideoError('Clip invalide: match_id/event_id manquant.');
      setActiveSurface('video');
      return;
    }

    setSelectedItem(item);
    setActiveSurface('video');
    setPlayingItemId(itemId);
    setLocalVideoLoading(true);
    setLocalVideoError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.detail || 'Erreur generation clip');

      const videoUrl = json.video_url || (json.job_id ? await pollVideoJob(json.job_id) : null);
      if (!videoUrl) throw new Error('Aucune URL video retournee.');
      setLocalVideoUrl(videoUrl);
    } catch (err) {
      setLocalVideoError(err.message || 'Erreur lecteur playlist');
    } finally {
      setPlayingItemId(null);
      setLocalVideoLoading(false);
    }
  };

  const handlePlay = async (item, event) => {
    event?.stopPropagation();
    if (!item) return;
    await handleGenerateLocalVideo(item, event);
  };

  const handleDeleteItem = async (item, event) => {
    event?.stopPropagation();
    if (!item || !selectedPlaylistId) return;
    const itemId = item.playlist_item_id || item.id;
    if (!itemId) return;
    const confirmed = window.confirm('Retirer ce clip de la playlist ?');
    if (!confirmed) return;

    setDeletingItemId(itemId);
    setError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists/${selectedPlaylistId}/items/${itemId}`, {
        method: 'DELETE'
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.detail || 'PLAYLIST_ITEM_DELETE_FAILED');

      setItems((currentItems) => {
        const nextItems = currentItems.filter((current) => String(current.playlist_item_id || current.id) !== String(itemId));
        setSelectedItem((currentSelected) => {
          if (String(currentSelected?.playlist_item_id || currentSelected?.id) !== String(itemId)) return currentSelected;
          return nextItems[0] || null;
        });
        return nextItems;
      });
      setPlaylists((currentPlaylists) => currentPlaylists.map((playlist) => (
        String(playlist.id) === String(selectedPlaylistId)
          ? { ...playlist, item_count: Math.max(0, Number(playlist.item_count || 0) - 1) }
          : playlist
      )));
    } catch (err) {
      setError(err.message || 'Erreur suppression item');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleSaveTrim = async () => {
    if (!selectedItem || !selectedPlaylistId) return;
    const itemId = selectedItem.playlist_item_id || selectedItem.id;
    if (!itemId) return;

    setSavingTrim(true);
    setLocalVideoError(null);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/playlists/${selectedPlaylistId}/items/${itemId}/trim`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trim_before_seconds: Number(trimBefore),
          trim_after_seconds: Number(trimAfter),
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.detail || 'TRIM_SAVE_FAILED');

      const patch = {
        trim_before_seconds: json.trim_before_seconds,
        trim_after_seconds: json.trim_after_seconds,
        trim_updated_at: json.trim_updated_at,
      };
      setSelectedItem((current) => current ? { ...current, ...patch } : current);
      setItems((currentItems) => currentItems.map((item) => (
        String(item.playlist_item_id || item.id) === String(itemId)
          ? { ...item, ...patch }
          : item
      )));
    } catch (err) {
      setLocalVideoError(err.message || 'Erreur sauvegarde rognage');
    } finally {
      setSavingTrim(false);
    }
  };

  return (
    <div className="h-full w-full overflow-hidden bg-[#050505] p-6 lg:p-8">
      <div className="mx-auto grid h-full w-full max-w-[1800px] grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[4px] border border-white/10 bg-[#1a1a1a] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#2d2d2d] px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#3cffd0] text-black">
                <ListMusic size={18} />
              </div>
              <div>
                <h2 className="verge-label-mono text-[11px] font-black uppercase tracking-[0.25em] text-white">Playlist</h2>
                <p className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#3cffd0]">spatial review board</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchPlaylists}
              disabled={loadingPlaylists}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[#949494] transition-all hover:border-[#3cffd0] hover:text-[#3cffd0] disabled:opacity-50"
            >
              {loadingPlaylists ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
            </button>
          </div>

          <div className="shrink-0 space-y-4 border-b border-white/10 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="verge-label-mono text-[8px] font-black uppercase tracking-[0.25em] text-[#949494]">
                  Playlist active
                </label>
                <span className="verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#3cffd0]">
                  {playlistTotals.playlists} listes
                </span>
              </div>
              <select
                value={selectedPlaylistId || ''}
                onChange={(event) => setSelectedPlaylistId(event.target.value || null)}
                disabled={loadingPlaylists || playlists.length === 0}
                className="h-12 w-full rounded-[3px] border border-white/10 bg-black/40 px-4 verge-label-mono text-[10px] font-black uppercase tracking-[0.18em] text-white outline-none transition-colors focus:border-[#3cffd0]/70 disabled:opacity-40"
              >
                <option value="" className="bg-[#131313] text-white">Aucune playlist</option>
                {selectOptions.map((playlist) => (
                  <option key={playlist.id} value={playlist.id} className="bg-[#131313] text-white">
                    {playlist.name} - {playlist.item_count || 0} items
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3cffd0]" />
              <input
                value={playlistSearch}
                onChange={(event) => setPlaylistSearch(event.target.value)}
                placeholder="Filtrer les playlists"
                className="h-10 w-full rounded-[3px] border border-white/10 bg-black/25 pl-9 pr-3 verge-label-mono text-[9px] font-black uppercase tracking-[0.16em] text-white outline-none placeholder:text-[#555] focus:border-[#3cffd0]/60"
              />
            </div>

            {selectedPlaylist && (
              <div className="rounded-[3px] border border-[#3cffd0]/25 bg-[#3cffd0]/10 p-4">
                <div className="truncate verge-label-mono text-[10px] font-black uppercase tracking-[0.22em] text-white">
                  {selectedPlaylist.name}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ['Items', playlistTotals.selectedItems],
                    ['Hydrates', playlistTotals.hydratedItems],
                    ['Creee', formatDate(selectedPlaylist.created_at)],
                    ['Total DB', playlistTotals.totalItems],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[2px] border border-white/10 bg-black/25 px-3 py-2">
                      <div className="verge-label-mono text-[7px] font-black uppercase tracking-[0.2em] text-[#949494]">{label}</div>
                      <div className="mt-1 truncate verge-label-mono text-[10px] font-black uppercase text-[#3cffd0]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loadingPlaylists && playlists.length === 0 && (
              <div className="flex h-20 flex-col items-center justify-center rounded-[3px] border border-white/10 bg-black/20 text-[#444]">
                <Database size={20} />
                <div className="mt-3 verge-label-mono text-[8px] font-black uppercase tracking-[0.25em]">Aucune playlist</div>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <div className="truncate verge-label-mono text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  {selectedPlaylist?.name || 'Selection'}
                </div>
                <div className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494]">
                  {items.length} clips hydrates - {items.filter((item) => item.item_kind === 'sequence').length} sequences
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto styled-scrollbar-verge">
              {loadingItems ? (
                <div className="flex h-full items-center justify-center text-[#3cffd0]">
                  <Loader2 size={26} className="animate-spin" />
                </div>
              ) : items.length > 0 ? (
                items.map((item, index) => {
                  const selected = String(selectedItem?.playlist_item_id || selectedItem?.id) === String(item.playlist_item_id || item.id);
                  const currentId = item.playlist_item_id || item.id;
                  const details = getItemDetails(item);
                  const color = itemColor(item);
                  return (
                    <button
                      key={currentId || index}
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className={`group flex w-full items-start justify-between gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition-all ${selected ? 'bg-[#3cffd0]/10 border-l-2 border-l-[#3cffd0]' : 'hover:bg-[#3cffd0]/5'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span
                            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}66` }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="shrink-0 verge-label-mono text-[8px] font-black text-[#3cffd0]">{getItemClock(item)}</span>
                              <span className="truncate verge-label-mono text-[9px] font-black uppercase tracking-[0.12em] text-white">{getItemLabel(item)}</span>
                            </div>
                            <div className="mt-0.5 truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.12em] text-[#949494]">
                              {getItemPlayer(item)}
                            </div>
                            <div className="mt-0.5 truncate verge-label-mono text-[7px] font-black uppercase tracking-[0.12em] text-[#666]">
                              {getItemMatch(item)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {details.slice(0, 4).map(([label, value]) => (
                            <span key={`${currentId}-${label}`} className="rounded-[2px] border border-white/10 bg-black/25 px-2 py-1 verge-label-mono text-[7px] font-black uppercase tracking-[0.1em] text-[#949494]">
                              <span className="text-[#555]">{label}</span>
                              <span className="ml-1 text-white">{value}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <span
                          onClick={(event) => handlePlay(item, event)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[#949494] transition-all hover:border-[#3cffd0] hover:text-[#3cffd0]"
                          title="Lancer la video"
                        >
                          {playingItemId === currentId || isVideoLoading ? <Loader2 size={13} className="animate-spin" /> : <PlayCircle size={16} />}
                        </span>
                        <span
                          onClick={(event) => handleDeleteItem(item, event)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/30 text-[#666] transition-all hover:border-[#ff4d4d]/60 hover:text-[#ff4d4d]"
                          title="Retirer de la playlist"
                        >
                          {deletingItemId === currentId ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-[#333]">
                  <Database size={30} />
                  <div className="mt-4 verge-label-mono text-[9px] font-black uppercase tracking-[0.25em]">Aucun item</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="relative min-h-0 overflow-hidden rounded-[4px] border border-white/10 bg-[#101010] shadow-2xl">
          <div className="absolute left-6 top-6 z-30 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-[3px] border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-xl">
              <div className="h-2 w-2 rounded-full bg-[#3cffd0]" />
              <div>
                <div className="verge-label-mono text-[9px] font-black uppercase tracking-[0.25em] text-white">
                  {activeSurface === 'map' ? 'Projection spatiale' : 'Lecteur integre'}
                </div>
                <div className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.2em] text-[#949494]">
                  {selectedItem ? getItemLabel(selectedItem) : 'Aucun item selectionne'}
                </div>
              </div>
            </div>
            <div className="flex rounded-[3px] border border-white/10 bg-black/55 p-1 backdrop-blur-xl">
              {[
                ['map', 'Map', Map],
                ['video', 'Lecteur', Film],
              ].map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveSurface(value)}
                  className={`flex items-center gap-2 rounded-[2px] px-3 py-2 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] transition-all ${activeSurface === value ? 'bg-[#3cffd0] text-black' : 'text-[#949494] hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeSurface === 'map' ? (
            <TacticalPitch
              orientation="horizontal"
              view="full"
              style={{ grass: '#111827', line: 'rgba(255,255,255,0.16)', background: '#050505' }}
              onClick={() => setSelectedItem(null)}
            >
              <PlaylistSpatialLayer
                items={items}
                selectedItem={selectedItem}
                onSelect={setSelectedItem}
                projectPoint={projectPoint}
              />
            </TacticalPitch>
          ) : (
            <div className="absolute inset-0 flex flex-col bg-[#050505] p-6 pt-28">
              <div className="min-h-0 flex-1 overflow-hidden rounded-[4px] border border-white/10 bg-black shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
                {localVideoLoading ? (
                  <div className="flex h-full flex-col items-center justify-center text-[#3cffd0]">
                    <Loader2 size={34} className="animate-spin" />
                    <div className="mt-5 verge-label-mono text-[9px] font-black uppercase tracking-[0.25em]">Generation du clip rogne</div>
                  </div>
                ) : localVideoUrl ? (
                  <video
                    key={localVideoUrl}
                    src={localVideoUrl}
                    controls
                    autoPlay
                    className="h-full w-full bg-black object-contain"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                    <Film size={42} className="text-[#3cffd0]/50" />
                    <div className="mt-5 verge-label-mono text-[11px] font-black uppercase tracking-[0.25em] text-white">
                      Lecteur playlist pret
                    </div>
                    <div className="mt-3 max-w-xl text-xs leading-relaxed text-[#949494]">
                      Selectionne un item, ajuste les marges avant/apres, puis genere le clip pour le previsualiser ici.
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid shrink-0 grid-cols-1 gap-4 rounded-[4px] border border-white/10 bg-[#1a1a1a] p-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="verge-label-mono text-[9px] font-black uppercase tracking-[0.25em] text-white">Rognage temporel</div>
                      <div className="mt-1 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494]">
                        Fenetre: {formatSecondsClock(finalPreviewStart)} - {formatSecondsClock(finalPreviewEnd)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-[2px] border border-white/10 bg-black/30 px-3 py-2 text-[#3cffd0]">
                      <Scissors size={13} />
                      <span className="verge-label-mono text-[8px] font-black uppercase tracking-[0.18em]">Trim</span>
                    </div>
                  </div>

                  {[
                    ['Avant action', trimBefore, setTrimBefore, `-${trimBefore}s`],
                    ['Apres action', trimAfter, setTrimAfter, `+${trimAfter}s`],
                  ].map(([label, value, setter, display]) => (
                    <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)_54px] items-center gap-3">
                      <label className="verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494]">{label}</label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        step="1"
                        value={value}
                        onChange={(event) => setter(Number(event.target.value))}
                        className="accent-[#3cffd0]"
                      />
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={value}
                        onChange={(event) => setter(Math.max(0, Number(event.target.value) || 0))}
                        className="h-8 rounded-[2px] border border-white/10 bg-black/40 px-2 text-right verge-label-mono text-[9px] font-black text-white outline-none focus:border-[#3cffd0]/60"
                        title={display}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col justify-between gap-3">
                  <div className="rounded-[2px] border border-white/10 bg-black/25 p-3">
                    <div className="truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494]">{getItemPlayer(selectedItem)}</div>
                    <div className="mt-1 truncate verge-label-mono text-[10px] font-black uppercase tracking-[0.14em] text-white">{selectedItem ? getItemLabel(selectedItem) : 'Aucun clip'}</div>
                    <div className="mt-1 truncate verge-label-mono text-[8px] font-black uppercase tracking-[0.14em] text-[#666]">{selectedItem ? getItemClock(selectedItem) : '--'}</div>
                    <div className={`mt-2 verge-label-mono text-[7px] font-black uppercase tracking-[0.16em] ${hasSavedTrim ? 'text-[#3cffd0]' : 'text-[#666]'}`}>
                      {hasSavedTrim ? 'Rognage sauvegarde' : 'Rognage par defaut'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveTrim}
                    disabled={!selectedItem || savingTrim || !hasTrimChanges}
                    className="flex h-10 items-center justify-center gap-2 rounded-[3px] border border-white/10 bg-black/40 px-4 verge-label-mono text-[8px] font-black uppercase tracking-[0.18em] text-[#949494] transition-all hover:border-[#3cffd0]/50 hover:text-[#3cffd0] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingTrim ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateLocalVideo(selectedItem)}
                    disabled={!selectedVideoPayload || localVideoLoading}
                    className="flex h-11 items-center justify-center gap-2 rounded-[3px] border border-[#3cffd0]/40 bg-[#3cffd0] px-4 verge-label-mono text-[9px] font-black uppercase tracking-[0.2em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {localVideoLoading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={15} />}
                    Generer
                  </button>
                </div>
              </div>

              {localVideoError && (
                <div className="mt-3 rounded-[3px] border border-[#ff4d4d]/30 bg-[#ff4d4d]/10 px-4 py-3 verge-label-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#ff8a8a]">
                  {localVideoError}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="absolute bottom-6 left-6 right-6 z-30 rounded-[3px] border border-[#ff4d4d]/30 bg-[#ff4d4d]/10 px-4 py-3 verge-label-mono text-[9px] font-black uppercase tracking-[0.16em] text-[#ff8a8a]">
              {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PlaylistExplorer;
