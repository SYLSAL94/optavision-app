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
import MultiSelectWithChips from '../ui/MultiSelectWithChips';
import TacticalPositionPicker from './TacticalPositionPicker';
import DualRangeSlider from '../ui/DualRangeSlider';

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
  advancedMetricsList = [],
  teamsList = [], 
  playersList = [], 
  filters, 
  onFilterChange, 
  onClose 
}) => {
  const [openSection, setOpenSection] = useState('primary');

  // Règle d'Or : Mapping des noms explicites (Résolution des IDs en labels lisibles)
  const teamMap = useMemo(() => {
    const map = {};
    teamsList.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [teamsList]);

  
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
      period_id: [],
      location: [],
      zone: [],
      competition: [],
      season: [],
      week: [],
      country: [],
      phase: [],
      stadium: [],
      stadium: [],
      advanced_tactics: [],
      startDate: '',
      endDate: '',
      player_id: [],
      receiver_id: [],
      opponent_id: []
    };
    setPendingFilters(initial);
  };

  const applyAnalysis = () => {
    onFilterChange(pendingFilters);
    onClose();
  };


  return (
    <aside className="w-[450px] h-full flex flex-col bg-[#131313]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl relative">
      
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
      <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-4 scrollbar-verge relative">

        
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
            <div className="space-y-8">
              <MultiSelectWithChips 
                label="Compétitions" 
                options={competitionsList} 
                selected={pendingFilters.competition || []} 
                onChange={(vals) => setPendingFilters({ ...pendingFilters, competition: vals })} 
                placeholder="Sélectionner..." 
              />
              <MultiSelectWithChips 
                label="Saisons" 
                options={seasonsList.map(String)} 
                selected={(pendingFilters.season || []).map(String)} 
                onChange={(vals) => setPendingFilters({ ...pendingFilters, season: vals })} 
                placeholder="Sélectionner..." 
              />
              <MultiSelectWithChips 
                label="Journées" 
                options={weeksList.map(String)} 
                selected={(pendingFilters.week || []).map(String)} 
                onChange={(vals) => setPendingFilters({ ...pendingFilters, week: vals })} 
                placeholder="Sélectionner..." 
              />
              <MultiSelectWithChips 
                label="Pays" 
                options={countriesList} 
                selected={pendingFilters.country || []} 
                onChange={(vals) => setPendingFilters({ ...pendingFilters, country: vals })} 
                placeholder="Sélectionner..." 
              />
              <MultiSelectWithChips 
                label="Phases" 
                options={phasesList} 
                selected={pendingFilters.phase || []} 
                onChange={(vals) => setPendingFilters({ ...pendingFilters, phase: vals })} 
                placeholder="Sélectionner..." 
              />
              <MultiSelectWithChips 
                label="Stades" 
                options={stadiumsList} 
                selected={pendingFilters.stadium || []} 
                onChange={(vals) => setPendingFilters({ ...pendingFilters, stadium: vals })} 
                placeholder="Sélectionner..." 
              />
            </div>

            <div className="h-px bg-white/5 my-4" />

            <MultiSelectWithChips 
              label="Sélection Individuelle (Match)" 
              options={matchesList.map(m => m.label || m.id)} 
              selected={(pendingFilters.matches || []).map(id => matchesList.find(m => m.id === id)?.label || id)} 
              onChange={(vals) => {
                const selectedIds = vals.map(val => matchesList.find(m => m.label === val || m.id === val)?.id);
                setPendingFilters({ ...pendingFilters, matches: selectedIds });
              }} 
              placeholder="Sélectionner des matchs..." 
            />

            <div className="h-px bg-white/5 my-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Équipe (Focus)</label>
                <select 
                  value={pendingFilters.localTeam || 'ALL'} 
                  onChange={(e) => setPendingFilters({ ...pendingFilters, localTeam: e.target.value })}
                  className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white focus:border-[#3cffd0] outline-none transition-all cursor-pointer rounded-[2px]"
                >
                  <option value="ALL">TOUTES ÉQUIPES</option>
                  {teamsList.map(team => (
                    <option key={team.id} value={team.id}>{teamMap[team.id]?.toUpperCase() || team.id}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">Opposition</label>
                <select 
                  value={pendingFilters.localOpponent || 'ALL'} 
                  onChange={(e) => setPendingFilters({ ...pendingFilters, localOpponent: e.target.value })}
                  className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white focus:border-[#ff4d4d] outline-none transition-all cursor-pointer rounded-[2px]"
                >
                  <option value="ALL">SANS FILTRE</option>
                  {teamsList.map(team => (
                    <option key={team.id} value={team.id}>VS {teamMap[team.id]?.toUpperCase() || team.id}</option>
                  ))}
                </select>
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
            <MultiSelectWithChips 
              label="Types d'Actions" 
              options={availableActionTypes} 
              selected={pendingFilters.types || []} 
              onChange={(vals) => setPendingFilters({ ...pendingFilters, types: vals })} 
              placeholder="Sélectionner des actions..." 
            />



            <MultiSelectWithChips 
              label="Sélection des Joueurs" 
              options={playersList.map(p => p.name)} 
              selected={(pendingFilters.players || []).map(id => playersList.find(p => p.id === id)?.name).filter(Boolean)} 
              onChange={(selectedNames) => {
                const selectedIds = selectedNames.map(name => playersList.find(p => p.name === name)?.id).filter(Boolean);
                setPendingFilters({ ...pendingFilters, players: selectedIds });
              }} 
              placeholder="Rechercher des joueurs..." 
            />
          </div>
        </AccordionSection>

        {/* SECTION 1.5 : RELATIONS TACTIQUES */}
        <AccordionSection 
          id="relations" 
          title="Acteurs & Relations Tactiques" 
          icon={<User size={18} />}
          isOpen={openSection === 'relations'}
          onToggle={() => setOpenSection(openSection === 'relations' ? null : 'relations')}
          badge={(pendingFilters.player_id?.length || 0) + (pendingFilters.receiver_id?.length || 0) + (pendingFilters.opponent_id?.length || 0)}
        >
          <div className="space-y-10">
            <MultiSelectWithChips 
              label="Joueur Focus / Passeur" 
              options={playersList.map(p => p.name)} 
              selected={(pendingFilters.player_id || []).map(id => playersList.find(p => p.id === id)?.name).filter(Boolean)} 
              onChange={(selectedNames) => {
                const selectedIds = selectedNames.map(name => playersList.find(p => p.name === name)?.id).filter(Boolean);
                setPendingFilters({ ...pendingFilters, player_id: selectedIds });
              }} 
              placeholder="Rechercher des joueurs..." 
            />

            <MultiSelectWithChips 
              label="Receveur" 
              options={playersList.map(p => p.name)} 
              selected={(pendingFilters.receiver_id || []).map(id => playersList.find(p => p.id === id)?.name).filter(Boolean)} 
              onChange={(selectedNames) => {
                const selectedIds = selectedNames.map(name => playersList.find(p => p.name === name)?.id).filter(Boolean);
                setPendingFilters({ ...pendingFilters, receiver_id: selectedIds });
              }} 
              placeholder="Rechercher des receveurs..." 
            />

            <MultiSelectWithChips 
              label="Adversaire de Duel" 
              options={playersList.map(p => p.name)} 
              selected={(pendingFilters.opponent_id || []).map(id => playersList.find(p => p.id === id)?.name).filter(Boolean)} 
              onChange={(selectedNames) => {
                const selectedIds = selectedNames.map(name => playersList.find(p => p.name === name)?.id).filter(Boolean);
                setPendingFilters({ ...pendingFilters, opponent_id: selectedIds });
              }} 
              placeholder="Rechercher des adversaires..." 
            />
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
          <div className="space-y-10">
            <MultiSelectWithChips 
              label="Lieu (Side)" 
              options={['Domicile', 'Extérieur']} 
              selected={(pendingFilters.location || []).map(l => l === 'home' ? 'Domicile' : 'Extérieur')} 
              onChange={(vals) => setPendingFilters({ ...pendingFilters, location: vals.map(v => v === 'Domicile' ? 'home' : 'away') })} 
              placeholder="Sélectionner..." 
            />

            <MultiSelectWithChips 
              label="Période" 
              options={['1ère Mi-temps', '2ème Mi-temps']} 
              selected={(pendingFilters.period_id || []).map(p => p === 1 ? '1ère Mi-temps' : '2ème Mi-temps')} 
              onChange={(vals) => setPendingFilters({ ...pendingFilters, period_id: vals.map(v => v === '1ère Mi-temps' ? 1 : 2) })} 
              placeholder="Sélectionner..." 
            />

            <div className="space-y-4">
              <label className="verge-label-mono text-[10px] text-hazard-white/40 mb-4 block uppercase tracking-widest font-black group-hover:text-hazard-white transition-colors">Zone Tactique (Visual)</label>
              <TacticalPositionPicker 
                selectedPositions={pendingFilters.zone || []}
                onChange={(vals) => setPendingFilters({ ...pendingFilters, zone: vals })}
              />
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

            <MultiSelectWithChips 
              label="Tactique Avancée (JSONB)" 
              options={advancedMetricsList} 
              selected={pendingFilters.advanced_tactics || []} 
              onChange={(vals) => setPendingFilters({ ...pendingFilters, advanced_tactics: vals })} 
              placeholder="Sélectionner..." 
            />
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
              <FilterGroup label="Plage de Dates (Début)">
                <input 
                  type="date" 
                  value={pendingFilters.startDate || ''}
                  onChange={(e) => setPendingFilters({ ...pendingFilters, startDate: e.target.value })}
                  className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-[10px] outline-none focus:border-[#3cffd0] transition-all"
                />
              </FilterGroup>
              <FilterGroup label="Plage de Dates (Fin)">
                <input 
                  type="date" 
                  value={pendingFilters.endDate || ''}
                  onChange={(e) => setPendingFilters({ ...pendingFilters, endDate: e.target.value })}
                  className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-[10px] outline-none focus:border-[#3cffd0] transition-all"
                />
              </FilterGroup>
            </div>

            <div className="h-px bg-white/5 my-4" />

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

const MultiSelectDropdown = ({ options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white flex justify-between items-center cursor-pointer hover:border-[#3cffd0] transition-colors"
      >
        <span className="truncate pr-4">
          {selectedValues.length === 0 ? placeholder : 
           selectedValues.length === 1 ? options.find(o => String(o.value) === String(selectedValues[0]))?.label || placeholder :
           `${selectedValues.length} SÉLECTION(S)`}
        </span>
        <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-[#1a1a1a] border border-[#3cffd0]/30 z-[999] max-h-64 overflow-y-auto styled-scrollbar-verge shadow-[0_20px_50px_rgba(0,0,0,0.8)]">

          {options.map(opt => {
            const isSelected = selectedValues.some(v => String(v) === String(opt.value));
            return (
              <div 
                key={opt.value}
                onClick={() => {
                  if (isSelected) onChange(selectedValues.filter(v => String(v) !== String(opt.value)));
                  else onChange([...selectedValues, opt.value]);
                }}
                className={`p-3 border-b border-white/5 verge-label-mono text-[9px] uppercase cursor-pointer flex justify-between items-center hover:bg-white/5 transition-colors ${isSelected ? 'text-[#3cffd0] bg-[#3cffd0]/5' : 'text-[#949494]'}`}
              >
                {opt.label}
                {isSelected && <Check size={12} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExplorationFilterPanel;
