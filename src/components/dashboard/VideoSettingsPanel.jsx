import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Settings, 
  Check, 
  AlertCircle, 
  Database, 
  Clock, 
  ArrowRight,
  Loader2,
  Save
} from 'lucide-react';

const VideoSettingsPanel = ({ onClose }) => {
  const [unassignedMatches, setUnassignedMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', msg: '' }

  const [formData, setFormData] = useState({
    match_id: '',
    r2_video_key: '',
    half1: '00:00',
    half2: '00:00'
  });

  const OPTAVISION_API_URL = "http://76.13.38.150:8503"; // Port standard pour l'API OptaVision

  useEffect(() => {
    fetchUnassigned();
  }, []);

  const fetchUnassigned = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/configs/unassigned`);
      const data = await response.json();
      setUnassignedMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Erreur chargement matchs non-assignés:", err);
      setStatus({ type: 'error', msg: 'Impossible de charger les matchs.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.match_id || !formData.r2_video_key) {
      setStatus({ type: 'error', msg: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const payload = {
      match_id: formData.match_id,
      r2_video_key: formData.r2_video_key,
      ui_config: {
        periods: {
          half1: formData.half1,
          half2: formData.half2
        }
      }
    };

    try {
      const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Erreur lors de l'enregistrement");

      setStatus({ type: 'success', msg: 'Configuration vidéo enregistrée avec succès !' });
      // Rafraîchir la liste
      fetchUnassigned();
      setFormData({ match_id: '', r2_video_key: '', half1: '00:00', half2: '00:00' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl overflow-hidden glass-morphism">
        
        {/* HEADER */}
        <div className="p-8 border-b border-white/10 bg-gradient-to-r from-[#5200ff]/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#5200ff]/20 rounded-lg">
              <Video className="text-[#5200ff]" size={24} />
            </div>
            <div>
              <h2 className="verge-h2 text-white">Config Vidéo R2</h2>
              <p className="verge-label-mono text-[9px] text-white/40 tracking-widest uppercase mt-1">Appairage Vidéo & Cloudflare R2</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-2xl">×</button>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          
          {/* SECTION 1 : MATCH SELECTION */}
          <div className="space-y-4">
            <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest flex items-center gap-3">
              <Database size={12} className="text-[#5200ff]" />
              Sélecteur de Match (Non assignés)
            </label>
            <select
              value={formData.match_id}
              onChange={(e) => setFormData({ ...formData, match_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 p-5 verge-label-mono text-[11px] text-white outline-none focus:border-[#5200ff] transition-all rounded-[2px]"
              disabled={loading}
            >
              <option value="">{loading ? 'Chargement...' : '--- Choisir un match ---'}</option>
              {unassignedMatches.map(m => (
                <option key={m.id} value={m.id}>{m.label} ({m.date})</option>
              ))}
            </select>
          </div>

          {/* SECTION 2 : R2 STORAGE */}
          <div className="space-y-4">
            <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest flex items-center gap-3">
              <Settings size={12} className="text-[#5200ff]" />
              Clé Vidéo Cloudflare R2
            </label>
            <input 
              type="text"
              placeholder="ex: videos/ligue1/match_id_2024.mp4"
              value={formData.r2_video_key}
              onChange={(e) => setFormData({ ...formData, r2_video_key: e.target.value })}
              className="w-full bg-white/5 border border-white/10 p-5 verge-label-mono text-[11px] text-white outline-none focus:border-[#5200ff] transition-all rounded-[2px]"
            />
          </div>

          {/* SECTION 3 : TIMING / OFFSETS */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest flex items-center gap-3">
                <Clock size={12} className="text-[#5200ff]" />
                Offset Mi-temps 1
              </label>
              <input 
                type="text"
                placeholder="MM:SS"
                value={formData.half1}
                onChange={(e) => setFormData({ ...formData, half1: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-5 verge-label-mono text-[11px] text-white outline-none focus:border-[#5200ff] transition-all rounded-[2px]"
              />
            </div>
            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest flex items-center gap-3">
                <Clock size={12} className="text-[#5200ff]" />
                Offset Mi-temps 2
              </label>
              <input 
                type="text"
                placeholder="MM:SS"
                value={formData.half2}
                onChange={(e) => setFormData({ ...formData, half2: e.target.value })}
                className="w-full bg-white/5 border border-white/10 p-5 verge-label-mono text-[11px] text-white outline-none focus:border-[#5200ff] transition-all rounded-[2px]"
              />
            </div>
          </div>

          {/* STATUS MESSAGES */}
          {status && (
            <div className={`p-5 rounded-[2px] flex items-center gap-4 text-[10px] verge-label-mono border ${status.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
              {status.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              {status.msg}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting || !formData.match_id}
            className="w-full py-6 bg-[#5200ff] text-white verge-label-mono text-[11px] font-black uppercase tracking-widest rounded-[2px] flex items-center justify-center gap-4 hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-[0_0_20px_rgba(82,0,255,0.3)]"
          >
            {submitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Associer la Vidéo R2
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
