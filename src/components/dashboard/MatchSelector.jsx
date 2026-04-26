import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Database, Play, Loader2, AlertCircle, Search } from 'lucide-react';
import { OPTAVISION_API_URL } from '../../config';

const MatchSelector = ({ onSelect }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${OPTAVISION_API_URL}/api/optavision/matches`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();
        setMatches(data);
      } catch (err) {
        console.error('Failed to fetch matches:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const filteredMatches = matches.filter(m => 
    m.match_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <Loader2 size={40} className="text-[#3cffd0] animate-spin" />
        <p className="verge-label-mono text-[10px] text-[#949494] uppercase tracking-[0.4em]">Chargement des configurations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-[20px] p-12 text-center max-w-2xl mx-auto">
        <AlertCircle size={40} className="text-red-500 mx-auto mb-6" />
        <h3 className="verge-h3 text-white mb-2">ERREUR DE SYNCHRONISATION</h3>
        <p className="verge-label-mono text-[11px] text-[#949494] mb-8 uppercase tracking-widest">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="btn-verge-primary px-8 py-3 text-[10px]"
        >
          RÉESSAYER
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-[#949494]" />
          <input 
            type="text"
            placeholder="RECHERCHER UN MATCH OU UN ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#131313] border border-white/10 rounded-full px-16 py-4 text-white verge-label-mono text-[12px] focus:outline-none focus:border-[#3cffd0] transition-all"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="verge-label-mono text-[10px] text-[#949494] font-black">{filteredMatches.length} MATCHS TROUVÉS</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <span className="verge-label-mono text-[10px] text-[#3cffd0] font-black uppercase">Statut: Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMatches.map((match, idx) => (
          <motion.div
            key={match.id || idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelect(match)}
            className="group relative bg-[#131313] border border-white/10 rounded-[24px] p-8 cursor-pointer hover:border-[#3cffd0]/50 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#3cffd0]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-white/5 rounded-[12px] flex items-center justify-center group-hover:bg-[#3cffd0] group-hover:text-black transition-colors">
                  <Database size={20} />
                </div>
                <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 group-hover:border-[#3cffd0]/30">
                  <span className="verge-label-mono text-[9px] text-[#949494] group-hover:text-[#3cffd0] font-black uppercase">Ready</span>
                </div>
              </div>
              <div>
                <h3 className="verge-h3 text-white group-hover:text-[#3cffd0] transition-colors mb-2 uppercase tracking-tight line-clamp-1">
                  {match.match_name || 'Match Sans Nom'}
                </h3>
                <div className="flex items-center gap-2 text-[#949494]">
                   <Calendar size={12} />
                   <span className="verge-label-mono text-[10px] uppercase font-black">
                     {match.updated_at ? new Date(match.updated_at).toLocaleDateString() : 'DATE INCONNUE'}
                   </span>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-[#3cffd0] rounded-full animate-pulse" />
                   <span className="verge-label-mono text-[9px] text-white/40 uppercase tracking-widest font-black">Data Ingested</span>
                </div>
                <div className="flex items-center gap-2 text-[#3cffd0] opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                  <span className="verge-label-mono text-[10px] font-black uppercase">Ouvrir</span>
                  <Play size={12} fill="#3cffd0" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#3cffd0] group-hover:w-full transition-all duration-500" />
          </motion.div>
        ))}
        {filteredMatches.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white/5 rounded-[24px] border border-dashed border-white/10">
            <p className="verge-label-mono text-[11px] text-[#949494] uppercase tracking-widest">Aucun match ne correspond à votre recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchSelector;
