import React, { useEffect, useState } from 'react';
import {
  Check,
  Crosshair,
  Database,
  RotateCcw,
  Shield,
  Target,
  Zap
} from 'lucide-react';
import AccordionSection from './AccordionSection';
import MultiSelectWithChips from '../ui/MultiSelectWithChips';
import AsyncMultiSelect from './AsyncMultiSelect';
import { OPTAVISION_API_URL } from '../../config';

const TEAM_SEARCH_ENDPOINT = `${OPTAVISION_API_URL}/api/optavision/teams`;

const DEFAULT_FILTERS = {
  outcomes: [],
  bodyParts: [],
  situations: [],
  distanceMax: null,
  minXg: null,
  minXgot: null,
  matches: [],
  competition: [],
  season: [],
  week: [],
  country: [],
  phase: [],
  stadium: [],
  startDate: '',
  endDate: '',
  start_min: 0,
  end_min: 130,
  localTeam: 'ALL',
  localOpponent: 'ALL',
  player_id: []
};

const OUTCOME_OPTIONS = [
  { id: 'goal', label: 'But' },
  { id: 'saved', label: 'Arret' },
  { id: 'blocked', label: 'Contre' },
  { id: 'post', label: 'Poteau' },
  { id: 'missed', label: 'Hors-cadre' }
];

const BODY_PART_OPTIONS = [
  { id: 'is_shot_right_footed', label: 'Pied droit' },
  { id: 'is_shot_left_footed', label: 'Pied gauche' },
  { id: 'is_shot_head', label: 'Tete' },
  { id: 'is_shot_overhead', label: 'Retourne' }
];

const CONTEXT_OPTIONS = [
  { id: 'is_shot_regular_play', label: 'Jeu place' },
  { id: 'is_shot_fast_break', label: 'Transition' },
  { id: 'is_shot_big_chance', label: 'Grosse occasion' },
  { id: 'is_shot_one_on_one', label: '1v1 gardien' },
  { id: 'is_shot_assisted', label: 'Tir assiste' },
  { id: 'is_shot_intentional_assist', label: 'Assist intentionnel' },
  { id: 'is_shot_individual_play', label: 'Action individuelle' }
];

const SET_PIECE_OPTIONS = [
  { id: 'is_shot_penalty', label: 'Penalty' },
  { id: 'is_shot_set_piece', label: 'CPA' },
  { id: 'is_shot_from_corner', label: 'Depuis corner' },
  { id: 'is_shot_free_kick', label: 'Coup franc' },
  { id: 'is_shot_direct_free_kick', label: 'Coup franc direct' }
];

const TECHNICAL_OPTIONS = [
  { id: 'is_shot_volley', label: 'Volee' },
  { id: 'is_shot_half_volley', label: 'Demi-volee' },
  { id: 'is_shot_first_touch', label: '1ere touche' },
  { id: 'is_shot_follows_dribble', label: 'Apres dribble' },
  { id: 'is_shot_lob', label: 'Lob' },
  { id: 'is_shot_rising', label: 'Montant' },
  { id: 'is_shot_dipping', label: 'Plongeant' },
  { id: 'is_shot_swerve_left', label: 'Effet gauche' },
  { id: 'is_shot_swerve_right', label: 'Effet droite' },
  { id: 'is_shot_swerve_moving', label: 'Effet mobile' }
];

const DEFLECTION_OPTIONS = [
  { id: 'is_shot_deflection', label: 'Deviation' },
  { id: 'is_shot_keeper_touched', label: 'Gardien touche' },
  { id: 'is_shot_saved_off_line', label: 'Sauve sur ligne' },
  { id: 'is_shot_blocked_by_teammate', label: 'Contre coequipier' },
  { id: 'is_shot_block_by_hand', label: 'Contre main' },
  { id: 'is_goal_line_decision', label: 'Goal-line decision' }
];

const LOCATION_OPTIONS = [
  { id: 'is_shot_out_of_box_centre', label: 'Hors surface centre' },
  { id: 'is_shot_regular_play', label: 'Dans le jeu' }
];

