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
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
        
        {/* Left: Help & Category */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            id="btn-help"
            onClick={onOpenHelp}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Kako se igra"
            aria-label="Pravila igre"
          >
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <span className="hidden sm:inline">Pravila</span>
          </button>

          <button
            id="btn-category-select"
            onClick={onOpenCategory}
            className="px-2 sm:px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 rounded-lg text-xs font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
            title="Promeni kategoriju"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="truncate max-w-[80px] xs:max-w-[110px] sm:max-w-none">{currentCatInfo.name}</span>
          </button>
        </div>

        {/* Center: Brand Title & Disc Logo */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="relative flex items-center justify-center">
            <Disc3 
              className={`w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 transition-transform ${
                isPlaying ? 'animate-spin-slow text-emerald-300' : ''
              }`} 
            />
            <div className="w-2 h-2 rounded-full bg-zinc-950 absolute" />
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-white leading-tight">
              Pogodi Pesmu
            </h1>
            <p className="text-[9px] sm:text-[10px] font-semibold text-emerald-400/90 tracking-wider uppercase">
              Muzički Izazov
            </p>
          </div>
        </div>

        {/* Right: Daily Streak & Stats */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Daily Streak Badge */}
          <button
            id="btn-header-streak"
            onClick={onOpenStats}
            className={`px-2 sm:px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1 sm:gap-1.5 text-xs font-bold active:scale-95 ${
              currentStreak > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-zinc-300'
            }`}
            title={`Dnevni niz: ${currentStreak} ${currentStreak === 1 ? 'dan' : 'dana'} zaredom`}
            aria-label="Dnevni niz"
          >
            <Flame className={`w-4 h-4 ${currentStreak > 0 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-zinc-500'}`} />
            <span>{currentStreak}</span>
            <span className="hidden md:inline font-normal text-[10px] text-zinc-400">
              {currentStreak === 1 ? 'dan' : 'dana'}
            </span>
          </button>

          {/* Stats Button */}
          <button
            id="btn-stats"
            onClick={onOpenStats}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Statistika"
            aria-label="Tvoja statistika"
          >
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <span className="hidden sm:inline">Statistika</span>
          </button>
        </div>
      </div>
    </header>
  );
};
