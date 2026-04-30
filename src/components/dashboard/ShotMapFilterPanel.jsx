import React, { useState } from 'react';
import {
  Check,
  Crosshair,
  RotateCcw,
  Shield,
  Target,
  Zap
} from 'lucide-react';
import AccordionSection from './AccordionSection';

const DEFAULT_FILTERS = {
  outcomes: [],
  bodyParts: [],
  situations: [],
  distanceMax: null
};

const OUTCOME_OPTIONS = [
  { id: 'goal', label: 'But' },
  { id: 'saved', label: 'Arret' },
  { id: 'blocked', label: 'Contre' },
  { id: 'post', label: 'Poteau' },
  { id: 'missed', label: 'Hors-cadre' }
];

const BODY_PART_OPTIONS = [
  { id: 'head', label: 'Tete', qualifierId: 15 },
  { id: 'right_foot', label: 'Pied droit', qualifierId: 20 },
  { id: 'left_foot', label: 'Pied gauche', qualifierId: 72 }
];

const SITUATION_OPTIONS = [
  { id: 'fast_break', label: 'Contre-attaque' },
  { id: 'regular_play', label: 'Jeu place' },
  { id: 'one_on_one', label: 'Face-a-face' },
  { id: 'out_of_box', label: 'Hors surface' }
];

const mergeFilters = (filters) => ({
  ...DEFAULT_FILTERS,
  ...(filters || {})
});

const ShotMapFilterPanel = ({ filters, onFilterChange, onApply, onClose }) => {
  const [openSection, setOpenSection] = useState('precision');
  const activeFilters = mergeFilters(filters);
  const distanceValue = activeFilters.distanceMax ?? 40;

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const updateFilters = (patch) => {
    onFilterChange?.({
      ...activeFilters,
      ...patch
    });
  };

  const toggleArrayFilter = (key, value) => {
    const values = activeFilters[key] || [];
    updateFilters({
      [key]: values.includes(value)
        ? values.filter(item => item !== value)
        : [...values, value]
    });
  };

  const resetFilters = () => {
    onFilterChange?.(DEFAULT_FILTERS);
  };

  const optionClassName = (active) => (
    `border py-3 verge-label-mono text-[9px] uppercase font-black transition-all ${
      active
        ? 'bg-red-500 text-white border-red-400'
        : 'bg-[#131313] text-[#949494] border-white/5 hover:text-white hover:border-red-500/30'
    }`
  );

  return (
    <aside className="w-[450px] h-full flex flex-col bg-[#131313] border-l border-white/10 shadow-2xl">
      <div className="p-10 pb-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex flex-col">
            <h3 className="verge-h3 text-white flex items-center gap-4">
              <Target size={22} className="text-red-500" />
              FILTRAGE TIRS
            </h3>
            <p className="verge-label-mono text-[9px] text-[#949494] mt-2 uppercase tracking-widest">Precision, resultat et distance</p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black transition-colors flex items-center gap-2"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-2 scrollbar-verge">
        <AccordionSection
          id="precision"
          title="Precision & Resultat"
          icon={<Crosshair size={18} />}
          isOpen={openSection === 'precision'}
          onToggle={() => toggleSection('precision')}
          subtitle="BUTS & CADRES"
        >
          <div className="grid grid-cols-2 gap-2">
            {OUTCOME_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleArrayFilter('outcomes', option.id)}
                className={optionClassName(activeFilters.outcomes.includes(option.id))}
              >
                {option.label}
              </button>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          id="tactical"
          title="Attributs Opta"
          icon={<Shield size={18} />}
          isOpen={openSection === 'tactical'}
          onToggle={() => toggleSection('tactical')}
          subtitle="QUALIFIERS"
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Partie du corps</label>
              <div className="grid grid-cols-3 gap-2">
                {BODY_PART_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleArrayFilter('bodyParts', option.id)}
                    className={optionClassName(activeFilters.bodyParts.includes(option.id))}
                    title={`Qualifier Opta ${option.qualifierId}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Situation</label>
              <div className="space-y-2">
                {SITUATION_OPTIONS.map(option => {
                  const active = activeFilters.situations.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleArrayFilter('situations', option.id)}
                      className={`w-full flex items-center justify-between p-3 border transition-colors ${
                        active
                          ? 'bg-red-500/15 border-red-500 text-white'
                          : 'bg-transparent border-white/5 text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="verge-label-mono text-[10px] uppercase font-black">{option.label}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-red-400 shadow-[0_0_8px_red]' : 'bg-white/20'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          id="geometry"
          title="Geometrie"
          icon={<Zap size={18} />}
          isOpen={openSection === 'geometry'}
          onToggle={() => toggleSection('geometry')}
          subtitle="DISTANCE"
        >
          <div className="p-8 bg-[#2d2d2d]/50 border border-white/5 rounded-[2px] relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <label className="verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">Distance max</label>
              <span className="verge-label-mono text-[11px] text-red-500 font-black">
                {activeFilters.distanceMax === null ? 'Tout' : `${activeFilters.distanceMax}m`}
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={distanceValue}
              onChange={(event) => updateFilters({ distanceMax: Number(event.target.value) })}
              className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-red-500"
            />
            <button
              type="button"
              onClick={() => updateFilters({ distanceMax: null })}
              className="mt-5 verge-label-mono text-[9px] text-[#949494] hover:text-white uppercase font-black"
            >
              Inclure toutes les distances
            </button>
          </div>
        </AccordionSection>
      </div>

      <div className="p-10 bg-[#131313] border-t border-white/10">
        <button
          type="button"
          onClick={() => onApply?.(activeFilters)}
          className="w-full bg-red-500 text-white py-6 rounded-[2px] verge-label-mono text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-white hover:text-black transition-all shadow-[0_20px_40px_rgba(239,68,68,0.1)]"
        >
          Appliquer l'Analyse
          <Check size={18} />
        </button>
      </div>
    </aside>
  );
};

export default ShotMapFilterPanel;
