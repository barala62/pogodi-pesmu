import React from 'react';
import { X, Award, Flame, Target, Trophy } from 'lucide-react';
import { UserStats } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  stats: UserStats;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, stats, onClose }) => {
  if (!isOpen) return null;

  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;

  // Find highest frequency in guess distribution for scaling bars
  const counts = Object.values(stats.guessDistribution) as number[];
  const maxGuessCount = Math.max(1, ...counts);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="stats-dialog"
        className="relative w-full max-w-md bg-zinc-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-6 overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Zatvori statistiku"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            Tvoja Statistika
          </h2>
          <p className="text-xs text-zinc-400">
            Pregled tvojih uspeha i dnevnog niza u pogađanju hitova
          </p>
        </div>

        {/* Daily Streak Highlight Banner */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Flame className={`w-6 h-6 sm:w-7 sm:h-7 ${stats.currentStreak > 0 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-zinc-500'}`} />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>Niz u Dnevnom Miksu</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  Dnevni miks
                </span>
              </div>
              <div className="text-lg sm:text-xl font-extrabold text-white">
                {stats.currentStreak} {stats.currentStreak === 1 ? 'dan' : 'dana'} zaredom
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 leading-tight">
                {stats.currentStreak > 0
                  ? 'Odlično! Igraj Dnevni miks svakog dana u ponoć da održiš niz.'
                  : 'Pogodi današnji Dnevni miks da započneš pobednički niz!'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <div className="text-[9px] uppercase font-bold text-zinc-400">
              Najbolji niz
            </div>
            <div className="text-sm sm:text-base font-extrabold text-purple-300">
              {stats.maxStreak} d.
            </div>
          </div>
        </div>

        {/* 4 Key Stat Metrics */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-xl sm:text-2xl font-extrabold text-white">
              {stats.gamesPlayed}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
              Odigrano
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
              {winRate}%
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
              Pobede
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-xl sm:text-2xl font-extrabold text-amber-400 flex items-center justify-center gap-0.5">
              {stats.currentStreak}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
              Trenutni niz
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="text-xl sm:text-2xl font-extrabold text-purple-400">
              {stats.maxStreak}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">
              Najbolji niz
            </div>
          </div>
        </div>

        {/* Guess Distribution Bar Chart */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
            Raspodela pogodaka po koracima
          </h3>

          <div className="space-y-1.5 font-mono text-xs">
            {[1, 2, 3, 4, 5, 6].map((step) => {
              const count = stats.guessDistribution[step] || 0;
              const widthPct = Math.max(8, (count / maxGuessCount) * 100);

              return (
                <div key={step} className="flex items-center gap-2">
                  <span className="w-4 text-zinc-400 font-bold text-right shrink-0">
                    {step}
                  </span>
                  <div className="flex-1 h-6 bg-white/[0.03] rounded overflow-hidden flex items-center">
                    <div
                      style={{ width: `${count > 0 ? widthPct : 6}%` }}
                      className={`h-full flex items-center justify-end px-2 font-bold text-xs transition-all duration-500 rounded ${
                        count > 0
                          ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-white/10 space-y-1">
          <p className="text-[11px] text-amber-300/80 font-medium">
            🔥 Niz pobeda se vezuje isključivo za <strong>Dnevni miks</strong>.
          </p>
          <p className="text-[10px] text-zinc-500">
            Statistika se automatski čuva u tvom internet pregledaču.
          </p>
        </div>
      </div>
    </div>
  );
};
