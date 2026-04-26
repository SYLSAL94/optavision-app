import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Video, 
  CheckCircle2, 
  Circle, 
  Clock, 
  User, 
  Zap, 
  TrendingUp, 
  ChevronRight,
  Loader2,
  AlertCircle,
  VideoIcon,
  ShoppingCart
} from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';

const EventExplorer = ({ matchId, matchName }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/events/${encodeURIComponent(matchName)}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (matchName) fetchEvents();
  }, [matchName]);

  const toggleEvent = (eventId) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = (e.playerName?.toLowerCase().includes(search.toLowerCase()) || e.type?.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || e.type?.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const uniqueTypes = ['all', ...new Set(events.map(e => e.type))];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 bg-[#131313] border border-white/5 rounded-[24px]">
        <Loader2 size={40} className="text-[#3cffd0] animate-spin" />
        <div className="text-center">
          <p className="verge-label-mono text-[10px] text-[#3cffd0] uppercase tracking-[0.4em] font-black">Analyse du flux Opta...</p>
          <p className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.2em] mt-2">Désarchivage du JSONB en colonnes analytiques</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-[24px] p-16 text-center">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-6" />
        <h3 className="verge-h3 text-white mb-2 uppercase">Échec de récupération des événements</h3>
        <p className="verge-label-mono text-[11px] text-[#949494] uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-[#131313] border border-white/10 p-8 rounded-[24px]">
        <div className="flex flex-col md:flex-row gap-6 w-full xl:w-auto">
          <div className="relative w-full md:w-[400px]">
            <Search size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#949494]" />
            <input 
              type="text"
              placeholder="FILTRER PAR JOUEUR OU ACTION..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full px-14 py-4 text-white verge-label-mono text-[11px] focus:outline-none focus:border-[#3cffd0] transition-all"
            />
          </div>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-full px-8 py-4 text-white verge-label-mono text-[11px] outline-none hover:border-white/20 transition-all uppercase"
          >
            {uniqueTypes.map(t => (
              <option key={t} value={t} className="bg-[#131313]">{t}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-6 w-full xl:w-auto border-t xl:border-t-0 xl:border-l border-white/10 pt-6 xl:pt-0 xl:pl-8">
           <div className="flex flex-col">
              <span className="verge-label-mono text-[9px] text-[#949494] uppercase font-black tracking-widest">Événements Sélectionnés</span>
              <div className="flex items-center gap-3">
                 <ShoppingCart size={16} className={selectedEvents.length > 0 ? "text-[#3cffd0]" : "text-[#949494]"} />
                 <span className="verge-label-mono text-[16px] text-white font-black">{selectedEvents.length}</span>
              </div>
           </div>
           <button 
             disabled={selectedEvents.length === 0}
             className={`btn-verge-primary px-10 py-4 text-[10px] flex items-center gap-3 ml-auto ${selectedEvents.length === 0 ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
           >
             GÉNÉRER LA SÉQUENCE <VideoIcon size={14} />
           </button>
        </div>
      </div>

      <div className="bg-[#131313] border border-white/10 rounded-[24px] overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_120px_150px_120px_60px] p-6 border-b border-white/10 bg-white/5">
          {['TEMPS', 'ÉVÉNEMENT / JOUEUR', 'IMPACT XT', 'PROG. PASS', 'COORDONNÉES', ''].map((h, i) => (
            <span key={i} className="verge-label-mono text-[9px] text-[#949494] font-black uppercase tracking-widest">{h}</span>
          ))}
        </div>

        <div className="max-h-[600px] overflow-y-auto scrollbar-verge">
          {filteredEvents.map((event, idx) => {
            const isSelected = selectedEvents.includes(event.id);
            const isHighXT = event.xT > 0.03;
            return (
              <motion.div 
                key={event.id || idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => toggleEvent(event.id)}
                className={`grid grid-cols-[80px_1fr_120px_150px_120px_60px] items-center p-6 border-b border-white/5 cursor-pointer transition-all hover:bg-white/[0.02] ${isSelected ? 'bg-[#3cffd0]/5' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-[#949494]" />
                  <span className="verge-label-mono text-[12px] text-white font-black">
                    {String(event.minute).padStart(2, '0')}:{String(event.second).padStart(2, '0')}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className={`verge-label-mono text-[10px] font-black px-2 py-0.5 rounded-[2px] uppercase ${isSelected ? 'bg-[#3cffd0] text-black' : 'bg-white/10 text-white'}`}>
                      {event.type}
                    </span>
                    <span className="verge-label-mono text-[11px] text-white flex items-center gap-2">
                      <User size={10} className="text-[#949494]" /> {event.playerName || 'JOUEUR INCONNU'}
                    </span>
                  </div>
                  <span className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-tighter opacity-60">
                    {event.teamName} • Sequence ID: {event.id.split('_').pop()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {isHighXT && <Zap size={12} className="text-[#3cffd0] animate-pulse" />}
                  <span className={`verge-label-mono text-[12px] font-black ${isHighXT ? 'text-[#3cffd0]' : 'text-white/60'}`}>
                    {event.xT ? `+${event.xT.toFixed(4)}` : '0.0000'}
                  </span>
                </div>
                <div>
                  {event.prog_pass ? (
                    <div className="flex items-center gap-2 text-[#3cffd0] bg-[#3cffd0]/10 w-fit px-3 py-1 rounded-full border border-[#3cffd0]/20">
                      <TrendingUp size={10} />
                      <span className="verge-label-mono text-[9px] font-black uppercase">Progressive</span>
                    </div>
                  ) : (
                    <span className="verge-label-mono text-[9px] text-white/20 uppercase font-black">Standard</span>
                  )}
                </div>
                <div className="verge-label-mono text-[10px] text-[#949494]">
                  {event.x ? `${event.x.toFixed(1)}, ${event.y.toFixed(1)}` : 'N/A'}
                </div>
                <div className="flex justify-center">
                  <button className={`transition-all ${isSelected ? 'text-[#3cffd0] scale-110' : 'text-white/10 hover:text-white/30'}`}>
                    {isSelected ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>
                </div>
              </motion.div>
            );
          })}
          {filteredEvents.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <p className="verge-label-mono text-[11px] text-[#949494] uppercase tracking-widest italic opacity-40">Aucun événement ne correspond aux filtres actifs.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 text-[#949494]">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#3cffd0] rounded-full" />
            <span className="verge-label-mono text-[9px] uppercase font-black">Indicateur d'Impact (xT &gt; 0.03)</span>
         </div>
         <div className="flex items-center gap-2">
            <TrendingUp size={12} className="text-[#3cffd0]" />
            <span className="verge-label-mono text-[9px] uppercase font-black">Progression Verticale Validée</span>
         </div>
      </div>
    </div>
  );
};

export default EventExplorer;
