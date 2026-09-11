import React from 'react';
import { X, Volume2, Search, Award, FastForward, CheckCircle2 } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="help-dialog"
        className="relative w-full max-w-md bg-zinc-900 border border-white/15 rounded-2xl p-6 shadow-2xl space-y-5 overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Zatvori uputstvo"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center justify-center gap-2">
            Kako se igra Pogodi Pesmu?
          </h2>
          <p className="text-xs text-zinc-400">
            Muzička igra pogađanja pesama na osnovu kratkih isečaka
          </p>
        </div>

        {/* Steps List */}
        <div className="space-y-4 text-sm text-zinc-300">
          <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs sm:text-sm">Poslušaj intro pesme</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Klikni na <strong className="text-white">Play</strong> i poslušaj početni isečak od svega <strong>0.5 sekundi</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs sm:text-sm">Pronađi pesmu u pretrazi</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kucaj ime izvođača, naziv hita ili reči iz refrena, pa izaberi tačnu pesmu sa padajuće liste.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs sm:text-sm">Otključaj više muzike</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Netačan odgovor ili klik na <strong>Preskoči</strong> otključava duži deo introa:
                <br />
                <span className="font-mono text-emerald-400 text-[11px] font-semibold">
                  0.5s → 1s → 2s → 4s → 8s → 16s
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-white text-xs sm:text-sm">Podeli sa prijateljima</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pogodi pesmu u što manje pokušaja, poslušaj ceo hit od 30s i kopiraj emoji rezultat spreman za deljenje!
              </p>
            </div>
          </div>
        </div>

        {/* Got it Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition-all"
        >
          Jasno, spreman sam za igru! 🎵
        </button>
      </div>
    </div>
  );
};
