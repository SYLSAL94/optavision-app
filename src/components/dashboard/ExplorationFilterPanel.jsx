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
  X
} from 'lucide-react';
import AccordionSection from './AccordionSection';

/**
 * ExplorationFilterPanel - Version Dynamique (Auto-Discovery)
 * Hydrate automatiquement les filtres à partir de la prop eventsData.
 */
const ExplorationFilterPanel = ({ matchesList = [], teamsList = [], playersList = [], filters, onFilterChange, onClose }) => {
  const [openSection, setOpenSection] = useState('primary');
  const [searchTerm, setSearchTerm] = useState('');

  // Liste fixe des types d'actions (Contrat Opta)
  const actionTypes = ['Pass', 'Shot', 'Tackle', 'Interception', 'Clearance', 'Save', 'Carry'];

  const toggleFilter = (category, value) => {
    // Si la valeur est un objet (player/team), on utilise son .id
    const filterValue = typeof value === 'object' ? value.id : value;
    
    const current = filters[category] || [];
    const updated = current.includes(filterValue)
      ? current.filter(v => v !== filterValue)
      : [...current, filterValue];
    onFilterChange({ ...filters, [category]: updated });
  };

  const resetFilters = () => {
    onFilterChange({
      types: [],
      players: [],
      xtMin: 0.0,
      scoreMin: 0
    });
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
              AUTO-DISCOVERY
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
            Reset
          </button>
        </div>

        {/* STATS RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-[#2d2d2d] p-4 rounded-[2px] border border-white/5">
              <div className="verge-label-mono text-[8px] text-[#949494] uppercase mb-1">Entités Joueurs</div>
              <div className="verge-label-mono text-xl text-white font-black">{playersList.length}</div>
           </div>
           <div className="bg-[#2d2d2d] p-4 rounded-[2px] border border-white/5">
              <div className="verge-label-mono text-[8px] text-[#949494] uppercase mb-1">Types d'Actions</div>
              <div className="verge-label-mono text-xl text-white font-black">{actionTypes.length}</div>
           </div>
        </div>
      </div>

      {/* CONTENT : ACCORDIONS */}
      <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-2 scrollbar-verge">
        
        {/* SECTION 1 : ACTIONS */}
        <AccordionSection 
          id="primary" 
          title="Filtres Actions" 
          icon={<Activity size={18} />}
          isOpen={openSection === 'primary'}
          onToggle={() => setOpenSection(openSection === 'primary' ? null : 'primary')}
          subtitle="CATÉGORIES DÉTECTÉES"
          badge={filters.types.length}
        >
          <div className="space-y-10">
            <FilterGroup label="Types d'Actions">
              <div className="grid grid-cols-2 gap-2">
                {actionTypes.map(type => (
                  <button 
                    key={type} 
                    onClick={() => toggleFilter('types', type)}
                    className={`border py-3 verge-label-mono text-[9px] font-black uppercase transition-all ${
                      filters.types.includes(type)
                      ? 'bg-[#3cffd0] text-black border-[#3cffd0]'
                      : 'bg-[#131313] border-white/5 text-[#949494] hover:border-[#3cffd0]/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Recherche Joueur">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#949494]" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="NOM DU JOUEUR..." 
                  className="w-full bg-[#131313] border border-white/10 py-4 pl-12 pr-4 verge-label-mono text-[10px] text-white focus:border-[#3cffd0] outline-none transition-all uppercase"
                />
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-verge space-y-1 pr-2">
                 {filteredPlayers.map(player => (
                   <button 
                     key={player.id}
                     onClick={() => toggleFilter('players', player)}
                     className={`w-full flex items-center justify-between px-4 py-3 rounded-[2px] verge-label-mono text-[10px] font-black uppercase transition-all ${
                       filters.players.includes(player.id)
                       ? 'bg-[#3cffd0]/10 text-[#3cffd0] border border-[#3cffd0]/20'
                       : 'bg-white/5 text-[#949494] border border-transparent hover:bg-white/10'
                     }`}
                   >
                     {player.name}
                     {filters.players.includes(player.id) && <Check size={12} />}
                   </button>
                 ))}
              </div>
            </FilterGroup>
          </div>
        </AccordionSection>

        {/* SECTION 2 : SPATIAL (Placeholder for now) */}
        <AccordionSection 
          id="spatial" 
          title="Zones Terrain" 
          icon={<MapIcon size={18} />}
          isOpen={openSection === 'spatial'}
          onToggle={() => setOpenSection(openSection === 'spatial' ? null : 'spatial')}
          subtitle="DÉPART & ARRIVÉE"
        >
          <div className="p-8 border border-white/5 bg-[#2d2d2d]/30 text-center">
             <MapIcon size={32} className="mx-auto mb-4 text-[#3cffd0]/20" />
             <p className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest">Interactive Polygon Selection Coming in v2</p>
          </div>
        </AccordionSection>

      </div>

      {/* FOOTER : CLOSE */}
      <div className="p-10 bg-[#131313] border-t border-white/10 flex gap-4">
        <button 
          onClick={onClose}
          className="flex-1 bg-[#3cffd0] text-black py-6 rounded-[2px] verge-label-mono text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-white transition-all shadow-[0_20px_40px_rgba(60,255,208,0.1)]"
        >
          Appliquer
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
