import React from 'react';
import { GuessAttempt } from '../types';

interface ProgressBarProps {
  currentTime: number;
  unlockedDuration: number;
  attempts: GuessAttempt[];
  isGameOver: boolean;
  totalDuration?: number; // default 16, or 30 when game is over
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  unlockedDuration,
  attempts,
  isGameOver,
  totalDuration = isGameOver && unlockedDuration > 16 ? 30 : 16,
}) => {
  // Format seconds into m:ss.s (e.g. 0:00.3 / 0:00.5)
  const formatTime = (secs: number) => {
    const clamped = Math.max(0, secs);
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    const tenths = Math.floor((clamped % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${tenths}`;
  };

  // 6 standard Heardle intervals:
  // Step 1: [0, 0.5] -> 0.5s
  // Step 2: [0.5, 1.0] -> 0.5s
  // Step 3: [1.0, 2.0] -> 1.0s
  // Step 4: [2.0, 4.0] -> 2.0s
  // Step 5: [4.0, 8.0] -> 4.0s
  // Step 6: [8.0, 16.0] -> 8.0s
  const segments = [
    { stepIndex: 0, start: 0, end: 0.5, targetDuration: 0.5 },
    { stepIndex: 1, start: 0.5, end: 1.0, targetDuration: 1.0 },
    { stepIndex: 2, start: 1.0, end: 2.0, targetDuration: 2.0 },
    { stepIndex: 3, start: 2.0, end: 4.0, targetDuration: 4.0 },
    { stepIndex: 4, start: 4.0, end: 8.0, targetDuration: 8.0 },
    { stepIndex: 5, start: 8.0, end: 16.0, targetDuration: 16.0 },
  ];

  const fillPercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));
  const unlockedPercent = Math.min(100, Math.max(0, (unlockedDuration / totalDuration) * 100));

  return (
    <div className="w-full space-y-2">
      {/* Segmented Timeline with Smooth Continuous Fill */}
      <div 
        id="progress-bar-container"
        className="relative w-full h-4 sm:h-4.5 bg-zinc-950/80 rounded-lg overflow-hidden border border-white/10 shadow-inner"
      >
        {/* 1. Unlocked time span highlight */}
        <div
          className="absolute inset-y-0 left-0 bg-white/[0.05] pointer-events-none transition-[width] duration-200"
          style={{ width: `${unlockedPercent}%` }}
        />

        {/* 2. Buttery-smooth continuous 60fps fill bar without transition lag */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)] pointer-events-none"
          style={{
            width: `${fillPercent}%`,
            willChange: 'width',
          }}
        />

        {/* 3. Overlaid Heardle Segment Dividers */}
        {segments.map((seg, idx) => {
          const segLeftPct = (seg.start / totalDuration) * 100;
          const segWidthPct = ((seg.end - seg.start) / totalDuration) * 100;

          return (
            <div
              key={idx}
              style={{ left: `${segLeftPct}%`, width: `${segWidthPct}%` }}
              className="absolute inset-y-0 border-r border-zinc-950/80 pointer-events-none z-10"
              title={`Pokušaj ${idx + 1}: ${seg.targetDuration}s`}
            />
          );
        })}

        {/* 5. Unlocked Limit Boundary Indicator */}
        {!isGameOver && unlockedPercent < 100 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-emerald-400/50 z-20 pointer-events-none"
            style={{ left: `${unlockedPercent}%` }}
            title={`Trenutni limit: ${unlockedDuration}s`}
          />
        )}
      </div>

      {/* Time & Steps Readout */}
      <div className="flex items-center justify-between text-xs font-mono font-medium text-zinc-400 px-1">
        <span className="text-emerald-400 font-semibold tracking-wider">
          {formatTime(currentTime)}
        </span>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-zinc-300 font-semibold">
            Otključano: {formatTime(unlockedDuration)}
          </span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>
    </div>
  );
};
