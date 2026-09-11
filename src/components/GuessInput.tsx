import React, { useState, useRef, useEffect } from 'react';
import { Search, FastForward, Check, Music, X } from 'lucide-react';
import { Song, STEP_DURATIONS } from '../types';
import { searchSongs } from '../data/songs/balkanSongs';

interface GuessInputProps {
  attemptCount: number;
  isGameOver: boolean;
  onMakeGuess: (song: Song) => void;
  onSkip: () => void;
}

export const GuessInput: React.FC<GuessInputProps> = ({
  attemptCount,
  isGameOver,
  onMakeGuess,
  onSkip,
}) => {
  const [query, setQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Song[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Next unlocked seconds on skip
  const nextStepIndex = Math.min(attemptCount + 1, STEP_DURATIONS.length - 1);
  const currentDuration = STEP_DURATIONS[attemptCount] || 16;
  const nextDuration = STEP_DURATIONS[nextStepIndex] || 16;
  const skipAddedSeconds = Math.max(0, nextDuration - currentDuration);

  // Update search results when query changes
  useEffect(() => {
    if (!query.trim() || selectedSong) {
      setResults([]);
      return;
    }
    const filtered = searchSongs(query, 8);
    setResults(filtered);
    setIsOpen(filtered.length > 0);
  }, [query, selectedSong]);

  // Handle outside click to close dropdown
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

  if (isGameOver) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full relative space-y-3">
      {/* Autocomplete Input */}
      <div className="relative">
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
          placeholder="Pretraži po izvođaču, nazivu ili refrenu pesme..."
          className="w-full min-h-[48px] pl-10 pr-10 py-3 bg-zinc-900 border border-white/10 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />

        {query && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Dropdown Results */}
        {isOpen && results.length > 0 && (
          <div 
            id="search-results-dropdown"
            className="absolute z-40 w-full mt-1.5 max-h-64 overflow-y-auto bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl divide-y divide-white/5"
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

      {/* Action Buttons: Skip & Confirm */}
      <div className="flex items-center gap-3">
        {/* Skip button */}
        <button
          id="btn-skip-guess"
          type="button"
          onClick={onSkip}
          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 active:scale-98 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <FastForward className="w-4 h-4 text-amber-400" />
          <span>
            {attemptCount >= 5 ? 'Odustani (Kraj)' : `Preskoči (+${skipAddedSeconds}s)`}
          </span>
        </button>

        {/* Confirm Guess button */}
        <button
          id="btn-submit-guess"
          type="button"
          disabled={!selectedSong}
          onClick={handleConfirmGuess}
          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 active:scale-98 text-xs sm:text-sm font-bold text-zinc-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:shadow-none"
        >
          <Check className="w-4 h-4" />
          <span>Potvrdi odgovor</span>
        </button>
      </div>
    </div>
  );
};
