import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  Volume2,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Cpu,
  Sliders,
  Play,
  RotateCcw,
  Music2,
  Heart,
  Home,
  Brain,
  Briefcase,
  GraduationCap,
  Mic,
  MicOff,
  Bell,
  HeartHandshake,
  Lock,
  Unlock,
  Flame,
  Radio,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { LilaPersonaId, VoiceName, VoiceSettingsConfig, WakeWordOption } from '../types';
import {
  LILA_VOICE_OPTIONS,
  LILA_PITCH_CONFIG,
  LILA_PERSONAS,
  LILA_WAKE_WORDS,
  getPitchDescription,
} from '../lila';
import {
  previewPitchTone,
  playSoundCue,
  getMicrophonePermissionStatus,
  requestMicrophoneAccess,
} from '../utils/audio';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: VoiceSettingsConfig;
  onChangeConfig: (newConfig: Partial<VoiceSettingsConfig>) => void;
  onPreviewGreeting?: (greetingText: string) => void;
}

const PERSONA_ICONS: Record<LilaPersonaId, any> = {
  friend: Heart,
  family: Home,
  counselor: Brain,
  assistant: Briefcase,
  mentor: GraduationCap,
  girlfriend: Heart,
};

export const VoiceSettingsModal: React.FC<VoiceSettingsProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onPreviewGreeting,
}) => {
  const [activeTab, setActiveTab] = useState<'persona' | 'wake_word' | 'voice' | 'engine'>('persona');
  const [testWakeWordState, setTestWakeWordState] = useState<'idle' | 'testing' | 'success'>('idle');
  const [micStatus, setMicStatus] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testMicVolume, setTestMicVolume] = useState(0);
  const [micGrantedToast, setMicGrantedToast] = useState(false);
  const testMicStreamRef = useRef<MediaStream | null>(null);
  const testMicCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isOpen) {
      getMicrophonePermissionStatus().then((status) => {
        setMicStatus(status === 'unsupported' ? 'prompt' : status);
      });
    }
    return () => {
      // Clean up any active mic test when closing modal
      if (testMicStreamRef.current) {
        testMicStreamRef.current.getTracks().forEach((t) => t.stop());
        testMicStreamRef.current = null;
      }
      if (testMicCtxRef.current && testMicCtxRef.current.state !== 'closed') {
        testMicCtxRef.current.close();
        testMicCtxRef.current = null;
      }
      setIsTestingMic(false);
      setTestMicVolume(0);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuthorizeAlwaysMic = async () => {
    setMicStatus('checking');
    const ok = await requestMicrophoneAccess();
    if (ok) {
      setMicStatus('granted');
      onChangeConfig({ alwaysAllowMic: true });
      setMicGrantedToast(true);
      setTimeout(() => setMicGrantedToast(false), 3000);
      if (config.soundEffects) {
        playSoundCue('wake');
      }
    } else {
      setMicStatus('denied');
    }
  };

  const handleToggleMicTesting = async () => {
    if (isTestingMic) {
      if (testMicStreamRef.current) {
        testMicStreamRef.current.getTracks().forEach((t) => t.stop());
        testMicStreamRef.current = null;
      }
      if (testMicCtxRef.current && testMicCtxRef.current.state !== 'closed') {
        testMicCtxRef.current.close();
        testMicCtxRef.current = null;
      }
      setIsTestingMic(false);
      setTestMicVolume(0);
      return;
    }

    try {
      setIsTestingMic(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      testMicStreamRef.current = stream;
      setMicStatus('granted');

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      testMicCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const interval = setInterval(() => {
        if (!testMicStreamRef.current) {
          clearInterval(interval);
          return;
        }
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setTestMicVolume(Math.min(100, Math.round((avg / 110) * 100)));
      }, 40);

      // Auto stop test after 8 seconds
      setTimeout(() => {
        clearInterval(interval);
        if (testMicStreamRef.current) {
          testMicStreamRef.current.getTracks().forEach((t) => t.stop());
          testMicStreamRef.current = null;
        }
        if (testMicCtxRef.current && testMicCtxRef.current.state !== 'closed') {
          testMicCtxRef.current.close();
          testMicCtxRef.current = null;
        }
        setIsTestingMic(false);
        setTestMicVolume(0);
      }, 8000);
    } catch (e) {
      console.warn('Mic test failed:', e);
      setIsTestingMic(false);
      setMicStatus('denied');
    }
  };

  const currentPitch = config.pitch ?? LILA_PITCH_CONFIG.default;
  const pitchPercentDiff = Math.round((currentPitch - 1.0) * 100);
  const pitchFormattedPercent =
    pitchPercentDiff > 0 ? `+${pitchPercentDiff}%` : `${pitchPercentDiff}%`;

  const currentPersona = LILA_PERSONAS[config.persona] || LILA_PERSONAS.friend;

  const handlePreviewTone = () => {
    previewPitchTone(currentPitch);
  };

  const handleResetPitch = () => {
    onChangeConfig({ pitch: LILA_PITCH_CONFIG.default });
    previewPitchTone(LILA_PITCH_CONFIG.default);
  };

  const handleTestWakeWord = () => {
    setTestWakeWordState('testing');
    if (config.wakeWordChime) {
      playSoundCue('wake');
    }
    setTimeout(() => {
      setTestWakeWordState('success');
      setTimeout(() => setTestWakeWordState('idle'), 2500);
    }, 900);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-xl bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#1D1D1F]"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white shadow-sm">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1D1D1F]">Preferences & Persona Settings</h3>
                <p className="text-xs text-gray-400 font-light">Lila AI · Wake Word · Persona · Audio</p>
              </div>
            </div>

            <button
              id="lila-close-settings-modal-btn"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-100 bg-[#FAFAFA] px-4 py-2 gap-1 overflow-x-auto custom-scrollbar">
            <button
              id="tab-persona"
              onClick={() => setActiveTab('persona')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'persona'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Persona & Role (स्वरूप)</span>
            </button>

            <button
              id="tab-wake-word"
              onClick={() => setActiveTab('wake_word')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'wake_word'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Wake Word (वेक-अप)</span>
            </button>

            <button
              id="tab-voice"
              onClick={() => setActiveTab('voice')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'voice'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Voice & Pitch (स्वर)</span>
            </button>

            <button
              id="tab-engine"
              onClick={() => setActiveTab('engine')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'engine'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Engine & Mode</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm custom-scrollbar bg-[#FAFAFA]">
            {/* Respect & Etiquette Guarantee Banner (Always visible at top of settings) */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-3 text-xs text-emerald-950 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-emerald-900">
                  Hinglish & Supreme 'Aap' Respect Guarantee
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed font-light">
                  Lila speaks in friendly, natural Hinglish (e.g. <em>"kya kar rahe he aap, sab ok hai na"</em>) and ALWAYS treats everyone with supreme dignity using <strong>"Aap"</strong>, <strong>"Aapka"</strong>, <strong>"bataiye"</strong>, and <strong>"kijiye"</strong>.
                </p>
              </div>
            </div>

            {/* TAB 1: PERSONA SETTINGS */}
            {activeTab === 'persona' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5 text-gray-600" />
                    <span>Choose Lila’s Persona (लीला का स्वरूप)</span>
                  </label>
                  <span className="text-xs text-black font-semibold">
                    {currentPersona.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {(Object.keys(LILA_PERSONAS) as LilaPersonaId[])
                    .filter((pKey) => !LILA_PERSONAS[pKey].isSecret)
                    .map((pKey) => {
                      const p = LILA_PERSONAS[pKey];
                      const isSelected = config.persona === p.id;
                      const Icon = PERSONA_ICONS[p.id] || Sparkles;

                      return (
                        <div
                          key={p.id}
                          id={`persona-option-${p.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => onChangeConfig({ persona: p.id })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onChangeConfig({ persona: p.id });
                            }
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer select-none ${
                            isSelected
                              ? 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-semibold text-xs flex items-center gap-2">
                                  <span>{p.name}</span>
                                  <span
                                    className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${
                                      isSelected
                                        ? 'bg-neutral-900 text-white border-black'
                                        : 'bg-gray-100 text-gray-700 border-gray-200'
                                    }`}
                                  >
                                    {p.tag}
                                  </span>
                                </div>
                                <div className="text-[11px] text-gray-500 font-medium">{p.hindiName}</div>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-black shrink-0 mt-1" />}
                          </div>

                          <p className="text-[11px] text-gray-600 leading-relaxed font-light pl-9.5">
                            {p.hindiDescription}
                          </p>

                          {/* Sample Greeting Preview */}
                          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] pl-9.5">
                            <span className="text-gray-500 italic truncate max-w-[340px]">
                              "{p.sampleGreeting}"
                            </span>
                            {onPreviewGreeting && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onChangeConfig({ persona: p.id });
                                  onPreviewGreeting(p.sampleGreeting);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-black hover:text-neutral-700 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 transition-colors shrink-0 ml-2 cursor-pointer"
                                title="Listen to sample greeting"
                              >
                                <Play className="w-2.5 h-2.5 fill-black" />
                                <span>Listen</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* SECRET PERSONA: GIRLFRIEND (AT LAST OF PERSONA TAB) */}
                <div className="pt-3 border-t border-gray-200/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      <span>Secret Persona (सीक्रेट स्वरूप)</span>
                    </label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                      Bonus Mode
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 via-pink-50/40 to-white border border-rose-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
                          <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-rose-950">
                              Girlfriend Persona (गर्लफ्रेंड)
                            </span>
                            <span className="text-[9px] px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-semibold">
                              Special
                            </span>
                          </div>
                          <p className="text-[11px] text-rose-800/80 font-light">
                            Romantic, sweet & caring Hinglish voice companion with deep affection.
                          </p>
                        </div>
                      </div>

                      {/* Enable / Disable Secret Switch */}
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          id="secret-girlfriend-toggle"
                          type="checkbox"
                          checked={!!config.secretGirlfriendEnabled}
                          onChange={(e) => {
                            const isEnabled = e.target.checked;
                            if (!isEnabled && config.persona === 'girlfriend') {
                              onChangeConfig({
                                secretGirlfriendEnabled: false,
                                persona: 'friend',
                              });
                            } else {
                              onChangeConfig({ secretGirlfriendEnabled: isEnabled });
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5.5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-rose-500"></div>
                      </label>
                    </div>

                    {/* Interactive Girlfriend Option if Enabled */}
                    {config.secretGirlfriendEnabled ? (
                      <div className="pt-2 border-t border-rose-200/60">
                        {(() => {
                          const p = LILA_PERSONAS.girlfriend;
                          const isSelected = config.persona === 'girlfriend';

                          return (
                            <div
                              id="persona-option-girlfriend"
                              role="button"
                              tabIndex={0}
                              onClick={() => onChangeConfig({ persona: 'girlfriend' })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onChangeConfig({ persona: 'girlfriend' });
                                }
                              }}
                              className={`w-full p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-white border-rose-500 text-rose-950 ring-2 ring-rose-300 shadow-sm'
                                  : 'bg-white/80 border-rose-200 text-gray-700 hover:bg-white hover:border-rose-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-rose-100 text-rose-600'
                                    }`}
                                  >
                                    <Heart className="w-3.5 h-3.5 fill-current" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-xs flex items-center gap-2">
                                      <span>{p.name}</span>
                                      <span
                                        className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${
                                          isSelected
                                            ? 'bg-rose-600 text-white border-rose-600'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}
                                      >
                                        {p.tag}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-rose-800 font-medium">
                                      {p.hindiName}
                                    </div>
                                  </div>
                                </div>
                                {isSelected ? (
                                  <span className="flex items-center gap-1 text-[11px] text-rose-700 font-semibold">
                                    <Check className="w-4 h-4 text-rose-600" />
                                    <span>Active</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-medium">
                                    Click to Activate
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-rose-900/80 leading-relaxed font-light pl-9.5">
                                {p.hindiDescription}
                              </p>

                              {/* Sample Greeting Preview */}
                              <div className="mt-2.5 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px] pl-9.5">
                                <span className="text-rose-700/80 italic truncate max-w-[320px]">
                                  "{p.sampleGreeting}"
                                </span>
                                {onPreviewGreeting && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onChangeConfig({ persona: 'girlfriend' });
                                      onPreviewGreeting(p.sampleGreeting);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 hover:text-rose-950 px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 transition-colors shrink-0 ml-2 cursor-pointer"
                                    title="Listen to sample greeting"
                                  >
                                    <Play className="w-2.5 h-2.5 fill-rose-700 text-rose-700" />
                                    <span>Listen</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-rose-700/70 pt-1 font-light italic">
                        <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Secret Girlfriend persona is disabled. Flip the switch above to enable.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WAKE WORD SETTINGS */}
            {activeTab === 'wake_word' && (
              <div className="space-y-5">
                {/* Always Allow Microphone for Lila Section */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#1D1D1F] flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Always Allow Lila for Microphone (हमेशा माइक चालू रखें)</span>
                        </span>
                        {config.alwaysAllowMic && micStatus === 'granted' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                            Pre-Warmed & Allowed
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                        Keep microphone pre-authorized across sessions. When enabled, wake words ("Hey Lila", "सुनो लीला") and instant voice conversation start with zero delays and no repetitive browser prompts.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="lila-always-allow-mic-toggle"
                      checked={config.alwaysAllowMic}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onChangeConfig({ alwaysAllowMic: checked });
                        if (checked) {
                          handleAuthorizeAlwaysMic();
                        }
                      }}
                      className="w-4 h-4 accent-black rounded cursor-pointer shrink-0 mt-1"
                    />
                  </div>

                  {/* Status & Quick Action Buttons */}
                  <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-gray-400 font-medium">Browser Permission:</span>
                      {micStatus === 'granted' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Always Allowed & Active</span>
                        </span>
                      ) : micStatus === 'denied' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/70">
                          <AlertCircle className="w-3 h-3" />
                          <span>Blocked in Browser</span>
                        </span>
                      ) : micStatus === 'checking' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          <span>Checking access...</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                          <span>Prompt when needed</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {micStatus !== 'granted' && (
                        <button
                          type="button"
                          id="lila-grant-always-mic-btn"
                          onClick={handleAuthorizeAlwaysMic}
                          className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Authorize Now</span>
                        </button>
                      )}

                      <button
                        type="button"
                        id="lila-test-mic-input-btn"
                        onClick={handleToggleMicTesting}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                          isTestingMic
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <Mic className="w-3 h-3" />
                        <span>{isTestingMic ? 'Stop Test' : 'Test Microphone'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Mic Sensitivity Gauge when Testing */}
                  {isTestingMic && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-gray-600 font-mono">
                        <span>Speak into your microphone now...</span>
                        <span className="font-semibold text-black">{testMicVolume}% input level</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-75 rounded-full"
                          style={{ width: `${testMicVolume}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {micGrantedToast && (
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Microphone is permanently authorized and always allowed for Lila!</span>
                    </div>
                  )}

                  {micStatus === 'denied' && (
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                        <span>How to allow microphone in your browser:</span>
                      </div>
                      <p className="text-amber-800 leading-snug">
                        Click the lock icon <span className="font-semibold">🔒</span> in your browser's address bar next to the URL, change <strong>Microphone</strong> to <strong>"Allow"</strong>, and refresh the page.
                      </p>
                    </div>
                  )}
                </div>

                {/* Wake Word Main Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-xs text-[#1D1D1F] flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-black" />
                      <span>Standby Wake-Up Word Detection</span>
                    </span>
                    <span className="text-[11px] text-gray-500 font-light block">
                      जब आप वेक वर्ड बोलेंगे (जैसे "Hey Lila" या "सुनो लीला"), लीला तुरंत सक्रिय होकर सुनेगी।
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.wakeWordEnabled}
                    onChange={(e) => onChangeConfig({ wakeWordEnabled: e.target.checked })}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                </div>

                {/* Wake Word Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-gray-600" />
                    <span>Select Preferred Wake Word</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {LILA_WAKE_WORDS.map((w) => {
                      const isSelected = config.wakeWord === w.id;
                      return (
                        <button
                          key={w.id}
                          id={`wake-word-option-${w.id}`}
                          disabled={!config.wakeWordEnabled}
                          onClick={() => onChangeConfig({ wakeWord: w.id })}
                          className={`p-3.5 rounded-2xl border text-left transition-all ${
                            !config.wakeWordEnabled
                              ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200'
                              : isSelected
                              ? 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs">{w.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                          </div>
                          <p className="text-[11px] text-gray-500 font-light">{w.hindiLabel}</p>
                          <div className="mt-2 text-[10px] font-mono text-gray-400">
                            Keywords: {w.phrases.slice(0, 3).join(', ')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wake Word Chime Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <div className="space-y-0.5">
                    <span className="font-medium text-xs text-[#1D1D1F] block">
                      Wake Up Audio Chime
                    </span>
                    <span className="text-[11px] text-gray-500 font-light block">
                      Play a sweet rising two-tone audio chime whenever Lila detects your wake word
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.wakeWordChime}
                    onChange={(e) => onChangeConfig({ wakeWordChime: e.target.checked })}
                    className="w-4 h-4 accent-black rounded cursor-pointer"
                  />
                </div>

                {/* Interactive Wake Word Test */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-xs text-[#1D1D1F] block">
                      Test Wake Word Detection
                    </span>
                    <span className="text-[11px] text-gray-500 font-light block">
                      Try triggering the wake up cue and responsive chime
                    </span>
                  </div>
                  <button
                    id="lila-test-wake-word-btn"
                    onClick={handleTestWakeWord}
                    disabled={testWakeWordState === 'testing'}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      testWakeWordState === 'success'
                        ? 'bg-emerald-600 text-white'
                        : testWakeWordState === 'testing'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-black text-white hover:bg-neutral-800'
                    }`}
                  >
                    {testWakeWordState === 'success' ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Awake!</span>
                      </>
                    ) : testWakeWordState === 'testing' ? (
                      <span>Listening...</span>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-white" />
                        <span>Simulate Wake Word</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: VOICE & PITCH SETTINGS */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                {/* Voice Model Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-gray-600" />
                      <span>Voice Model</span>
                    </label>
                    <span className="text-xs text-black font-semibold">{config.voice}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {LILA_VOICE_OPTIONS.map((v) => {
                      const isSelected = config.voice === v.id;
                      return (
                        <button
                          key={v.id}
                          id={`voice-option-${v.id}`}
                          onClick={() => onChangeConfig({ voice: v.id })}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-xs flex items-center gap-1.5">
                              {v.name}
                              {v.tag && (
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${
                                    v.isSoft
                                      ? 'bg-pink-50 text-pink-700 border-pink-200'
                                      : 'bg-gray-100 text-gray-800 border-gray-200'
                                  }`}
                                >
                                  {v.tag}
                                </span>
                              )}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                          </div>
                          <p className="text-[11px] text-gray-500 leading-snug font-light">{v.vibe}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Voice Pitch Adjuster Slider */}
                <div id="lila-pitch-adjuster-section" className="space-y-3 pt-4 border-t border-gray-200/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-gray-600" />
                      <span>Voice Pitch Adjuster</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-black text-white">
                        {currentPitch.toFixed(2)}x
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        ({pitchFormattedPercent})
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-[#1D1D1F] font-medium">
                        <Music2 className="w-3.5 h-3.5 text-pink-600" />
                        <span>{getPitchDescription(currentPitch)}</span>
                      </div>
                      {currentPitch !== LILA_PITCH_CONFIG.default && (
                        <button
                          id="lila-reset-pitch-btn"
                          onClick={handleResetPitch}
                          className="text-[11px] text-gray-400 hover:text-black flex items-center gap-1 transition-colors"
                          title="Reset to default pitch"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <input
                        id="lila-pitch-slider-input"
                        type="range"
                        min={LILA_PITCH_CONFIG.min}
                        max={LILA_PITCH_CONFIG.max}
                        step={LILA_PITCH_CONFIG.step}
                        value={currentPitch}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onChangeConfig({ pitch: val });
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black transition-all"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>Deep ({LILA_PITCH_CONFIG.min}x)</span>
                        <span className="text-black font-semibold">
                          Default ({LILA_PITCH_CONFIG.default}x)
                        </span>
                        <span>High ({LILA_PITCH_CONFIG.max}x)</span>
                      </div>
                    </div>

                    {/* Quick Pitch Presets */}
                    <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Presets:</span>
                      {LILA_PITCH_CONFIG.presets.map((preset) => {
                        const isActive = Math.abs(currentPitch - preset.value) < 0.02;
                        return (
                          <button
                            key={preset.label}
                            id={`lila-pitch-preset-${preset.value}`}
                            onClick={() => {
                              onChangeConfig({ pitch: preset.value });
                              previewPitchTone(preset.value);
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-black text-white font-semibold shadow-xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-normal'
                            }`}
                          >
                            <span>{preset.label}</span>
                            <span className="text-[10px] opacity-75 font-mono">({preset.value}x)</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        id="lila-preview-pitch-chime-btn"
                        onClick={handlePreviewTone}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-medium text-[#1D1D1F] transition-colors"
                      >
                        <Play className="w-3 h-3 fill-black text-black" />
                        <span>Preview Pitch Tone</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ENGINE & PROTOCOL SETTINGS */}
            {activeTab === 'engine' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-gray-600" />
                    <span>Connection Protocol</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => onChangeConfig({ connectionMode: 'live_websocket' })}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        config.connectionMode === 'live_websocket'
                          ? 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-xs text-black mb-0.5">Gemini Live Stream</div>
                      <div className="text-[11px] text-gray-500 font-light">
                        Real-time bidirectional 24kHz PCM16 stream with live interruptions
                      </div>
                    </button>

                    <button
                      onClick={() => onChangeConfig({ connectionMode: 'turn_based' })}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        config.connectionMode === 'turn_based'
                          ? 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold text-xs text-black mb-0.5">Smart Voice Turn</div>
                      <div className="text-[11px] text-gray-500 font-light">
                        Gemini 3.7 Flash + Grounding + 3.1 Flash TTS Synthesis
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-200/80">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gray-600" />
                    <span>Interaction Preferences</span>
                  </label>

                  <div className="space-y-2">
                    {/* Always Allow Mic */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
                      <div className="space-y-0.5 pr-2">
                        <span className="font-semibold text-xs text-[#1D1D1F] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Always Allow Microphone (हमेशा माइक चालू रखें)</span>
                        </span>
                        <span className="text-[11px] text-gray-500 font-light block">
                          Maintain persistent microphone pre-authorization for zero-delay speech responses
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.alwaysAllowMic}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          onChangeConfig({ alwaysAllowMic: checked });
                          if (checked) {
                            handleAuthorizeAlwaysMic();
                          }
                        }}
                        className="w-4 h-4 accent-black rounded cursor-pointer shrink-0"
                      />
                    </div>

                    {/* Continuous Hands-Free */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
                      <div className="space-y-0.5">
                        <span className="font-medium text-xs text-[#1D1D1F] block">
                          Hands-Free Continuous Conversation
                        </span>
                        <span className="text-[11px] text-gray-500 font-light block">
                          Automatically resume microphone listening after Lila finishes speaking
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.continuousMode}
                        onChange={(e) => onChangeConfig({ continuousMode: e.target.checked })}
                        className="w-4 h-4 accent-black rounded cursor-pointer"
                      />
                    </div>

                    {/* Subtitles Overlay */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
                      <div className="space-y-0.5">
                        <span className="font-medium text-xs text-[#1D1D1F] block">
                          Live Subtitle Captions
                        </span>
                        <span className="text-[11px] text-gray-500 font-light block">
                          Display dynamic text floating badge during voice streaming
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.showSubtitles}
                        onChange={(e) => onChangeConfig({ showSubtitles: e.target.checked })}
                        className="w-4 h-4 accent-black rounded cursor-pointer"
                      />
                    </div>

                    {/* Sound Effects */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
                      <div className="space-y-0.5">
                        <span className="font-medium text-xs text-[#1D1D1F] block">UI Sound Cues</span>
                        <span className="text-[11px] text-gray-500 font-light block">
                          Play subtle audio chimes on session connect, tools, and disconnect
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.soundEffects}
                        onChange={(e) => onChangeConfig({ soundEffects: e.target.checked })}
                        className="w-4 h-4 accent-black rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex justify-end bg-white">
            <button
              id="lila-done-settings-btn"
              onClick={onClose}
              className="px-6 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 shadow-sm transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
