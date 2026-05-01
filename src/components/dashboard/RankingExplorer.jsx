import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Database, Loader2, SlidersHorizontal, Trophy, X } from 'lucide-react';
import ExplorationFilterPanel from './ExplorationFilterPanel';
import { OPTAVISION_API_URL } from '../../config';
import { createExplorationSearchParams } from './optaFilterParams';

const RankBadge = ({ rank }) => {
  if (rank === 1) {
    return <div className="w-10 h-10 bg-[#3cffd0] text-black flex items-center justify-center text-xs font-black rounded-[4px] shadow-[4px_4px_0px_rgba(60,255,208,0.2)]">{rank}</div>;
  }
  if (rank <= 3) {
    return <div className="w-10 h-10 bg-[#5200ff] text-white flex items-center justify-center text-xs font-black rounded-[4px] shadow-[4px_4px_0px_rgba(82,0,255,0.2)]">{rank}</div>;
  }
  return <div className="w-10 h-10 bg-[#2d2d2d] text-[#949494] flex items-center justify-center text-xs font-black rounded-[4px] border border-white/5">{rank}</div>;
};

const RANKING_PAGE_SIZE = 20;

const RankingExplorer = ({
  filters,
  onFiltersChange,
  matchesList = [],
  availableActionTypes = [],
  availableNextActionTypes = [],
  competitionsList = [],
  seasonsList = [],
  weeksList = [],
  countriesList = [],
  phasesList = [],
  stadiumsList = [],
  advancedMetricsList = [],
  teamsList = [],
  playersList = []
}) => {
  const [ranking, setRanking] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchRanking = async (nextFilters = filters, nextPage = page) => {
    setLoading(true);
    setError(null);
    const params = createExplorationSearchParams(nextFilters, {
      page: String(nextPage),
      limit: String(RANKING_PAGE_SIZE)
    });
    const url = `${OPTAVISION_API_URL}/api/optavision/ranking?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`RANKING_DATA_FAILURE: ${response.status}`);
      const payload = await response.json();
      if (Array.isArray(payload)) {
        setRanking(payload);
        setTotal(payload.length);
      } else {
        setRanking(Array.isArray(payload.items) ? payload.items : []);
        setTotal(Number(payload.total || 0));
        setPage(Number(payload.page || nextPage));
      }
    } catch (err) {
      console.error('RANKING_FETCH_ERROR:', err);
      setError(err.message);
      setRanking([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanking(filters);
  }, []);

  const totals = useMemo(() => {
    const totalActions = ranking.reduce((sum, row) => sum + Number(row.total_actions || 0), 0);
    const successfulActions = ranking.reduce((sum, row) => sum + Number(row.successful_actions || 0), 0);
    const successRate = totalActions > 0 ? Math.round((successfulActions / totalActions) * 100) : 0;
    return { totalActions, successfulActions, successRate };
  }, [ranking]);

  const applyRankingFilters = (nextFilters) => {
    onFiltersChange?.(nextFilters);
    setPage(1);
    fetchRanking(nextFilters, 1);
  };

  const totalPages = Math.max(1, Math.ceil(total / RANKING_PAGE_SIZE));

  const goToPage = (nextPage) => {
    const boundedPage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(boundedPage);
    fetchRanking(filters, boundedPage);
  };

  return (
    <div className="w-full h-full p-8 bg-[#131313] overflow-hidden">
      <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8">
        <section className="min-h-0 flex flex-col bg-[#1a1a1a] border border-white/10 rounded-[4px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.35)]">
          <div className="p-8 border-b border-white/10 bg-[#2d2d2d] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#3cffd0] text-black rounded-[4px] flex items-center justify-center">
                <Trophy size={22} />
              </div>
              <div>
                <h2 className="verge-h3 text-white uppercase tracking-tighter font-black">Ranking Performance</h2>
                <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase tracking-[0.25em] font-black mt-1">API-first player aggregation</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="verge-label-mono bg-[#3cffd0] text-black px-5 py-3 rounded-[3px] text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-all"
            >
              <SlidersHorizontal size={14} />
              Filtrer
            </button>
          </div>

          <div className="grid grid-cols-3 border-b border-white/5 bg-black/30">
            {[
              ['Actions', totals.totalActions.toLocaleString()],
              ['Reussies', totals.successfulActions.toLocaleString()],
              ['Reussite', `${totals.successRate}%`]
            ].map(([label, value]) => (
              <div key={label} className="p-5 border-r border-white/5 last:border-r-0">
                <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.25em] font-black">{label}</div>
                <div className="verge-label-mono text-2xl text-white font-black mt-2">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[70px_minmax(0,1fr)_130px_130px_110px] gap-4 px-6 py-4 border-b border-white/5 bg-[#131313] verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest font-black">
            <span>Rank</span>
            <span>Joueur</span>
            <span className="text-right">Actions</span>
            <span className="text-right">Reussies</span>
            <span className="text-right">Taux</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto styled-scrollbar-verge divide-y divide-white/[0.03]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-[#3cffd0]">
                <Loader2 size={30} className="animate-spin" />
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 text-[#ff4d4d]">
                <Database size={40} className="mb-4 opacity-40" />
                <div className="verge-label-mono text-[10px] uppercase font-black tracking-widest">{error}</div>
              </div>
            ) : ranking.length > 0 ? (
              ranking.map((player, index) => {
                const totalActions = Number(player.total_actions || 0);
                const successfulActions = Number(player.successful_actions || 0);
                const successRate = totalActions > 0 ? Math.round((successfulActions / totalActions) * 100) : 0;
                return (
                  <motion.div
                    key={`${player.player_id || 'unknown'}-${index}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-[70px_minmax(0,1fr)_130px_130px_110px] gap-4 items-center px-6 py-5 hover:bg-[#3cffd0]/5 transition-all group"
                  >
                      <RankBadge rank={(page - 1) * RANKING_PAGE_SIZE + index + 1} />
                    <div className="min-w-0">
                      <div className="verge-label-mono text-[13px] text-white font-black group-hover:text-[#3cffd0] uppercase truncate">
                        {player.playerName || player.player_id || 'Joueur inconnu'}
                      </div>
                      <div className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-widest mt-1">ID {player.player_id || 'N/A'}</div>
                    </div>
                    <div className="text-right verge-label-mono text-2xl text-[#3cffd0] font-black">{totalActions}</div>
                    <div className="text-right verge-label-mono text-xl text-white font-black">{successfulActions}</div>
                    <div className="text-right">
                      <span className={`verge-label-mono text-[10px] px-3 py-1 rounded-[3px] font-black ${successRate >= 70 ? 'bg-[#3cffd0] text-black' : successRate >= 45 ? 'bg-[#ffd03c] text-black' : 'bg-[#ff4d4d] text-black'}`}>
                        {successRate}%
                      </span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-20">
                <Activity size={48} />
                <div className="verge-label-mono text-[11px] font-black uppercase tracking-[0.3em] mt-4">No Ranking Data</div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-white/10 bg-[#131313] flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-[2px] verge-label-mono text-[10px] text-white font-black uppercase tracking-widest transition-all"
            >
              Prec
            </button>
            <div className="verge-label-mono text-[9px] text-[#949494] font-black tracking-widest">
              PAGE <span className="text-[#3cffd0]">{page}</span> / {totalPages}
              <span className="ml-3 text-white/40">{total.toLocaleString()} JOUEURS</span>
            </div>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => goToPage(page + 1)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-[2px] verge-label-mono text-[10px] text-white font-black uppercase tracking-widest transition-all"
            >
              Suiv
            </button>
          </div>
        </section>

        <aside className="hidden xl:flex min-h-0 flex-col gap-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-[4px] p-6">
            <div className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-[0.25em] font-black">Contrat API</div>
            <div className="verge-label-mono text-[11px] text-white font-black uppercase mt-3">GET /api/optavision/ranking</div>
            <p className="text-xs text-[#949494] leading-relaxed mt-4">
              Le classement est calcule cote base avec les memes filtres que la carte d'exploration.
            </p>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
            />
            <motion.div
              initial={{ x: -500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -500, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full z-[301]"
            >
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="absolute top-6 right-6 z-10 w-9 h-9 rounded-full border border-white/10 bg-white/5 text-[#949494] hover:text-white hover:bg-red-500 transition-all flex items-center justify-center"
              >
                <X size={16} />
              </button>
              <ExplorationFilterPanel
                matchesList={matchesList}
                availableActionTypes={availableActionTypes}
                availableNextActionTypes={availableNextActionTypes}
                competitionsList={competitionsList}
                seasonsList={seasonsList}
                weeksList={weeksList}
                countriesList={countriesList}
                phasesList={phasesList}
                stadiumsList={stadiumsList}
                advancedMetricsList={advancedMetricsList}
                teamsList={teamsList}
                playersList={playersList}
                filters={filters}
                onFilterChange={applyRankingFilters}
                onClose={() => setIsFilterOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RankingExplorer;
