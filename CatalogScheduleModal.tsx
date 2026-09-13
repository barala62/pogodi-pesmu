import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Calendar, 
  Music, 
  Play, 
  Square, 
  Search, 
  RefreshCw, 
  Check, 
  Sparkles, 
  Volume2, 
  Loader2, 
  Filter,
  ShieldCheck,
  Lock,
  LogOut,
  Globe2,
  AlertCircle
} from 'lucide-react';
import { GameCategory, Song } from '../types';
import { resetGameStateForCategory } from '../utils/storage';
import { 
  ALL_BALKAN_SONGS, 
  CATEGORIES, 
  getSongsForCategory, 
  getDailySong, 
  setScheduleOverride, 
  clearScheduleOverride, 
  getScheduleOverrides,
  setServerScheduleOverrides,
  syncServerSchedule,
  normalizeText 
} from '../data/songs/balkanSongs';

const ADMIN_SECRET = 'pogodipesmu2026';
const ADMIN_AUTH_KEY = 'balkan_admin_auth_token';

interface CatalogScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleChanged?: (info?: { dateStr: string; category: GameCategory; newSongId?: string }) => void;
}

export const CatalogScheduleModal: React.FC<CatalogScheduleModalProps> = ({
  isOpen,
  onClose,
  onScheduleChanged
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'schedule' | 'catalog'>('schedule');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('daily-mix');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // Overrides state trigger
  const [overridesVersion, setOverridesVersion] = useState(0);

  // Audio preview player state
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Search in catalog
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogGenreFilter, setCatalogGenreFilter] = useState<'all' | 'narodna' | 'ex-yu' | 'moderno' | 'pop-dance'>('all');

  // Change song modal state
  const [changeDateTarget, setChangeDateTarget] = useState<{ dateStr: string; label: string; currentSong: Song } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isSavingServer, setIsSavingServer] = useState(false);

  // Stop audio on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setPlayingSongId(null);
      setIsLoadingAudio(false);
      setStatusMessage(null);
      setAuthError('');
    }
  }, [isOpen]);

  // Handle Login submission
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setIsVerifying(true);

    try {
      // Verify with backend
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() })
      });

      if (res.ok) {
        sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
        setIsAuthenticated(true);
        setPasswordInput('');
        // Sync latest schedule from server
        await syncServerSchedule();
        setOverridesVersion(v => v + 1);
      } else {
        // Fallback local check
        if (passwordInput.trim() === ADMIN_SECRET) {
          sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
          setIsAuthenticated(true);
          setPasswordInput('');
        } else {
          setAuthError('Pogrešna lozinka. Pokušajte ponovo.');
        }
      }
    } catch {
      if (passwordInput.trim() === ADMIN_SECRET) {
        sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError('Pogrešna lozinka. Pokušajte ponovo.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  // Format dates: Today, Tomorrow, and next 6 days
  const upcomingDays = useMemo(() => {
    const days: Array<{ dateStr: string; label: string; isToday: boolean; isTomorrow: boolean; dayName: string }> = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayNames = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
      const dayName = dayNames[d.getDay()];

      let label = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
      if (i === 0) label = 'Danas';
      else if (i === 1) label = 'Sutra';
      else if (i === 2) label = 'Prekosutra';

      days.push({
        dateStr,
        label,
        isToday: i === 0,
        isTomorrow: i === 1,
        dayName
      });
    }

    return days;
  }, []);

  // Get active schedule songs for the selected category
  const scheduleList = useMemo(() => {
    const overrides = getScheduleOverrides();
    void overridesVersion;

    return upcomingDays.map(day => {
      const song = getDailySong(day.dateStr, selectedCategory);
      const isOverridden = Boolean(overrides[`${day.dateStr}:${selectedCategory}`]);
      return {
        ...day,
        song,
        isOverridden
      };
    });
  }, [upcomingDays, selectedCategory, overridesVersion]);

  // Filtered catalog songs
  const filteredCatalog = useMemo(() => {
    let list = ALL_BALKAN_SONGS;
    if (catalogGenreFilter !== 'all') {
      list = list.filter(s => s.genre === catalogGenreFilter);
    }
    const q = normalizeText(catalogSearch);
    if (!q) return list.slice(0, 150);

    return list.filter(s => {
      const titleNorm = normalizeText(s.title);
      const artistNorm = normalizeText(s.artist);
      return titleNorm.includes(q) || artistNorm.includes(q) || `${artistNorm} ${titleNorm}`.includes(q);
    }).slice(0, 150);
  }, [catalogSearch, catalogGenreFilter]);

  // Filtered songs for change picker
  const filteredPickerSongs = useMemo(() => {
    if (!changeDateTarget) return [];
    const songsForCat = getSongsForCategory(selectedCategory);
    const q = normalizeText(pickerSearch);
    if (!q) return songsForCat.slice(0, 100);

    return songsForCat.filter(s => {
      const titleNorm = normalizeText(s.title);
      const artistNorm = normalizeText(s.artist);
      return titleNorm.includes(q) || artistNorm.includes(q) || `${artistNorm} ${titleNorm}`.includes(q);
    }).slice(0, 100);
  }, [changeDateTarget, selectedCategory, pickerSearch]);

  // Audio preview handler
  const handleTogglePlay = async (song: Song) => {
    if (playingSongId === song.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingSongId(null);
      return;
    }

    try {
      setIsLoadingAudio(true);
      setPlayingSongId(song.id);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const res = await fetch(`/api/preview/${encodeURIComponent(song.id)}`);
      if (!res.ok) throw new Error('Preview fetch failed');
      const data = await res.json() as { previewUrl?: string };

      if (!data.previewUrl) {
        throw new Error('No preview url');
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = data.previewUrl;
      audioRef.current.onended = () => {
        setPlayingSongId(null);
      };
      audioRef.current.onerror = () => {
        setPlayingSongId(null);
        setIsLoadingAudio(false);
      };

      await audioRef.current.play();
      setIsLoadingAudio(false);
    } catch (err) {
      console.error('Failed to play preview:', err);
      setIsLoadingAudio(false);
      setPlayingSongId(null);
    }
  };

  // Set override song on server (affects ALL players)
  const handleApplyOverride = async (songId: string) => {
    if (!changeDateTarget) return;
    const targetDateStr = changeDateTarget.dateStr;
    const targetCat = selectedCategory;
    setIsSavingServer(true);
    setStatusMessage(null);

    // Reset all skips and attempts for this date and category immediately
    resetGameStateForCategory(targetCat, targetDateStr);

    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: ADMIN_SECRET,
          dateStr: targetDateStr,
          category: targetCat,
          songId
        })
      });

      if (res.ok) {
        const data = await res.json() as { overrides?: Record<string, string> };
        if (data.overrides) {
          setServerScheduleOverrides(data.overrides);
        }
      }
      // Also update local storage as backup
      setScheduleOverride(targetDateStr, targetCat, songId);
      setOverridesVersion(v => v + 1);
      setChangeDateTarget(null);
      setStatusMessage(`Pesma za ${changeDateTarget.label} je uspešno promenjena! Svi prethodni skipovi su resetovani.`);
      if (onScheduleChanged) onScheduleChanged({ dateStr: targetDateStr, category: targetCat, newSongId: songId });
    } catch (err) {
      console.error('Failed to save to server:', err);
      setScheduleOverride(targetDateStr, targetCat, songId);
      setOverridesVersion(v => v + 1);
      setChangeDateTarget(null);
      setStatusMessage('Sačuvano lokalno. Svi skipovi su resetovani.');
      if (onScheduleChanged) onScheduleChanged({ dateStr: targetDateStr, category: targetCat, newSongId: songId });
    } finally {
      setIsSavingServer(false);
    }
  };

  // Reset override for a day on server
  const handleResetOverride = async (dateStr: string) => {
    const targetCat = selectedCategory;
    setIsSavingServer(true);

    // Reset all skips and attempts for this date and category immediately
    resetGameStateForCategory(targetCat, dateStr);

    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: ADMIN_SECRET,
          dateStr,
          category: targetCat
        })
      });

      if (res.ok) {
        const data = await res.json() as { overrides?: Record<string, string> };
        if (data.overrides) {
          setServerScheduleOverrides(data.overrides);
        }
      }
      clearScheduleOverride(dateStr, targetCat);
      setOverridesVersion(v => v + 1);
      setStatusMessage(`Vraćeno na automatski algoritam. Svi skipovi su resetovani.`);
      if (onScheduleChanged) onScheduleChanged({ dateStr, category: targetCat });
    } catch (err) {
      console.error('Reset failed:', err);
      clearScheduleOverride(dateStr, targetCat);
      setOverridesVersion(v => v + 1);
      if (onScheduleChanged) onScheduleChanged({ dateStr, category: targetCat });
    } finally {
      setIsSavingServer(false);
    }
  };

  // Pick random alternative and push to server
  const handleRandomOverride = async (dateStr: string) => {
    const targetCat = selectedCategory;
    const catSongs = getSongsForCategory(targetCat);
    const rand = catSongs[Math.floor(Math.random() * catSongs.length)];
    if (!rand) return;

    setIsSavingServer(true);

    // Reset all skips and attempts for this date and category immediately
    resetGameStateForCategory(targetCat, dateStr);

    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: ADMIN_SECRET,
          dateStr,
          category: targetCat,
          songId: rand.id
        })
      });
      if (res.ok) {
        const data = await res.json() as { overrides?: Record<string, string> };
        if (data.overrides) {
          setServerScheduleOverrides(data.overrides);
        }
      }
      setScheduleOverride(dateStr, targetCat, rand.id);
      setOverridesVersion(v => v + 1);
      setStatusMessage(`Postavljena nova nasumična pesma (${rand.artist} – ${rand.title}). Svi skipovi su resetovani.`);
      if (onScheduleChanged) onScheduleChanged({ dateStr, category: targetCat, newSongId: rand.id });
    } catch (err) {
      console.error('Random override error:', err);
      setScheduleOverride(dateStr, targetCat, rand.id);
      setOverridesVersion(v => v + 1);
      if (onScheduleChanged) onScheduleChanged({ dateStr, category: targetCat, newSongId: rand.id });
    } finally {
      setIsSavingServer(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* LOGIN SCREEN: IF NOT AUTHENTICATED */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h2 className="text-xl font-extrabold text-white">
                Urednički Pristup (Admin)
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Ovaj panel je zaštićen i namenjen je za uređivanje rasporeda pesama za sve posetioce sajta. Unesi šifru za pristup.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Unesite šifru..."
                  autoFocus
                  className="w-full bg-zinc-950 border border-white/15 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner text-center font-mono"
                />
              </div>

              {authError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !passwordInput.trim()}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Prijavi se</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-[11px] text-zinc-500 pt-2 border-t border-white/5 w-full max-w-sm">
              Link za pristup: <code className="text-emerald-400">/admin</code> ili <code className="text-emerald-400">?admin=true</code>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN PANEL */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-zinc-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Globe2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                      Urednički Panel
                    </h2>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ZVANIČNO ZA SVE IGRAČE
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Baza: {ALL_BALKAN_SONGS.length} pesama • Izmene se odmah primenjuju na serveru
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center gap-1"
                  title="Odjavi se sa admin naloga"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Odjava</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Zatvori"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center border-b border-white/10 px-4 sm:px-6 bg-zinc-950/40 gap-2">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'schedule'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Raspored dana & Sutrašnja pesma</span>
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                className={`py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === 'catalog'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Preslušavanje baze ({ALL_BALKAN_SONGS.length})</span>
              </button>
            </div>

            {/* Global Status Toast Notification */}
            {statusMessage && (
              <div className="bg-emerald-950/60 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
                <button
                  onClick={() => setStatusMessage(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* TAB 1: SCHEDULE */}
            {activeTab === 'schedule' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                
                {/* Category selection */}
                <div className="flex flex-wrap items-center gap-1.5 pb-2">
                  <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mr-1">
                    <Filter className="w-3.5 h-3.5 text-emerald-400" />
                    Kategorija:
                  </span>
                  {CATEGORIES.filter(c => c.id !== 'practice').map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/5'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Day cards */}
                <div className="space-y-2.5">
                  {scheduleList.map(item => {
                    const isPlayingThis = playingSongId === item.song.id;

                    return (
                      <div
                        key={item.dateStr}
                        className={`p-3.5 rounded-xl border transition-all ${
                          item.isTomorrow
                            ? 'bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                            : item.isToday
                            ? 'bg-zinc-800/60 border-white/15'
                            : 'bg-zinc-900/60 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          {/* Left: Day & Song Info */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            {/* Play button */}
                            <button
                              onClick={() => handleTogglePlay(item.song)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                isPlayingThis
                                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 animate-pulse'
                                  : 'bg-white/10 hover:bg-emerald-500/20 text-zinc-200 hover:text-emerald-300 border border-white/10'
                              }`}
                              title="Preslušaj zvanični uzorak pesme"
                              aria-label="Preslušaj"
                            >
                              {isLoadingAudio && isPlayingThis ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : isPlayingThis ? (
                                <Square className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="text-xs font-bold text-zinc-400">
                                  {item.dayName}, {item.dateStr}
                                </span>
                                {item.isToday && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                    DANAS U IGRI
                                  </span>
                                )}
                                {item.isTomorrow && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> SUTRAŠNJA PESMA
                                  </span>
                                )}
                                {item.isOverridden && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Server Override
                                  </span>
                                )}
                              </div>

                              <div className="truncate font-bold text-sm sm:text-base text-white">
                                {item.song.artist} – {item.song.title}
                              </div>
                              <div className="text-xs text-zinc-400">
                                Godina: {item.song.year} • Žanr: {item.song.genre}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => setChangeDateTarget({
                                dateStr: item.dateStr,
                                label: `${item.label} (${item.dateStr})`,
                                currentSong: item.song
                              })}
                              disabled={isSavingServer}
                              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500 rounded-lg text-xs font-semibold transition-all shadow-sm"
                              title="Izaberi drugu pesmu iz baze za sve igrače"
                            >
                              Promeni pesmu
                            </button>

                            <button
                              onClick={() => handleRandomOverride(item.dateStr)}
                              disabled={isSavingServer}
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs transition-all"
                              title="Nasumična druga pesma sa servera"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>

                            {item.isOverridden && (
                              <button
                                onClick={() => handleResetOverride(item.dateStr)}
                                disabled={isSavingServer}
                                className="px-2 py-1 text-[10px] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                title="Vrati na originalni automatski raspored"
                              >
                                Poništi
                              </button>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {/* TAB 2: FULL CATALOG PREVIEW */}
            {activeTab === 'catalog' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col space-y-3 min-h-0">
                
                {/* Search & Genre filters */}
                <div className="space-y-2 shrink-0">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Pretraži pesmu ili izvođača (npr. Ceca, Bijelo Dugme, Voyage, Toma...)"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: `Sve (${ALL_BALKAN_SONGS.length})` },
                      { id: 'narodna', label: 'Narodna & Kafanska' },
                      { id: 'ex-yu', label: 'Ex-Yu Klasika' },
                      { id: 'moderno', label: 'Moderno & Trap' },
                      { id: 'pop-dance', label: 'Pop & Dance' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setCatalogGenreFilter(tab.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          catalogGenreFilter === tab.id
                            ? 'bg-emerald-500 text-black font-bold'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Song list */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
                  {filteredCatalog.map((song) => {
                    const isPlayingThis = playingSongId === song.id;

                    return (
                      <div
                        key={song.id}
                        className="pt-1.5 pb-1.5 flex items-center justify-between gap-2 hover:bg-white/5 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleTogglePlay(song)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              isPlayingThis
                                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                                : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white'
                            }`}
                            title="Preslušaj uzorak pesme"
                          >
                            {isLoadingAudio && isPlayingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isPlayingThis ? (
                              <Square className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="truncate text-xs sm:text-sm font-semibold text-white">
                              {song.artist} – {song.title}
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                              <span>{song.year}</span>
                              <span>•</span>
                              <span className="capitalize">{song.genre}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono">
                            30s sample
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] text-zinc-500 text-center pt-2 border-t border-white/5">
                  Prikazano {filteredCatalog.length} od ukupno {ALL_BALKAN_SONGS.length} pesama. Svi semplovi su legalni zvanični Deezer / Apple Music CDN fajlovi.
                </div>

              </div>
            )}

            {/* Change Song Modal Overlay */}
            {changeDateTarget && (
              <div className="absolute inset-0 bg-black/90 z-20 flex flex-col p-4 sm:p-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Izaberi novu pesmu za: {changeDateTarget.label}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Trenutna pesma: <span className="text-emerald-400 font-medium">{changeDateTarget.currentSong.artist} – {changeDateTarget.currentSong.title}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setChangeDateTarget(null)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Pretraži pesmu koju želiš da postaviš za sve..."
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1 divide-y divide-white/5">
                  {filteredPickerSongs.map(song => (
                    <div
                      key={song.id}
                      className="py-2 px-2.5 flex items-center justify-between gap-3 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {song.artist} – {song.title}
                        </div>
                        <div className="text-xs text-zinc-400">
                          {song.year} • {song.genre}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTogglePlay(song)}
                          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded"
                          title="Preslušaj sample pre izbora"
                        >
                          {playingSongId === song.id ? (
                            <Square className="w-4 h-4 text-emerald-400 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleApplyOverride(song.id)}
                          disabled={isSavingServer}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                        >
                          {isSavingServer ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Postavi za sve</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setChangeDateTarget(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold rounded-lg"
                  >
                    Otkaži
                  </button>
                </div>
              </div>
            )}

          </>
        )}

      </div>
    </div>
  );
};
