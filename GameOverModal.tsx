import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Share2, Check, X, Disc3, Play, Pause, RotateCw, Sparkles, Flame } from 'lucide-react';
import { Song, GuessAttempt, GameCategory, SongPreviewResponse, UserStats } from '../types';
import { getDayNumber } from '../utils/storage';
import { CATEGORIES } from '../data/songs/balkanSongs';

interface GameOverModalProps {
  isOpen: boolean;
  isWon: boolean;
  attempts: GuessAttempt[];
  targetSong: Song;
  previewData: SongPreviewResponse | null;
  isPlayingFullAudio: boolean;
  category: GameCategory;
  dateStr: string;
  userStats?: UserStats;
  onPlayFullAudio: () => void;
  onNextPracticeSong?: () => void;
  onClose: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  isWon,
  attempts,
  targetSong,
  previewData,
  isPlayingFullAudio,
  category,
  dateStr,
  userStats,
  onPlayFullAudio,
  onNextPracticeSong,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  // Trigger celebratory confetti on victory
  useEffect(() => {
    if (isOpen && isWon) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#34d399', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
        });
      } catch {
        // Confetti fallback
      }
    }
  }, [isOpen, isWon]);

  if (!isOpen) return null;

  const dayNum = getDayNumber(dateStr);
  const categoryInfo = CATEGORIES.find(c => c.id === category);

  // Build Emoji Matrix for sharing
  const generateShareText = () => {
    const emojis = attempts.map(att => {
      if (att.status === 'correct') return '🟩';
      if (att.status === 'skipped') return '🟧';
      if (att.status === 'incorrect') return '🟥';
      return '⬛';
    });

    // Pad to 6 if won before attempt 6
    while (emojis.length < 6) {
      emojis.push('⬛');
    }

    const scoreStr = isWon ? `${attempts.length}/6` : 'X/6';
    const categoryName = categoryInfo?.name || 'Dnevni Izazov';

    return `Pogodi Pesmu (#${dayNum} - ${categoryName})\n🔊 ${emojis.join('')} ${scoreStr}\nIgraj i ti: ${window.location.origin}`;
  };

  const handleShare = async () => {
    const text = generateShareText();
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch (e) {
        console.warn('Clipboard write failed:', e);
      }
    }
  };

  const coverImage = previewData?.coverUrl || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="game-over-dialog"
        className="relative w-full max-w-md bg-zinc-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5 overflow-hidden"
      >
        {/* Close icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Zatvori prozor"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Victory / Defeat Header */}
        <div className="text-center space-y-1">
          {isWon ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-extrabold border border-emerald-500/30 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Svaka čast! Pogodio si!
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-extrabold border border-red-500/30 uppercase tracking-wide">
              <X className="w-3.5 h-3.5" />
              Više sreće sledeći put!
            </div>
          )}

          <h2 className="text-xl font-bold text-white">
            {isWon ? 'Pobeda!' : 'Pesma je bila:'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isWon
              ? `Rešeno u ${attempts.length}. pokušaju!`
              : 'Iskoristio si svih 6 pokušaja.'}
          </p>

          {/* Daily streak context badge */}
          {category === 'daily-mix' ? (
            <div className="pt-1 flex items-center justify-center">
              {isWon ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                  <span>Dnevni niz: {userStats?.currentStreak || 1} {userStats?.currentStreak === 1 ? 'dan' : 'dana'}!</span>
                </div>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  Dnevni niz u Dnevnom miksu je prekinut. Igraj sutra u ponoć!
                </span>
              )}
            </div>
          ) : category !== 'practice' ? (
            <div className="pt-1 flex items-center justify-center">
              <span className="text-[11px] text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                Režim: {categoryInfo?.name} • <span className="text-amber-300/80">Dnevni niz važi samo za Dnevni miks</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Song Showcase Card with Vinyl Record & Cover Art */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
          {/* Cover Art or Vinyl Record Icon */}
          <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 shadow-md border border-white/10 bg-zinc-950 flex items-center justify-center">
            {coverImage ? (
              <img
                src={coverImage}
                alt={targetSong.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Disc3 className="w-10 h-10 text-emerald-400 animate-spin-slow" />
            )}
          </div>

          {/* Song Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-bold text-white truncate leading-tight">
              {targetSong.title}
            </h3>
            <p className="text-sm font-medium text-emerald-400 truncate">
              {targetSong.artist}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-zinc-400 font-medium">
              <span>{targetSong.year}</span>
              <span>•</span>
              <span className="capitalize">{targetSong.genre}</span>
              {previewData?.album && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[120px]">{previewData.album}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Full 30s audio player trigger button */}
        <button
          id="btn-play-full-preview"
          onClick={onPlayFullAudio}
          className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 font-semibold text-sm transition-all border ${
            isPlayingFullAudio
              ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
              : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
          }`}
        >
          {isPlayingFullAudio ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pauziraj 30s isečak</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current text-emerald-400" />
              <span>Poslušaj ceo isečak (30s)</span>
            </>
          )}
        </button>

        {/* Share Result Button with Emoji Matrix */}
        <div className="space-y-2">
          <button
            id="btn-share-result"
            onClick={handleShare}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-zinc-950 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Kopirano u privremenu memoriju!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Podeli rezultat (Emoji)</span>
              </>
            )}
          </button>

          {/* Matrix preview preview */}
          <div className="text-center font-mono text-sm tracking-widest text-zinc-400 pt-1">
            {attempts.map((a, i) => (
              <span key={i}>
                {a.status === 'correct' ? '🟩' : a.status === 'skipped' ? '🟧' : '🟥'}
              </span>
            ))}
            {Array.from({ length: 6 - attempts.length }).map((_, i) => (
              <span key={`empty-${i}`}>⬛</span>
            ))}
          </div>
        </div>

        {/* Practice Mode: Next Song button */}
        {category === 'practice' && onNextPracticeSong && (
          <button
            id="btn-next-practice"
            onClick={onNextPracticeSong}
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Sledeća pesma (Nova runda)</span>
          </button>
        )}
      </div>
    </div>
  );
};
