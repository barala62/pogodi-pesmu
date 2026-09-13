import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { AttemptSlots } from './components/AttemptSlots';
import { GameControls } from './components/GameControls';
import { Footer } from './components/Footer';
import { GameOverModal } from './components/GameOverModal';
import { StatsModal } from './components/StatsModal';
import { HelpModal } from './components/HelpModal';
import { CategoryModal } from './components/CategoryModal';
import { CatalogScheduleModal } from './components/CatalogScheduleModal';
import { PracticeAuthModal } from './components/PracticeAuthModal';

import {
  Song,
  GameCategory,
  GuessAttempt,
  STEP_DURATIONS,
  MAX_ATTEMPTS,
  FULL_PREVIEW_DURATION,
  SongPreviewResponse,
  UserStats,
} from './types';

import {
  getDailySong,
  getRandomSong,
  CATEGORIES,
  syncServerSchedule,
} from './data/songs/balkanSongs';

import {
  loadUserStats,
  saveGameResult,
  loadGameState,
  saveGameState,
  resetGameStateForCategory,
  getTodayDateStr,
} from './utils/storage';

import { SnippetAudioPlayer } from './utils/audioPlayer';
import Confetti from 'react-confetti';

export default function App() {
  const [todayDateStr, setTodayDateStr] = useState<string>(getTodayDateStr());
  const [category, setCategory] = useState<GameCategory>('daily-mix');
  const [attempts, setAttempts] = useState<GuessAttempt[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  const [unlockedDuration, setUnlockedDuration] = useState<number>(0.5);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(true);
  const [previewData, setPreviewData] = useState<SongPreviewResponse | null>(null);

  // Modals state
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showGameOverModal, setShowGameOverModal] = useState<boolean>(false);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showPracticeAuthModal, setShowPracticeAuthModal] = useState<boolean>(false);
  const [isPracticeUnlocked, setIsPracticeUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('balkan_practice_unlocked') === 'true';
    }
    return false;
  });

  // User Stats
  const [userStats, setUserStats] = useState<UserStats>(() => loadUserStats());

  // Practice round counter to trigger fresh song
  const [practiceRound, setPracticeRound] = useState<number>(1);

  // Snippet Audio Player ref
  const audioPlayerRef = useRef<SnippetAudioPlayer | null>(null);

  // Target song calculation
  const targetSong = useMemo<Song>(() => {
    if (category === 'practice') {
      return getRandomSong('practice');
    }
    return getDailySong(todayDateStr, category);
  }, [category, todayDateStr, practiceRound]);

  // Initialize audio player
  useEffect(() => {
    const player = new SnippetAudioPlayer();
    audioPlayerRef.current = player;

    player.setCallbacks(
      (time) => {
        setCurrentTime(time);
      },
      (playing) => {
        setIsPlaying(playing);
      },
      () => {
        setIsPlaying(false);
      }
    );

    return () => {
      player.destroy();
    };
  }, []);

  // Sync server schedule on mount and check admin access URL
  useEffect(() => {
    let lastOverridesJson = '';

    const checkServerSchedule = async () => {
      const overrides = await syncServerSchedule();
      const currentJson = JSON.stringify(overrides || {});
      if (lastOverridesJson !== '' && currentJson !== lastOverridesJson) {
        // Admin changed schedule on server: trigger target song refresh & skip reset
        setPracticeRound(r => r + 1);
      }
      lastOverridesJson = currentJson;
    };

    // 1. Initial sync
    checkServerSchedule();

    // Periodic check every 15s or when window/tab is focused
    const interval = setInterval(checkServerSchedule, 15000);
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkServerSchedule();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    // 2. Check if admin or training link was used (/admin, /trening, etc.)
    if (typeof window !== 'undefined') {
      const url = window.location.pathname + window.location.search + window.location.hash;
      if (url.toLowerCase().includes('admin')) {
        setShowCatalogModal(true);
      }
      if (url.toLowerCase().includes('trening') || url.toLowerCase().includes('practice')) {
        const unlocked = sessionStorage.getItem('balkan_practice_unlocked') === 'true';
        if (unlocked) {
          setCategory('practice');
        } else {
          setShowPracticeAuthModal(true);
        }
      }
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, []);

  // Check midnight rollover periodically
  useEffect(() => {
    const timer = setInterval(() => {
      const nowStr = getTodayDateStr();
      if (nowStr !== todayDateStr) {
        setTodayDateStr(nowStr);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [todayDateStr]);

  // Load game state & fetch audio preview for target song
  useEffect(() => {
    if (!targetSong) return;

    let isMounted = true;
    setIsLoadingAudio(true);
    setCurrentTime(0);
    setIsPlaying(false);
    audioPlayerRef.current?.stop();

    // Check if saved state exists
    const savedState = category !== 'practice' 
      ? loadGameState(category, todayDateStr)
      : null;

    if (savedState && savedState.targetSongId === targetSong.id) {
      setAttempts(savedState.attempts);
      setIsGameOver(savedState.isGameOver);
      setIsWon(savedState.isWon);
      setUnlockedDuration(savedState.unlockedSeconds);
      if (savedState.isGameOver) {
        setShowGameOverModal(true);
      }
    } else {
      // Song changed in admin settings or no saved state: wipe any old skips and reset to 0
      if (savedState && savedState.targetSongId !== targetSong.id && category !== 'practice') {
        resetGameStateForCategory(category, todayDateStr);
      }
      setAttempts([]);
      setIsGameOver(false);
      setIsWon(false);
      setUnlockedDuration(0.5);
      setShowGameOverModal(false);
      setCurrentTime(0);
      audioPlayerRef.current?.stop();
      audioPlayerRef.current?.setLimitDuration(0.5);
    }

    // Fetch song preview from backend API with automatic retry and client iTunes fallback
    const fetchPreview = async () => {
      let resolvedData: SongPreviewResponse | null = null;

      try {
        const res = await fetch(`/api/preview/${targetSong.id}`);
        if (res.ok) {
          resolvedData = await res.json();
        }
      } catch (err) {
        console.warn('First preview fetch attempt failed, retrying...', err);
        // Short pause and retry once
        try {
          await new Promise(r => setTimeout(r, 400));
          const retryRes = await fetch(`/api/preview/${targetSong.id}`);
          if (retryRes.ok) {
            resolvedData = await retryRes.json();
          }
        } catch {
          // Will fall back below
        }
      }

      if (!isMounted) return;

      // If backend preview was found
      if (resolvedData && (resolvedData.previewUrl || resolvedData.directPreviewUrl)) {
        setPreviewData(resolvedData);
        await audioPlayerRef.current?.loadTrack(
          resolvedData.previewUrl || '',
          resolvedData.directPreviewUrl || '',
          false,
          resolvedData.startOffset || 0,
          targetSong.id
        );
      } else {
        // Fallback: search iTunes directly on client to guarantee audible music
        try {
          const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(targetSong.artist + ' ' + targetSong.title)}&entity=song&limit=1`
          );
          const itunesData = await itunesRes.json();
          const firstResult = itunesData.results?.[0];
          if (firstResult?.previewUrl) {
            const clientPreview: SongPreviewResponse = {
              songId: targetSong.id,
              title: targetSong.title,
              artist: targetSong.artist,
              year: targetSong.year,
              genre: targetSong.genre,
              album: firstResult.collectionName || targetSong.album,
              coverUrl: firstResult.artworkUrl100 || '',
              previewUrl: firstResult.previewUrl,
              directPreviewUrl: firstResult.previewUrl,
              source: 'itunes',
              startOffset: targetSong.startOffset || 0,
            };
            setPreviewData(clientPreview);
            await audioPlayerRef.current?.loadTrack(
              firstResult.previewUrl,
              firstResult.previewUrl,
              false,
              targetSong.startOffset || 0,
              targetSong.id
            );
          } else {
            // Only if song is nowhere online do we use synth
            await audioPlayerRef.current?.loadTrack('', '', true, 0, targetSong.id);
          }
        } catch (clientErr) {
          console.warn('Client iTunes preview fallback failed:', clientErr);
          await audioPlayerRef.current?.loadTrack('', '', true, 0, targetSong.id);
        }
      }

      const duration = (savedState?.isGameOver) 
        ? FULL_PREVIEW_DURATION 
        : (savedState?.unlockedSeconds || 0.5);

      audioPlayerRef.current?.setLimitDuration(duration);
      if (isMounted) {
        setIsLoadingAudio(false);
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [targetSong.id, category, todayDateStr]);

  // Persist state
  const persistCurrentState = (
    nextAttempts: GuessAttempt[],
    gameOver: boolean,
    won: boolean,
    duration: number
  ) => {
    if (category !== 'practice') {
      saveGameState({
        category,
        dateStr: todayDateStr,
        targetSongId: targetSong.id,
        attempts: nextAttempts,
        isGameOver: gameOver,
        isWon: won,
        unlockedSeconds: duration,
      });
    }
  };

  // Guess submission
  const handleMakeGuess = (guessedSong: Song) => {
    if (isGameOver || attempts.length >= MAX_ATTEMPTS) return;

    const isCorrect = guessedSong.id === targetSong.id;
    const nextAttempt: GuessAttempt = {
      guessSongId: guessedSong.id,
      guessTitle: guessedSong.title,
      guessArtist: guessedSong.artist,
      status: isCorrect ? 'correct' : 'incorrect',
    };

    const nextAttempts = [...attempts, nextAttempt];
    setAttempts(nextAttempts);

    if (isCorrect) {
      // Won!
      audioPlayerRef.current?.playEffect('correct');
      setIsWon(true);
      setShowConfetti(true);
      setIsGameOver(true);
      setUnlockedDuration(FULL_PREVIEW_DURATION);
      audioPlayerRef.current?.setLimitDuration(FULL_PREVIEW_DURATION);

      // Save stats (streak is tied strictly to daily-mix)
      const updatedStats = saveGameResult(true, nextAttempts.length, todayDateStr, category);
      setUserStats(updatedStats);
      persistCurrentState(nextAttempts, true, true, FULL_PREVIEW_DURATION);

      // Automatically play 30 seconds of the song when guessed correctly!
      setTimeout(() => {
        audioPlayerRef.current?.play(true);
      }, 350);

      // Open Victory dialog
      setTimeout(() => {
        setShowGameOverModal(true);
      }, 700);
    } else {
      // Incorrect
      audioPlayerRef.current?.playEffect('wrong');

      if (nextAttempts.length >= MAX_ATTEMPTS) {
        // Lost (all 6 attempts used)
        setIsWon(false);
        setIsGameOver(true);
        setUnlockedDuration(FULL_PREVIEW_DURATION);
        audioPlayerRef.current?.setLimitDuration(FULL_PREVIEW_DURATION);

        const updatedStats = saveGameResult(false, MAX_ATTEMPTS, todayDateStr, category);
        setUserStats(updatedStats);
        persistCurrentState(nextAttempts, true, false, FULL_PREVIEW_DURATION);

        setTimeout(() => {
          setShowGameOverModal(true);
        }, 600);
      } else {
        // Unlock next step
        const nextDuration = STEP_DURATIONS[nextAttempts.length] || 16;
        setUnlockedDuration(nextDuration);
        audioPlayerRef.current?.setLimitDuration(nextDuration);
        persistCurrentState(nextAttempts, false, false, nextDuration);

        // Auto-play newly extended clip
        setTimeout(() => {
          audioPlayerRef.current?.play(true);
        }, 300);
      }
    }
  };

  // Skip attempt
  const handleSkip = () => {
    if (isGameOver || attempts.length >= MAX_ATTEMPTS) return;

    audioPlayerRef.current?.playEffect('skip');

    const nextAttempt: GuessAttempt = {
      status: 'skipped',
    };

    const nextAttempts = [...attempts, nextAttempt];
    setAttempts(nextAttempts);

    if (nextAttempts.length >= MAX_ATTEMPTS) {
      // Lost after 6 skips
      setIsWon(false);
      setIsGameOver(true);
      setUnlockedDuration(FULL_PREVIEW_DURATION);
      audioPlayerRef.current?.setLimitDuration(FULL_PREVIEW_DURATION);

      const updatedStats = saveGameResult(false, MAX_ATTEMPTS, todayDateStr, category);
      setUserStats(updatedStats);
      persistCurrentState(nextAttempts, true, false, FULL_PREVIEW_DURATION);

      setTimeout(() => {
        setShowGameOverModal(true);
      }, 600);
    } else {
      // Unlock next step
      const nextDuration = STEP_DURATIONS[nextAttempts.length] || 16;
      setUnlockedDuration(nextDuration);
      audioPlayerRef.current?.setLimitDuration(nextDuration);
      persistCurrentState(nextAttempts, false, false, nextDuration);

      // Auto-play newly extended snippet
      setTimeout(() => {
        audioPlayerRef.current?.play(true);
      }, 300);
    }
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play(false);
    }
  };

  // Rewind
  const handleRestart = () => {
    audioPlayerRef.current?.stop();
    audioPlayerRef.current?.play(true);
  };

  // Play full 30s in game over modal
  const handlePlayFullAudio = () => {
    if (!audioPlayerRef.current) return;
    audioPlayerRef.current.setLimitDuration(FULL_PREVIEW_DURATION);
    if (isPlaying) {
      audioPlayerRef.current.pause();
    } else {
      audioPlayerRef.current.play(false);
    }
  };

  // Next Practice Song
  const handleNextPracticeSong = () => {
    setShowGameOverModal(false);
    setPracticeRound((r) => r + 1);
  };

  const currentCategoryInfo = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  return (
    <div className="min-h-screen bg-[#0d1117] text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-white">
      {/* App Header */}
      <Header
        currentCategory={category}
        isPlaying={isPlaying}
        currentStreak={userStats.currentStreak}
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenCategory={() => setShowCategoryModal(true)}
        onOpenStats={() => setShowStatsModal(true)}
      />

      {/* Main Game Arena */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between space-y-4 sm:space-y-6">
        
        {/* Category Banner pill */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400">Režim:</span>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <span>{currentCategoryInfo.name}</span>
              <span className="text-[10px] opacity-75 font-normal">({currentCategoryInfo.badge})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-zinc-500">
            Pokušaj {Math.min(attempts.length + 1, 6)} / 6
          </div>
        </div>

        {/* 6 Attempt Slots */}
        <div className="w-full">
          <AttemptSlots attempts={attempts} isGameOver={isGameOver} />
        </div>

        {/* Unified Game Controls: Progress Bar, Play/Pause + Skip, Search & Confirm */}
        <GameControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          unlockedDuration={unlockedDuration}
          previewData={previewData}
          isLoadingAudio={isLoadingAudio}
          attempts={attempts}
          isGameOver={isGameOver}
          onTogglePlay={handleTogglePlay}
          onRestart={handleRestart}
          onMakeGuess={handleMakeGuess}
          onSkip={handleSkip}
          onShowResults={() => setShowGameOverModal(true)}
          onNextPracticeSong={handleNextPracticeSong}
          isPracticeMode={category === 'practice'}
        />
      </main>

      {/* App Footer */}
      <Footer
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenCategory={() => setShowCategoryModal(true)}
        onAdminTrigger={() => setShowCatalogModal(true)}
        onPracticeTrigger={() => {
          if (isPracticeUnlocked) {
            setCategory('practice');
          } else {
            setShowPracticeAuthModal(true);
          }
        }}
      />

      {/* Modals */}
      <GameOverModal
        isOpen={showGameOverModal}
        isWon={isWon}
        attempts={attempts}
        targetSong={targetSong}
        previewData={previewData}
        isPlayingFullAudio={isPlaying && unlockedDuration >= FULL_PREVIEW_DURATION}
        category={category}
        dateStr={todayDateStr}
        userStats={userStats}
        onPlayFullAudio={handlePlayFullAudio}
        onNextPracticeSong={handleNextPracticeSong}
        onClose={() => setShowGameOverModal(false)}
      />

      <StatsModal
        isOpen={showStatsModal}
        stats={userStats}
        onClose={() => setShowStatsModal(false)}
      />

      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      <CategoryModal
        isOpen={showCategoryModal}
        currentCategory={category}
        todayDateStr={todayDateStr}
        onSelectCategory={(cat) => {
          setShowConfetti(false);
          setCategory(cat);
          setShowCategoryModal(false);
        }}
        onClose={() => setShowCategoryModal(false)}
      />

      <CatalogScheduleModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onScheduleChanged={(info) => {
          // If schedule was updated in admin settings, reset all skips and attempts immediately
          if (info) {
            resetGameStateForCategory(info.category, info.dateStr);
            if (info.dateStr === todayDateStr && (info.category === category || category === 'daily-mix')) {
              setAttempts([]);
              setIsGameOver(false);
              setIsWon(false);
              setUnlockedDuration(0.5);
              setShowGameOverModal(false);
              setCurrentTime(0);
              audioPlayerRef.current?.stop();
              audioPlayerRef.current?.setLimitDuration(0.5);
            }
          }
          setPracticeRound(r => r + 1);
        }}
      />

      <PracticeAuthModal
        isOpen={showPracticeAuthModal}
        isUnlocked={isPracticeUnlocked}
        onSuccess={() => {
          setIsPracticeUnlocked(true);
          setCategory('practice');
        }}
        onLock={() => {
          setIsPracticeUnlocked(false);
          if (category === 'practice') {
            setCategory('daily-mix');
          }
        }}
        onClose={() => setShowPracticeAuthModal(false)}
      />

      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={400}
          gravity={0.18}
          initialVelocityY={15}
          onConfettiComplete={() => setShowConfetti(false)}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 99999, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}
