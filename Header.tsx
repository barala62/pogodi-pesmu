import React from 'react';
import { HelpCircle, BarChart2, Layers, Disc3, Flame } from 'lucide-react';
import { GameCategory, CategoryInfo } from '../types';
import { CATEGORIES } from '../data/songs/balkanSongs';

interface HeaderProps {
  currentCategory: GameCategory;
  isPlaying: boolean;
  currentStreak: number;
  onOpenHelp: () => void;
  onOpenCategory: () => void;
  onOpenStats: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCategory,
  isPlaying,
  currentStreak,
  onOpenHelp,
  onOpenCategory,
  onOpenStats,
}) => {
  const currentCatInfo = CATEGORIES.find(c => c.id === currentCategory) || CATEGORIES[0];

  return (
    <header className="w-full border-b border-white/10 bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-2.5 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-2">
        
        {/* Left: Help & Category */}
        <div className="flex-1 flex items-center justify-start gap-1 sm:gap-2 min-w-0">
          <button
            id="btn-help"
            onClick={onOpenHelp}
            className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
            title="Kako se igra"
            aria-label="Pravila igre"
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <span className="hidden sm:inline">Pravila</span>
          </button>

          <button
            id="btn-category-select"
            onClick={onOpenCategory}
            className="px-2 sm:px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 rounded-lg text-xs font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 min-w-0"
            title="Promeni kategoriju"
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[65px] xs:max-w-[100px] sm:max-w-none">{currentCatInfo.name}</span>
          </button>
        </div>

        {/* Center: Brand Title & Disc Logo - Perfectly Centered on Mobile & Desktop */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 px-1">
          <div className="relative flex items-center justify-center shrink-0 self-center">
            <Disc3 
              className={`w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 transition-transform ${
                isPlaying ? 'animate-spin-slow text-emerald-300' : ''
              }`} 
            />
            <div className="w-2 h-2 rounded-full bg-zinc-950 absolute" />
          </div>
          <div className="flex flex-col justify-center text-left leading-tight">
            <h1 className="text-xs xs:text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight">
              Pogodi Pesmu
            </h1>
            <p className="text-[8px] xs:text-[9px] sm:text-[10px] font-semibold text-emerald-400/90 tracking-wider uppercase leading-none mt-0.5">
              Muzički Izazov
            </p>
          </div>
        </div>

        {/* Right: Daily Streak & Stats */}
        <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2 min-w-0">
          {/* Daily Streak Badge */}
          <button
            id="btn-header-streak"
            onClick={onOpenStats}
            className={`px-1.5 sm:px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-bold active:scale-95 shrink-0 ${
              currentStreak > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-zinc-300'
            }`}
            title={`Dnevni niz (Dnevni miks): ${currentStreak} ${currentStreak === 1 ? 'dan' : 'dana'} zaredom`}
            aria-label="Dnevni niz u Dnevnom miksu"
          >
            <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${currentStreak > 0 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-zinc-500'}`} />
            <span>{currentStreak}</span>
            <span className="hidden md:inline font-normal text-[10px] text-zinc-400">
              {currentStreak === 1 ? 'dan' : 'dana'}
            </span>
          </button>

          {/* Stats Button */}
          <button
            id="btn-stats"
            onClick={onOpenStats}
            className="p-1.5 sm:p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
            title="Statistika"
            aria-label="Tvoja statistika"
          >
            <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <span className="hidden sm:inline">Statistika</span>
          </button>
        </div>
      </div>
    </header>
  );
};

