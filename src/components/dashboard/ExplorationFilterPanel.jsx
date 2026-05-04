import { useState, useMemo } from 'react';
import { 
  Activity, 
  Zap, 
  SlidersHorizontal, 
  RotateCcw, 
  Check,
  User,
  Target,
  Database
} from 'lucide-react';
import AccordionSection from './AccordionSection';
import MultiSelectWithChips from '../ui/MultiSelectWithChips';
import TacticalPositionPicker from './TacticalPositionPicker';
import DualRangeSlider from '../ui/DualRangeSlider';

const DISTANCE_RANGE_MIN = 0;
const DISTANCE_RANGE_MAX = 80;
const TIME_RANGE_MIN = 0;
const TIME_RANGE_MAX = 130;
const TIME_PRESETS = [
  { label: 'Tout', hint: '0-130', start: 0, end: 130, periods: [] },
  { label: '1H', hint: '0-45', start: 0, end: 45, periods: [1] },
  { label: '1H 45+', hint: 'arrets', start: 45, end: 70, periods: [1] },
  { label: '2H', hint: '45-90', start: 45, end: 90, periods: [2] },
  { label: '2H 90+', hint: 'arrets', start: 90, end: 130, periods: [2] },
  { label: 'ET1', hint: '90-105', start: 90, end: 105, periods: [3] },
  { label: 'ET2', hint: '105-120', start: 105, end: 120, periods: [4] },
  { label: 'Fin match', hint: '75-130', start: 75, end: 130, periods: [] },
];
const PERIOD_OPTIONS = [
  { id: 1, label: '1H' },
  { id: 2, label: '2H' },
  { id: 3, label: 'ET1' },
  { id: 4, label: 'ET2' },
];

const periodLabelFromId = (periodId) => (
  PERIOD_OPTIONS.find(option => option.id === Number(periodId))?.label || `P${periodId}`
);

const periodIdFromLabel = (label) => (
  PERIOD_OPTIONS.find(option => option.label === label)?.id
);

/**
 * ExplorationFilterPanel - Version Dynamique (Auto-Discovery)
 * Hydrate automatiquement les filtres à partir de la prop eventsData.
 */
