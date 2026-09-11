import { Song, GameCategory, CategoryInfo } from '../../types';
import { MODERNO_SONGS } from './modernoSongs';
import { NARODNA_SONGS } from './narodnaSongs';
import { EXYU_SONGS } from './exyuSongs';
import { POP_DANCE_SONGS } from './popDanceSongs';

export const ALL_BALKAN_SONGS: Song[] = [
  ...MODERNO_SONGS,
  ...NARODNA_SONGS,
  ...EXYU_SONGS,
  ...POP_DANCE_SONGS
];

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'daily-mix',
    name: 'Dnevni Miks',
    badge: 'Glavni Izazov ⭐',
    description: 'Zvanična pesma dana iz celokupne riznice balkanskih hitova. Za sve generacije!',
    icon: 'Disc3'
  },
  {
    id: 'moderno',
    name: 'Moderni Hitovi & Trap',
    badge: 'Trending 🔥',
    description: 'Vreli zvuk današnjice: Voyage, Nucci, Prija, Tea Tairović, Jala & Buba, Desingerica...',
    genreFilter: 'moderno',
    icon: 'Flame'
  },
  {
    id: 'ex-yu',
    name: 'Ex-Yu Klasika',
    badge: 'Pop & Rok 🎸',
    description: 'Večni gitarski i pop klasici: Bijelo Dugme, Zdravko Čolić, Bajaga, EKV, Parni Valjak...',
    genreFilter: 'ex-yu',
    icon: 'Music2'
  },
  {
    id: 'narodna',
    name: 'Narodna & Kafanska',
    badge: 'Merak & Duša 🍷',
    description: 'Pesme za dušu i lomljenje čaša: Toma, Šaban, Haris, Halid, Miroslav, Aca Lukas...',
    genreFilter: 'narodna',
    icon: 'Wine'
  },
  {
    id: 'practice',
    name: 'Slobodna Vežba',
    badge: 'Beskonačno ♾️',
    description: 'Igraj koliko god želiš! Svaki put te čeka novi nasumični hit za vežbanje sluha.',
    icon: 'Shuffle'
  }
];

// Simple deterministic string hash (djb2-like)
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get songs filtered for category
export function getSongsForCategory(category: GameCategory): Song[] {
  if (category === 'moderno') {
    return ALL_BALKAN_SONGS.filter(s => s.genre === 'moderno');
  }
  if (category === 'ex-yu') {
    return ALL_BALKAN_SONGS.filter(s => s.genre === 'ex-yu');
  }
  if (category === 'narodna') {
    return ALL_BALKAN_SONGS.filter(s => s.genre === 'narodna');
  }
  // daily-mix and practice use the full catalog
  return ALL_BALKAN_SONGS;
}

// Deterministic daily song selection based on category and date string (YYYY-MM-DD)
export function getDailySong(dateStr: string, category: GameCategory): Song {
  const songs = getSongsForCategory(category);
  if (!songs.length) return ALL_BALKAN_SONGS[0];
  
  const seedString = `${dateStr}-${category}-balkan-heardle-seed-v1`;
  const hash = hashString(seedString);
  const index = hash % songs.length;
  return songs[index];
}

// Random song for practice mode
export function getRandomSong(category: GameCategory = 'practice'): Song {
  const songs = getSongsForCategory(category);
  const index = Math.floor(Math.random() * songs.length);
  return songs[index];
}

// Helper to normalize Latin diacritics for flexible fuzzy searching
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/đ/g, 'dj')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Search autocomplete
export function searchSongs(query: string, maxResults = 8): Song[] {
  const q = normalizeText(query);
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = ALL_BALKAN_SONGS.map(song => {
    const titleNorm = normalizeText(song.title);
    const artistNorm = normalizeText(song.artist);
    const fullNorm = `${artistNorm} ${titleNorm} ${titleNorm} ${artistNorm}`;
    
    // Check search terms
    const termsNorm = song.searchTerms.map(t => normalizeText(t)).join(' ');

    let score = 0;

    // Exact title start match
    if (titleNorm.startsWith(q)) score += 100;
    // Exact artist start match
    else if (artistNorm.startsWith(q)) score += 90;
    // Title includes
    else if (titleNorm.includes(q)) score += 60;
    // Artist includes
    else if (artistNorm.includes(q)) score += 50;
    // Search terms include
    else if (termsNorm.includes(q)) score += 40;

    // Token matching
    const allTokensMatch = tokens.every(token => 
      fullNorm.includes(token) || termsNorm.includes(token)
    );

    if (allTokensMatch) {
      score += 30;
    }

    return { song, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.song);
}
