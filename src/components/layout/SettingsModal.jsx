import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Shield, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Heart, 
  Filter, 
  Trash2, 
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
  const [matchSearch, setMatchSearch] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  
  const [formData, setFormData] = useState({
    match_id: '',
    r2_video_key: '',
    half1: '00:00',
    half2: '00:00'
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (activeTab === 'video-r2') fetchR2Data();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'video-r2') fetchR2Data();
  }, [activeTab, isOpen]);

  const fetchR2Data = async () => {
    setLoadingR2(true);
    try {
      const [matchesRes, videosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/optavision/configs/unassigned`).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/optavision/videos/available`).then(r => r.json())
      ]);
      setUnassignedMatches(Array.isArray(matchesRes.items) ? matchesRes.items : []);
      setAvailableVideos(Array.isArray(videosRes.items) ? videosRes.items : []);
    } catch (err) {
      setR2Status({ type: 'error', msg: 'Erreur de synchronisation R2' });
    } finally {
      setLoadingR2(false);
    }
  };

  const matchCompetitions = useMemo(() => {
    return Array.from(new Set(unassignedMatches.map(m => m.competition).filter(Boolean))).sort();
  }, [unassignedMatches]);

  const matchSeasons = useMemo(() => {
    return Array.from(new Set(unassignedMatches.map(m => m.season).filter(Boolean))).sort();
  }, [unassignedMatches]);

  const filteredMatches = useMemo(() => {
    const s = matchSearch.toLowerCase();
    return unassignedMatches.filter(m => {
      const matchesSearch = !s || (m.label || m.description || m.id).toLowerCase().includes(s);
      const matchesComp = !competitionFilter || m.competition === competitionFilter;
      const matchesSeason = !seasonFilter || m.season === seasonFilter;
      return matchesSearch && matchesComp && matchesSeason;
    });
  }, [unassignedMatches, matchSearch, competitionFilter, seasonFilter]);

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
          r2_video_key: formData.r2_video_key,
          ui_config: { periods: { half1: formData.half1, half2: formData.half2 } }
        })
      });
      if (!response.ok) throw new Error();
      setR2Status({ type: 'success', msg: 'Configuration R2 validée' });
      fetchR2Data();
    } catch (err) {
      setR2Status({ type: 'error', msg: 'Échec de sauvegarde' });
    } finally {
      setSubmittingR2(false);
    }
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
                              onChange={(e) => setFormData({...formData, match_id: e.target.value})}
                              disabled={loadingR2}
                            >
                                <option value="">{loadingR2 ? 'Chargement...' : '--- Choisir un match ---'}</option>
                                {filteredMatches.map(m => (
                                    <option key={m.id} value={m.id}>{m.label || m.description || m.id} ({m.date})</option>
                                ))}
                            </select>
                        </div>

                        {/* SELECTEUR VIDEO R2 */}
                        <div className="space-y-4">
                            <label className={labelClassName}><Play size={12} className="text-jelly-mint" /> CLE VIDEO CLOUDFLARE R2</label>
                            <select 
                              className={inputClassName}
                              value={formData.r2_video_key}
                              onChange={(e) => setFormData({...formData, r2_video_key: e.target.value})}
                              disabled={loadingR2}
                            >
                                <option value="">{loadingR2 ? 'Scan R2 en cours...' : '--- Choisir une video ---'}</option>
                                {availableVideos.map(v => (
                                    <option key={v.key} value={v.key}>{v.key}</option>
                                ))}
                            </select>
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
                    </form>
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
