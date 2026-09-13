import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock, KeyRound, Sparkles, Check, Dumbbell, ArrowRight, ShieldAlert } from 'lucide-react';

interface PracticeAuthModalProps {
  isOpen: boolean;
  isUnlocked: boolean;
  onSuccess: () => void;
  onLock: () => void;
  onClose: () => void;
}

export const PracticeAuthModal: React.FC<PracticeAuthModalProps> = ({
  isOpen,
  isUnlocked,
  onSuccess,
  onLock,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowSuccessToast(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Unesite šifru za trening.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check via server endpoint first
      const res = await fetch('/api/practice/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      if (res.ok) {
        sessionStorage.setItem('balkan_practice_unlocked', 'true');
        setShowSuccessToast(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        // Fallback local check
        if (password.trim() === 'trening2026') {
          sessionStorage.setItem('balkan_practice_unlocked', 'true');
          setShowSuccessToast(true);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 600);
        } else {
          setError('Pogrešna šifra za Trening. Pokušajte ponovo.');
        }
      }
    } catch {
      // Offline / network fallback
      if (password.trim() === 'trening2026') {
        sessionStorage.setItem('balkan_practice_unlocked', 'true');
        setShowSuccessToast(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        setError('Pogrešna šifra za Trening. Pokušajte ponovo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectLaunch = () => {
    onSuccess();
    onClose();
  };

  const handleRelock = () => {
    sessionStorage.removeItem('balkan_practice_unlocked');
    onLock();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="practice-auth-dialog"
        className="relative w-full max-w-md bg-zinc-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-5 overflow-hidden"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors z-10"
          aria-label="Zatvori"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-emerald-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/10">
            {isUnlocked ? <Unlock className="w-7 h-7 text-emerald-400" /> : <Dumbbell className="w-7 h-7 text-purple-400" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <span>Skriveni Trening Režim</span>
              {isUnlocked && (
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Otključano 🔓
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Neograničeno vežbanje i pogađanje svih pesama iz baze bez ikakvih dnevnih limita.
            </p>
          </div>
        </div>

        {/* Form or Unlocked State */}
        {isUnlocked ? (
          <div className="space-y-4 pt-2">
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-emerald-200">Pristup je već odobren</div>
                <div className="text-emerald-400/80 mt-0.5">
                  Možeš slobodno igrati beskonačne nasumične runde.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleDirectLaunch}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Pokreni Trening Sada</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleRelock}
                className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Ponovo zaključaj trening</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                <span>Šifra za pristup:</span>
              </label>

              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Unesite šifru za trening..."
                  autoFocus
                  disabled={isLoading || showSuccessToast}
                  className="w-full px-3.5 py-2.5 bg-zinc-800/90 border border-white/15 focus:border-purple-500 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {error && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {showSuccessToast && (
                <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Šifra je tačna! Otključavam Trening...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-medium text-xs transition-colors"
              >
                Otkaži
              </button>

              <button
                type="submit"
                disabled={isLoading || showSuccessToast}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <span>Provera...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Otključaj</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer info about direct URL access */}
        <div className="pt-2 border-t border-white/10 text-center space-y-1">
          <p className="text-[11px] text-zinc-400">
            Direktan link za pristup: <code className="text-purple-300 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">/trening</code> ili <code className="text-purple-300 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">?trening=true</code>
          </p>
        </div>
      </div>
    </div>
  );
};
