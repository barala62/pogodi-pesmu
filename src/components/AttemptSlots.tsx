import React from 'react';
import { Check, X, FastForward } from 'lucide-react';
import { GuessAttempt, MAX_ATTEMPTS } from '../types';

interface AttemptSlotsProps {
  attempts: GuessAttempt[];
  isGameOver: boolean;
}

export const AttemptSlots: React.FC<AttemptSlotsProps> = ({ attempts, isGameOver }) => {
  const currentSlotIndex = attempts.length;

  return (
    <div id="attempt-slots-list" className="w-full space-y-2">
      {Array.from({ length: MAX_ATTEMPTS }).map((_, idx) => {
        const attempt = attempts[idx];
        const isActive = idx === currentSlotIndex && !isGameOver;

        let borderStyle = 'border-white/10 bg-white/[0.02] text-zinc-500';
        if (attempt) {
          if (attempt.status === 'correct') {
            borderStyle = 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300';
          } else if (attempt.status === 'incorrect') {
            borderStyle = 'border-red-500/40 bg-red-950/20 text-red-300';
          } else if (attempt.status === 'skipped') {
            borderStyle = 'border-amber-500/40 bg-amber-950/20 text-amber-300';
          }
        } else if (isActive) {
          borderStyle = 'border-emerald-500/70 bg-white/[0.05] text-zinc-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]';
        }

        return (
          <div
            key={idx}
            id={`attempt-slot-${idx + 1}`}
            className={`w-full min-h-[44px] px-3.5 py-2 rounded-lg border flex items-center justify-between text-sm transition-all duration-200 ${borderStyle}`}
          >
            {/* Left: Attempt index & Icon */}
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="w-5 text-center font-mono text-xs font-semibold text-zinc-500 shrink-0">
                {idx + 1}
              </span>

              {attempt ? (
                <div className="flex items-center gap-2 truncate">
                  {attempt.status === 'correct' && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  )}
                  {attempt.status === 'incorrect' && (
                    <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </div>
                  )}
                  {attempt.status === 'skipped' && (
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <FastForward className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  )}

                  <div className="truncate text-xs sm:text-sm">
                    {attempt.status === 'skipped' ? (
                      <span className="font-medium not-italic text-zinc-300 pr-2 inline-block">Preskočeno</span>
                    ) : (
                      <span className="font-medium text-white">
                        {attempt.guessArtist} - <span className="font-semibold">{attempt.guessTitle}</span>
                      </span>
                    )}
                  </div>
                </div>
              ) : isActive ? (
                <span className="text-xs text-zinc-400 font-normal">
                  Tvoj sledeći pokušaj...
                </span>
              ) : (
                <span className="text-zinc-600 text-xs">—</span>
              )}
            </div>

            {/* Right: status indicator pill */}
            <div className="shrink-0 ml-2">
              {attempt?.status === 'correct' && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Pogođeno 🟩
                </span>
              )}
              {attempt?.status === 'incorrect' && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  Netačno ❌
                </span>
              )}
              {attempt?.status === 'skipped' && (
                <span className="text-xs text-amber-400/80 pr-1 select-none" title="Preskočeno">
                  ⏭️
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
