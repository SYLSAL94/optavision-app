import { motion } from 'framer-motion';

const POSITION_ZONES = [
  { id: 1, label: 'GK', top: '85%', left: '50%', codes: ['GK'] },
  { id: 2, label: 'CB', top: '72%', left: '50%', codes: ['RCB', 'CB', 'LCB'] },
  { id: 3, label: 'LB', top: '68%', left: '15%', codes: ['LB', 'LWB'] },
  { id: 4, label: 'RB', top: '68%', left: '85%', codes: ['RB', 'RWB'] },
  { id: 5, label: 'DM', top: '58%', left: '50%', codes: ['RDM', 'CDM', 'LDM'] },
  { id: 6, label: 'LM', top: '45%', left: '15%', codes: ['LM'] },
  { id: 7, label: 'RM', top: '45%', left: '85%', codes: ['RM'] },
  { id: 8, label: 'CM', top: '45%', left: '50%', codes: ['RCM', 'CM', 'LCM'] },
  { id: 9, label: 'AM', top: '32%', left: '50%', codes: ['RAM', 'CAM', 'LAM'] },
  { id: 10, label: 'LW', top: '20%', left: '15%', codes: ['LW'] },
  { id: 11, label: 'RW', top: '20%', left: '85%', codes: ['RW'] },
  { id: 12, label: 'ST', top: '10%', left: '50%', codes: ['RCF', 'ST', 'LCF', 'SS'] },
];

const FIELD_ZONE_GROUPS = [
  {
    label: 'Longitudinal',
    zones: [
      { id: 'DEF_HALF', label: 'Def Half', codes: ['DEF_HALF'] },
      { id: 'OFF_HALF', label: 'Off Half', codes: ['OFF_HALF'] },
      { id: 'DEF_THIRD', label: 'Def Third', codes: ['DEF_THIRD'] },
      { id: 'MID_THIRD', label: 'Mid Third', codes: ['MID_THIRD'] },
      { id: 'FINAL_THIRD', label: 'Final Third', codes: ['FINAL_THIRD'] },
    ],
  },
  {
    label: 'Channels',
    zones: [
      { id: 'LEFT_WING', label: 'Left Wing', codes: ['LEFT_WING'] },
      { id: 'HALF_SPACE_LEFT', label: 'Left Half', codes: ['HALF_SPACE_LEFT'] },
      { id: 'CENTER_CHANNEL', label: 'Center', codes: ['CENTER_CHANNEL'] },
      { id: 'HALF_SPACE_RIGHT', label: 'Right Half', codes: ['HALF_SPACE_RIGHT'] },
      { id: 'RIGHT_WING', label: 'Right Wing', codes: ['RIGHT_WING'] },
    ],
  },
  {
    label: 'Specific',
    zones: [
      { id: 'BOX_DEF', label: 'Def Box', codes: ['BOX_DEF'] },
      { id: 'BOX_OFF', label: 'Off Box', codes: ['BOX_OFF'] },
      { id: 'ZONE_14', label: 'Zone 14', codes: ['ZONE_14'] },
    ],
  },
];

const TacticalPositionPicker = ({ selectedPositions = [], onChange, variant = 'positions' }) => {
  const togglePosition = (codes) => {
    // Si tous les codes de la zone sont déjà sélectionnés, on les retire
    const allSelected = codes.every(c => selectedPositions.includes(c));
    if (allSelected) {
      onChange(selectedPositions.filter(p => !codes.includes(p)));
    } else {
      // Sinon on ajoute uniquement ceux qui manquent
      const newItems = codes.filter(c => !selectedPositions.includes(c));
      onChange([...selectedPositions, ...newItems]);
    }
  };

  if (variant === 'fieldZones') {
    return (
      <div className="relative w-full bg-canvas-black border border-hazard-white/10 rounded-[4px] overflow-hidden p-4">
        <div className="relative h-40 border border-hazard-white/5 rounded-[4px] mb-4 overflow-hidden">
          <div className="absolute top-1/2 left-0 w-full h-px bg-hazard-white/5" />
          <div className="absolute top-0 left-1/3 h-full w-px bg-hazard-white/5" />
          <div className="absolute top-0 left-2/3 h-full w-px bg-hazard-white/5" />
          <div className="absolute inset-x-[18%] top-0 h-[17%] border-x border-b border-hazard-white/5" />
          <div className="absolute inset-x-[18%] bottom-0 h-[17%] border-x border-t border-hazard-white/5" />
        </div>

        <div className="space-y-4">
          {FIELD_ZONE_GROUPS.map(group => (
            <div key={group.label} className="space-y-2">
              <div className="verge-label-mono text-[8px] text-hazard-white/30 uppercase tracking-widest font-black">{group.label}</div>
              <div className="grid grid-cols-2 gap-2">
                {group.zones.map(zone => {
                  const isActive = zone.codes.every(c => selectedPositions.includes(c));
                  return (
                    <motion.button
                      key={zone.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => togglePosition(zone.codes)}
                      className={`min-h-9 px-3 rounded-[2px] border verge-label-mono text-[8px] font-black uppercase transition-all ${
                        isActive
                          ? 'bg-jelly-mint border-jelly-mint text-absolute-black shadow-[0_0_20px_rgba(60,255,208,0.16)]'
                          : 'bg-surface-slate border-hazard-white/10 text-secondary-text hover:border-hazard-white/30 hover:bg-hazard-white hover:text-absolute-black'
                      }`}
                    >
                      {zone.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[3/4] bg-canvas-black border border-hazard-white/10 rounded-[4px] overflow-hidden p-4">
      {/* Pitch Lines */}
      <div className="absolute inset-4 border border-hazard-white/5 rounded-[4px] pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-b border-x border-hazard-white/5" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1/6 border-t border-x border-hazard-white/5" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-hazard-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 aspect-square border border-hazard-white/5 rounded-full" />
      </div>

      <div className="relative w-full h-full">
        {POSITION_ZONES.map((zone) => {
          const isActive = zone.codes.every(c => selectedPositions.includes(c));
          const isPartiallyActive = zone.codes.some(c => selectedPositions.includes(c)) && !isActive;
          return (
            <motion.button
              key={zone.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => togglePosition(zone.codes)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 md:w-10 h-8 md:h-10 rounded-[2px] border flex items-center justify-center transition-all duration-300 ${
                isActive 
                ? 'bg-jelly-mint border-jelly-mint text-absolute-black shadow-[0_0_20px_rgba(60,255,208,0.2)]' 
                : isPartiallyActive
                ? 'bg-jelly-mint/30 border-jelly-mint/50 text-hazard-white border-dashed'
                : 'bg-surface-slate border-hazard-white/10 text-secondary-text hover:border-hazard-white/30 hover:bg-hazard-white hover:text-absolute-black'
              }`}
              style={{ top: zone.top, left: zone.left }}
            >
              <span className="verge-label-mono text-[8px] md:text-[10px]">{zone.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default TacticalPositionPicker;
