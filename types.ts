export type Genre = 'ex-yu' | 'narodna' | 'moderno' | 'pop-dance';

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: Genre;
  searchTerms: string[];
  previewQuery?: string;
  album?: string;
  startOffset?: number; // Optional offset in seconds to skip silence or jump to intro
  fallbackMelody?: number[]; // Frequencies for Web Audio fallback synth
}

export type GameCategory = 
  | 'daily-mix'
  | 'moderno'
  | 'ex-yu'
  | 'narodna'
  | 'practice';

export interface CategoryInfo {
  id: GameCategory;
  name: string;
  badge: string;
  description: string;
  genreFilter?: Genre;
  icon: string;
}

export type AttemptStatus = 'correct' | 'incorrect' | 'skipped' | 'empty';

export interface GuessAttempt {
  guessSongId?: string;
  guessTitle?: string;
  guessArtist?: string;
  status: AttemptStatus;
}

export interface GameState {
  category: GameCategory;
  dateStr: string; // YYYY-MM-DD
  targetSongId: string;
  attempts: GuessAttempt[]; // 0 to 6 attempts
  isGameOver: boolean;
  isWon: boolean;
  unlockedSeconds: number; // 0.5, 1, 2, 4, 8, 16, or 30
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string;
  guessDistribution: { [step: number]: number }; // step 1 to 6
}

export interface SongPreviewResponse {
  songId: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: Genre;
  previewUrl?: string;
  directPreviewUrl?: string;
  coverUrl?: string;
  source: 'deezer' | 'itunes' | 'synth';
  synthNotes?: number[];
  startOffset?: number;
}

export const STEP_DURATIONS = [0.5, 1, 2, 4, 8, 16] as const;
export const MAX_ATTEMPTS = 6;
export const FULL_PREVIEW_DURATION = 30;
