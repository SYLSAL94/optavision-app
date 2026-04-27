import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  TrendingUp, 
  Target, 
  Search, 
  ChevronRight,
  Database,
  ShieldAlert,
  ArrowLeft,
  SlidersHorizontal,
  X,
  Settings,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown
} from 'lucide-react';
import ExplorationFilterPanel from './ExplorationFilterPanel';
import BuildUpFilterPanel from './BuildUpFilterPanel';
import ShotMapFilterPanel from './ShotMapFilterPanel';

import EventExplorer from './EventExplorer';
import BuildUpExplorer from './BuildUpExplorer';
import ShotMapExplorer from './ShotMapExplorer';
import { API_BASE_URL, OPTAVISION_API_URL } from '../../config';

/**
 * OptaVisionDashboard - Squelette UI/UX Premium (Style The Verge)
 * Aligné sur le Design System du projet Scouting.
 */
const OptaVisionDashboard = ({ user }) => {
  const [matchId, setMatchId] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalEvents, setTotalEvents] = useState(0);

  // Auto-Discovery States
  const [matchesList, setMatchesList] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [playersList, setPlayersList] = useState([]);
  const [activeTab, setActiveTab] = useState('exploration');
  const [activeTool, setActiveTool] = useState(null); // 'events', 'sequences', 'shots'
  const [view, setView] = useState('DASHBOARD'); 
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [explorationFilters, setExplorationFilters] = useState({
    types: [],
    players: [],
    xtMin: 0.0,
    scoreMin: 0
  });

  const fetchMatchEvents = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const url = `${OPTAVISION_API_URL}/api/optavision/matches/${id}/events?page=${page}&limit=${limit}`;
    console.log("🌐 Appel de l'API OptaVision vers :", url);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`MATCH_DATA_FAILURE: ${response.status}`);
      const json = await response.json();
      console.log("🚨 RÉPONSE API BRUTE :", json);
      
      // Data Binding : items pour le flux, total pour la pagination
      setData(json.items || []);
      setTotalEvents(json.total || 0);
    } catch (err) {
      console.error("❌ ERREUR DE FETCH :", err);
      setError(err.message);
      setData([]);
      setTotalEvents(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Lookups (Auto-Discovery)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [m, t, p] = await Promise.all([
          fetch(`${OPTAVISION_API_URL}/api/optavision/matches`).then(r => r.json()),
          fetch(`${OPTAVISION_API_URL}/api/optavision/teams`).then(r => r.json()),
          fetch(`${OPTAVISION_API_URL}/api/optavision/players`).then(r => r.json())
        ]);
        setMatchesList(m);
        setTeamsList(t);
        setPlayersList(p);
        
        // Initialisation avec le premier match si vide
        if (m.length > 0 && !matchId) {
          const firstId = m[0].match_id;
          setMatchId(firstId);
        }
      } catch (err) {
        console.error("META_FETCH_ERROR:", err);
      }
    };
    fetchMeta();
  }, []);

  // Hydratation automatique si matchId présent au montage ou changement
  useEffect(() => {
    if (matchId && matchId.length > 5) {
      fetchMatchEvents(matchId);
    }
  }, [matchId, page, limit]);

  console.log("🔥 Rendu Dashboard - matchId actuel :", matchId);
  return (
    <div className="min-h-screen bg-[#131313] text-white flex flex-col font-sans overflow-hidden">
      
      {/* HEADER : SCOUTING STYLE (3 COLS) - MASQUÉ SI OUTIL ACTIF */}
      {!activeTool && (
        <header className="sticky top-0 z-[100] w-full px-8 bg-[#131313] border-b border-white/10 h-24 flex items-center shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-full max-w-[1700px] mx-auto grid grid-cols-2 md:grid-cols-3 items-center">
            
            {/* Logo - Colonne Gauche */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4 cursor-pointer group w-fit" onClick={() => { setView('DASHBOARD'); setActiveTool(null); setIsFilterOpen(false); }}>
                <div className="w-12 h-12 bg-white text-black rounded-[4px] flex items-center justify-center group-hover:bg-[#3cffd0] transition-colors">
                  <Activity size={24} />
                </div>
                <div className="hidden lg:flex flex-col">
                  <span className="verge-h3 text-white leading-none tracking-tighter uppercase font-black">The Analyst</span>
                  <span className="verge-label-mono text-[#3cffd0] text-[10px] mt-1 tracking-widest uppercase">OptaVision</span>
                </div>
              </div>
            </div>

            {/* Recherche Centrale (Intelligence Hub) */}
            <div className="flex justify-center order-3 md:order-2 col-span-2 md:col-span-1 mt-4 md:mt-0 px-4">
              <div className="w-full max-w-[500px] relative group">
                <div className="absolute inset-0 bg-[#3cffd0]/5 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full" />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#949494] group-focus-within:text-[#3cffd0] transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="ENTER MATCH ID..."
                  value={typeof matchId === 'string' ? matchId : matchId?.match_id || ''}
                  onChange={(e) => setMatchId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchMatchEvents(matchId)}
                  className="w-full bg-[#2d2d2d]/50 border border-white/10 rounded-full py-4 pl-14 pr-32 verge-label-mono text-[10px] text-white focus:border-[#3cffd0]/50 outline-none transition-all placeholder:text-[#949494]/40"
                />
                
                {/* SELECTEUR DE MATCH (Auto-Discovery) */}
                <div className="absolute right-32 top-1/2 -translate-y-1/2 flex items-center">
                  <select 
                    value={typeof matchId === 'string' ? matchId : matchId?.match_id || ''}
                    onChange={(e) => setMatchId(e.target.value)}
                    className="bg-black/40 border-l border-white/10 px-4 py-2 verge-label-mono text-[9px] text-[#3cffd0] outline-none cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <option value="">SELECT MATCH...</option>
                    {matchesList.map(m => (
                      <option key={m.match_id} value={m.match_id}>
                        {m.matchName || m.match_id}
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={() => fetchMatchEvents(matchId)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#3cffd0] text-black px-6 py-2 verge-label-mono text-[9px] font-black hover:bg-white transition-all rounded-full"
                >
                  {loading ? 'SYNCING...' : 'ANALYZE'}
                </button>
              </div>
            </div>

            {/* Espace Droite - User & Settings */}
            <div className="hidden md:flex justify-end items-center gap-6 order-2 md:order-3">
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center text-[#949494] hover:text-white transition-colors relative">
                  <Bell size={20} />
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-[#131313] rounded-full" />
                </button>
                <button className="w-10 h-10 flex items-center justify-center text-[#949494] hover:text-[#3cffd0] transition-colors">
                  <Settings size={20} />
                </button>
              </div>

              <div className="h-10 w-px bg-white/10 mx-2" />

              <div className="flex items-center gap-4 bg-white/5 pl-4 pr-2 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                <div className="flex flex-col items-end">
                  <span className="verge-label-mono text-[10px] text-white font-black leading-none">{user?.name || 'GUEST USER'}</span>
                  <span className="verge-label-mono text-[8px] text-[#3cffd0] mt-1 tracking-tighter uppercase">ANALYST PRO</span>
                </div>
                <div className="w-8 h-8 bg-[#2d2d2d] rounded-full flex items-center justify-center text-white group-hover:bg-[#3cffd0] group-hover:text-black transition-all">
                  <UserIcon size={16} />
                </div>
                <ChevronDown size={14} className="text-[#949494] mr-2" />
              </div>
            </div>
            
          </div>
        </header>
      )}

      {/* MAIN VIEW AREA */}
      <div className={`flex-1 flex flex-col overflow-hidden ${activeTool ? 'p-0' : 'p-8 md:p-12 lg:p-20 gap-12'}`}>

        {/* DASHBOARD VIEW */}
        {view === 'DASHBOARD' && (
          <div className="flex-1 flex overflow-hidden relative">
            
            <div className={`flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden ${activeTool ? '' : 'space-y-12 pr-4'}`}>
              
              {/* TABS NAVIGATION - MASQUÉ SI OUTIL ACTIF */}
              {!activeTool && (
                <div className="flex items-center justify-between">
                  <nav className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-full w-fit">
                    {[
                      { id: 'exploration', label: 'Exploration (Événements)', icon: Activity },
                      { id: 'buildup', label: 'Build-Up (Séquences)', icon: TrendingUp },
                      { id: 'shots', label: 'Shot Map (Tirs)', icon: Target },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setActiveTool(null); setIsFilterOpen(false); }}
                        className={`flex items-center gap-3 px-8 py-3 rounded-full verge-label-mono text-[10px] font-black transition-all ${
                          activeTab === tab.id 
                          ? 'bg-[#3cffd0] text-black' 
                          : 'text-[#949494] hover:text-white'
                        }`}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </nav>

                  <div className="flex items-center gap-4">
                    <span className="verge-label-mono text-[10px] text-[#949494] opacity-40 uppercase tracking-[0.2em]">
                      MATCH ID: {typeof matchId === 'string' ? matchId : matchId?.match_id || '---'}
                    </span>
                  </div>
                </div>
              )}

              {/* MAIN CONTENT : TILES OR INTERNAL VIEW */}
              <main className={`flex-1 overflow-y-auto scrollbar-verge ${activeTool ? '' : 'pb-32'}`}>
                <AnimatePresence mode="wait">
                  {!activeTool ? (
                    <motion.div 
                      key={activeTab}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                      {activeTab === 'exploration' && (
                        <TileSkeleton 
                          title="Journal des Événements" 
                          desc="Flux brut enrichi de métriques AI (xT, Prog, Angles)." 
                          icon={<Activity />} 
                          onClick={() => setActiveTool('events')}
                        />
                      )}
                      {activeTab === 'buildup' && (
                        <TileSkeleton 
                          title="Chaînes de Possession" 
                          desc="Regroupement des événements en séquences tactiques." 
                          icon={<TrendingUp />} 
                          color="text-[#5200ff]" 
                          onClick={() => setActiveTool('sequences')}
                        />
                      )}
                      {activeTab === 'shots' && (
                        <TileSkeleton 
                          title="Shot Map Analytique" 
                          desc="Visualisation spatiale des tirs et probabilités xG." 
                          icon={<Target />} 
                          color="text-red-500" 
                          onClick={() => setActiveTool('shots')}
                        />
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="active-tool"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-full bg-[#131313] relative overflow-hidden"
                    >
                      {/* CLOSE BUTTON */}
                      <button 
                        onClick={() => { setActiveTool(null); setIsFilterOpen(false); }}
                        className="absolute top-10 right-10 z-[250] w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[#949494] hover:text-white hover:bg-red-500 transition-all group"
                      >
                        <X size={20} className="group-hover:rotate-90 transition-transform" />
                      </button>

                      {/* ROUTAGE IMMERSIF DES MODULES */}
                      {activeTool === 'events' ? (
                        <div className="w-full h-full p-8 overflow-hidden bg-[#131313] animate-in fade-in duration-700">
                          {/* HYDRATATION ET FILTRAGE DU JOURNAL DES ÉVÉNEMENTS */}
                          <EventExplorer 
                            data={data} 
                            matchId={matchId} 
                            loading={loading} 
                            filters={explorationFilters}
                          />
                        </div>
                      ) : activeTool === 'sequences' ? (
                        <BuildUpExplorer data={data} loading={loading} />
                      ) : activeTool === 'shots' ? (
                        <ShotMapExplorer data={data} loading={loading} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#131313] text-white/20">
                          <div className="verge-label-mono text-[10px] uppercase tracking-[0.5em]">
                            MODULE {activeTool?.toUpperCase()} EN ATTENTE D'IMPLÉMENTATION
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>

            {/* LATERAL FILTER PANEL (DRAWER LEFT) */}
            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setIsFilterOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                  />
                  <motion.div
                    initial={{ x: -500, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -500, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 left-0 h-full z-[201]"
                  >
                    {activeTab === 'exploration' && (
                      <ExplorationFilterPanel 
                        matchesList={matchesList}
                        teamsList={teamsList}
                        playersList={playersList}
                        filters={explorationFilters}
                        onFilterChange={setExplorationFilters}
                        onClose={() => setIsFilterOpen(false)} 
                      />
                    )}
                    {activeTab === 'buildup' && <BuildUpFilterPanel onClose={() => setIsFilterOpen(false)} />}
                    {activeTab === 'shots' && <ShotMapFilterPanel onClose={() => setIsFilterOpen(false)} />}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* FLOATING TOGGLE BUTTON (BOTTOM LEFT) - CONDITIONNEL */}
            <AnimatePresence>
              {activeTool && (
                <motion.button
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  onClick={() => setIsFilterOpen(true)}
                  className="fixed bottom-10 left-10 z-[150] w-14 h-14 bg-black border border-[#3cffd0]/30 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(60,255,208,0.2)] hover:scale-110 hover:border-[#3cffd0] transition-all group"
                >
                  <SlidersHorizontal size={22} className="text-[#3cffd0] group-hover:rotate-90 transition-transform duration-500" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

const TileSkeleton = ({ title, desc, icon, dataCount, onClick, color = "text-[#3cffd0]" }) => (
  <div 
    onClick={onClick}
    className="verge-card group cursor-pointer hover:border-[#3cffd0]/50 transition-all duration-300"
  >
    <div className="flex justify-between items-start mb-12">
      <div className={`w-12 h-12 bg-[#2d2d2d] border border-white/5 flex items-center justify-center rounded-[2px] ${color} group-hover:border-current transition-colors`}>
        {React.cloneElement(icon, { size: 20 })}
      </div>
      {dataCount !== undefined && (
        <span className="verge-label-mono text-[9px] bg-white/5 px-3 py-1 rounded-[2px]">{dataCount} RECORDS</span>
      )}
    </div>
    
    <div className="space-y-4">
      <h3 className="text-3xl font-black text-white uppercase leading-none tracking-tighter group-hover:text-[#3cffd0] transition-colors">{title}</h3>
      <p className="verge-label-mono text-[10px] text-[#949494] lowercase italic opacity-60 leading-relaxed">{desc}</p>
    </div>
    
    <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
      <span className="verge-label-mono text-[8px] text-[#949494]">READY FOR RENDERING</span>
      <ChevronRight size={14} className="text-[#949494] group-hover:text-white transition-all group-hover:translate-x-1" />
    </div>
  </div>
);

export default OptaVisionDashboard;