const ExplorationFilterPanel = ({ 
  matchesList = [], 
  availableActionTypes = [], 
  availableNextActionTypes = [],
  availablePreviousActionTypes = [],
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

  const updateNumericFilter = (category, value) => {
    setPendingFilters({ ...pendingFilters, [category]: value });
  };

  const updateDistanceRange = (minKey, maxKey, nextMin, nextMax) => {
    const isFullRange = nextMin === DISTANCE_RANGE_MIN && nextMax === DISTANCE_RANGE_MAX;
    setPendingFilters({
      ...pendingFilters,
      [minKey]: isFullRange ? null : nextMin,
      [maxKey]: isFullRange ? null : nextMax
    });
  };

  const updatePositionFilter = (key, values) => {
    const uniqueValues = [...new Set(values)];
    const oppositeKey = key === 'tactical_positions' ? 'exclude_positions' : 'tactical_positions';
    setPendingFilters(prev => ({
      ...prev,
      [key]: uniqueValues,
      [oppositeKey]: (prev[oppositeKey] || []).filter(position => !uniqueValues.includes(position))
    }));
  };

  const passDistanceMin = pendingFilters.pass_distance_min ?? DISTANCE_RANGE_MIN;
  const passDistanceMax = pendingFilters.pass_distance_max ?? DISTANCE_RANGE_MAX;
  const carryDistanceMin = pendingFilters.carry_distance_min ?? DISTANCE_RANGE_MIN;
  const carryDistanceMax = pendingFilters.carry_distance_max ?? DISTANCE_RANGE_MAX;
  const passDistanceActive = (
    pendingFilters.pass_distance_min !== null && pendingFilters.pass_distance_min !== undefined
  ) || (
    pendingFilters.pass_distance_max !== null && pendingFilters.pass_distance_max !== undefined
  );
  const carryDistanceActive = (
    pendingFilters.carry_distance_min !== null && pendingFilters.carry_distance_min !== undefined
  ) || (
    pendingFilters.carry_distance_max !== null && pendingFilters.carry_distance_max !== undefined
  );
  const timeStart = Number.isFinite(Number(pendingFilters.start_min)) ? Number(pendingFilters.start_min) : TIME_RANGE_MIN;
  const timeEnd = Number.isFinite(Number(pendingFilters.end_min)) ? Number(pendingFilters.end_min) : TIME_RANGE_MAX;
  const selectedPeriods = (pendingFilters.period_id || []).map(Number).filter(Number.isFinite);
  const timeRangeActive = timeStart > TIME_RANGE_MIN || timeEnd < TIME_RANGE_MAX || selectedPeriods.length > 0;

  const updateTimeRange = (nextStart, nextEnd) => {
    setPendingFilters({
      ...pendingFilters,
      start_min: Math.min(nextStart, nextEnd),
      end_min: Math.max(nextStart, nextEnd)
    });
  };

  const applyTimePreset = (preset) => {
    setPendingFilters({
      ...pendingFilters,
      start_min: preset.start,
      end_min: preset.end,
      period_id: preset.periods
    });
  };

  const togglePeriod = (periodId) => {
    const current = pendingFilters.period_id || [];
    const exists = current.includes(periodId);
    setPendingFilters({
      ...pendingFilters,
      period_id: exists ? current.filter(id => id !== periodId) : [...current, periodId]
    });
  };

  const resetTimeWindow = () => {
    setPendingFilters({
      ...pendingFilters,
      start_min: TIME_RANGE_MIN,
      end_min: TIME_RANGE_MAX,
      period_id: []
    });
  };

  const resetFilters = () => {
    const initial = {
      matches: [],
      types: [],
      players: [],
      teams: [],
      min_xt: 0.0,
      start_min: 0,
      end_min: TIME_RANGE_MAX,
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
      next_action_types: [],
      previous_action_types: [],
      exclude_types: [],
      tactical_positions: [],
      exclude_positions: [],
      position_filter_scope: 'current',
      start_zones: [],
      end_zones: [],
      advanced_tactics: [],
      startDate: '',
      endDate: '',
      player_id: [],
      receiver_id: [],
      opponent_id: [],
      pass_distance_min: null,
      pass_distance_max: null,
      carry_distance_min: null,
      carry_distance_max: null,
      include_technical: false
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

            <div className="flex items-center justify-between gap-6 border border-white/10 bg-[#0b0b0b] p-5 rounded-[2px]">
              <div className="min-w-0">
                <div className="verge-label-mono text-[10px] text-white uppercase tracking-widest font-black">
                  Afficher evenements techniques
                </div>
                <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest mt-2 leading-relaxed">
                  Audit raw, substitutions, starts, outs et corrections
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!pendingFilters.include_technical}
                onClick={() => setPendingFilters({
                  ...pendingFilters,
                  include_technical: !pendingFilters.include_technical
                })}
                className={`relative h-7 w-14 shrink-0 rounded-full border transition-all ${
                  pendingFilters.include_technical
                    ? 'bg-[#3cffd0] border-[#3cffd0]'
                    : 'bg-[#1d1d1d] border-white/15'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                    pendingFilters.include_technical ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

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
          badge={(pendingFilters.types?.length || 0) + (pendingFilters.exclude_types?.length || 0) + (pendingFilters.next_action_types?.length || 0) + (pendingFilters.previous_action_types?.length || 0) + (pendingFilters.players?.length || 0)}
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
              label="Action Suivante" 
              options={availableNextActionTypes.length > 0 ? availableNextActionTypes : availableActionTypes} 
              selected={pendingFilters.next_action_types || []} 
              onChange={(vals) => setPendingFilters({ ...pendingFilters, next_action_types: vals })} 
              placeholder="Sélectionner..." 
            />

            <MultiSelectWithChips 
              label="Action Précédente" 
              options={availablePreviousActionTypes.length > 0 ? availablePreviousActionTypes : availableActionTypes} 
              selected={pendingFilters.previous_action_types || []} 
              onChange={(vals) => setPendingFilters({ ...pendingFilters, previous_action_types: vals })} 
              placeholder="Sélectionner..." 
            />

            <MultiSelectWithChips 
              label="Exclure Types" 
              options={availableActionTypes} 
              selected={pendingFilters.exclude_types || []} 
              onChange={(vals) => setPendingFilters({ ...pendingFilters, exclude_types: vals })} 
              placeholder="Aucune exclusion" 
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
          badge={(pendingFilters.period_id?.length || 0) + (pendingFilters.location?.length || 0) + (pendingFilters.tactical_positions?.length || 0) + (pendingFilters.exclude_positions?.length || 0) + (pendingFilters.start_zones?.length || 0) + (pendingFilters.end_zones?.length || 0)}
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

            <div className="space-y-3">
              <label className="verge-label-mono text-[10px] text-hazard-white/40 block uppercase tracking-widest font-black">
                Mode des postes
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'current', label: 'Courant' },
                  { value: 'multi', label: 'Multi-postes' }
                ].map(option => {
                  const isActive = (pendingFilters.position_filter_scope || 'current') === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPendingFilters({ ...pendingFilters, position_filter_scope: option.value })}
                      className={`min-h-10 border rounded-[2px] verge-label-mono text-[9px] font-black uppercase tracking-widest transition-all ${
                        isActive
                          ? 'bg-jelly-mint border-jelly-mint text-absolute-black'
                          : 'bg-surface-slate border-hazard-white/10 text-secondary-text hover:border-hazard-white/30 hover:text-hazard-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="verge-label-mono text-[10px] text-hazard-white/40 mb-4 block uppercase tracking-widest font-black group-hover:text-hazard-white transition-colors">Positions Tactiques</label>
                <TacticalPositionPicker 
                  selectedPositions={pendingFilters.tactical_positions || []}
                  onChange={(vals) => updatePositionFilter('tactical_positions', vals)}
                />
              </div>

              <div className="space-y-4">
                <label className="verge-label-mono text-[10px] text-hazard-white/40 mb-4 block uppercase tracking-widest font-black group-hover:text-hazard-white transition-colors">Exclure Positions</label>
                <TacticalPositionPicker 
                  selectedPositions={pendingFilters.exclude_positions || []}
                  onChange={(vals) => updatePositionFilter('exclude_positions', vals)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="verge-label-mono text-[10px] text-hazard-white/40 mb-4 block uppercase tracking-widest font-black group-hover:text-hazard-white transition-colors">Zone de départ</label>
                <TacticalPositionPicker 
                  variant="fieldZones"
                  selectedPositions={pendingFilters.start_zones || []}
                  onChange={(vals) => setPendingFilters({ ...pendingFilters, start_zones: vals })}
                />
              </div>

              <div className="space-y-4">
                <label className="verge-label-mono text-[10px] text-hazard-white/40 mb-4 block uppercase tracking-widest font-black group-hover:text-hazard-white transition-colors">Zone d'arrivée</label>
                <TacticalPositionPicker 
                  variant="fieldZones"
                  selectedPositions={pendingFilters.end_zones || []}
                  onChange={(vals) => setPendingFilters({ ...pendingFilters, end_zones: vals })}
                />
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
          badge={(pendingFilters.min_xt > 0 ? 1 : 0) + (pendingFilters.outcome !== null && pendingFilters.outcome !== undefined ? 1 : 0) + (pendingFilters.advanced_tactics?.length || 0) + (passDistanceActive ? 1 : 0) + (carryDistanceActive ? 1 : 0)}
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

            <div className="space-y-8">
              <DualRangeSlider
                label="Distance des passes"
                min={DISTANCE_RANGE_MIN}
                max={DISTANCE_RANGE_MAX}
                step={1}
                unit="m"
                currentMin={passDistanceMin}
                currentMax={passDistanceMax}
                onChange={(nextMin, nextMax) => updateDistanceRange('pass_distance_min', 'pass_distance_max', nextMin, nextMax)}
              />

              <DualRangeSlider
                label="Distance des carries"
                min={DISTANCE_RANGE_MIN}
                max={DISTANCE_RANGE_MAX}
                step={1}
                unit="m"
                currentMin={carryDistanceMin}
                currentMax={carryDistanceMax}
                onChange={(nextMin, nextMax) => updateDistanceRange('carry_distance_min', 'carry_distance_max', nextMin, nextMax)}
              />

              {(passDistanceActive || carryDistanceActive) && (
                <button
                  type="button"
                  onClick={() => setPendingFilters({
                    ...pendingFilters,
                    pass_distance_min: null,
                    pass_distance_max: null,
                    carry_distance_min: null,
                    carry_distance_max: null
                  })}
                  className="verge-label-mono text-[9px] text-[#949494] hover:text-white uppercase font-black transition-colors"
                >
                  Reinitialiser distances
                </button>
              )}
            </div>

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
          badge={timeRangeActive ? 1 : 0}
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

            <div className="space-y-5 rounded-[2px] border border-white/10 bg-[#0b0b0b] p-5">
              <div>
                <div className="verge-label-mono text-[10px] text-white uppercase tracking-widest font-black">
                  Temps de jeu officiel
                </div>
                <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest mt-2 leading-relaxed">
                  Filtre par minute Opta et par periode pour eviter les collisions entre 1H 45+ et 2H.
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {PERIOD_OPTIONS.map(period => {
                  const isActive = selectedPeriods.includes(period.id);
                  return (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => togglePeriod(period.id)}
                      className={`min-h-10 border rounded-[2px] verge-label-mono text-[9px] font-black uppercase tracking-widest transition-all ${
                        isActive
                          ? 'bg-[#3cffd0] border-[#3cffd0] text-black'
                          : 'bg-[#131313] border-white/10 text-[#949494] hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block font-black">
                Presets de match
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_PRESETS.map(preset => {
                  const isActive = timeStart === preset.start
                    && timeEnd === preset.end
                    && selectedPeriods.length === preset.periods.length
                    && preset.periods.every(period => selectedPeriods.includes(period));
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyTimePreset(preset)}
                      className={`min-h-[52px] border rounded-[2px] px-3 py-2 text-left transition-all ${
                        isActive
                          ? 'bg-[#3cffd0] border-[#3cffd0] text-black'
                          : 'bg-[#131313] border-white/10 text-[#d7d7d7] hover:border-white/30'
                      }`}
                    >
                      <div className="verge-label-mono text-[9px] uppercase font-black truncate">{preset.label}</div>
                      <div className="verge-label-mono text-[7px] uppercase mt-1 opacity-60 truncate">{preset.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <DualRangeSlider
              label={`Minute de match (${timeStart}' - ${timeEnd}')`}
              min={TIME_RANGE_MIN}
              max={TIME_RANGE_MAX}
              step={1}
              unit="'"
              currentMin={timeStart}
              currentMax={timeEnd}
              onChange={updateTimeRange}
            />

            <div className="grid grid-cols-2 gap-4">
              <FilterGroup label="Minute Début">
                 <input 
                   type="number" 
                   min={TIME_RANGE_MIN}
                   max={TIME_RANGE_MAX}
                   value={timeStart}
                   onChange={(e) => updateTimeRange(parseInt(e.target.value, 10) || TIME_RANGE_MIN, timeEnd)}
                   className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-xs outline-none"
                 />
              </FilterGroup>
              <FilterGroup label="Minute Fin">
                 <input 
                   type="number" 
                   min={TIME_RANGE_MIN}
                   max={TIME_RANGE_MAX}
                   value={timeEnd}
                   onChange={(e) => updateTimeRange(timeStart, parseInt(e.target.value, 10) || TIME_RANGE_MAX)}
                   className="w-full bg-[#131313] border border-white/10 p-4 verge-label-mono text-white text-xs outline-none"
                 />
              </FilterGroup>
            </div>
            {timeRangeActive && (
              <button
                type="button"
                onClick={resetTimeWindow}
                className="verge-label-mono text-[9px] text-[#949494] hover:text-white uppercase font-black transition-colors"
              >
                Reinitialiser chronologie
              </button>
            )}
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
