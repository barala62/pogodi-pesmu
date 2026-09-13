import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward, Check, Search, X, Music, Volume2, Sparkles } from 'lucide-react';
import { Song, GuessAttempt, SongPreviewResponse, STEP_DURATIONS, MAX_ATTEMPTS } from '../types';
import { searchSongs } from '../data/songs/balkanSongs';
import { ProgressBar } from './ProgressBar';

interface GameControlsProps {
  isPlaying: boolean;
  currentTime: number;
  unlockedDuration: number;
  previewData: SongPreviewResponse | null;
  isLoadingAudio: boolean;
  attempts: GuessAttempt[];
  isGameOver: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onMakeGuess: (song: Song) => void;
  onSkip: () => void;
  onShowResults?: () => void;
  onNextPracticeSong?: () => void;
  isPracticeMode?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  isPlaying,
  currentTime,
  unlockedDuration,
  previewData,
  isLoadingAudio,
  attempts,
  isGameOver,
  onTogglePlay,
  onRestart,
  onMakeGuess,
  onSkip,
  onShowResults,
  onNextPracticeSong,
  isPracticeMode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Song[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const attemptCount = attempts.length;
  const nextStepIndex = Math.min(attemptCount + 1, STEP_DURATIONS.length - 1);
  const currentDuration = STEP_DURATIONS[attemptCount] || 16;
  const nextDuration = STEP_DURATIONS[nextStepIndex] || 16;
  const skipAddedSeconds = Math.max(0, nextDuration - currentDuration);

  // Search autocomplete
  useEffect(() => {
    if (!query.trim() || selectedSong) {
      setResults([]);
      return;
    }
    const filtered = searchSongs(query, 7);
    setResults(filtered);
    setIsOpen(filtered.length > 0);
  }, [query, selectedSong]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setQuery(`${song.artist} - ${song.title}`);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedSong(null);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleConfirmGuess = () => {
    if (!selectedSong) return;
    onMakeGuess(selectedSong);
    setSelectedSong(null);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectedSong) {
        handleConfirmGuess();
      } else if (results.length > 0) {
        handleSelectSong(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getGenreColor = (genre: string) => {
    switch (genre) {
      case 'moderno': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'ex-yu': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'narodna': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
  };

  return (
    <div 
      id="game-controls-card"
      ref={containerRef}
      className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-2xl space-y-4 relative"
    >
      {/* 1. Segmented Progress Bar */}
      <ProgressBar
        currentTime={currentTime}
        unlockedDuration={unlockedDuration}
        attempts={attempts}
        isGameOver={isGameOver}
      />

      {/* 2. Unified Action Bar: Rewind + Big Play/Pause + Skip Button Side-by-Side */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1">
        {/* Rewind */}
        <button
          id="btn-rewind"
          onClick={onRestart}
          disabled={isLoadingAudio}
          className="p-3 sm:px-3.5 sm:py-3 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 transition-all border border-white/5 flex items-center justify-center shrink-0"
          title="Vrati na početak (0:00)"
          aria-label="Vrati na početak"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Central Play/Pause Button */}
        <button
          id="btn-play-pause"
          onClick={onTogglePlay}
          disabled={isLoadingAudio}
          className={`flex-1 min-h-[50px] px-4 py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-98 shadow-lg ${
            isPlaying
              ? 'bg-emerald-400 text-zinc-950 ring-4 ring-emerald-400/20 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
              : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isPlaying ? 'Pauziraj isečak' : `Pusti isečak (${unlockedDuration}s)`}
          aria-label={isPlaying ? 'Pauziraj zvuk' : 'Pusti zvuk'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-current shrink-0" />
              <span>Pauziraj</span>
              <span className="flex items-center gap-0.5 ml-1">
                <span className="w-1 h-3 bg-zinc-950 animate-bounce rounded-full [animation-delay:0ms]" />
                <span className="w-1 h-4 bg-zinc-950 animate-bounce rounded-full [animation-delay:150ms]" />
                <span className="w-1 h-2 bg-zinc-950 animate-bounce rounded-full [animation-delay:300ms]" />
              </span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current ml-0.5 shrink-0" />
              <span>Pusti isečak ({unlockedDuration}s)</span>
            </>
          )}
        </button>

        {/* Skip button directly next to Play button! */}
        {!isGameOver ? (
          <button
            id="btn-skip-guess"
            type="button"
            onClick={onSkip}
            className="px-3.5 sm:px-4 min-h-[50px] rounded-xl border border-white/10 hover:border-amber-500/40 bg-white/5 hover:bg-amber-500/10 active:scale-95 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-amber-300 transition-all flex items-center justify-center gap-1.5 shrink-0"
            title={attemptCount >= 5 ? 'Odustani od pogađanja' : `Preskoči na ${nextDuration}s`}
          >
            <FastForward className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">
              {attemptCount >= 5 ? 'Odustani' : `+${skipAddedSeconds}s`}
            </span>
          </button>
        ) : (
          <div className="w-10 sm:w-12 shrink-0" />
        )}
      </div>

      {/* 3. Search & Confirm Input (immediately under Play & Skip) */}
      {!isGameOver ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Search className="w-4 h-4" />
              </div>

              <input
                ref={inputRef}
                id="song-search-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selectedSong) setSelectedSong(null);
                }}
                onFocus={() => {
                  if (results.length > 0 && !selectedSong) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Unesi izvođača ili naziv pesme..."
                className="w-full min-h-[46px] pl-10 pr-9 py-2.5 bg-zinc-950/80 border border-white/10 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />

              {query && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Autocomplete dropdown */}
              {isOpen && results.length > 0 && (
                <div 
                  id="search-results-dropdown"
                  className="absolute z-50 left-0 right-0 bottom-full mb-2 max-h-64 overflow-y-auto bg-zinc-900/98 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl divide-y divide-white/5"
                >
                  {results.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => handleSelectSong(song)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-500/10 flex items-center justify-between gap-3 transition-colors group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/20 transition-colors">
                          <Music className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="truncate">
                          <div className="font-semibold text-sm text-white truncate">
                            {song.title}
                          </div>
                          <div className="text-xs text-zinc-400 truncate">
                            {song.artist}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getGenreColor(song.genre)}`}>
                          {song.genre}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {song.year}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Guess button */}
            <button
              id="btn-submit-guess"
              type="button"
              disabled={!selectedSong}
              onClick={handleConfirmGuess}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 active:scale-95 text-xs sm:text-sm font-bold text-zinc-950 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 disabled:shadow-none shrink-0"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span className="hidden xs:inline">Potvrdi</span>
            </button>
          </div>
        </div>
      ) : (
        /* Game Over State inside dock */
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white/[0.02] p-3 rounded-xl border border-white/5">
          <span className="text-xs font-medium text-zinc-300">
            Igra je završena za ovu pesmu!
          </span>
          <div className="flex items-center gap-2">
            {onShowResults && (
              <button
                id="btn-open-modal-results"
                onClick={onShowResults}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-sm"
              >
                Prikaži rezultat
              </button>
            )}
            {isPracticeMode && onNextPracticeSong && (
              <button
                id="btn-inline-next"
                onClick={onNextPracticeSong}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-all border border-white/10"
              >
                Sledeća pesma 🔁
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
