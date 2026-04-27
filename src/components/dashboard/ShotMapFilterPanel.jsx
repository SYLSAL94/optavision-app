import React, { useState } from 'react';
import { 
  Target, 
  RotateCcw, 
  Check,
  Search,
  ChevronDown,
  Activity,
  Crosshair,
  Shield,
  Zap
} from 'lucide-react';
import AccordionSection from './AccordionSection';

/**
 * ShotMapFilterPanel - Squelette du panneau de filtrage latéral pour l'analyse des tirs
 */
const ShotMapFilterPanel = ({ onClose }) => {
  const [openSection, setOpenSection] = useState('precision');

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <aside className="w-[450px] h-full flex flex-col bg-[#131313] border-l border-white/10 shadow-2xl">
      
      {/* HEADER SECTION */}
      <div className="p-10 pb-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex flex-col">
            <h3 className="verge-h3 text-white flex items-center gap-4">
              <Target size={22} className="text-red-500" />
              FILTRAGE TIRS
            </h3>
            <p className="verge-label-mono text-[9px] text-[#949494] mt-2 uppercase tracking-widest">Efficacité devant le but & xG</p>
          </div>
          <button className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black transition-colors flex items-center gap-2">
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* CONTENT : ACCORDIONS */}
      <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-2 scrollbar-verge">
        
        {/* SECTION 1 : PRÉCISION */}
        <AccordionSection 
          id="precision" 
          title="Précision & Résultat" 
          icon={<Crosshair size={18} />}
          isOpen={openSection === 'precision'}
          onToggle={() => toggleSection('precision')}
          subtitle="BUTS & CADRÉS"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {['But ✅', 'Arrêt 👐', 'Contré 🛡️', 'Hors-Cadre ❌'].map(res => (
                <button key={res} className="bg-[#131313] border border-white/5 py-3 verge-label-mono text-[9px] text-[#949494] hover:text-white hover:border-red-500/30 transition-all">
                  {res}
                </button>
              ))}
            </div>
          </div>
        </AccordionSection>

        {/* SECTION 2 : TACTIQUE */}
        <AccordionSection 
          id="tactical" 
          title="Attributs Tactiques" 
          icon={<Shield size={18} />}
          isOpen={openSection === 'tactical'}
          onToggle={() => toggleSection('tactical')}
          subtitle="CONCOURS DE CIRCONSTANCES"
        >
          <div className="space-y-10">
            <div className="space-y-4">
              <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Partie du Corps</label>
              <div className="flex gap-2">
                {['Tête', 'Pied G.', 'Pied D.'].map(part => (
                   <button key={part} className="flex-1 bg-[#2d2d2d] border border-white/5 py-3 verge-label-mono text-[9px] text-white hover:bg-red-500/10 transition-all">
                     {part}
                   </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
               <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest block">Situation</label>
               {['Contre-attaque', 'Jeu Placé', 'Face-à-face', 'Hors Surface'].map(sit => (
                 <div key={sit} className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                   <span className="verge-label-mono text-[10px] text-white opacity-60 group-hover:opacity-100">{sit}</span>
                   <div className="w-1 h-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_red]" />
                 </div>
               ))}
            </div>
          </div>
        </AccordionSection>

        {/* SECTION 3 : CAGE & DISTANCE */}
        <AccordionSection 
          id="geometry" 
          title="Géométrie & xG" 
          icon={<Zap size={18} />}
          isOpen={openSection === 'geometry'}
          onToggle={() => toggleSection('geometry')}
          subtitle="DISTANCE & PROBABILITÉS"
        >
          <div className="space-y-12">
            <div className="p-8 bg-[#2d2d2d]/50 border border-white/5 rounded-[2px] relative overflow-hidden">
               <div className="flex justify-between items-center mb-6">
                <label className="verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">Valeur xG Min.</label>
                <span className="verge-label-mono text-[11px] text-red-500 font-black">0.15+</span>
              </div>
              <input type="range" className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-red-500" />
            </div>

            <div className="p-8 bg-[#2d2d2d]/50 border border-white/5 rounded-[2px] relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <label className="verge-label-mono text-[10px] text-white font-black uppercase tracking-widest">Distance (m)</label>
                <span className="verge-label-mono text-[11px] text-red-500 font-black">Max 25m</span>
              </div>
              <input type="range" className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-red-500" />
            </div>
          </div>
        </AccordionSection>

      </div>

      {/* FOOTER : APPLY BUTTON */}
      <div className="p-10 bg-[#131313] border-t border-white/10">
        <button className="w-full bg-red-500 text-white py-6 rounded-[2px] verge-label-mono text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-white hover:text-black transition-all shadow-[0_20px_40px_rgba(239,68,68,0.1)]">
          Filtrer la Shot Map
          <Check size={18} />
        </button>
      </div>
    </aside>
  );
};

export default ShotMapFilterPanel;
