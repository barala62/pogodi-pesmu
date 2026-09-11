import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { AttemptSlots } from './components/AttemptSlots';
import { GameControls } from './components/GameControls';
import { Footer } from './components/Footer';
import { GameOverModal } from './components/GameOverModal';
import { StatsModal } from './components/StatsModal';
import { HelpModal } from './components/HelpModal';
import { CategoryModal } from './components/CategoryModal';

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
} from './data/songs/balkanSongs';

import {
  loadUserStats,
  saveGameResult,
  loadGameState,
  saveGameState,
  getTodayDateStr,
} from './utils/storage';

import { SnippetAudioPlayer } from './utils/audioPlayer';

export default function App() {
  const [todayDateStr, setTodayDateStr] = useState<string>(getTodayDateStr());
  const [category, setCategory] = useState<GameCategory>('daily-mix');
  const [attempts, setAttempts] = useState<GuessAttempt[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [unlockedDuration, setUnlockedDuration] = useState<number>(0.5);

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
      setAttempts([]);
      setIsGameOver(false);
      setIsWon(false);
      setUnlockedDuration(0.5);
      setShowGameOverModal(false);
    }

    // Fetch song preview from backend API
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview/${targetSong.id}`);
        if (!res.ok) throw new Error('Preview fetch failed');
        const data: SongPreviewResponse = await res.json();

        if (!isMounted) return;

        setPreviewData(data);

        // Load into audio player
        if (data.previewUrl || data.directPreviewUrl) {
          audioPlayerRef.current?.loadTrack(data.previewUrl || '', data.directPreviewUrl || '', false, data.startOffset || 0);
        } else {
          audioPlayerRef.current?.loadTrack('', '', true);
        }

        const duration = (savedState?.isGameOver) 
          ? FULL_PREVIEW_DURATION 
          : (savedState?.unlockedSeconds || 0.5);

        audioPlayerRef.current?.setLimitDuration(duration);
        setIsLoadingAudio(false);
      } catch (err) {
        console.warn('Backend preview fetch error, using synth fallback:', err);
        if (!isMounted) return;
        setPreviewData({
          songId: targetSong.id,
          title: targetSong.title,
          artist: targetSong.artist,
          year: targetSong.year,
          genre: targetSong.genre,
          source: 'synth',
        });
        audioPlayerRef.current?.loadTrack('', '', true);
        audioPlayerRef.current?.setLimitDuration(savedState?.unlockedSeconds || 0.5);
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
      setIsGameOver(true);
      setUnlockedDuration(FULL_PREVIEW_DURATION);
      audioPlayerRef.current?.setLimitDuration(FULL_PREVIEW_DURATION);

      // Save stats
      const updatedStats = saveGameResult(true, nextAttempts.length, todayDateStr);
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

        const updatedStats = saveGameResult(false, MAX_ATTEMPTS, todayDateStr);
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

      const updatedStats = saveGameResult(false, MAX_ATTEMPTS, todayDateStr);
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
          setCategory(cat);
          setShowCategoryModal(false);
        }}
        onClose={() => setShowCategoryModal(false)}
      />
    </div>
  );
}