const mergeFilters = (filters) => ({
  ...DEFAULT_FILTERS,
  ...(filters || {})
});

const ShotMapFilterPanel = ({
  matchesList = [],
  competitionsList = [],
  seasonsList = [],
  weeksList = [],
  countriesList = [],
  phasesList = [],
  stadiumsList = [],
  filters,
  onFilterChange,
  onApply
}) => {
  const [openSection, setOpenSection] = useState('matches');
  const [pendingFilters, setPendingFilters] = useState(mergeFilters(filters));
  const distanceValue = pendingFilters.distanceMax ?? 40;
  const minXgValue = pendingFilters.minXg ?? 0;
  const minXgotValue = pendingFilters.minXgot ?? 0;

  useEffect(() => {
    setPendingFilters(mergeFilters(filters));
  }, [filters]);

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const updateFilters = (patch) => {
    setPendingFilters(prev => ({
      ...prev,
      ...patch
    }));
  };

  const toggleArrayFilter = (key, value) => {
    const values = pendingFilters[key] || [];
    updateFilters({
      [key]: values.includes(value)
        ? values.filter(item => item !== value)
        : [...values, value]
    });
  };

  const selectedTeamId = (value) => (value && value !== 'ALL' ? [value] : []);

  const updateSingleTeamFilter = (key, selectedIds) => {
    const nextId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : 'ALL';
    updateFilters({ [key]: nextId });
  };

  const resetFilters = () => {
    setPendingFilters(DEFAULT_FILTERS);
  };

  const applyAnalysis = () => {
    onFilterChange?.(pendingFilters);
    onApply?.(pendingFilters);
  };

  const optionClassName = (active) => (
    `border py-3 verge-label-mono text-[9px] uppercase font-black transition-all ${
      active
        ? 'bg-red-500 text-white border-red-400'
        : 'bg-[#131313] text-[#949494] border-white/5 hover:text-white hover:border-red-500/30'
    }`
  );

  const renderTagOptions = (options, columns = 'grid-cols-2') => (
    <div className={`grid ${columns} gap-2`}>
      {options.map(option => {
        const active = pendingFilters.situations.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggleArrayFilter('situations', option.id)}
            className={`min-h-[42px] px-3 py-2 border transition-colors rounded-[2px] text-left ${
              active
                ? 'bg-red-500/15 border-red-500 text-white'
                : 'bg-transparent border-white/5 text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="verge-label-mono text-[9px] uppercase font-black leading-tight">{option.label}</span>
          </button>
        );
      })}
    </div>
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

      <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-4 scrollbar-verge">
        <AccordionSection
          id="matches"
          title="Silos de Donnees"
          icon={<Database size={18} />}
          isOpen={openSection === 'matches'}
          onToggle={() => toggleSection('matches')}
          badge={(pendingFilters.matches?.length || 0) + (pendingFilters.competition?.length || 0) + (pendingFilters.season?.length || 0) + (pendingFilters.week?.length || 0) + (pendingFilters.country?.length || 0)}
        >
          <div className="space-y-8">
            <div className="space-y-8">
              <MultiSelectWithChips
                label="Competitions"
                options={competitionsList}
                selected={pendingFilters.competition || []}
                onChange={(vals) => updateFilters({ competition: vals })}
                placeholder="Selectionner..."
              />
              <MultiSelectWithChips
                label="Saisons"
                options={seasonsList.map(String)}
                selected={(pendingFilters.season || []).map(String)}
                onChange={(vals) => updateFilters({ season: vals })}
                placeholder="Selectionner..."
              />
              <MultiSelectWithChips
                label="Journees"
                options={weeksList.map(String)}
                selected={(pendingFilters.week || []).map(String)}
                onChange={(vals) => updateFilters({ week: vals })}
                placeholder="Selectionner..."
              />
              <MultiSelectWithChips
                label="Pays"
                options={countriesList}
                selected={pendingFilters.country || []}
                onChange={(vals) => updateFilters({ country: vals })}
                placeholder="Selectionner..."
              />
              <MultiSelectWithChips
                label="Phases"
                options={phasesList}
                selected={pendingFilters.phase || []}
                onChange={(vals) => updateFilters({ phase: vals })}
                placeholder="Selectionner..."
              />
              <MultiSelectWithChips
                label="Stades"
                options={stadiumsList}
                selected={pendingFilters.stadium || []}
                onChange={(vals) => updateFilters({ stadium: vals })}
                placeholder="Selectionner..."
              />
            </div>

            <div className="h-px bg-white/5 my-4" />

            <MultiSelectWithChips
              label="Selection Individuelle (Match)"
              options={matchesList.map(m => m.label || m.id)}
              selected={(pendingFilters.matches || []).map(id => matchesList.find(m => m.id === id)?.label || id)}
              onChange={(vals) => {
                const selectedIds = vals
                  .map(val => matchesList.find(m => m.label === val || m.id === val)?.id)
                  .filter(Boolean);
                updateFilters({ matches: selectedIds });
              }}
              placeholder="Selectionner des matchs..."
            />

            <div className="h-px bg-white/5 my-4" />

            <div className="grid grid-cols-2 gap-4">
              <AsyncMultiSelect
                label="Equipe Focus"
                selectedIds={selectedTeamId(pendingFilters.localTeam)}
                onChange={(selectedIds) => updateSingleTeamFilter('localTeam', selectedIds)}
                endpoint={TEAM_SEARCH_ENDPOINT}
                cacheNamespace="teams"
                fallbackLabel="Equipe"
                emptyLabel="Aucune equipe trouvee"
                maxSelected={1}
                placeholder="Saisir 3 caracteres..."
              />

              <AsyncMultiSelect
                label="Opposition"
                selectedIds={selectedTeamId(pendingFilters.localOpponent)}
                onChange={(selectedIds) => updateSingleTeamFilter('localOpponent', selectedIds)}
                endpoint={TEAM_SEARCH_ENDPOINT}
                cacheNamespace="teams"
                fallbackLabel="Equipe"
                emptyLabel="Aucune equipe trouvee"
                maxSelected={1}
                placeholder="Saisir 3 caracteres..."
              />
            </div>

            <div className="h-px bg-white/5 my-4" />

            <AsyncMultiSelect
              label="Selection des Joueurs"
              selectedIds={pendingFilters.player_id || []}
              onChange={(selectedIds) => updateFilters({ player_id: selectedIds })}
              placeholder="Saisir 3 caracteres..."
            />
          </div>
        </AccordionSection>

        <AccordionSection
          id="precision"
          title="Resultat & Qualite"
          icon={<Crosshair size={18} />}
          isOpen={openSection === 'precision'}
          onToggle={() => toggleSection('precision')}
          subtitle="ISSUE, xG & xGOT"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {OUTCOME_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleArrayFilter('outcomes', option.id)}
                  className={optionClassName(pendingFilters.outcomes.includes(option.id))}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <QualitySlider
              label="xG minimum"
              value={minXgValue}
              isActive={pendingFilters.minXg !== null && pendingFilters.minXg !== undefined}
              onChange={(value) => updateFilters({ minXg: value })}
              onClear={() => updateFilters({ minXg: null })}
            />
            <QualitySlider
              label="xGOT minimum"
              value={minXgotValue}
              isActive={pendingFilters.minXgot !== null && pendingFilters.minXgot !== undefined}
              onChange={(value) => updateFilters({ minXgot: value })}
              onClear={() => updateFilters({ minXgot: null })}
            />
          </div>
        </AccordionSection>

        <AccordionSection
          id="tactical"
          title="Attributs Opta"
          icon={<Shield size={18} />}
          isOpen={openSection === 'tactical'}
          onToggle={() => toggleSection('tactical')}
          subtitle="TAGS METIER"
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Partie du corps</label>
              <div className="grid grid-cols-2 gap-2">
                {BODY_PART_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleArrayFilter('bodyParts', option.id)}
                    className={optionClassName(pendingFilters.bodyParts.includes(option.id))}
                    title={option.id}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Contexte</label>
              {renderTagOptions(CONTEXT_OPTIONS)}
            </div>

            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Coups de pied arretes</label>
              {renderTagOptions(SET_PIECE_OPTIONS)}
            </div>

            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Technique de frappe</label>
              {renderTagOptions(TECHNICAL_OPTIONS)}
            </div>

            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Gardien, deviation & ligne</label>
              {renderTagOptions(DEFLECTION_OPTIONS)}
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          id="geometry"
          title="Geometrie & Localisation"
          icon={<Zap size={18} />}
          isOpen={openSection === 'geometry'}
          onToggle={() => toggleSection('geometry')}
          subtitle="DISTANCE & ZONES"
        >
          <div className="space-y-6">
            <div className="p-8 bg-[#2d2d2d]/50 border border-white/5 rounded-[2px] relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <label className="verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">Distance max</label>
                <span className="verge-label-mono text-[11px] text-red-500 font-black">
                  {pendingFilters.distanceMax === null ? 'Tout' : `${pendingFilters.distanceMax}m`}
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

            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Localisation Opta</label>
              {renderTagOptions(LOCATION_OPTIONS)}
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          id="time"
          title="Chronologie"
          icon={<RotateCcw size={18} />}
          isOpen={openSection === 'time'}
          onToggle={() => toggleSection('time')}
        >
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <FilterGroup label="Plage de Dates (Debut)">
                <input
                  type="date"
                  value={pendingFilters.startDate || ''}
                  onChange={(e) => updateFilters({ startDate: e.target.value })}
                  className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-[10px] outline-none focus:border-red-500 transition-all"
                />
              </FilterGroup>
              <FilterGroup label="Plage de Dates (Fin)">
                <input
                  type="date"
                  value={pendingFilters.endDate || ''}
                  onChange={(e) => updateFilters({ endDate: e.target.value })}
                  className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-[10px] outline-none focus:border-red-500 transition-all"
                />
              </FilterGroup>
            </div>

            <div className="h-px bg-white/5 my-4" />

            <div className="grid grid-cols-2 gap-4">
              <FilterGroup label="Minute Debut">
                <input
                  type="number"
                  value={pendingFilters.start_min}
                  onChange={(e) => updateFilters({ start_min: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-xs outline-none"
                />
              </FilterGroup>
              <FilterGroup label="Minute Fin">
                <input
                  type="number"
                  value={pendingFilters.end_min}
                  onChange={(e) => updateFilters({ end_min: parseInt(e.target.value, 10) || 130 })}
                  className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-xs outline-none"
                />
              </FilterGroup>
            </div>
          </div>
        </AccordionSection>
      </div>

      <div className="p-10 bg-[#131313] border-t border-white/10">
        <button
          type="button"
          onClick={applyAnalysis}
          className="w-full bg-red-500 text-white py-6 rounded-[2px] verge-label-mono text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-white hover:text-black transition-all shadow-[0_20px_40px_rgba(239,68,68,0.1)]"
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

const QualitySlider = ({ label, value, isActive, onChange, onClear }) => (
  <div className="p-5 bg-[#2d2d2d]/50 border border-white/5 rounded-[2px]">
    <div className="flex justify-between items-center mb-4">
      <label className="verge-label-mono text-[9px] text-white font-black uppercase tracking-widest">{label}</label>
      <span className="verge-label-mono text-[10px] text-red-500 font-black">
        {isActive ? Number(value).toFixed(2) : 'Off'}
      </span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-red-500"
    />
    <button
      type="button"
      onClick={onClear}
      className="mt-4 verge-label-mono text-[8px] text-[#949494] hover:text-white uppercase font-black"
    >
      Desactiver ce seuil
    </button>
  </div>
);

export default ShotMapFilterPanel;
