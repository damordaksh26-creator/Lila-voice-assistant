import React from 'react';
import { MessageSquare, Settings, Radio, Sparkles, Mic, MicOff, HeartHandshake, ShieldCheck } from 'lucide-react';
import { VoiceState, VoiceName, LilaPersonaId, WakeWordOption } from '../types';
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
}

export const Header: React.FC<HeaderProps> = ({
  voiceState,
  currentVoice,
  pitch = 1.06,
  persona,
  wakeWordEnabled,
  wakeWord,
  alwaysAllowMic = true,
  micPermissionStatus = 'granted',
  onRequestAlwaysAllowMic,
  onOpenSettings,
  onOpenTranscripts,
  transcriptCount,
}) => {
  const isLive = voiceState !== 'disconnected';
  const activePersonaObj = LILA_PERSONAS[persona] || LILA_PERSONAS.friend;
  const activeWakeObj = LILA_WAKE_WORDS.find((w) => w.id === wakeWord) || LILA_WAKE_WORDS[0];

  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center shadow-sm">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            {isLive && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-medium tracking-tight text-[#1D1D1F]">Lila</span>
            <span className="hidden sm:inline-flex text-[10px] font-semibold uppercase tracking-widest text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full bg-emerald-50/80">
              Hindi Voice AI
            </span>
          </div>
        </div>

        {/* Center Persona & Wake Word Status Pills */}
        <div className="flex items-center gap-2">
          {/* Active Persona Switcher Pill */}
          <button
            id="lila-header-persona-btn"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-white text-xs font-medium text-gray-700 hover:text-black transition-all cursor-pointer shadow-2xs"
            title="Change Lila Persona"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-pink-600" />
            <span className="font-semibold text-[11px] text-gray-900">{activePersonaObj.name.split(' ')[0]}</span>
            <span className="hidden md:inline text-[10px] text-gray-400">({activePersonaObj.tag.split(' ')[0]})</span>
          </button>

          {/* Always Allow Mic Status Pill */}
          {alwaysAllowMic && micPermissionStatus === 'granted' ? (
            <button
              id="lila-header-always-mic-btn"
              onClick={onOpenSettings}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 text-emerald-800 text-xs font-medium hover:bg-emerald-100/70 transition-all cursor-pointer shadow-2xs"
              title="Microphone is always allowed for Lila"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] font-semibold">Mic: Always Allowed</span>
            </button>
          ) : micPermissionStatus === 'denied' ? (
            <button
              id="lila-header-mic-denied-btn"
              onClick={onOpenSettings}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
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
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition-all cursor-pointer shadow-2xs"
                title="Always allow microphone access"
              >
                <Mic className="w-3.5 h-3.5 text-gray-500" />
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
                ? 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}
            title="Wake word standby listener"
          >
            <Mic className={`w-3.5 h-3.5 ${wakeWordEnabled ? 'text-black' : 'text-gray-400'}`} />
            <span className="text-[11px]">
              {wakeWordEnabled ? `Wake: "${activeWakeObj.label}"` : 'Wake Word: Off'}
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Voice Model & Pitch Pill */}
          <button
            id="lila-header-voice-badge-btn"
            onClick={onOpenSettings}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-gray-300 text-xs font-medium text-gray-600 hover:text-black shadow-2xs transition-all cursor-pointer"
            title="Configure Voice & Pitch"
          >
            <Radio className={`w-3 h-3 ${isLive ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-[#1D1D1F] font-semibold text-[11px]">{currentVoice}</span>
            <span className="text-[10px] text-pink-700 font-mono font-semibold px-1 py-0.2 bg-pink-50 border border-pink-200/60 rounded">
              {pitch.toFixed(2)}x
            </span>
          </button>

          {/* Transcripts Toggle Button */}
          <button
            id="lila-header-transcripts-btn"
            onClick={onOpenTranscripts}
            className="relative p-2.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-black transition-all shadow-2xs"
            title="Conversation History"
          >
            <MessageSquare className="w-4 h-4" />
            {transcriptCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-black text-white text-[10px] font-bold shadow-sm">
                {transcriptCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            id="lila-header-settings-btn"
            onClick={onOpenSettings}
            className="p-2.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-black transition-all shadow-2xs"
            title="Voice & Persona Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

