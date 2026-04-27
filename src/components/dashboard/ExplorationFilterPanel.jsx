import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  Activity, 
  Map as MapIcon, 
  Zap, 
  SlidersHorizontal, 
  RotateCcw, 
  Check,
  Search,
  ChevronDown,
  User,
  Target,
  X,
  Database
} from 'lucide-react';
import AccordionSection from './AccordionSection';

/**
 * ExplorationFilterPanel - Version Dynamique (Auto-Discovery)
 * Hydrate automatiquement les filtres à partir de la prop eventsData.
 */
const ExplorationFilterPanel = ({ 
  matchesList = [], 
  availableActionTypes = [], 
  competitionsList = [],
  seasonsList = [],
  weeksList = [],
  countriesList = [],
  phasesList = [],
  stadiumsList = [],
  teamsList = [], 
  playersList = [], 
  filters, 
  onFilterChange, 
  onClose 
}) => {
  const [openSection, setOpenSection] = useState('primary');
  const [searchTerm, setSearchTerm] = useState('');
  
  // BOUCLIER ANTI-SPAM : État local pour les modifications en cours
  const [pendingFilters, setPendingFilters] = useState({ ...filters });

  const toggleFilter = (category, value) => {
    const filterValue = typeof value === 'object' ? value.id : value;
    const current = pendingFilters[category] || [];
    const updated = current.includes(filterValue)
      ? current.filter(v => v !== filterValue)
      : [...current, filterValue];
    setPendingFilters({ ...pendingFilters, [category]: updated });
  };

  const updateNumericFilter = (category, value) => {
    setPendingFilters({ ...pendingFilters, [category]: value });
  };

  const resetFilters = () => {
    const initial = {
      matches: [],
      types: [],
      players: [],
      teams: [],
      min_xt: 0.0,
      start_min: 0,
      end_min: 95,
      outcome: null,
      period_id: null,
      location: null,
      zone: null,
      competition: null,
      season: null,
      week: null,
      country: null,
      phase: null,
      stadium: null
    };
    setPendingFilters(initial);
  };

  const applyAnalysis = () => {
    onFilterChange(pendingFilters);
    onClose();
  };

  const filteredPlayers = playersList.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-[450px] h-full flex flex-col bg-[#131313] border-l border-white/10 shadow-2xl relative">
      
      {/* HEADER SECTION */}
      <div className="p-10 pb-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex flex-col">
            <h3 className="verge-h3 text-white flex items-center gap-4">
              <SlidersHorizontal size={22} className="text-[#3cffd0]" />
              FILTRAGE CONTEXTUEL
            </h3>
            <p className="verge-label-mono text-[9px] text-[#3cffd0] mt-2 uppercase tracking-[0.2em] font-black">
              {matchesList.length} MATCHS DÉTECTÉS
            </p>
          </div>
          <button 
            onClick={resetFilters}
            className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black transition-colors flex items-center gap-2"
          >
            <RotateCcw size={12} />
            Réinitialiser
          </button>
        </div>
      </div>

      {/* CONTENT : ACCORDIONS */}
      <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-4 scrollbar-verge">
        
        {/* SECTION 0 : SÉLECTION DES MATCHS (Cross-Match) */}
        <AccordionSection 
          id="matches" 
          title="Silos de Données" 
          icon={<Database size={18} />}
          isOpen={openSection === 'matches'}
          onToggle={() => setOpenSection(openSection === 'matches' ? null : 'matches')}
          badge={(pendingFilters.matches?.length || 0) + (pendingFilters.competition ? 1 : 0) + (pendingFilters.season ? 1 : 0) + (pendingFilters.week ? 1 : 0) + (pendingFilters.country ? 1 : 0)}
        >
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              {/* Filtre par Compétition */}
              <div className="space-y-3">
                <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Compétition</label>
                <select 
                  value={pendingFilters.competition || ''} 
                  onChange={(e) => setPendingFilters({ ...pendingFilters, competition: e.target.value || null })}
                  className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white outline-none focus:border-[#3cffd0]"
                >
                  <option value="">TOUTES</option>
                  {competitionsList.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>

              {/* Filtre par Saison */}
              <div className="space-y-3">
                <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Saison</label>
                <select 
                  value={pendingFilters.season || ''} 
                  onChange={(e) => setPendingFilters({ ...pendingFilters, season: e.target.value || null })}
                  className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white outline-none focus:border-[#3cffd0]"
                >
                  <option value="">TOUTES</option>
                  {seasonsList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Filtre par Semaine */}
              <div className="space-y-3">
                <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Semaine</label>
                <select 
                  value={pendingFilters.week || ''} 
                  onChange={(e) => setPendingFilters({ ...pendingFilters, week: e.target.value || null })}
                  className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white outline-none focus:border-[#3cffd0]"
                >
                  <option value="">TOUTES</option>
                  {weeksList.map(w => <option key={w} value={w}>SEM {w}</option>)}
                </select>
              </div>

              {/* Filtre par Pays */}
              <div className="space-y-3">
                <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Pays</label>
                <select 
                  value={pendingFilters.country || ''} 
                  onChange={(e) => setPendingFilters({ ...pendingFilters, country: e.target.value || null })}
                  className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white outline-none focus:border-[#3cffd0]"
                >
                  <option value="">TOUS</option>
                  {countriesList.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Filtre par Phase */}
              <div className="space-y-3">
                <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Phase</label>
                <select 
                  value={pendingFilters.phase || ''} 
                  onChange={(e) => setPendingFilters({ ...pendingFilters, phase: e.target.value || null })}
                  className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white outline-none focus:border-[#3cffd0]"
                >
                  <option value="">TOUTES</option>
                  {phasesList.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                </select>
              </div>

              {/* Filtre par Stade */}
              <div className="space-y-3">
                <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Stade</label>
                <select 
                  value={pendingFilters.stadium || ''} 
                  onChange={(e) => setPendingFilters({ ...pendingFilters, stadium: e.target.value || null })}
                  className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white outline-none focus:border-[#3cffd0]"
                >
                  <option value="">TOUS</option>
                  {stadiumsList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="h-px bg-white/5 my-4" />

            <div className="space-y-4">
              <div className="verge-label-mono text-[8px] text-[#949494] uppercase mb-4 tracking-widest">SÉLECTION INDIVIDUELLE</div>
              <div className="space-y-1">
                {matchesList.map(match => (
                  <button 
                    key={match.id}
                    onClick={() => toggleFilter('matches', match.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-[2px] verge-label-mono text-[10px] font-black uppercase transition-all ${
                      pendingFilters.matches.includes(match.id)
                      ? 'bg-[#3cffd0]/10 text-[#3cffd0] border border-[#3cffd0]/20'
                      : 'bg-white/5 text-[#949494] border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {match.label || match.id}
                    {pendingFilters.matches.includes(match.id) && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* SECTION 1 : ACTEURS & ACTIONS */}
        <AccordionSection 
          id="primary" 
          title="Filtres Tactiques" 
          icon={<Activity size={18} />}
          isOpen={openSection === 'primary'}
          onToggle={() => setOpenSection(openSection === 'primary' ? null : 'primary')}
          badge={(pendingFilters.types?.length || 0) + (pendingFilters.players?.length || 0)}
        >
          <div className="space-y-10">
            <FilterGroup label="Types d'Actions">
              <div className="grid grid-cols-2 gap-2">
                {availableActionTypes.map(type => (
                  <button 
                    key={type} 
                    onClick={() => toggleFilter('types', type)}
                    className={`border py-3 verge-label-mono text-[9px] font-black uppercase transition-all ${
                      pendingFilters.types.includes(type)
                      ? 'bg-[#3cffd0] text-black border-[#3cffd0]'
                      : 'bg-[#131313] border-white/5 text-[#949494] hover:border-[#3cffd0]/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Sélection des Joueurs">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#949494]" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="RECHERCHER UN NOM..." 
                  className="w-full bg-[#131313] border border-white/10 py-4 pl-12 pr-4 verge-label-mono text-[10px] text-white focus:border-[#3cffd0] outline-none transition-all uppercase"
                />
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-verge space-y-1 pr-2">
                 {filteredPlayers.map(player => (
                   <button 
                     key={player.id}
                     onClick={() => toggleFilter('players', player)}
                     className={`w-full flex items-center justify-between px-4 py-3 rounded-[2px] verge-label-mono text-[10px] font-black uppercase transition-all ${
                       pendingFilters.players.includes(player.id)
                       ? 'bg-[#3cffd0]/10 text-[#3cffd0] border border-[#3cffd0]/20'
                       : 'bg-white/5 text-[#949494] border border-transparent hover:bg-white/10'
                     }`}
                   >
                     {player.name}
                     {pendingFilters.players.includes(player.id) && <Check size={12} />}
                   </button>
                 ))}
              </div>
            </FilterGroup>
          </div>
        </AccordionSection>

        {/* SECTION 2 : CONTEXTE TACTIQUE (Période, Lieu, Zone) */}
        <AccordionSection 
          id="context" 
          title="Contexte & Espace" 
          icon={<Target size={18} />}
          isOpen={openSection === 'context'}
          onToggle={() => setOpenSection(openSection === 'context' ? null : 'context')}
          badge={(pendingFilters.period_id ? 1 : 0) + (pendingFilters.location ? 1 : 0) + (pendingFilters.zone ? 1 : 0)}
        >
          <div className="space-y-6">
            {/* Lieu du match */}
            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Lieu (Side)</label>
              <div className="grid grid-cols-2 gap-2">
                {['home', 'away'].map(loc => (
                  <button
                    key={loc}
                    onClick={() => setPendingFilters({ ...pendingFilters, location: pendingFilters.location === loc ? null : loc })}
                    className={`px-4 py-3 rounded-[2px] verge-label-mono text-[9px] font-black uppercase border transition-all ${
                      pendingFilters.location === loc 
                      ? 'bg-[#3cffd0] text-black border-[#3cffd0]' 
                      : 'bg-white/5 text-[#949494] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {loc === 'home' ? 'Domicile' : 'Extérieur'}
                  </button>
                ))}
              </div>
            </div>

            {/* Période */}
            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Période</label>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map(p => (
                  <button
                    key={p}
                    onClick={() => setPendingFilters({ ...pendingFilters, period_id: pendingFilters.period_id === p ? null : p })}
                    className={`px-4 py-3 rounded-[2px] verge-label-mono text-[9px] font-black uppercase border transition-all ${
                      pendingFilters.period_id === p 
                      ? 'bg-[#3cffd0] text-black border-[#3cffd0]' 
                      : 'bg-white/5 text-[#949494] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {p === 1 ? '1ère Mi-temps' : '2ème Mi-temps'}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone de jeu */}
            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Zone Tactique (JSONB)</label>
              <div className="grid grid-cols-2 gap-2">
                {['Center', 'Left', 'Right', 'Back'].map(z => (
                  <button
                    key={z}
                    onClick={() => setPendingFilters({ ...pendingFilters, zone: pendingFilters.zone === z ? null : z })}
                    className={`px-4 py-3 rounded-[2px] verge-label-mono text-[9px] font-black uppercase border transition-all ${
                      pendingFilters.zone === z 
                      ? 'bg-[#3cffd0] text-black border-[#3cffd0]' 
                      : 'bg-white/5 text-[#949494] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* SECTION 3 : PERFORMANCE (xT, OUTCOME) */}
        <AccordionSection 
          id="performance" 
          title="Indicateurs Clés" 
          icon={<Zap size={18} />}
          isOpen={openSection === 'performance'}
          onToggle={() => setOpenSection(openSection === 'performance' ? null : 'performance')}
        >
          <div className="space-y-10">
            <FilterGroup label={`Seuil de Menace (xT >= ${pendingFilters.min_xt})`}>
              <input 
                type="range" 
                min="0" max="0.5" step="0.01" 
                value={pendingFilters.min_xt}
                onChange={(e) => updateNumericFilter('min_xt', parseFloat(e.target.value))}
                className="w-full accent-[#3cffd0] bg-[#2d2d2d] h-1 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between verge-label-mono text-[8px] text-[#949494]">
                 <span>NEUTRE (0.0)</span>
                 <span>DANGER (+0.5)</span>
              </div>
            </FilterGroup>

            <FilterGroup label="Résultat de l'action">
               <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: null, label: 'TOUS' },
                    { id: 1, label: 'RÉUSSIS' },
                    { id: 0, label: 'ÉCHECS' }
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => updateNumericFilter('outcome', opt.id)}
                      className={`py-3 border verge-label-mono text-[9px] font-black uppercase transition-all ${
                        pendingFilters.outcome === opt.id
                        ? 'bg-[#5200ff] text-white border-[#5200ff]'
                        : 'bg-[#131313] border-white/5 text-[#949494]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
               </div>
            </FilterGroup>
          </div>
        </AccordionSection>

        {/* SECTION 3 : FENÊTRE TEMPORELLE */}
        <AccordionSection 
          id="time" 
          title="Chronologie" 
          icon={<RotateCcw size={18} />}
          isOpen={openSection === 'time'}
          onToggle={() => setOpenSection(openSection === 'time' ? null : 'time')}
        >
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <FilterGroup label="Minute Début">
                 <input 
                   type="number" 
                   value={pendingFilters.start_min}
                   onChange={(e) => updateNumericFilter('start_min', parseInt(e.target.value))}
                   className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-xs outline-none"
                 />
              </FilterGroup>
              <FilterGroup label="Minute Fin">
                 <input 
                   type="number" 
                   value={pendingFilters.end_min}
                   onChange={(e) => updateNumericFilter('end_min', parseInt(e.target.value))}
                   className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-xs outline-none"
                 />
              </FilterGroup>
            </div>
          </div>
        </AccordionSection>

      </div>

      {/* FOOTER : APPLY BUTTON (BOUCLIER ANTI-SPAM) */}
      <div className="p-10 bg-[#131313] border-t border-white/10">
        <button 
          onClick={applyAnalysis}
          className="w-full bg-[#3cffd0] text-black py-6 rounded-[2px] verge-label-mono text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-white transition-all shadow-[0_20px_40px_rgba(60,255,208,0.2)]"
        >
          Appliquer l'Analyse
          <Check size={18} />
        </button>
      </div>
    </aside>
  );
};

const FilterGroup = ({ label, children }) => (
  <div className="space-y-4">
    <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">
      {label}
    </label>
    {children}
  </div>
);

export default ExplorationFilterPanel;
