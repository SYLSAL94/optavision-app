import React, { useState, useEffect, useMemo } from 'react';
import {
  Video,
  Settings,
  Check,
  AlertCircle,
  Database,
  Clock,
  ArrowRight,
  Loader2,
  Save,
  Search,
  X
} from 'lucide-react';

import { API_BASE_URL } from '../../config';

const VideoSettingsPanel = ({ onClose }) => {
  const [unassignedMatches, setUnassignedMatches] = useState([]);
  const [availableVideos, setAvailableVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', msg: '' }
  const [matchSearch, setMatchSearch] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');

  const [formData, setFormData] = useState({
    match_id: '',
    r2_video_key_m1: '',
    r2_video_key_m2: '',
    half1: '00:00',
    half2: '00:00'
  });

  const inputClassName = "w-full bg-[#0b0b0b]/80 border border-white/10 p-5 verge-label-mono text-[11px] text-white outline-none focus:border-[#3cffd0] focus:ring-1 focus:ring-[#3cffd0]/40 focus:shadow-[0_0_24px_rgba(60,255,208,0.12)] transition-all rounded-[2px] placeholder:text-white/20 disabled:opacity-50 disabled:cursor-not-allowed";
  const compactInputClassName = "w-full bg-[#0b0b0b]/80 border border-white/10 px-4 py-3 verge-label-mono text-[10px] text-white outline-none focus:border-[#3cffd0] focus:ring-1 focus:ring-[#3cffd0]/30 transition-all rounded-[2px] placeholder:text-white/20";
  const labelClassName = "verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest flex items-center gap-3";

  useEffect(() => {
    fetchUnassigned();
    fetchAvailableVideos();
  }, []);

  const fetchUnassigned = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/configs/unassigned`);
      const data = await response.json();
      // Data Binding aligne sur le nouveau standard "items"
      setUnassignedMatches(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("DETAIL ERREUR FETCH VIDEO :", err);
      setStatus({ type: 'error', msg: 'Impossible de charger les matchs.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVideos = async () => {
    setVideosLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/videos/available`);
      if (!response.ok) throw new Error('Erreur listing R2');
      const data = await response.json();
      setAvailableVideos(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("DETAIL ERREUR FETCH R2 :", err);
      setStatus({ type: 'error', msg: 'Impossible de charger les videos R2.' });
    } finally {
      setVideosLoading(false);
    }
  };

  const matchCompetitions = useMemo(() => {
    return Array.from(new Set(unassignedMatches.map(match => match.competition).filter(Boolean))).sort();
  }, [unassignedMatches]);

  const matchSeasons = useMemo(() => {
    return Array.from(new Set(unassignedMatches.map(match => match.season).filter(Boolean))).sort();
  }, [unassignedMatches]);

  const filteredMatches = useMemo(() => {
    const search = matchSearch.trim().toLowerCase();

    return unassignedMatches.filter((match) => {
      const haystack = [
        match.id,
        match.label,
        match.description,
        match.date,
        match.competition,
        match.season
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesCompetition = !competitionFilter || match.competition === competitionFilter;
      const matchesSeason = !seasonFilter || match.season === seasonFilter;

      return matchesSearch && matchesCompetition && matchesSeason;
    });
  }, [unassignedMatches, matchSearch, competitionFilter, seasonFilter]);

  const formatVideoLabel = (video) => {
    if (!video?.key) return '';
    const sizeMb = Number.isFinite(Number(video.size))
      ? ` - ${(Number(video.size) / (1024 * 1024)).toFixed(1)} MB`
      : '';
    return `${video.key}${sizeMb}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.match_id || !formData.r2_video_key_m1) {
      setStatus({ type: 'error', msg: 'Veuillez au moins renseigner la vidéo de la 1ère mi-temps.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const payload = {
      match_id: formData.match_id,
      r2_video_key_m1: formData.r2_video_key_m1,
      r2_video_key_m2: formData.r2_video_key_m2,
      ui_config: {
        periods: {
          half1: formData.half1,
          half2: formData.half2
        }
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Erreur lors de l'enregistrement");

      setStatus({ type: 'success', msg: 'Configuration video enregistree avec succes !' });
      // Rafraichir la liste
      fetchUnassigned();
      fetchAvailableVideos();
      setFormData({ match_id: '', r2_video_key_m1: '', r2_video_key_m2: '', half1: '00:00', half2: '00:00' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-xl p-4">
      <div className="w-full max-w-3xl backdrop-blur-2xl bg-[#131313]/90 border border-white/10 shadow-2xl rounded-2xl overflow-hidden">

        {/* HEADER */}
        <div className="p-8 border-b border-white/10 bg-[#0f0f0f]/70 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black border border-[#3cffd0]/30 rounded-[4px] flex items-center justify-center shadow-[0_0_28px_rgba(60,255,208,0.14)]">
              <Video className="text-[#3cffd0]" size={24} />
            </div>
            <div>
              <h2 className="verge-h2 text-white">Config Video R2</h2>
              <p className="verge-label-mono text-[9px] text-[#3cffd0] tracking-[0.2em] uppercase mt-1 font-black">
                Appairage Video & Cloudflare R2
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/45 hover:text-white hover:border-[#3cffd0]/60 hover:bg-[#3cffd0]/10 hover:shadow-[0_0_22px_rgba(60,255,208,0.18)] transition-all"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSubmit} className="p-10 space-y-10 bg-[#131313]/55 max-h-[82vh] overflow-y-auto scrollbar-verge">

          {/* SECTION 1 : MATCH SELECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <label className={labelClassName}>
                <Database size={12} className="text-[#3cffd0]" />
                Selecteur de Match (Non assignes)
              </label>
              <span className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-widest">
                {filteredMatches.length} / {unassignedMatches.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3cffd0]" />
                <input
                  type="text"
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  placeholder="Recherche match, ID, competition..."
                  className={`${compactInputClassName} pl-10`}
                />
              </div>

              <select
                value={competitionFilter}
                onChange={(e) => setCompetitionFilter(e.target.value)}
                className={compactInputClassName}
              >
                <option value="">Toutes competitions</option>
                {matchCompetitions.map(competition => (
                  <option key={competition} value={competition}>{competition}</option>
                ))}
              </select>

              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className={compactInputClassName}
              >
                <option value="">Toutes saisons</option>
                {matchSeasons.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>

            <select
              value={formData.match_id}
              onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
              className={inputClassName}
              disabled={loading}
            >
              <option value="">{loading ? 'Chargement...' : '--- Choisir un match ---'}</option>
              {filteredMatches.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label || m.description || m.id} ({m.date || 'date inconnue'})
                </option>
              ))}
            </select>
          </div>

          {/* SECTION 2 : R2 STORAGE (SPLIT M1/M2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label className={labelClassName}>
                  <Settings size={12} className="text-[#3cffd0]" />
                  Vidéo 1ère Mi-Temps (M1)
                </label>
              </div>
              <select
                value={formData.r2_video_key_m1}
                onChange={(e) => setFormData({ ...formData, r2_video_key_m1: e.target.value })}
                className={inputClassName}
                disabled={videosLoading}
              >
                <option value="">{videosLoading ? 'Scan R2...' : '--- Source M1 ---'}</option>
                {availableVideos.map(video => (
                  <option key={video.key} value={video.key}>
                    {formatVideoLabel(video)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label className={labelClassName}>
                  <Settings size={12} className="text-white/40" />
                  Vidéo 2ème Mi-Temps (M2)
                </label>
              </div>
              <select
                value={formData.r2_video_key_m2}
                onChange={(e) => setFormData({ ...formData, r2_video_key_m2: e.target.value })}
                className={inputClassName}
                disabled={videosLoading}
              >
                <option value="">{videosLoading ? 'Scan R2...' : '--- Source M2 (Optionnel) ---'}</option>
                {availableVideos.map(video => (
                  <option key={video.key} value={video.key}>
                    {formatVideoLabel(video)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 3 : TIMING / OFFSETS */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className={labelClassName}>
                <Clock size={12} className="text-[#3cffd0]" />
                Offset Mi-temps 1
              </label>
              <input
                type="text"
                placeholder="MM:SS"
                value={formData.half1}
                onChange={(e) => setFormData({ ...formData, half1: e.target.value })}
                className={inputClassName}
              />
            </div>
            <div className="space-y-4">
              <label className={labelClassName}>
                <Clock size={12} className="text-[#3cffd0]" />
                Offset Mi-temps 2
              </label>
              <input
                type="text"
                placeholder="MM:SS"
                value={formData.half2}
                onChange={(e) => setFormData({ ...formData, half2: e.target.value })}
                className={inputClassName}
              />
            </div>
          </div>

          {/* STATUS MESSAGES */}
          {status && (
            <div className={`p-5 rounded-[2px] flex items-center gap-4 text-[10px] verge-label-mono border ${status.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {status.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              {status.msg}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting || !formData.match_id}
            className="w-full py-6 bg-[#03a9e6] text-white verge-label-mono text-[11px] font-black uppercase tracking-widest rounded-[4px] flex items-center justify-center gap-4 hover:bg-[#3cffd0] hover:text-black hover:shadow-[0_0_30px_rgba(60,255,208,0.28)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#03a9e6] disabled:hover:text-white group shadow-[0_0_24px_rgba(3,169,230,0.22)]"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Save size={18} />
                Associer la Video R2
                <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
};

export default VideoSettingsPanel;
