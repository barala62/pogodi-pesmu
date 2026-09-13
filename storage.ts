import { UserStats, GameState, GameCategory } from '../types';

const STATS_STORAGE_KEY = 'balkan_heardle_user_stats_v1';
const STATE_PREFIX = 'balkan_heardle_gamestate_v1';

export const DEFAULT_STATS: UserStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: '',
  guessDistribution: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0
  }
};

export function loadUserStats(todayDateStr?: string): UserStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    const today = todayDateStr || getTodayDateStr();
    
    let currentStreak = parsed.currentStreak || 0;
    const lastPlayedDate = parsed.lastPlayedDate || '';

    // If last played was 2 or more days ago, current streak is broken
    if (lastPlayedDate && currentStreak > 0 && lastPlayedDate !== today && !isYesterday(lastPlayedDate, today)) {
      currentStreak = 0;
    }

    return {
      gamesPlayed: parsed.gamesPlayed || 0,
      gamesWon: parsed.gamesWon || 0,
      currentStreak,
      maxStreak: parsed.maxStreak || 0,
      lastPlayedDate,
      guessDistribution: {
        1: parsed.guessDistribution?.[1] || 0,
        2: parsed.guessDistribution?.[2] || 0,
        3: parsed.guessDistribution?.[3] || 0,
        4: parsed.guessDistribution?.[4] || 0,
        5: parsed.guessDistribution?.[5] || 0,
        6: parsed.guessDistribution?.[6] || 0
      }
    };
  } catch (e) {
    console.error('Failed to load user stats from localStorage:', e);
    return { ...DEFAULT_STATS };
  }
}

export function saveGameResult(
  isWon: boolean, 
  guessStep: number, 
  dateStr: string,
  category: GameCategory = 'daily-mix'
): UserStats {
  const current = loadUserStats(dateStr);
  const next: UserStats = { ...current };

  // Practice mode does not alter user stats or streaks
  if (category === 'practice') {
    return current;
  }

  next.gamesPlayed += 1;

  if (isWon) {
    next.gamesWon += 1;
    // Step distribution
    if (guessStep >= 1 && guessStep <= 6) {
      next.guessDistribution[guessStep] = (next.guessDistribution[guessStep] || 0) + 1;
    }
  }

  // WIN STREAK: Tied ONLY to 'daily-mix'
  if (category === 'daily-mix') {
    if (isWon) {
      // If already recorded today, keep current streak
      if (current.lastPlayedDate === dateStr) {
        // Already won today, streak is maintained
      } else {
        const isConsecutive = isYesterday(current.lastPlayedDate, dateStr);
        if (isConsecutive) {
          next.currentStreak += 1;
        } else {
          next.currentStreak = 1;
        }
        if (next.currentStreak > next.maxStreak) {
          next.maxStreak = next.currentStreak;
        }
      }
    } else {
      // Lost daily-mix -> streak resets to 0
      next.currentStreak = 0;
    }
    next.lastPlayedDate = dateStr;
  }
  // Other categories (narodna, ex-yu, moderno, pop-dance) DO NOT alter currentStreak, maxStreak, or lastPlayedDate!

  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to save user stats:', e);
  }

  return next;
}

export function saveGameState(state: GameState): void {
  try {
    const key = `${STATE_PREFIX}_${state.category}_${state.dateStr}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

export function resetGameStateForCategory(category: GameCategory, dateStr: string): void {
  try {
    const key = `${STATE_PREFIX}_${category}_${dateStr}`;
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to reset game state for category:', e);
  }
}

export function loadGameState(category: GameCategory, dateStr: string): GameState | null {
  try {
    const key = `${STATE_PREFIX}_${category}_${dateStr}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load game state:', e);
    return null;
  }
}

export function clearPracticeGameState(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(`${STATE_PREFIX}_practice_`)) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.error('Failed to clear practice state:', e);
  }
}

function isYesterday(prevDateStr: string, currentDateStr: string): boolean {
  if (!prevDateStr) return false;
  const prev = new Date(prevDateStr);
  const curr = new Date(currentDateStr);
  const diffTime = curr.getTime() - prev.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
  return diffDays === 1;
}

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate day number since base launch (e.g. Sept 1, 2024 or today)
export function getDayNumber(dateStr: string): number {
  const base = new Date('2024-01-01').getTime();
  const current = new Date(dateStr).getTime();
  const diff = Math.floor((current - base) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}
