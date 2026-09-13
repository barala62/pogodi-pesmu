import React, { useMemo } from 'react';
import { X, Disc3, Flame, Music2, Wine, Shuffle, Check, Trophy, PlayCircle } from 'lucide-react';
import { GameCategory } from '../types';
import { CATEGORIES, getDailySong } from '../data/songs/balkanSongs';
import { loadGameState, resetGameStateForCategory } from '../utils/storage';

interface CategoryModalProps {
  isOpen: boolean;
  currentCategory: GameCategory;
  todayDateStr: string;
  onSelectCategory: (category: GameCategory) => void;
  onClose: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  currentCategory,
  todayDateStr,
  onSelectCategory,
  onClose,
}) => {
  if (!isOpen) return null;

  // Only show daily categories in "Izaberi Režim" (practice is completely hidden and accessible via /trening)
  const categoryStatuses = useMemo(() => {
    const dailyCats = CATEGORIES.filter(cat => cat.id !== 'practice');

    return dailyCats.map((cat) => {
      const saved = loadGameState(cat.id, todayDateStr);
      const currentDailySong = getDailySong(todayDateStr, cat.id);
      const isMatchingSong = Boolean(saved && saved.targetSongId === currentDailySong.id);

      if (saved && !isMatchingSong) {
        resetGameStateForCategory(cat.id, todayDateStr);
      }

      return {
        cat,
        isDone: Boolean(isMatchingSong && saved?.isGameOver),
        isWon: Boolean(isMatchingSong && saved?.isGameOver && saved?.isWon),
        inProgress: Boolean(isMatchingSong && saved && !saved.isGameOver && saved.attempts.length > 0),
        attemptsCount: isMatchingSong ? (saved?.attempts.length || 0) : 0,
      };
    });
  }, [isOpen, todayDateStr]);

  const completedCount = categoryStatuses.filter((s) => s.isDone).length;
  const wonCount = categoryStatuses.filter((s) => s.isWon).length;

  const renderIcon = (iconName: string, isSelected: boolean) => {
    const iconClass = `w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`;
    switch (iconName) {
      case 'Flame': return <Flame className={iconClass} />;
      case 'Music2': return <Music2 className={iconClass} />;
      case 'Wine': return <Wine className={iconClass} />;
      case 'Shuffle': return <Shuffle className={iconClass} />;
      default: return <Disc3 className={iconClass} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="category-dialog"
        className="relative w-full max-w-lg bg-zinc-900 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Zatvori izbor kategorija"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-white">
            Izaberi Režim / Muzičku Kategoriju
          </h2>
          <p className="text-xs text-zinc-400">
            Dnevni izazovi se ažuriraju svakog dana u ponoć
          </p>
        </div>

        {/* Daily Progress summary banner */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-zinc-300 font-medium">
              Današnji napredak: <strong className="text-white">{completedCount} / {categoryStatuses.length}</strong> odigrano
            </span>
          </div>
          {wonCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold shrink-0">
              {wonCount} {wonCount === 1 ? 'pobeda' : 'pobede'} 🏆
            </span>
          )}
        </div>

        {/* Category Cards List */}
        <div className="space-y-2.5 pt-1">
          {categoryStatuses.map(({ cat, isDone, isWon, inProgress, attemptsCount }) => {
            const isSelected = currentCategory === cat.id;

            return (
              <button
                key={cat.id}
                id={`cat-card-${cat.id}`}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onClose();
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 group relative ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/25 shadow-md ring-1 ring-emerald-500/30'
                    : isDone
                    ? 'border-white/10 bg-zinc-900/60 hover:bg-white/5 hover:border-white/20'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected 
                      ? 'bg-emerald-500/20' 
                      : isWon
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-white/5 group-hover:bg-white/10'
                  }`}>
                    {renderIcon(cat.icon, isSelected || isWon)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                        {cat.badge}
                      </span>

                      {/* Status Badges: Done / In Progress / Ready */}
                      {isDone ? (
                        isWon ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Završeno ({attemptsCount}/6)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-300 border border-zinc-600 flex items-center gap-1">
                            <span>Odigrano ({attemptsCount}/6)</span>
                          </span>
                        )
                      ) : inProgress ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <span>⏳ U toku ({attemptsCount}/6)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                          <span>Novo za danas</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Right Indicator: Active selected Check or Play indicator */}
                <div className="shrink-0 flex items-center mt-1">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-sm" title="Trenutno izabrano">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : isDone ? (
                    <div className="text-[11px] text-zinc-500 group-hover:text-zinc-300 font-medium transition-colors">
                      Pregledaj →
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/5 group-hover:bg-emerald-500/20 text-zinc-400 group-hover:text-emerald-400 flex items-center justify-center transition-colors">
                      <PlayCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
