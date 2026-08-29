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
  Pause,
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
  Smartphone,
  Download,
  Globe,
  Copy,
  Code2,
  ExternalLink,
  Edit3,
  Youtube,
  Music,
  FileText,
  SkipForward,
  SkipBack,
  Terminal,
  PhoneCall,
  Calculator,
  Users,
  Plus,
  Trash2,
  Camera,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  LilaPersonaId,
  VoiceName,
  VoiceSettingsConfig,
  WakeWordOption,
  SupportedTargetApp,
  ContactEntry,
} from '../types';
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
import {
  getAppBridgeStatus,
  subscribeToAppBridge,
  executeAppControlCommand,
  requestPhonePermission,
  requestContactsPermission,
  requestNotificationAccessSettings,
  requestAccessibilitySettings,
  DEFAULT_CONTACTS,
  evaluateMathExpression,
} from '../utils/appBridge';
import { ANDROID_COMPANION_FILES } from '../utils/nativeCompanionCode';
import { DeviceOnboardingModal } from './DeviceOnboardingModal';

interface VoiceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: VoiceSettingsConfig;
  onChangeConfig: (newConfig: Partial<VoiceSettingsConfig>) => void;
  onPreviewGreeting?: (greetingText: string) => void;
  theme?: 'light' | 'dark';
}

const PERSONA_ICONS: Record<LilaPersonaId, any> = {
  friend: Heart,
  family: Home,
  counselor: Brain,
  assistant: Briefcase,
  mentor: GraduationCap,
  girlfriend: Heart,
};

