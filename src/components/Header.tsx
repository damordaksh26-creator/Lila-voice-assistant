import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Settings,
  Radio,
  Sparkles,
  Mic,
  MicOff,
  HeartHandshake,
  ShieldCheck,
  Sun,
  Moon,
  Heart,
} from 'lucide-react';
import { VoiceState, VoiceName, LilaPersonaId, WakeWordOption, ThemeMode } from '../types';
import { LILA_PERSONAS, LILA_WAKE_WORDS } from '../lila';

interface HeaderProps {
  voiceState: VoiceState;
  currentVoice: VoiceName;
  pitch?: number;
  persona: LilaPersonaId;
  wakeWordEnabled: boolean;
  wakeWord: WakeWordOption;
  alwaysAllowMic?: boolean;
  micPermissionStatus?: 'granted' | 'prompt' | 'denied' | 'checking';
  onRequestAlwaysAllowMic?: () => void;
  onOpenSettings: () => void;
  onOpenTranscripts: () => void;
  transcriptCount: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSecretUnlockGirlfriend?: () => void;
  isGirlfriendMode?: boolean;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  voiceState,
  currentVoice,
  pitch = 1.10,
  persona,
  wakeWordEnabled,
  wakeWord,
  alwaysAllowMic = true,
  micPermissionStatus = 'granted',
  onRequestAlwaysAllowMic,
  onOpenSettings,
  onOpenTranscripts,
  transcriptCount,
  theme,
  onToggleTheme,
  onSecretUnlockGirlfriend,
  isGirlfriendMode = false,
}) => {
  const isLive = voiceState !== 'disconnected';
  const isDark = theme === 'dark';
  const activePersonaObj = LILA_PERSONAS[persona] || LILA_PERSONAS.friend;
  const activeWakeObj = LILA_WAKE_WORDS.find((w) => w.id === wakeWord) || LILA_WAKE_WORDS[0];

  // Secret click counter on logo to unlock girlfriend mode
  const [logoClicks, setLogoClicks] = useState(0);
  const [showTapTooltip, setShowTapTooltip] = useState(false);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    setShowTapTooltip(true);

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    tapTimeoutRef.current = setTimeout(() => {
      setShowTapTooltip(false);
      setLogoClicks(0);
    }, 2800);

    if (newCount >= 5) {
      setLogoClicks(0);
      setShowTapTooltip(false);
      if (onSecretUnlockGirlfriend) {
        onSecretUnlockGirlfriend();
      }
    }
  };

  return (
    <header
      id="lila-header"
      className={`w-full backdrop-blur-md border-b sticky top-0 z-30 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0F1117]/85 border-[#22252D] text-white'
          : 'bg-white/85 border-gray-100 text-[#1D1D1F]'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Identity with Secret Tap Trigger */}
        <div className="flex items-center gap-3 relative">
          <motion.button
            id="lila-brand-logo-btn"
            onClick={handleLogoClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="relative cursor-pointer focus:outline-none group"
            title={logoClicks > 0 ? `${5 - logoClicks} taps left to Secret Girlfriend Mode!` : 'Lila Voice AI (Tap 5x for secret)'}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                isGirlfriendMode
                  ? 'bg-rose-500 text-white ring-2 ring-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                  : isDark
                  ? 'bg-white text-black'
                  : 'bg-black text-white'
              }`}
            >
              {isGirlfriendMode ? (
                <Heart className="w-4 h-4 fill-white animate-pulse" />
              ) : (
                <div
                  className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-black' : 'bg-white'
                  }`}
                />
              )}
            </div>
            {isLive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            )}
          </motion.button>

          {/* Floating Tap Counter Badge */}
          <AnimatePresence>
            {showTapTooltip && logoClicks > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.9 }}
                className="absolute top-11 left-0 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-semibold shadow-lg flex items-center gap-1.5 border border-rose-400"
              >
                <Heart className="w-3 h-3 fill-white animate-bounce" />
                <span>Tap {5 - logoClicks} more times for Secret Mode!</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <span
              className={`text-xl font-medium tracking-tight ${
                isDark ? 'text-white' : 'text-[#1D1D1F]'
              }`}
            >
              Lila
            </span>
            {isGirlfriendMode ? (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-rose-600 border border-rose-200 dark:border-rose-800/60 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 shadow-2xs"
              >
                <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                <span>Girlfriend Active</span>
              </motion.span>
            ) : (
              <span
                className={`hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-widest border px-2 py-0.5 rounded-full transition-colors ${
                  isDark
                    ? 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40'
                    : 'text-emerald-800 border-emerald-200/80 bg-emerald-50/80'
                }`}
              >
                Hindi Voice AI
              </span>
            )}
          </div>
        </div>

        {/* Center Persona & Status Pills */}
        <div className="flex items-center gap-2">
          {/* Active Persona Switcher Pill */}
          <motion.button
            id="lila-header-persona-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
              isDark
                ? 'bg-[#181A20] border-[#2B2F3A] text-gray-200 hover:border-gray-600 hover:bg-[#20242E]'
                : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white text-gray-700 hover:text-black'
            }`}
            title="Change Lila Persona"
          >
            <HeartHandshake
              className={`w-3.5 h-3.5 ${
                persona === 'girlfriend' ? 'text-rose-500' : 'text-pink-500'
              }`}
            />
            <span className="font-semibold text-[11px]">
              {persona === 'girlfriend' ? 'Girlfriend' : activePersonaObj.name.split(' ')[0]}
            </span>
            <span
              className={`hidden md:inline text-[10px] ${
                isDark ? 'text-gray-400' : 'text-gray-400'
              }`}
            >
              ({persona === 'girlfriend' ? 'Sweet & Caring' : activePersonaObj.tag.split(' ')[0]})
            </span>
          </motion.button>

          {/* Always Allow Mic Status Pill */}
          {alwaysAllowMic && micPermissionStatus === 'granted' ? (
            <button
              id="lila-header-always-mic-btn"
              onClick={onOpenSettings}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
                  : 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70'
              }`}
              title="Microphone is always allowed for Lila"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-semibold">Mic: Allowed</span>
            </button>
          ) : micPermissionStatus === 'denied' ? (
            <button
              id="lila-header-mic-denied-btn"
              onClick={onOpenSettings}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'border-rose-800 bg-rose-950/50 text-rose-300'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
              title="Microphone is blocked. Click to view help"
            >
              <MicOff className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px] font-semibold">Mic: Blocked</span>
            </button>
          ) : (
            onRequestAlwaysAllowMic && (
              <button
                id="lila-header-allow-mic-btn"
                onClick={onRequestAlwaysAllowMic}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                  isDark
                    ? 'border-[#2B2F3A] bg-[#181A20] hover:bg-[#20242E] text-gray-300'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                }`}
                title="Always allow microphone access"
              >
                <Mic className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-semibold">Always Allow Mic</span>
              </button>
            )
          )}

          {/* Wake Word Status Pill */}
          <button
            id="lila-header-wake-word-btn"
            onClick={onOpenSettings}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
              wakeWordEnabled
                ? isDark
                  ? 'bg-[#181A20] border-[#2B2F3A] text-gray-200 hover:border-gray-600'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                : isDark
                ? 'bg-[#14161C] border-[#22252D] text-gray-500'
                : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}
            title="Wake word standby listener"
          >
            <Mic
              className={`w-3.5 h-3.5 ${
                wakeWordEnabled ? (isDark ? 'text-emerald-400' : 'text-black') : 'text-gray-400'
              }`}
            />
            <span className="text-[11px]">
              {wakeWordEnabled ? `Wake: "${activeWakeObj.label}"` : 'Wake: Off'}
            </span>
          </button>
        </div>

        {/* Action Controls & Dark Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Voice Model & Pitch Pill */}
          <button
            id="lila-header-voice-badge-btn"
            onClick={onOpenSettings}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shadow-2xs transition-all cursor-pointer ${
              isDark
                ? 'bg-[#181A20] border-[#2B2F3A] text-gray-300 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:text-black'
            }`}
            title="Configure Voice & Pitch"
          >
            <Radio className={`w-3 h-3 ${isLive ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
            <span className="font-semibold text-[11px]">{currentVoice}</span>
            <span
              className={`text-[10px] font-mono font-semibold px-1 py-0.2 rounded border ${
                isDark
                  ? 'text-pink-300 bg-pink-950/60 border-pink-800/60'
                  : 'text-pink-700 bg-pink-50 border-pink-200/60'
              }`}
            >
              {pitch.toFixed(2)}x
            </span>
          </button>

          {/* Dark / Light Mode Switcher with animated icon */}
          <motion.button
            id="lila-theme-switcher-btn"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTheme}
            className={`p-2.5 rounded-full border transition-all shadow-2xs cursor-pointer ${
              isDark
                ? 'bg-[#181A20] border-[#2B2F3A] text-amber-300 hover:bg-[#222632] hover:border-amber-400/50'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-black'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="sun-icon"
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: 90, scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon-icon"
                  initial={{ rotate: 90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  exit={{ rotate: -90, scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-4 h-4 text-slate-700" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Transcripts Toggle Button */}
          <motion.button
            id="lila-header-transcripts-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenTranscripts}
            className={`relative p-2.5 rounded-full border transition-all shadow-2xs cursor-pointer ${
              isDark
                ? 'bg-[#181A20] border-[#2B2F3A] text-gray-300 hover:bg-[#222632] hover:text-white'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-black'
            }`}
            title="Conversation History"
          >
            <MessageSquare className="w-4 h-4" />
            {transcriptCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold shadow-sm ${
                  isDark ? 'bg-white text-black' : 'bg-black text-white'
                }`}
              >
                {transcriptCount}
              </span>
            )}
          </motion.button>

          {/* Settings Button */}
          <motion.button
            id="lila-header-settings-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings}
            className={`p-2.5 rounded-full border transition-all shadow-2xs cursor-pointer ${
              isDark
                ? 'bg-[#181A20] border-[#2B2F3A] text-gray-300 hover:bg-[#222632] hover:text-white'
                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-black'
            }`}
            title="Voice & Persona Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </header>
  );
});

