import React from 'react';
import { Play, Pause, RotateCcw, Volume2, Sparkles } from 'lucide-react';
import { SongPreviewResponse } from '../types';

interface AudioControllerProps {
  isPlaying: boolean;
  unlockedDuration: number;
  previewData: SongPreviewResponse | null;
  isLoadingAudio: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  isGameOver: boolean;
}

export const AudioController: React.FC<AudioControllerProps> = ({
  isPlaying,
  unlockedDuration,
  previewData,
  isLoadingAudio,
  onTogglePlay,
  onRestart,
  isGameOver,
}) => {
  return (
    <div id="audio-controller" className="w-full flex flex-col items-center justify-center py-2 space-y-3">
      {/* Audio Status Pill */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        {isLoadingAudio ? (
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Učitavanje zvuka...
          </span>
        ) : isGameOver ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Volume2 className="w-3.5 h-3.5" />
            Otključan ceo audio isečak (30s)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            Slušaj intro od <strong className="text-white">{unlockedDuration}s</strong>
          </span>
        )}

        {previewData?.source === 'synth' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Sintisajzer zvuk
          </span>
        )}
      </div>

      {/* Main Buttons Row */}
      <div className="flex items-center gap-4">
        {/* Rewind to 0 */}
        <button
          id="btn-rewind"
          onClick={onRestart}
          disabled={isLoadingAudio}
          className="p-3 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 transition-all border border-white/5"
          title="Vrati na početak (0:00)"
          aria-label="Vrati na početak"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Big Central Play / Pause Button */}
        <button
          id="btn-play-pause"
          onClick={onTogglePlay}
          disabled={isLoadingAudio}
          className={`relative group w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl ${
            isPlaying
              ? 'bg-emerald-400 text-zinc-950 ring-4 ring-emerald-400/30 shadow-[0_0_24px_rgba(52,211,153,0.5)]'
              : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 hover:ring-4 hover:ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isPlaying ? 'Pauziraj' : `Pusti (${unlockedDuration}s)`}
          aria-label={isPlaying ? 'Pauziraj zvuk' : 'Pusti zvuk'}
        >
          {/* Animated sound ripple when playing */}
          {isPlaying && (
            <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
          )}

          {isPlaying ? (
            <Pause className="w-7 h-7 fill-current" />
          ) : (
            <Play className="w-7 h-7 fill-current ml-1" />
          )}
        </button>

        {/* Placeholder spacer for symmetrical balance */}
        <div className="w-10 h-10 flex items-center justify-center">
          {isPlaying && (
            <div className="flex items-center gap-0.5 h-4">
              <span className="w-1 h-3 bg-emerald-400 animate-bounce rounded-full [animation-delay:0ms]" />
              <span className="w-1 h-4 bg-emerald-400 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="w-1 h-2 bg-emerald-400 animate-bounce rounded-full [animation-delay:300ms]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
