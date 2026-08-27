import React from 'react';
import {
  MessageSquare,
  Settings,
  Radio,
  Sun,
  Moon,
} from 'lucide-react';
import { VoiceState, VoiceName, LilaPersonaId, WakeWordOption, ThemeMode } from '../types';

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
  theme?: ThemeMode;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  voiceState,
  currentVoice,
  pitch = 1.06,
  onOpenSettings,
  onOpenTranscripts,
  transcriptCount,
  isDark = false,
  onToggleTheme,
}) => {
  const isLive = voiceState !== 'disconnected';

  return (
    <header className="w-full bg-white/85 dark:bg-[#121217]/85 backdrop-blur-md border-b border-gray-100 dark:border-white/10 sticky top-0 z-30 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-full flex items-center justify-center shadow-xs transition-colors">
              <div className="w-2 h-2 bg-white dark:bg-black rounded-full" />
            </div>
            {isLive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121217] animate-pulse" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-medium tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5]">Lila</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30 px-2 py-0.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40">
              Hindi Voice AI
            </span>
          </div>
        </div>

        {/* Unified Top Right Controls (Theme Toggle, Transcripts, Voice Config, Settings) */}
        <div className="flex items-center gap-2">
          {/* Explicit Dark / Light Mode Switcher */}
          <div
            id="lila-theme-switcher"
            className="flex items-center p-0.5 rounded-full bg-gray-100 dark:bg-[#1A1A22] border border-gray-200/80 dark:border-white/10 shadow-2xs"
          >
            <button
              id="lila-theme-light-btn"
              type="button"
              onClick={() => {
                if (isDark && onToggleTheme) onToggleTheme();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                !isDark
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
              title="Switch to Light Mode"
            >
              <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
              <span className="hidden sm:inline text-[11px]">Light</span>
            </button>

            <button
              id="lila-theme-dark-btn"
              type="button"
              onClick={() => {
                if (!isDark && onToggleTheme) onToggleTheme();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#2A2A36] text-white shadow-xs font-semibold'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
              title="Switch to Dark Mode"
            >
              <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400 fill-indigo-400' : 'text-gray-400'}`} />
              <span className="hidden sm:inline text-[11px]">Dark</span>
            </button>
          </div>

          {/* Voice Model & Pitch Badge */}
          <button
            id="lila-header-voice-badge-btn"
            onClick={onOpenSettings}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#1C1C24] border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white shadow-2xs transition-all cursor-pointer active:scale-95"
            title="Configure Voice & Pitch"
          >
            <Radio className={`w-3 h-3 ${isLive ? 'text-emerald-500 animate-pulse' : 'text-gray-400 dark:text-gray-500'}`} />
            <span className="text-[#1D1D1F] dark:text-white font-semibold text-[11px]">{currentVoice}</span>
            <span className="text-[10px] text-pink-700 dark:text-pink-300 font-mono font-semibold px-1 py-0.2 bg-pink-50 dark:bg-pink-950/50 border border-pink-200/60 dark:border-pink-500/30 rounded">
              {pitch.toFixed(2)}x
            </span>
          </button>

          {/* Transcripts / History Toggle Button */}
          <button
            id="lila-header-transcripts-btn"
            onClick={onOpenTranscripts}
            className="relative p-2.5 rounded-full bg-white dark:bg-[#1C1C24] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#252530] text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Conversation Transcripts & Subtitles"
          >
            <MessageSquare className="w-4 h-4" />
            {transcriptCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold flex items-center justify-center">
                {transcriptCount > 9 ? '9+' : transcriptCount}
              </span>
            )}
          </button>

          {/* Voice & System Settings Button */}
          <button
            id="lila-header-settings-btn"
            onClick={onOpenSettings}
            className="p-2.5 rounded-full bg-white dark:bg-[#1C1C24] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#252530] text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="Voice, Persona & Audio Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
