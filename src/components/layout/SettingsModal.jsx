import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  User, 
  Shield, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  Settings,
  Play,
  Database,
  Search,
  Clock,
  Save,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../../config';

const SettingsModal = ({ isOpen, onClose, user, initialTab = 'profile' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [status, setStatus] = useState({ loading: false, error: null, success: false });

  // --- LOGIQUE CONFIG VIDEO R2 ---
  const [unassignedMatches, setUnassignedMatches] = useState([]);
  const [availableVideos, setAvailableVideos] = useState([]);
  const [loadingR2, setLoadingR2] = useState(true);
  const [submittingR2, setSubmittingR2] = useState(false);
  const [r2Status, setR2Status] = useState(null);
  const [assignedConfigs, setAssignedConfigs] = useState([]);
  const [loadingAssignedConfigs, setLoadingAssignedConfigs] = useState(false);
  const [assignedConfigsStatus, setAssignedConfigsStatus] = useState(null);
  const [selectedAssignedMatch, setSelectedAssignedMatch] = useState(null);
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

  // --- LOGIQUE CONFIGURATIONS GLOBALES (localStorage) ---
  const [globalVideoConfig, setGlobalVideoConfig] = useState(() => {
    const saved = localStorage.getItem('optavision_video_config');
    return saved ? JSON.parse(saved) : {
      before_buffer: 3,
      after_buffer: 3,
      min_clip_gap: 3
    };
  });

  const updateGlobalConfig = (key, value) => {
    const next = { ...globalVideoConfig, [key]: parseFloat(value) || 0 };
    setGlobalVideoConfig(next);
    localStorage.setItem('optavision_video_config', JSON.stringify(next));
  };

  const fetchR2Data = useCallback(async () => {
    setLoadingR2(true);
    try {
      const [matchesRes, videosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/optavision/configs/unassigned`).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/optavision/videos/available`).then(r => r.json())
      ]);
      setUnassignedMatches(Array.isArray(matchesRes.items) ? matchesRes.items : []);
      const hydratedVideos = Array.isArray(videosRes.items) ? videosRes.items.map(video => ({
        ...video,
        is_associated: video.is_associated ?? video.isAssociated ?? video.IsAssociated ?? false
      })) : [];
      setAvailableVideos(hydratedVideos);
    } catch {
      setR2Status({ type: 'error', msg: 'Erreur de synchronisation R2' });
    } finally {
      setLoadingR2(false);
    }
  }, []);

  const fetchAssignedConfigs = useCallback(async () => {
    setLoadingAssignedConfigs(true);
    setAssignedConfigsStatus(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/configs/assigned`);
      if (!response.ok) throw new Error('Erreur listing configs R2');
      const data = await response.json();
      setAssignedConfigs(Array.isArray(data.items) ? data.items : []);
    } catch {
      setAssignedConfigsStatus({ type: 'error', msg: 'Impossible de charger les configurations R2.' });
    } finally {
      setLoadingAssignedConfigs(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'video-r2') void Promise.resolve().then(fetchR2Data);
  }, [activeTab, fetchR2Data, isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'edit-video-r2') void Promise.resolve().then(fetchAssignedConfigs);
  }, [activeTab, fetchAssignedConfigs, isOpen]);

  const videosM1 = useMemo(() => availableVideos.filter(video => 
    video.key !== formData.r2_video_key_m2 && 
    (video.key === formData.r2_video_key_m1 || String(video.is_associated).toLowerCase() !== 'true')
  ), [availableVideos, formData.r2_video_key_m1, formData.r2_video_key_m2]);

  const videosM2 = useMemo(() => availableVideos.filter(video => 
    video.key !== formData.r2_video_key_m1 && 
    (video.key === formData.r2_video_key_m2 || String(video.is_associated).toLowerCase() !== 'true')
  ), [availableVideos, formData.r2_video_key_m1, formData.r2_video_key_m2]);

  const matchCompetitions = useMemo(() => {
    return Array.from(new Set(unassignedMatches.map(m => m.competition).filter(Boolean))).sort();
  }, [unassignedMatches]);

  const matchSeasons = useMemo(() => {
    return Array.from(new Set(unassignedMatches.map(m => m.season).filter(Boolean))).sort();
  }, [unassignedMatches]);

  const assignedCompetitions = useMemo(() => {
    return Array.from(new Set(assignedConfigs.map(config => config.competition).filter(Boolean))).sort();
  }, [assignedConfigs]);

  const assignedSeasons = useMemo(() => {
    return Array.from(new Set(assignedConfigs.map(config => config.season).filter(Boolean))).sort();
  }, [assignedConfigs]);

  const filteredMatches = useMemo(() => {
    const s = matchSearch.toLowerCase();
    return unassignedMatches.filter(m => {
      const matchesSearch = !s || (m.label || m.description || m.id).toLowerCase().includes(s);
      const matchesComp = !competitionFilter || m.competition === competitionFilter;
      const matchesSeason = !seasonFilter || m.season === seasonFilter;
      return matchesSearch && matchesComp && matchesSeason;
    });
  }, [unassignedMatches, matchSearch, competitionFilter, seasonFilter]);

  const filteredAssignedConfigs = useMemo(() => {
    const s = matchSearch.trim().toLowerCase();
    return assignedConfigs.filter(config => {
      const haystack = [
        config.match_id,
        config.match_name,
        config.r2_video_key_m1,
        config.r2_video_key_m2,
        config.competition,
        config.season
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesSearch = !s || haystack.includes(s);
      const matchesComp = !competitionFilter || config.competition === competitionFilter;
      const matchesSeason = !seasonFilter || config.season === seasonFilter;
      return matchesSearch && matchesComp && matchesSeason;
    });
  }, [assignedConfigs, matchSearch, competitionFilter, seasonFilter]);

  const matchOptions = useMemo(() => {
    if (!selectedAssignedMatch || !formData.match_id) return filteredMatches;
    if (filteredMatches.some(match => match.id === selectedAssignedMatch.id)) return filteredMatches;
    return [selectedAssignedMatch, ...filteredMatches];
  }, [filteredMatches, selectedAssignedMatch, formData.match_id]);

  const handleR2Submit = async (e) => {
    e.preventDefault();
    setSubmittingR2(true);
    setR2Status(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/optavision/configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: formData.match_id,
          r2_video_key_m1: formData.r2_video_key_m1,
          r2_video_key_m2: formData.r2_video_key_m2,
          ui_config: { periods: { half1: formData.half1, half2: formData.half2 } }
        })
      });
      if (!response.ok) throw new Error();
      setR2Status({ type: 'success', msg: 'Configuration R2 validée' });
      fetchR2Data();
    } catch {
      setR2Status({ type: 'error', msg: 'Échec de sauvegarde' });
    } finally {
      setSubmittingR2(false);
    }
  };

  const handleEditAssignedConfig = (config) => {
    setMatchSearch('');
    setCompetitionFilter('');
    setSeasonFilter('');
    setR2Status(null);
    setSelectedAssignedMatch({
      id: config.match_id,
      label: config.match_name || config.match_id,
      description: config.match_name || config.match_id,
      date: config.date || 'configuration existante',
      competition: config.competition,
      season: config.season
    });
    setUnassignedMatches((currentMatches) => {
      if (currentMatches.some(match => match.id === config.match_id)) return currentMatches;
      return [
        {
          id: config.match_id,
          label: config.match_name || config.match_id,
          description: config.match_name || config.match_id,
          date: config.date || 'configuration existante',
          competition: config.competition,
          season: config.season
        },
        ...currentMatches
      ];
    });
    setFormData({
      match_id: config.match_id || '',
      r2_video_key_m1: config.r2_video_key_m1 || '',
      r2_video_key_m2: config.r2_video_key_m2 || '',
      half1: config.half1 || '00:00',
      half2: config.half2 || '00:00'
    });
    setActiveTab('video-r2');
  };
  // --- FIN LOGIQUE R2 ---

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setStatus({ ...status, error: "LES NOUVEAUX MOTS DE PASSE NE CORRESPONDENT PAS" });
      return;
    }
    setStatus({ loading: true, error: null, success: false });
    try {
      setTimeout(() => {
        setStatus({ loading: false, error: null, success: true });
        setPasswords({ old: '', new: '', confirm: '' });
      }, 1000);
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: false });
    }
  };

  const inputClassName = "w-full bg-[#0b0b0b]/80 border border-white/10 p-4 verge-label-mono text-[11px] text-white outline-none focus:border-[#3cffd0] transition-all rounded-[2px]";
  const labelClassName = "verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest flex items-center gap-3 mb-3";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-6xl h-[750px] bg-canvas-black border border-white/10 rounded-[4px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col md:flex-row relative"
      >
        {/* Sidebar - Technical Control Panel */}
        <div className="w-full md:w-80 bg-surface-slate border-r border-white/5 p-8 flex flex-col gap-2 relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-jelly-mint/20" />
          
          <div className="flex items-center gap-4 mb-12 px-2">
             <div className="w-12 h-12 bg-canvas-black border border-jelly-mint/30 flex items-center justify-center shadow-2xl">
                <Settings className="text-jelly-mint" size={24} />
             </div>
             <div>
                <h3 className="verge-label-mono text-xl font-black uppercase tracking-[0.1em] text-hazard-white leading-none">Settings</h3>
                <p className="verge-label-mono text-[8px] text-secondary-text font-black uppercase tracking-[0.3em] opacity-40 mt-1.5">Control Center</p>
             </div>
          </div>

          <div className="space-y-1">
            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center justify-between px-5 py-4 rounded-[1px] verge-label-mono text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeTab === 'profile' ? 'bg-jelly-mint text-absolute-black border-jelly-mint' : 'text-secondary-text border-transparent hover:bg-white/5 hover:text-white'}`}>
              <div className="flex items-center gap-4">
                <User size={16} strokeWidth={2.5} /> PROFIL ADMIN
              </div>
              {activeTab === 'profile' && <ChevronRight size={14} />}
            </button>

            <button onClick={() => setActiveTab('video-r2')} className={`w-full flex items-center justify-between px-5 py-4 rounded-[1px] verge-label-mono text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeTab === 'video-r2' ? 'bg-jelly-mint text-absolute-black border-jelly-mint' : 'text-secondary-text border-transparent hover:bg-white/5 hover:text-white'}`}>
              <div className="flex items-center gap-4">
                <Play size={16} strokeWidth={2.5} /> CONFIG VIDEO R2
              </div>
              {activeTab === 'video-r2' && <ChevronRight size={14} />}
            </button>

            <button onClick={() => setActiveTab('edit-video-r2')} className={`w-full flex items-center justify-between px-5 py-4 rounded-[1px] verge-label-mono text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeTab === 'edit-video-r2' ? 'bg-jelly-mint text-absolute-black border-jelly-mint' : 'text-secondary-text border-transparent hover:bg-white/5 hover:text-white'}`}>
              <div className="flex items-center gap-4">
                <Database size={16} strokeWidth={2.5} /> MODIF CONFIG R2
              </div>
              {activeTab === 'edit-video-r2' && <ChevronRight size={14} />}
            </button>
            
            <button onClick={() => setActiveTab('security')} className={`w-full flex items-center justify-between px-5 py-4 rounded-[1px] verge-label-mono text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeTab === 'security' ? 'bg-jelly-mint text-absolute-black border-jelly-mint' : 'text-secondary-text border-transparent hover:bg-white/5 hover:text-white'}`}>
              <div className="flex items-center gap-4">
                <Shield size={16} strokeWidth={2.5} /> SÉCURITÉ
              </div>
              {activeTab === 'security' && <ChevronRight size={14} />}
            </button>
          </div>


          <div className="mt-auto p-6 bg-canvas-black border border-white/5 rounded-[2px] relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10" />
            <div className="relative z-10">
                <p className="verge-label-mono text-[8px] font-black uppercase text-jelly-mint mb-2 tracking-[0.3em]">OPTAVISION PRO</p>
                <p className="verge-label-mono text-[10px] font-black text-hazard-white mb-5 uppercase tracking-tight">Active Analytics Engine</p>
                <div className="h-1 w-full bg-white/5 rounded-[1px] overflow-hidden">
                    <div className="h-full w-full bg-jelly-mint shadow-[0_0_10px_rgba(60,255,208,0.5)]" />
                </div>
            </div>
          </div>
        </div>

        {/* Content Area - Clean Technical Layout */}
        <div className="flex-1 flex flex-col relative bg-canvas-black">
          <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-[2px] bg-surface-slate border border-white/10 text-secondary-text hover:text-hazard-white hover:border-jelly-mint/50 transition-all z-20 shadow-2xl">
            <X size={20} />
          </button>

          <div className="flex-1 overflow-y-auto p-12 scrollbar-verge">
            
            {/* ONGLET CONFIG VIDEO R2 */}
            {activeTab === 'video-r2' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center gap-6">
                        <div className="h-10 w-1 bg-jelly-mint" />
                        <div>
                            <h4 className="verge-label-mono text-3xl font-black text-hazard-white uppercase tracking-tighter mb-1">Config Video R2</h4>
                            <p className="verge-label-mono text-[9px] text-secondary-text font-black uppercase tracking-[0.2em] opacity-40">Paramètres du moteur Cloudflare R2 & FFmpeg</p>
                        </div>
                    </div>

                    <form onSubmit={handleR2Submit} className="space-y-8">
                        {/* SELECTEUR DE MATCH */}
                        <div className="space-y-4">
                            <label className={labelClassName}><Database size={12} className="text-jelly-mint" /> SELECTEUR DE MATCH ({filteredMatches.length} / {unassignedMatches.length})</label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-jelly-mint/50" />
                                    <input 
                                      type="text" 
                                      placeholder="Rechercher..." 
                                      className={`${inputClassName} pl-12 py-3 text-[10px]`}
                                      value={matchSearch}
                                      onChange={(e) => setMatchSearch(e.target.value)}
                                    />
                                </div>
                                <select 
                                  className={`${inputClassName} py-3 text-[10px]`}
                                  value={competitionFilter}
                                  onChange={(e) => setCompetitionFilter(e.target.value)}
                                >
                                    <option value="">Toutes compétitions</option>
                                    {matchCompetitions.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select 
                                  className={`${inputClassName} py-3 text-[10px]`}
                                  value={seasonFilter}
                                  onChange={(e) => setSeasonFilter(e.target.value)}
                                >
                                    <option value="">Toutes saisons</option>
                                    {matchSeasons.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <select 
                              className={inputClassName}
                              value={formData.match_id}
                              onChange={(e) => {
                                setSelectedAssignedMatch(null);
                                setFormData({...formData, match_id: e.target.value});
                              }}
                              disabled={loadingR2}
                            >
                                <option value="">{loadingR2 ? 'Chargement...' : '--- Choisir un match ---'}</option>
                                {matchOptions.map(m => (
                                    <option key={m.id} value={m.id}>{m.label || m.description || m.id} ({m.date})</option>
                                ))}
                            </select>
                        </div>

                        {/* SELECTEURS VIDEO R2 (M1/M2) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className={labelClassName}><Play size={12} className="text-jelly-mint" /> VIDÉO 1ère MI-TEMPS (M1)</label>
                                <select 
                                  className={inputClassName}
                                  value={formData.r2_video_key_m1}
                                  onChange={(e) => setFormData({...formData, r2_video_key_m1: e.target.value})}
                                  disabled={loadingR2}
                                >
                                    <option value="">{loadingR2 ? 'Scan R2...' : '--- Source M1 ---'}</option>
                                    {videosM1.map(v => (
                                        <option key={v.key} value={v.key}>{v.key}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className={labelClassName}><Play size={12} className="text-white/40" /> VIDÉO 2ème MI-TEMPS (M2)</label>
                                <select 
                                  className={inputClassName}
                                  value={formData.r2_video_key_m2}
                                  onChange={(e) => setFormData({...formData, r2_video_key_m2: e.target.value})}
                                  disabled={loadingR2}
                                >
                                    <option value="">{loadingR2 ? 'Scan R2...' : '--- Source M2 (Optionnel) ---'}</option>
                                    {videosM2.map(v => (
                                        <option key={v.key} value={v.key}>{v.key}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* OFFSETS */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className={labelClassName}><Clock size={12} className="text-jelly-mint" /> OFFSET MI-TEMPS 1</label>
                                <input type="text" placeholder="MM:SS" className={inputClassName} value={formData.half1} onChange={(e) => setFormData({...formData, half1: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                                <label className={labelClassName}><Clock size={12} className="text-jelly-mint" /> OFFSET MI-TEMPS 2</label>
                                <input type="text" placeholder="MM:SS" className={inputClassName} value={formData.half2} onChange={(e) => setFormData({...formData, half2: e.target.value})} />
                            </div>
                        </div>

                        {r2Status && (
                            <div className={`p-4 rounded-[1px] verge-label-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-4 border ${r2Status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                                {r2Status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {r2Status.msg}
                            </div>
                        )}

                        <button type="submit" disabled={submittingR2 || !formData.match_id} className="w-full bg-jelly-mint text-absolute-black py-5 rounded-[2px] verge-label-mono text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:shadow-[0_0_20px_rgba(60,255,208,0.3)] transition-all disabled:opacity-30">
                            {submittingR2 ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} /> ASSOCIER LA VIDEO R2 <ArrowRight size={18} /></>}
                        </button>

                        <div className="pt-10 border-t border-white/5 space-y-8">
                            <div className="flex items-center gap-4">
                                <Settings size={16} className="text-jelly-mint" />
                                <h5 className="verge-label-mono text-[11px] font-black text-hazard-white uppercase tracking-[0.2em]">Configuration Globale Vidéo (FFmpeg)</h5>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    <label className={labelClassName}>Buffer Avant (sec)</label>
                                    <input 
                                        type="number" 
                                        step="0.5"
                                        className={inputClassName} 
                                        value={globalVideoConfig.before_buffer}
                                        onChange={(e) => updateGlobalConfig('before_buffer', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className={labelClassName}>Buffer Après (sec)</label>
                                    <input 
                                        type="number" 
                                        step="0.5"
                                        className={inputClassName} 
                                        value={globalVideoConfig.after_buffer}
                                        onChange={(e) => updateGlobalConfig('after_buffer', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className={labelClassName}>Fusion Tolérance (sec)</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        className={inputClassName} 
                                        value={globalVideoConfig.min_clip_gap}
                                        onChange={(e) => updateGlobalConfig('min_clip_gap', e.target.value)}
                                    />
                                </div>
                            </div>
                            <p className="verge-label-mono text-[8px] text-secondary-text/40 uppercase tracking-widest italic">
                                * Ces paramètres s'appliquent automatiquement à toutes les générations de clips et de rafales.
                            </p>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'edit-video-r2' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-6">
                  <div className="h-10 w-1 bg-jelly-mint" />
                  <div>
                    <h4 className="verge-label-mono text-3xl font-black text-hazard-white uppercase tracking-tighter mb-1">Modif config R2</h4>
                    <p className="verge-label-mono text-[9px] text-secondary-text font-black uppercase tracking-[0.2em] opacity-40">Configurations video deja associees</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <label className={labelClassName}><Database size={12} className="text-jelly-mint" /> CONFIGURATIONS ({filteredAssignedConfigs.length} / {assignedConfigs.length})</label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-jelly-mint/50" />
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        className={`${inputClassName} pl-12 py-3 text-[10px]`}
                        value={matchSearch}
                        onChange={(e) => setMatchSearch(e.target.value)}
                      />
                    </div>

                    <select
                      className={`${inputClassName} py-3 text-[10px]`}
                      value={competitionFilter}
                      onChange={(e) => setCompetitionFilter(e.target.value)}
                    >
                      <option value="">Toutes competitions</option>
                      {assignedCompetitions.map(competition => (
                        <option key={competition} value={competition}>{competition}</option>
                      ))}
                    </select>

                    <select
                      className={`${inputClassName} py-3 text-[10px]`}
                      value={seasonFilter}
                      onChange={(e) => setSeasonFilter(e.target.value)}
                    >
                      <option value="">Toutes saisons</option>
                      {assignedSeasons.map(season => (
                        <option key={season} value={season}>{season}</option>
                      ))}
                    </select>
                  </div>

                  <div className="hidden lg:grid grid-cols-[1.4fr_1fr_1fr_120px] gap-4 px-5 py-3 border-b border-white/10 verge-label-mono text-[8px] text-secondary-text font-black uppercase tracking-[0.2em]">
                    <span>Match</span>
                    <span>Source M1</span>
                    <span>Source M2</span>
                    <span className="text-right">Action</span>
                  </div>

                  {loadingAssignedConfigs && (
                    <div className="p-8 flex items-center justify-center gap-4 border border-white/5 bg-white/[0.02] rounded-[2px] verge-label-mono text-[10px] text-secondary-text uppercase tracking-widest">
                      <Loader2 size={16} className="animate-spin text-jelly-mint" />
                      Chargement configs R2
                    </div>
                  )}

                  {assignedConfigsStatus && (
                    <div className="p-4 rounded-[1px] verge-label-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-4 border bg-red-500/10 border-red-500/30 text-red-500">
                      <AlertCircle size={16} />
                      {assignedConfigsStatus.msg}
                    </div>
                  )}

                  {!loadingAssignedConfigs && !assignedConfigsStatus && assignedConfigs.length === 0 && (
                    <div className="p-8 border border-white/5 bg-white/[0.02] rounded-[2px] verge-label-mono text-[10px] text-secondary-text uppercase tracking-widest">
                      Aucune configuration R2 existante
                    </div>
                  )}

                  {!loadingAssignedConfigs && !assignedConfigsStatus && assignedConfigs.length > 0 && filteredAssignedConfigs.length === 0 && (
                    <div className="p-8 border border-white/5 bg-white/[0.02] rounded-[2px] verge-label-mono text-[10px] text-secondary-text uppercase tracking-widest">
                      Aucune configuration ne correspond aux filtres
                    </div>
                  )}

                  {!loadingAssignedConfigs && filteredAssignedConfigs.map(config => (
                    <div key={config.match_id} className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_120px] gap-4 items-center p-5 bg-surface-slate/60 border border-white/5 rounded-[2px] hover:border-jelly-mint/30 transition-all">
                      <div className="min-w-0">
                        <p className="verge-label-mono text-[11px] font-black text-hazard-white uppercase tracking-tight truncate">{config.match_name || config.match_id}</p>
                        <p className="verge-label-mono text-[8px] text-secondary-text uppercase tracking-widest mt-1 truncate">{config.match_id}</p>
                      </div>
                      <p className="verge-label-mono text-[9px] text-secondary-text break-all">{config.r2_video_key_m1 || 'Non defini'}</p>
                      <p className="verge-label-mono text-[9px] text-secondary-text break-all">{config.r2_video_key_m2 || 'Non defini'}</p>
                      <button
                        type="button"
                        onClick={() => handleEditAssignedConfig(config)}
                        className="lg:justify-self-end w-[104px] h-10 bg-jelly-mint text-absolute-black rounded-[2px] verge-label-mono text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_18px_rgba(60,255,208,0.28)] transition-all"
                      >
                        Editer
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-6">
                    <div className="h-10 w-1 bg-jelly-mint" />
                    <div>
                        <h4 className="verge-label-mono text-3xl font-black text-hazard-white uppercase tracking-tighter mb-1">Profil Administrateur</h4>
                        <p className="verge-label-mono text-[9px] text-secondary-text font-black uppercase tracking-[0.2em] opacity-40">Détails de votre compte professionnel</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-surface-slate border border-white/5 rounded-[2px] space-y-2 relative shadow-lg">
                    <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10" />
                    <label className="verge-label-mono text-[9px] font-black uppercase text-jelly-mint tracking-[0.2em]">Nom d'utilisateur</label>
                    <p className="verge-label-mono text-xl font-black text-hazard-white uppercase tracking-tight">{user?.username || 'ANALYST_01'}</p>
                  </div>
                  <div className="p-8 bg-surface-slate border border-white/5 rounded-[2px] space-y-2 relative shadow-lg">
                    <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10" />
                    <label className="verge-label-mono text-[9px] font-black uppercase text-jelly-mint tracking-[0.2em]">Email Associé</label>
                    <p className="verge-label-mono text-xl font-black text-hazard-white uppercase tracking-tight">{user?.email || 'pro@optavision.ai'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-6">
                    <div className="h-10 w-1 bg-jelly-mint" />
                    <div>
                        <h4 className="verge-label-mono text-3xl font-black text-hazard-white uppercase tracking-tighter mb-1">Sécurité</h4>
                        <p className="verge-label-mono text-[9px] text-secondary-text font-black uppercase tracking-[0.2em] opacity-40">Mise à jour des protocoles d'accès</p>
                    </div>
                </div>
                <form onSubmit={handleUpdatePassword} className="space-y-8 max-w-lg">
                  <div className="space-y-3">
                    <label className="verge-label-mono text-[9px] font-black uppercase text-secondary-text tracking-[0.2em]">Mot de passe actuel</label>
                    <input type="password" required className="w-full bg-canvas-black border border-white/10 rounded-[1px] px-5 py-4 text-hazard-white verge-label-mono text-[11px] font-black outline-none focus:border-jelly-mint/50 transition-all tracking-widest placeholder:text-white/5" placeholder="••••••••" value={passwords.old} onChange={(e) => setPasswords({...passwords, old: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="verge-label-mono text-[9px] font-black uppercase text-secondary-text tracking-[0.2em]">Nouveau mot de passe</label>
                    <input type="password" required className="w-full bg-canvas-black border border-white/10 rounded-[1px] px-5 py-4 text-hazard-white verge-label-mono text-[11px] font-black outline-none focus:border-jelly-mint/50 transition-all tracking-widest placeholder:text-white/5" placeholder="••••••••" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} />
                  </div>
                  
                  {status.error && <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-[1px] text-red-500 verge-label-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-4"><AlertCircle size={16} /> {status.error}</div>}
                  {status.success && <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-[1px] text-emerald-400 verge-label-mono text-[9px] font-black uppercase tracking-widest flex items-center gap-4"><CheckCircle2 size={16} /> MISE À JOUR VALIDÉE</div>}
                  
                  <button type="submit" disabled={status.loading} className="w-full bg-jelly-mint hover:bg-jelly-mint/90 disabled:bg-canvas-black disabled:text-[#444] text-absolute-black verge-label-mono text-[12px] font-black uppercase tracking-[0.4em] py-5 rounded-[2px] shadow-[0_20px_40px_rgba(60,255,208,0.2)] transition-all flex items-center justify-center gap-4 active:scale-[0.98]">
                    {status.loading ? <Loader2 size={20} className="animate-spin" /> : "METTRE À JOUR"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