export const VoiceSettingsModal: React.FC<VoiceSettingsProps> = React.memo(({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onPreviewGreeting,
  theme = 'light',
}) => {
  const [activeTab, setActiveTab] = useState<'persona' | 'device_control' | 'wake_word' | 'voice' | 'engine'>('device_control');
  const [testWakeWordState, setTestWakeWordState] = useState<'idle' | 'testing' | 'success'>('idle');
  const [micStatus, setMicStatus] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testMicVolume, setTestMicVolume] = useState(0);
  const [micGrantedToast, setMicGrantedToast] = useState(false);
  const [secretPassInput, setSecretPassInput] = useState('');
  const [secretUnlockError, setSecretUnlockError] = useState(false);
  const [secretUnlockSuccess, setSecretUnlockSuccess] = useState(false);

  // App Control Tab State
  const [bridgeStatus, setBridgeStatus] = useState(() => getAppBridgeStatus());
  const [selectedCompanionIndex, setSelectedCompanionIndex] = useState(0);
  const [copiedCodeToast, setCopiedCodeToast] = useState(false);
  const [testActionNotice, setTestActionNotice] = useState<string | null>(null);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  // Custom Contact Form State
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactHindi, setNewContactHindi] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);

  // Calculator & Notes Tester
  const [calcInput, setCalcInput] = useState('45 * 12');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [calcSteps, setCalcSteps] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('Buy almond milk and organic fruits');

  const testMicStreamRef = useRef<MediaStream | null>(null);
  const testMicCtxRef = useRef<AudioContext | null>(null);
  const isDark = theme === 'dark';

  const isGirlfriendUnlocked = Boolean(config.secretGirlfriendUnlocked || config.persona === 'girlfriend');

  const allContacts: ContactEntry[] = [
    ...(config.customContacts || []),
    ...DEFAULT_CONTACTS,
  ];

  useEffect(() => {
    return subscribeToAppBridge((status) => {
      setBridgeStatus(status);
    });
  }, []);

  const handleUnlockSecretGirlfriend = () => {
    onChangeConfig({ secretGirlfriendUnlocked: true, persona: 'girlfriend' });
    setSecretUnlockSuccess(true);
    setTimeout(() => setSecretUnlockSuccess(false), 3000);
    if (config.soundEffects) {
      playSoundCue('pop');
    }
  };

  const handleSecretPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = secretPassInput.trim().toLowerCase();
    if (['love', 'meera', 'girlfriend', 'daksh', 'sweetheart', 'gf', 'secret', 'jaan'].includes(clean)) {
      handleUnlockSecretGirlfriend();
      setSecretPassInput('');
      setSecretUnlockError(false);
    } else {
      setSecretUnlockError(true);
      setTimeout(() => setSecretUnlockError(false), 2500);
    }
  };

  useEffect(() => {
    if (isOpen) {
      getMicrophonePermissionStatus().then((status) => {
        setMicStatus(status === 'unsupported' ? 'prompt' : status);
      });
      setBridgeStatus(getAppBridgeStatus());
    }
    return () => {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  const handleExecuteQuickAppTest = async (
    action: any,
    targetApp: SupportedTargetApp,
    query?: string,
    textToType?: string,
    phoneNumber?: string,
    contactName?: string,
    mathExpr?: string
  ) => {
    try {
      const res = await executeAppControlCommand(
        {
          intent: 'app_control',
          action,
          target_app: targetApp,
          query,
          text_to_type: textToType,
          phone_number: phoneNumber,
          contact_name: contactName,
          math_expression: mathExpr,
          note_app: config.preferredNotesApp || 'google_keep',
        },
        config.customContacts || []
      );

      setTestActionNotice(res.message);
      if (config.soundEffects) {
        playSoundCue('tool');
      }
      setTimeout(() => setTestActionNotice(null), 3500);
    } catch (err) {
      console.warn('App control test error:', err);
    }
  };

  const handleAddCustomContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    const newEntry: ContactEntry = {
      id: `custom_${Date.now()}`,
      name: newContactName.trim(),
      hindiName: newContactHindi.trim() || undefined,
      phoneNumber: newContactPhone.trim(),
      avatarColor: 'bg-indigo-500',
    };

    const updated = [newEntry, ...(config.customContacts || [])];
    onChangeConfig({ customContacts: updated });
    setNewContactName('');
    setNewContactPhone('');
    setNewContactHindi('');
    setShowAddContact(false);
  };

  const handleDeleteCustomContact = (id: string) => {
    const updated = (config.customContacts || []).filter((c) => c.id !== id);
    onChangeConfig({ customContacts: updated });
  };

  const handleRunCalculatorTest = () => {
    const res = evaluateMathExpression(calcInput);
    if (res.result !== null) {
      setCalcResult(res.formatted);
      setCalcSteps(res.steps);
      handleExecuteQuickAppTest('calculate', 'calculator', undefined, undefined, undefined, undefined, calcInput);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeToast(true);
    setTimeout(() => setCopiedCodeToast(false), 2000);
  };

  return (
    <>
      <DeviceOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onComplete={() => {
          setIsOnboardingModalOpen(false);
          onChangeConfig({ hasCompletedOnboarding: true });
        }}
      />

      <AnimatePresence>
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#1D1D1F]"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white shadow-sm">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1D1D1F]">Preferences & Full Device Control (v3)</h3>
                  <p className="text-xs text-gray-400 font-light">Calling · Calculator · MediaSession · Notepad · Voice</p>
                </div>
              </div>

              <button
                id="lila-close-settings-modal-btn"
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div
              className={`flex border-b px-4 py-2 gap-1 overflow-x-auto custom-scrollbar transition-colors ${
                isDark ? 'bg-[#14161C] border-[#22252D]' : 'bg-[#FAFAFA] border-gray-100'
              }`}
            >
              <button
                id="tab-device-control"
                onClick={() => setActiveTab('device_control')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'device_control'
                    ? isDark
                      ? 'bg-white text-black shadow-xs'
                      : 'bg-black text-white shadow-xs'
                    : isDark
                    ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Device Control (v3)</span>
              </button>

              <button
                id="tab-persona"
                onClick={() => setActiveTab('persona')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'persona'
                    ? isDark
                      ? 'bg-white text-black shadow-xs'
                      : 'bg-black text-white shadow-xs'
                    : isDark
                    ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Persona ({currentPersona.name})</span>
              </button>

              <button
                id="tab-wake-word"
                onClick={() => setActiveTab('wake_word')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'wake_word'
                    ? isDark
                      ? 'bg-white text-black shadow-xs'
                      : 'bg-black text-white shadow-xs'
                    : isDark
                    ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Wake Word & Mic</span>
              </button>

              <button
                id="tab-voice"
                onClick={() => setActiveTab('voice')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'voice'
                    ? isDark
                      ? 'bg-white text-black shadow-xs'
                      : 'bg-black text-white shadow-xs'
                    : isDark
                    ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Voice & Pitch</span>
              </button>

              <button
                id="tab-engine"
                onClick={() => setActiveTab('engine')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'engine'
                    ? isDark
                      ? 'bg-white text-black shadow-xs'
                      : 'bg-black text-white shadow-xs'
                    : isDark
                    ? 'text-gray-400 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-200/70 hover:text-black'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Engine & Protocol</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              {/* TAB 1: DEVICE CONTROL & SYSTEM AUTOMATION (v3) */}
              {activeTab === 'device_control' && (
                <div className="space-y-5">
                  {/* Permissions Health & Onboarding Hub */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 via-amber-50/50 to-orange-50/50 border border-rose-200/80 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ShieldCheck className="w-4 h-4 text-rose-600" />
                          <span className="font-bold text-xs text-rose-950">
                            Device Permissions Center (सिस्टम अनुमतियां)
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-800 font-bold">
                            Step 0 Setup
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-900/80 font-light leading-relaxed">
                          Lila requires permissions to place calls, control background media, and operate Calculator/Notepad apps.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsOnboardingModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Run Setup Flow</span>
                      </button>
                    </div>

                    {/* Permissions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {/* Microphone */}
                      <div className="p-2.5 rounded-xl bg-white/90 border border-rose-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold flex items-center gap-1 text-slate-800">
                            <Mic className="w-3.5 h-3.5 text-rose-500" />
                            <span>Microphone</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-light block">Voice Input</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${bridgeStatus.micGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {bridgeStatus.micGranted ? 'Granted' : 'Grant'}
                        </span>
                      </div>

                      {/* Phone Calling */}
                      <div className="p-2.5 rounded-xl bg-white/90 border border-rose-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold flex items-center gap-1 text-slate-800">
                            <PhoneCall className="w-3.5 h-3.5 text-blue-500" />
                            <span>Phone Calls</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-light block">ACTION_CALL</span>
                        </div>
                        <button
                          type="button"
                          onClick={requestPhonePermission}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold cursor-pointer ${bridgeStatus.phoneCallGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {bridgeStatus.phoneCallGranted ? 'Granted' : 'Allow'}
                        </button>
                      </div>

                      {/* Contacts Access */}
                      <div className="p-2.5 rounded-xl bg-white/90 border border-rose-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold flex items-center gap-1 text-slate-800">
                            <Users className="w-3.5 h-3.5 text-purple-500" />
                            <span>Contacts</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-light block">Read Names</span>
                        </div>
                        <button
                          type="button"
                          onClick={requestContactsPermission}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold cursor-pointer ${bridgeStatus.contactsGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {bridgeStatus.contactsGranted ? 'Granted' : 'Allow'}
                        </button>
                      </div>

                      {/* Notification Access */}
                      <div className="p-2.5 rounded-xl bg-white/90 border border-rose-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold flex items-center gap-1 text-slate-800">
                            <Bell className="w-3.5 h-3.5 text-amber-500" />
                            <span>Notification Access</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-light block">MediaSession</span>
                        </div>
                        <button
                          type="button"
                          onClick={requestNotificationAccessSettings}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold cursor-pointer ${bridgeStatus.notificationAccessGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {bridgeStatus.notificationAccessGranted ? 'Active' : 'Settings'}
                        </button>
                      </div>

                      {/* Accessibility Service */}
                      <div className="p-2.5 rounded-xl bg-white/90 border border-rose-100 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold flex items-center gap-1 text-slate-800">
                            <Layers className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Accessibility UI</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-light block">Calc & Notepad</span>
                        </div>
                        <button
                          type="button"
                          onClick={requestAccessibilitySettings}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold cursor-pointer ${bridgeStatus.accessibilityAccessGranted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {bridgeStatus.accessibilityAccessGranted ? 'Active' : 'Settings'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 1: Phone Calling & Voice Contacts Book */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
                        <span>Step 1: Voice Calling & Contacts (कॉल और संपर्क)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddContact(!showAddContact)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
                      </button>
                    </div>

                    {/* Add Contact Inline Form */}
                    {showAddContact && (
                      <form onSubmit={handleAddCustomContact} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Name (e.g. Doctor, Boss)"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Hindi Tag (optional)"
                            value={newContactHindi}
                            onChange={(e) => setNewContactHindi(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                          />
                          <input
                            type="tel"
                            placeholder="Phone (+91 98...)"
                            value={newContactPhone}
                            onChange={(e) => setNewContactPhone(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                            required
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
                          >
                            Save Contact
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Contacts Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allContacts.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-gray-50/50 flex items-center justify-between group"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full ${c.avatarColor || 'bg-rose-500'} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                              {c.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-semibold text-gray-900 truncate">{c.name}</span>
                                {c.hindiName && (
                                  <span className="text-[10px] text-gray-500">({c.hindiName})</span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500 font-mono block truncate">{c.phoneNumber}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleExecuteQuickAppTest('call', 'phone', undefined, undefined, c.phoneNumber, c.name)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                              title={`Call ${c.name}`}
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>Call</span>
                            </button>
                            {c.id.startsWith('custom_') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomContact(c.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* STEP 3: Built-in App Automation (Calculator & Notepad) */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-rose-500" />
                      <span>Step 3: Built-in App Automation (कैलकुलेटर और नोटपैड)</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Calculator Automation Card */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Calculator className="w-4 h-4 text-rose-600" />
                            <span>Calculator Button Automation</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">Accessibility</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-light">
                          Taps numeric & operator buttons sequentially in device Calculator.
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={calcInput}
                            onChange={(e) => setCalcInput(e.target.value)}
                            placeholder="e.g. 45 * 12 or 500 + 250"
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleRunCalculatorTest}
                            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer shrink-0"
                          >
                            Calculate
                          </button>
                        </div>
                        {calcResult && (
                          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                            <strong>Result:</strong> {calcResult} &nbsp;
                            <span className="text-[10px] text-emerald-700">
                              (Buttons: {calcSteps.join(' ')} )
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notepad Dictation Card */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Edit3 className="w-4 h-4 text-purple-600" />
                            <span>Notepad / Keep Dictation</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">Text Injection</span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-light">
                          Injects dictated text into editable nodes of Note apps.
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            placeholder="Note text to inject..."
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleExecuteQuickAppTest('type_text', 'notepad', undefined, noteInput)}
                            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer shrink-0"
                          >
                            Type Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: Media & System Quick Triggers */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-gray-600" />
                        <span>Step 2: MediaSession & Quick System Triggers</span>
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">Instant Dispatch</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleExecuteQuickAppTest('pause', 'youtube')}
                        className="p-2.5 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 mb-0.5">
                          <Pause className="w-3.5 h-3.5 text-rose-500" />
                          <span>Pause Media</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-light block">YouTube / Player</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecuteQuickAppTest('resume', 'youtube')}
                        className="p-2.5 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 mb-0.5">
                          <Play className="w-3.5 h-3.5 text-rose-500" />
                          <span>Resume Media</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-light block">Playback</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecuteQuickAppTest('next', 'spotify')}
                        className="p-2.5 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 mb-0.5">
                          <SkipForward className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Next Track</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-light block">Skip forward</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecuteQuickAppTest('volume_up', 'system')}
                        className="p-2.5 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 mb-0.5">
                          <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Volume Up</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-light block">+1 Step</span>
                      </button>
                    </div>

                    {testActionNotice && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{testActionNotice}</span>
                      </div>
                    )}
                  </div>

                  {/* Android Native Companion Project Source Code Viewer */}
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                          <Code2 className="w-4 h-4 text-gray-700" />
                          <span>Android Companion Source Files (Kotlin & XML)</span>
                        </span>
                        <span className="text-[11px] text-gray-500 font-light block">
                          Drop these into Android Studio to compile your native APK
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(ANDROID_COMPANION_FILES[selectedCompanionIndex]?.code || '')}
                        className="px-3 py-1.5 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedCodeToast ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy File</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* File Selector Tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                      {ANDROID_COMPANION_FILES.map((file, idx) => {
                        const isSelected = selectedCompanionIndex === idx;
                        return (
                          <button
                            key={file.filename}
                            type="button"
                            onClick={() => setSelectedCompanionIndex(idx)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-neutral-900 text-white font-semibold'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {file.filename}
                          </button>
                        );
                      })}
                    </div>

                    {/* Code Container */}
                    <div className="relative rounded-xl bg-[#12141A] text-gray-300 p-3 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-56 custom-scrollbar border border-[#2B2F3A]">
                      <div className="text-[9px] uppercase tracking-wider text-rose-400 font-bold mb-1.5">
                        {ANDROID_COMPANION_FILES[selectedCompanionIndex]?.description}
                      </div>
                      <pre className="whitespace-pre">{ANDROID_COMPANION_FILES[selectedCompanionIndex]?.code}</pre>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PERSONA SETTINGS */}
              {activeTab === 'persona' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(LILA_PERSONAS)
                      .filter((p) => !p.isSecret || isGirlfriendUnlocked)
                      .map((p) => {
                        const isSelected = config.persona === p.id;
                        const Icon = PERSONA_ICONS[p.id] || Heart;
                        const isGirlfriend = p.id === 'girlfriend';

                        return (
                          <div
                            key={p.id}
                            id={`persona-card-${p.id}`}
                            onClick={() => onChangeConfig({ persona: p.id })}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                              isGirlfriend
                                ? isSelected
                                  ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-200 shadow-sm'
                                  : 'bg-rose-50/30 border-rose-200 hover:bg-rose-50/60'
                                : isSelected
                                ? 'bg-white border-black ring-2 ring-black/10 shadow-sm'
                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                    isGirlfriend
                                      ? 'bg-rose-500 text-white'
                                      : isSelected
                                      ? 'bg-black text-white'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="font-semibold text-xs flex items-center gap-2">
                                    <span>{p.name}</span>
                                    <span
                                      className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${
                                        isGirlfriend
                                          ? 'bg-rose-500 text-white border-rose-500'
                                          : isSelected
                                          ? 'bg-neutral-900 text-white border-black'
                                          : 'bg-gray-100 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      {isGirlfriend ? '💖 Secret' : p.tag}
                                    </span>
                                  </div>
                                  <div className={`text-[11px] font-medium ${isGirlfriend ? 'text-rose-600' : 'text-gray-500'}`}>{p.hindiName}</div>
                                </div>
                              </div>
                              {isSelected && (
                                <Check className={`w-4 h-4 shrink-0 mt-1 ${isGirlfriend ? 'text-rose-600' : 'text-black'}`} />
                              )}
                            </div>

                            <p className={`text-[11px] leading-relaxed font-light pl-9.5 ${isGirlfriend ? 'text-rose-900/80' : 'text-gray-600'}`}>
                              {p.hindiDescription}
                            </p>

                            {/* Sample Greeting Preview */}
                            <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] pl-9.5">
                              <span className={`italic truncate max-w-[340px] ${isGirlfriend ? 'text-rose-700 font-medium' : 'text-gray-500'}`}>
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
                                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors shrink-0 ml-2 cursor-pointer ${
                                    isGirlfriend
                                      ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                                      : 'bg-gray-100 hover:bg-gray-200 text-black'
                                  }`}
                                  title="Listen to sample greeting"
                                >
                                  <Play className={`w-2.5 h-2.5 ${isGirlfriend ? 'fill-rose-700' : 'fill-black'}`} />
                                  <span>Listen</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Secret Girlfriend Mode Vault Card */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isGirlfriendUnlocked
                        ? isDark
                          ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                          : 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : isDark
                        ? 'bg-[#181A20] border-[#2B2F3A] text-gray-300'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isGirlfriendUnlocked
                              ? 'bg-rose-500 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isGirlfriendUnlocked ? (
                            <Heart className="w-3.5 h-3.5 fill-white" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold flex items-center gap-1.5">
                            <span>Secret Girlfriend Mode (सीक्रेट गर्लफ्रेंड मोड)</span>
                            {isGirlfriendUnlocked && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                                Unlocked
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] opacity-75 font-light leading-relaxed mt-0.5">
                            Ultra-sweet, romantic Hinglish with gentle care and minimal words.
                          </p>
                        </div>
                      </div>

                      {isGirlfriendUnlocked ? (
                        <button
                          type="button"
                          onClick={() => {
                            onChangeConfig({
                              persona: config.persona === 'girlfriend' ? 'friend' : 'girlfriend',
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs ${
                            config.persona === 'girlfriend'
                              ? 'bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-300'
                              : 'bg-black text-white hover:bg-neutral-800'
                          }`}
                        >
                          {config.persona === 'girlfriend' ? 'Active 💖' : 'Select'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          id="direct-unlock-girlfriend-btn"
                          onClick={handleUnlockSecretGirlfriend}
                          className="px-3 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Heart className="w-3 h-3 fill-white" />
                          <span>Unlock 💖</span>
                        </button>
                      )}
                    </div>

                    {!isGirlfriendUnlocked && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <form onSubmit={handleSecretPassSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
                          <input
                            type="text"
                            placeholder="Passcode ('love', 'meera', 'gf')..."
                            value={secretPassInput}
                            onChange={(e) => setSecretPassInput(e.target.value)}
                            className="px-2.5 py-1 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:border-rose-400 w-full sm:w-48"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-rose-100 text-[11px] font-semibold text-gray-700 dark:text-gray-300 hover:text-rose-700 transition-colors shrink-0 cursor-pointer"
                          >
                            Unlock
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: WAKE WORD SETTINGS */}
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
                          Keeps the audio pipeline permanently ready to respond to wake words and touch without browser mic permission popups.
                        </p>
                      </div>

                      {micStatus !== 'granted' && (
                        <button
                          type="button"
                          id="authorize-always-mic-btn"
                          onClick={handleAuthorizeAlwaysMic}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Allow Microphone</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Wake Word Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-gray-600" />
                        <span>Wake Word Activation</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Wake Word Listening</span>
                        <input
                          type="checkbox"
                          checked={config.wakeWordEnabled}
                          onChange={(e) => onChangeConfig({ wakeWordEnabled: e.target.checked })}
                          className="w-4 h-4 accent-black rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {LILA_WAKE_WORDS.map((w) => {
                        const isSelected = config.wakeWord === w.id;
                        return (
                          <button
                            key={w.id}
                            id={`wake-word-option-${w.id}`}
                            onClick={() => onChangeConfig({ wakeWord: w.id, wakeWordEnabled: true })}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
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
                </div>
              )}

              {/* TAB 4: VOICE & PITCH SETTINGS */}
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
                            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
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
                            className="text-[11px] text-gray-400 hover:text-black flex items-center gap-1 transition-colors cursor-pointer"
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
                              className={`px-2.5 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-medium text-[#1D1D1F] transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-black text-black" />
                          <span>Preview Pitch Tone</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ENGINE & PROTOCOL SETTINGS */}
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
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
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
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
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
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={`p-4 border-t flex justify-end transition-colors ${
                isDark ? 'bg-[#14161C] border-[#22252D]' : 'bg-white border-gray-100'
              }`}
            >
              <button
                id="lila-done-settings-btn"
                onClick={onClose}
                className={`px-6 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                  isDark
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
});
