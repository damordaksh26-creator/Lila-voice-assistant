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
  Save,
  Zap,
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

  // Local draft state for settings & save feedback
  const [draftConfig, setDraftConfig] = useState<VoiceSettingsConfig>(config);
  const [savedToast, setSavedToast] = useState(false);
  const [savedMessage, setSavedMessage] = useState('Settings saved successfully!');

  // Custom Contact Form State
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactHindi, setNewContactHindi] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);

  // Inline Contact Editing State
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [editContactHindi, setEditContactHindi] = useState('');

  // Calculator & Notes Tester
  const [calcInput, setCalcInput] = useState('45 * 12');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [calcSteps, setCalcSteps] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('Buy almond milk and organic fruits');

  const testMicStreamRef = useRef<MediaStream | null>(null);
  const testMicCtxRef = useRef<AudioContext | null>(null);
  const isDark = theme === 'dark';

  // Sync draft state whenever modal opens or external config changes
  useEffect(() => {
    if (isOpen) {
      setDraftConfig(config);
      setEditingContactId(null);
      setShowAddContact(false);
    }
  }, [isOpen, config]);

  const hasUnsavedChanges = JSON.stringify(draftConfig) !== JSON.stringify(config);

  const isGirlfriendUnlocked = Boolean(draftConfig.secretGirlfriendUnlocked || draftConfig.persona === 'girlfriend');

  const removedDefaultIds = draftConfig.removedDefaultContactIds || [];
  const activeDefaultContacts = DEFAULT_CONTACTS.filter(
    (c) => !removedDefaultIds.includes(c.id)
  );
  const allContacts: ContactEntry[] = [
    ...(draftConfig.customContacts || []),
    ...activeDefaultContacts,
  ];

  useEffect(() => {
    return subscribeToAppBridge((status) => {
      setBridgeStatus(status);
    });
  }, []);

  const updateDraft = (updates: Partial<VoiceSettingsConfig>) => {
    setDraftConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleSaveSettings = (customMessage = 'Settings saved successfully!') => {
    onChangeConfig(draftConfig);
    try {
      localStorage.setItem('lila_settings_v2', JSON.stringify(draftConfig));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
    setSavedMessage(customMessage);
    setSavedToast(true);
    if (draftConfig.soundEffects) {
      playSoundCue('pop');
    }
    setTimeout(() => {
      setSavedToast(false);
    }, 3000);
  };

  const handleUnlockSecretGirlfriend = () => {
    const updated = { ...draftConfig, secretGirlfriendUnlocked: true, persona: 'girlfriend' as LilaPersonaId };
    setDraftConfig(updated);
    onChangeConfig(updated);
    try {
      localStorage.setItem('lila_settings_v2', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    setSecretUnlockSuccess(true);
    setSavedMessage('Secret Girlfriend Mode Unlocked & Saved! 💖');
    setSavedToast(true);
    setTimeout(() => {
      setSecretUnlockSuccess(false);
      setSavedToast(false);
    }, 3000);
    if (draftConfig.soundEffects) {
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
      const updated = { ...draftConfig, alwaysAllowMic: true };
      setDraftConfig(updated);
      onChangeConfig(updated);
      try {
        localStorage.setItem('lila_settings_v2', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      setMicGrantedToast(true);
      setTimeout(() => setMicGrantedToast(false), 3000);
      if (draftConfig.soundEffects) {
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

  const currentPitch = draftConfig.pitch ?? LILA_PITCH_CONFIG.default;
  const pitchPercentDiff = Math.round((currentPitch - 1.0) * 100);
  const pitchFormattedPercent =
    pitchPercentDiff > 0 ? `+${pitchPercentDiff}%` : `${pitchPercentDiff}%`;

  const currentPersona = LILA_PERSONAS[draftConfig.persona] || LILA_PERSONAS.friend;

  const handlePreviewTone = () => {
    previewPitchTone(currentPitch);
  };

  const handleResetPitch = () => {
    updateDraft({ pitch: LILA_PITCH_CONFIG.default });
    previewPitchTone(LILA_PITCH_CONFIG.default);
  };

  const handleTestWakeWord = () => {
    setTestWakeWordState('testing');
    if (draftConfig.wakeWordChime) {
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
          note_app: draftConfig.preferredNotesApp || 'google_keep',
        },
        draftConfig.customContacts || [],
        draftConfig.removedDefaultContactIds || []
      );

      setTestActionNotice(res.message);
      if (draftConfig.soundEffects) {
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

    const updated = [newEntry, ...(draftConfig.customContacts || [])];
    const newCfg = { ...draftConfig, customContacts: updated };
    setDraftConfig(newCfg);
    onChangeConfig(newCfg);
    try {
      localStorage.setItem('lila_settings_v2', JSON.stringify(newCfg));
    } catch (err) {
      // ignore
    }

    setNewContactName('');
    setNewContactPhone('');
    setNewContactHindi('');
    setShowAddContact(false);
    handleSaveSettings(`Contact "${newEntry.name}" added and saved!`);
  };

  const handleStartEditContact = (c: ContactEntry) => {
    setEditingContactId(c.id);
    setEditContactName(c.name);
    setEditContactPhone(c.phoneNumber);
    setEditContactHindi(c.hindiName || '');
  };

  const handleCancelEditContact = () => {
    setEditingContactId(null);
    setEditContactName('');
    setEditContactPhone('');
    setEditContactHindi('');
  };

  const handleSaveEditedContact = (e: React.FormEvent, originalContact: ContactEntry) => {
    e.preventDefault();
    if (!editContactName.trim() || !editContactPhone.trim()) return;

    const isPreset = DEFAULT_CONTACTS.some((def) => def.id === originalContact.id);

    let updatedCustomContacts = [...(draftConfig.customContacts || [])];
    let updatedRemovedDefaults = [...(draftConfig.removedDefaultContactIds || [])];

    if (isPreset) {
      // Remove from default preset list and add user customized entry to customContacts
      if (!updatedRemovedDefaults.includes(originalContact.id)) {
        updatedRemovedDefaults.push(originalContact.id);
      }
      const existingCustomIdx = updatedCustomContacts.findIndex((c) => c.id === originalContact.id);
      const customizedEntry: ContactEntry = {
        ...originalContact,
        name: editContactName.trim(),
        hindiName: editContactHindi.trim() || undefined,
        phoneNumber: editContactPhone.trim(),
      };

      if (existingCustomIdx >= 0) {
        updatedCustomContacts[existingCustomIdx] = customizedEntry;
      } else {
        updatedCustomContacts.unshift(customizedEntry);
      }
    } else {
      // Existing custom contact
      updatedCustomContacts = updatedCustomContacts.map((c) =>
        c.id === originalContact.id
          ? {
              ...c,
              name: editContactName.trim(),
              hindiName: editContactHindi.trim() || undefined,
              phoneNumber: editContactPhone.trim(),
            }
          : c
      );
    }

    const newCfg: VoiceSettingsConfig = {
      ...draftConfig,
      customContacts: updatedCustomContacts,
      removedDefaultContactIds: updatedRemovedDefaults,
    };

    setDraftConfig(newCfg);
    onChangeConfig(newCfg);
    try {
      localStorage.setItem('lila_settings_v2', JSON.stringify(newCfg));
    } catch (err) {
      // ignore
    }

    setEditingContactId(null);
    handleSaveSettings(`Contact "${editContactName.trim()}" phone number updated & saved!`);
  };

  const handleDeleteContact = (contact: ContactEntry) => {
    const isCustom = contact.id.startsWith('custom_') || (draftConfig.customContacts || []).some((c) => c.id === contact.id);
    let updatedCustom = draftConfig.customContacts || [];
    let updatedRemoved = draftConfig.removedDefaultContactIds || [];

    if (isCustom) {
      updatedCustom = updatedCustom.filter((c) => c.id !== contact.id);
    } else {
      updatedRemoved = Array.from(new Set([...updatedRemoved, contact.id]));
    }

    const newCfg: VoiceSettingsConfig = {
      ...draftConfig,
      customContacts: updatedCustom,
      removedDefaultContactIds: updatedRemoved,
    };

    setDraftConfig(newCfg);
    onChangeConfig(newCfg);
    try {
      localStorage.setItem('lila_settings_v2', JSON.stringify(newCfg));
    } catch (e) {
      // ignore
    }
    handleSaveSettings(`Contact "${contact.name}" removed and saved!`);
  };

  const handleRemoveAllPresetContacts = () => {
    const allDefaultIds = DEFAULT_CONTACTS.map((c) => c.id);
    const newCfg: VoiceSettingsConfig = {
      ...draftConfig,
      removedDefaultContactIds: allDefaultIds,
    };
    setDraftConfig(newCfg);
    onChangeConfig(newCfg);
    try {
      localStorage.setItem('lila_settings_v2', JSON.stringify(newCfg));
    } catch (e) {
      // ignore
    }
    handleSaveSettings('All pre-set numbers removed and saved!');
  };

  const handleRestorePresetContacts = () => {
    const newCfg: VoiceSettingsConfig = {
      ...draftConfig,
      removedDefaultContactIds: [],
    };
    setDraftConfig(newCfg);
    onChangeConfig(newCfg);
    try {
      localStorage.setItem('lila_settings_v2', JSON.stringify(newCfg));
    } catch (e) {
      // ignore
    }
    handleSaveSettings('Pre-set default numbers restored and saved!');
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
          const updated = { ...draftConfig, hasCompletedOnboarding: true };
          setDraftConfig(updated);
          onChangeConfig(updated);
        }}
      />

      <AnimatePresence>
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className={`w-full max-w-2xl border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] transition-all backdrop-blur-xl ${
              isDark
                ? 'bg-[#101217] border-white/[0.08] text-zinc-100 shadow-black/60'
                : 'bg-white border-zinc-200 text-zinc-900 shadow-xl'
            }`}
          >
            {/* Header */}
            <div
              className={`p-4 sm:p-5 border-b flex items-center justify-between transition-colors ${
                isDark ? 'bg-[#101217] border-white/[0.08]' : 'bg-white border-zinc-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                    isDark ? 'bg-white text-black' : 'bg-black text-white'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    <span>Preferences & Full Device Control</span>
                    {hasUnsavedChanges && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-semibold animate-pulse border border-amber-500/30">
                        Unsaved Changes
                      </span>
                    )}
                  </h3>
                  <p className={`text-xs font-light ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Phone Numbers · AI & Voice Models · Personas · Protocol
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Header Save Button */}
                <button
                  id="header-save-settings-btn"
                  type="button"
                  onClick={() => handleSaveSettings()}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    hasUnsavedChanges
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/30 animate-pulse'
                      : isDark
                      ? 'bg-white/10 hover:bg-white/20 text-zinc-200'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                  }`}
                  title="Save all changes to settings"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
                </button>

                <button
                  id="lila-close-settings-modal-btn"
                  onClick={onClose}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-white/10'
                      : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Saved Notification Banner */}
            <AnimatePresence>
              {savedToast && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs z-10"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>{savedMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedToast(false)}
                    className="p-1 hover:bg-emerald-700 rounded text-emerald-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

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
                <span>Device & Phone Numbers ({allContacts.length})</span>
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
                <span>Voice & Pitch ({draftConfig.voice})</span>
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
                <span>AI Models & Protocol</span>
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
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
              {/* TAB 1: DEVICE CONTROL & PHONE NUMBERS EDIT */}
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
                        className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
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
                    </div>
                  </div>

                  {/* STEP 1: Phone Calling & Voice Contacts Book (With Edit & Save) */}
                  <div
                    className={`p-4 rounded-2xl border shadow-sm space-y-3.5 transition-colors ${
                      isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
                          <span>Step 1: Voice Calling & Phone Numbers ({allContacts.length})</span>
                        </label>
                        <p className={`text-[11px] font-light ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                          Edit any phone number, add your custom contacts, or dial with voice ("Call Mom", "Call Papa").
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Remove All Preset Numbers Button */}
                        {activeDefaultContacts.length > 0 && (
                          <button
                            type="button"
                            id="btn-remove-all-preset-numbers"
                            onClick={handleRemoveAllPresetContacts}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                              isDark
                                ? 'bg-rose-950/40 text-rose-300 border-rose-800/50 hover:bg-rose-900/60'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Remove all pre-given contacts"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Pre-set ({activeDefaultContacts.length})</span>
                          </button>
                        )}

                        {/* Restore Preset Numbers Button */}
                        {removedDefaultIds.length > 0 && (
                          <button
                            type="button"
                            id="btn-restore-preset-numbers"
                            onClick={handleRestorePresetContacts}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                              isDark
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/60'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title="Restore default pre-given contacts"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore Pre-set</span>
                          </button>
                        )}

                        {/* Add Contact Button */}
                        <button
                          type="button"
                          id="btn-add-contact-toggle"
                          onClick={() => setShowAddContact(!showAddContact)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Add Contact Inline Form */}
                    {showAddContact && (
                      <form
                        onSubmit={handleAddCustomContact}
                        className={`p-3.5 rounded-xl border space-y-2.5 ${
                          isDark
                            ? 'bg-white/[0.04] border-white/10'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Voice Contact (नया कांटेक्ट जोड़ें)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Name (e.g. Doctor, Boss)"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                              isDark
                                ? 'bg-[#181A20] border-white/10 text-white placeholder-zinc-500'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            required
                          />
                          <input
                            type="text"
                            placeholder="Hindi Tag (optional)"
                            value={newContactHindi}
                            onChange={(e) => setNewContactHindi(e.target.value)}
                            className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                              isDark
                                ? 'bg-[#181A20] border-white/10 text-white placeholder-zinc-500'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                          <input
                            type="tel"
                            placeholder="Phone (+91 98...)"
                            value={newContactPhone}
                            onChange={(e) => setNewContactPhone(e.target.value)}
                            className={`px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono ${
                              isDark
                                ? 'bg-[#181A20] border-white/10 text-white placeholder-zinc-500'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAddContact(false)}
                            className={`px-3 py-1 text-xs rounded-lg cursor-pointer ${
                              isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-black'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Contact</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Contacts List or Empty State */}
                    {allContacts.length === 0 ? (
                      <div
                        className={`p-6 rounded-xl border border-dashed text-center space-y-2.5 ${
                          isDark
                            ? 'border-white/10 bg-white/[0.01]'
                            : 'border-gray-200 bg-gray-50/50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-gray-200/60 dark:bg-white/10 text-gray-400">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
                            All pre-given mobile numbers have been removed
                          </p>
                          <p className={`text-[11px] font-light max-w-sm mx-auto mt-0.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                            You can add your own custom mobile numbers or restore the pre-set defaults anytime.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowAddContact(true)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Contact</span>
                          </button>
                          {removedDefaultIds.length > 0 && (
                            <button
                              type="button"
                              onClick={handleRestorePresetContacts}
                              className={`px-3 py-1.5 border text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors ${
                                isDark
                                  ? 'border-white/20 text-zinc-200 hover:bg-white/10'
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore Pre-set Numbers</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {allContacts.map((c) => {
                          const isPreset = DEFAULT_CONTACTS.some((def) => def.id === c.id);
                          const isEditingThis = editingContactId === c.id;

                          if (isEditingThis) {
                            return (
                              <form
                                key={c.id}
                                onSubmit={(e) => handleSaveEditedContact(e, c)}
                                className={`p-3 rounded-xl border space-y-2 col-span-1 sm:col-span-2 ${
                                  isDark
                                    ? 'bg-rose-950/20 border-rose-500/40 text-white'
                                    : 'bg-rose-50/50 border-rose-300 text-zinc-900'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs font-semibold text-rose-600">
                                  <span className="flex items-center gap-1">
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit Contact & Phone Number: {c.name}</span>
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-normal">
                                    {isPreset ? 'Will save as custom override' : 'Custom Contact'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[10px] text-zinc-400 block mb-0.5">Contact Name</label>
                                    <input
                                      type="text"
                                      value={editContactName}
                                      onChange={(e) => setEditContactName(e.target.value)}
                                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                                        isDark ? 'bg-[#181A20] border-white/20 text-white' : 'bg-white border-zinc-300'
                                      }`}
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] text-zinc-400 block mb-0.5">Hindi Tag / Relation</label>
                                    <input
                                      type="text"
                                      value={editContactHindi}
                                      onChange={(e) => setEditContactHindi(e.target.value)}
                                      placeholder="e.g. मम्मी, पापा, दोस्त"
                                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                                        isDark ? 'bg-[#181A20] border-white/20 text-white' : 'bg-white border-zinc-300'
                                      }`}
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] text-zinc-400 block mb-0.5">Phone Number</label>
                                    <input
                                      type="tel"
                                      value={editContactPhone}
                                      onChange={(e) => setEditContactPhone(e.target.value)}
                                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono ${
                                        isDark ? 'bg-[#181A20] border-white/20 text-white' : 'bg-white border-zinc-300'
                                      }`}
                                      required
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={handleCancelEditContact}
                                    className={`px-3 py-1 text-xs rounded-lg cursor-pointer ${
                                      isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-black'
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save Phone Number</span>
                                  </button>
                                </div>
                              </form>
                            );
                          }

                          return (
                            <div
                              key={c.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all group ${
                                isDark
                                  ? 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-full ${
                                    c.avatarColor || (isPreset ? 'bg-rose-500' : 'bg-indigo-500')
                                  } text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}
                                >
                                  {c.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <span className={`text-xs font-semibold truncate ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
                                      {c.name}
                                    </span>
                                    {c.hindiName && (
                                      <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                                        ({c.hindiName})
                                      </span>
                                    )}
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                                        isPreset
                                          ? isDark
                                            ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                                            : 'bg-rose-100/70 text-rose-700'
                                          : isDark
                                          ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40'
                                          : 'bg-indigo-100/70 text-indigo-700'
                                      }`}
                                    >
                                      {isPreset ? 'Pre-set' : 'Custom'}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[11px] font-mono block truncate font-medium ${
                                      isDark ? 'text-zinc-300' : 'text-gray-700'
                                    }`}
                                  >
                                    {c.phoneNumber}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0">
                                {/* Edit Button */}
                                <button
                                  type="button"
                                  id={`btn-edit-contact-${c.id}`}
                                  onClick={() => handleStartEditContact(c)}
                                  className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                    isDark
                                      ? 'text-zinc-300 hover:text-white hover:bg-white/10'
                                      : 'text-gray-600 hover:text-black hover:bg-gray-200'
                                  }`}
                                  title={`Edit phone number for ${c.name}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">Edit</span>
                                </button>

                                {/* Call Button */}
                                <button
                                  type="button"
                                  onClick={() => handleExecuteQuickAppTest('call', 'phone', undefined, undefined, c.phoneNumber, c.name)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs active:scale-95"
                                  title={`Call ${c.name} (${c.phoneNumber})`}
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>Call</span>
                                </button>

                                {/* Delete / Remove Button */}
                                <button
                                  type="button"
                                  id={`btn-remove-contact-${c.id}`}
                                  onClick={() => handleDeleteContact(c)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isDark
                                      ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40'
                                      : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title={isPreset ? `Remove pre-given number for ${c.name}` : `Delete ${c.name}`}
                                  aria-label={`Remove ${c.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* STEP 3: Built-in App Automation (Calculator & Notepad) */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] shadow-sm space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-rose-500" />
                      <span>Step 3: Built-in App Automation (कैलकुलेटर और नोटपैड)</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Calculator Automation Card */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <Calculator className="w-4 h-4 text-rose-600" />
                            <span>Calculator Button Automation</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">Accessibility</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-light">
                          Taps numeric & operator buttons sequentially in device Calculator.
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={calcInput}
                            onChange={(e) => setCalcInput(e.target.value)}
                            placeholder="e.g. 45 * 12 or 500 + 250"
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-[#181A20] font-mono dark:text-white"
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
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs">
                            <strong>Result:</strong> {calcResult} &nbsp;
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                              (Buttons: {calcSteps.join(' ')} )
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notepad Dictation Card */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <Edit3 className="w-4 h-4 text-purple-600" />
                            <span>Notepad / Keep Dictation</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">Text Injection</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-light">
                          Injects dictated text into editable nodes of Note apps.
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            placeholder="Note text to inject..."
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-[#181A20] dark:text-white"
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
                </div>
              )}

              {/* TAB 2: PERSONA SETTINGS (With Save Button) */}
              {activeTab === 'persona' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                        Select Lila's Persona (व्यक्तित्व चुनें)
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Choose how Lila speaks and connects with you. Click any persona and hit Save.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="save-persona-btn"
                      onClick={() => handleSaveSettings(`Persona "${currentPersona.name}" active & saved!`)}
                      className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Persona</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(LILA_PERSONAS)
                      .filter((p) => !p.isSecret || isGirlfriendUnlocked)
                      .map((p) => {
                        const isSelected = draftConfig.persona === p.id;
                        const Icon = PERSONA_ICONS[p.id] || Heart;
                        const isGirlfriend = p.id === 'girlfriend';

                        return (
                          <div
                            key={p.id}
                            id={`persona-card-${p.id}`}
                            onClick={() => updateDraft({ persona: p.id })}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                              isGirlfriend
                                ? isSelected
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-300 shadow-sm'
                                  : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50/60'
                                : isSelected
                                ? isDark
                                  ? 'bg-white/10 border-white ring-2 ring-white/20 shadow-md'
                                  : 'bg-white border-black ring-2 ring-black/10 shadow-sm'
                                : isDark
                                ? 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'
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
                                      ? isDark
                                        ? 'bg-white text-black'
                                        : 'bg-black text-white'
                                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
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
                                          ? isDark
                                            ? 'bg-white text-black border-white'
                                            : 'bg-neutral-900 text-white border-black'
                                          : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10'
                                      }`}
                                    >
                                      {isGirlfriend ? '💖 Secret' : p.tag}
                                    </span>
                                  </div>
                                  <div className={`text-[11px] font-medium ${isGirlfriend ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {p.hindiName}
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Selected</span>
                                  <Check className={`w-4 h-4 shrink-0 ${isGirlfriend ? 'text-rose-600' : isDark ? 'text-white' : 'text-black'}`} />
                                </div>
                              )}
                            </div>

                            <p className={`text-[11px] leading-relaxed font-light pl-9.5 ${isGirlfriend ? 'text-rose-900/80 dark:text-rose-200/80' : 'text-gray-600 dark:text-gray-300'}`}>
                              {p.hindiDescription}
                            </p>

                            {/* Sample Greeting Preview & Save */}
                            <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] pl-9.5">
                              <span className={`italic truncate max-w-[280px] ${isGirlfriend ? 'text-rose-700 dark:text-rose-300 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                                "{p.sampleGreeting}"
                              </span>
                              <div className="flex items-center gap-1">
                                {onPreviewGreeting && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateDraft({ persona: p.id });
                                      onPreviewGreeting(p.sampleGreeting);
                                    }}
                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors shrink-0 cursor-pointer ${
                                      isGirlfriend
                                        ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                                        : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-black dark:text-white'
                                    }`}
                                    title="Listen to sample greeting"
                                  >
                                    <Play className={`w-2.5 h-2.5 ${isGirlfriend ? 'fill-rose-700' : 'fill-current'}`} />
                                    <span>Listen</span>
                                  </button>
                                )}
                              </div>
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
                            const newPersona: LilaPersonaId = draftConfig.persona === 'girlfriend' ? 'friend' : 'girlfriend';
                            updateDraft({ persona: newPersona });
                            handleSaveSettings(`Persona set to ${newPersona === 'girlfriend' ? 'Girlfriend' : 'Friend'}!`);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs ${
                            draftConfig.persona === 'girlfriend'
                              ? 'bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-300'
                              : 'bg-black text-white hover:bg-neutral-800'
                          }`}
                        >
                          {draftConfig.persona === 'girlfriend' ? 'Active 💖' : 'Select & Save'}
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

              {/* TAB 3: VOICE & PITCH SETTINGS (With Save Button) */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  {/* Voice Model Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-gray-600" />
                          <span>Voice Model Selection (आवाज़ चुनें)</span>
                        </label>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light">
                          Current Voice: <span className="font-semibold text-zinc-900 dark:text-white">{draftConfig.voice}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        id="save-voice-model-btn"
                        onClick={() => handleSaveSettings(`Voice model "${draftConfig.voice}" saved!`)}
                        className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Voice</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {LILA_VOICE_OPTIONS.map((v) => {
                        const isSelected = draftConfig.voice === v.id;
                        return (
                          <button
                            key={v.id}
                            id={`voice-option-${v.id}`}
                            type="button"
                            onClick={() => updateDraft({ voice: v.id })}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-white/10 border-white text-white ring-2 ring-white/20 shadow-md'
                                  : 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                                : isDark
                                ? 'bg-white/[0.02] border-white/[0.08] text-gray-300 hover:bg-white/[0.05]'
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
                              {isSelected && <Check className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-black'}`} />}
                            </div>
                            <p className={`text-[11px] leading-snug font-light ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                              {v.vibe}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Voice Pitch Adjuster Slider */}
                  <div id="lila-pitch-adjuster-section" className="space-y-3 pt-4 border-t border-gray-200/80 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-gray-600" />
                        <span>Voice Pitch Adjuster (पिच एडजस्टर)</span>
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

                    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] shadow-sm space-y-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-[#1D1D1F] dark:text-zinc-200 font-medium">
                          <Music2 className="w-3.5 h-3.5 text-pink-600" />
                          <span>{getPitchDescription(currentPitch)}</span>
                        </div>
                        {currentPitch !== LILA_PITCH_CONFIG.default && (
                          <button
                            id="lila-reset-pitch-btn"
                            type="button"
                            onClick={handleResetPitch}
                            className="text-[11px] text-gray-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
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
                            updateDraft({ pitch: val });
                          }}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black transition-all"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                          <span>Deep ({LILA_PITCH_CONFIG.min}x)</span>
                          <span className="text-black dark:text-white font-semibold">
                            Default ({LILA_PITCH_CONFIG.default}x)
                          </span>
                          <span>High ({LILA_PITCH_CONFIG.max}x)</span>
                        </div>
                      </div>

                      {/* Quick Pitch Presets */}
                      <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Presets:</span>
                        {LILA_PITCH_CONFIG.presets.map((preset) => {
                          const isActive = Math.abs(currentPitch - preset.value) < 0.02;
                          return (
                            <button
                              key={preset.label}
                              id={`lila-pitch-preset-${preset.value}`}
                              type="button"
                              onClick={() => {
                                updateDraft({ pitch: preset.value });
                                previewPitchTone(preset.value);
                              }}
                              className={`px-2.5 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                                isActive
                                  ? 'bg-black dark:bg-white text-white dark:text-black font-semibold shadow-xs'
                                  : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-normal'
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
                          type="button"
                          onClick={handlePreviewTone}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-xs font-medium text-[#1D1D1F] dark:text-white transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current text-current" />
                          <span>Preview Pitch Tone</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ring Visualizer Style Selector */}
                  <div id="lila-visualizer-style-section" className="space-y-3 pt-4 border-t border-gray-200/80 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-gray-600" />
                        <span>Voice Orb Visualizer Style</span>
                      </label>
                      <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md ${
                        isDark ? 'bg-white/10 text-zinc-300' : 'bg-black/5 text-zinc-700'
                      }`}>
                        Fluid Canvas 60 FPS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          id: 'golden_spirals',
                          title: 'Fibonacci Golden Spiral',
                          desc: 'Concentric golden harmonic waves and radiant particle rays',
                          tag: 'Smooth Harmonic',
                        },
                        {
                          id: 'cosmic_pulse',
                          title: 'Cosmic Resonant Pulse',
                          desc: 'Pure luminous glowing aura with organic sound-reactive waves',
                          tag: 'Organic Aura',
                        },
                        {
                          id: 'quantum_orbit',
                          title: 'Quantum 3D Orbits',
                          desc: 'Multi-axis gyroscopic particle rings with orbital velocity',
                          tag: '3D Gyroscope',
                        },
                        {
                          id: 'soundwave_bars',
                          title: 'Radial Equalizer Pins',
                          desc: '48 responsive radial audio bars reactive to voice spectrum',
                          tag: 'Spectrum Pins',
                        },
                      ].map((style) => {
                        const isSelected = (draftConfig.ringAnimationStyle || 'golden_spirals') === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            id={`visualizer-style-${style.id}`}
                            onClick={() => updateDraft({ ringAnimationStyle: style.id as any })}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-white/10 border-white text-white ring-2 ring-white/20 shadow-md'
                                  : 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                                : isDark
                                ? 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:border-white/20'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-xs flex items-center gap-1.5">
                                {style.title}
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${
                                    isSelected
                                      ? isDark
                                        ? 'bg-white text-black border-white'
                                        : 'bg-black text-white border-black'
                                      : isDark
                                      ? 'bg-white/10 text-zinc-300 border-white/10'
                                      : 'bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {style.tag}
                                </span>
                              </span>
                              {isSelected && (
                                <Check className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-black'}`} />
                              )}
                            </div>
                            <p className={`text-[11px] leading-snug font-light ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                              {style.desc}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ENGINE & AI MODEL SETTINGS (With Save Button) */}
              {activeTab === 'engine' && (
                <div className="space-y-6">
                  {/* AI Model Intelligence Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-rose-500" />
                          <span>AI Intelligence Model (AI मॉडल चयन)</span>
                        </label>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Select the Gemini AI model powering Lila's conversational responses.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="save-ai-model-btn"
                        onClick={() => handleSaveSettings(`AI Model & Engine preferences saved!`)}
                        className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Engine</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          id: 'gemini-2.5-flash',
                          name: 'Gemini 2.5 Flash',
                          badge: 'Realtime Fast ⚡',
                          desc: 'Ultra-low latency streaming, snappy conversations, and sharp Hindi responses.',
                          bestFor: 'Default Live Voice',
                        },
                        {
                          id: 'gemini-3.7-flash',
                          name: 'Gemini 3.7 Flash',
                          badge: 'Hybrid Reasoning 🧠',
                          desc: 'Enhanced reasoning, witty humor, nuance, and grounded search intelligence.',
                          bestFor: 'Smartest Logic',
                        },
                        {
                          id: 'gemini-2.5-pro',
                          name: 'Gemini 2.5 Pro',
                          badge: 'Deep Knowledge 🔬',
                          desc: 'Complex multi-step coding, deep problem-solving, and expansive memory.',
                          bestFor: 'Deep Analysis',
                        },
                      ].map((model) => {
                        const isSelected = (draftConfig.aiModel || 'gemini-2.5-flash') === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            id={`ai-model-select-${model.id}`}
                            onClick={() => updateDraft({ aiModel: model.id as any })}
                            className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-white/10 border-white text-white ring-2 ring-white/20 shadow-md'
                                  : 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                                : isDark
                                ? 'bg-white/[0.02] border-white/[0.08] text-gray-300 hover:bg-white/[0.05]'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-semibold text-xs text-black dark:text-white">{model.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                              </div>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800/40 inline-block mb-1.5">
                                {model.badge}
                              </span>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug font-light">
                                {model.desc}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-2 block">
                              Best: {model.bestFor}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Protocol selection */}
                  <div className="space-y-3 pt-4 border-t border-gray-200/80 dark:border-white/10">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-gray-600" />
                      <span>Connection Protocol (कनेक्शन प्रोटोकॉल)</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => updateDraft({ connectionMode: 'live_websocket' })}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          draftConfig.connectionMode === 'live_websocket'
                            ? isDark
                              ? 'bg-white/10 border-white text-white ring-2 ring-white/20 shadow-md'
                              : 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                            : isDark
                            ? 'bg-white/[0.02] border-white/[0.08] text-gray-300'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-xs text-black dark:text-white">Gemini Live Stream</span>
                          {draftConfig.connectionMode === 'live_websocket' && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-light">
                          Real-time bidirectional 24kHz PCM16 stream with live interruptions
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateDraft({ connectionMode: 'turn_based' })}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          draftConfig.connectionMode === 'turn_based'
                            ? isDark
                              ? 'bg-white/10 border-white text-white ring-2 ring-white/20 shadow-md'
                              : 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                            : isDark
                            ? 'bg-white/[0.02] border-white/[0.08] text-gray-300'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-xs text-black dark:text-white">Smart Voice Turn</span>
                          {draftConfig.connectionMode === 'turn_based' && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-light">
                          Gemini 3.7 Flash + Grounding + 3.1 Flash TTS Synthesis
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: WAKE WORD & MIC */}
              {activeTab === 'wake_word' && (
                <div className="space-y-5">
                  {/* Always Allow Microphone for Lila Section */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.08] shadow-sm space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-xs text-[#1D1D1F] dark:text-white flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>Always Allow Lila for Microphone (हमेशा माइक चालू रखें)</span>
                          </span>
                          {draftConfig.alwaysAllowMic && micStatus === 'granted' && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                              Pre-Warmed & Allowed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-light leading-relaxed">
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
                        <span>Wake Word Activation (वेक वर्ड सक्रियण)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Wake Word Listening</span>
                        <input
                          type="checkbox"
                          checked={draftConfig.wakeWordEnabled}
                          onChange={(e) => updateDraft({ wakeWordEnabled: e.target.checked })}
                          className="w-4 h-4 accent-black rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {LILA_WAKE_WORDS.map((w) => {
                        const isSelected = draftConfig.wakeWord === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            id={`wake-word-option-${w.id}`}
                            onClick={() => updateDraft({ wakeWord: w.id, wakeWordEnabled: true })}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              !draftConfig.wakeWordEnabled
                                ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-white/[0.01] border-gray-200 dark:border-white/5'
                                : isSelected
                                ? isDark
                                  ? 'bg-white/10 border-white text-white ring-2 ring-white/20 shadow-sm'
                                  : 'bg-white border-black text-black ring-2 ring-black/10 shadow-sm'
                                : isDark
                                ? 'bg-white/[0.02] border-white/[0.08] text-gray-300 hover:bg-white/[0.05]'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-xs">{w.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-light">{w.hindiLabel}</p>
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
            </div>

            {/* Footer with Prominent Save Button */}
            <div
              className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
                isDark ? 'bg-[#14161C] border-[#22252D]' : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center gap-2 text-xs">
                {hasUnsavedChanges ? (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    <span>You have unsaved changes</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All changes saved</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  id="lila-cancel-settings-btn"
                  onClick={() => {
                    setDraftConfig(config);
                    onClose();
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                  }`}
                >
                  Cancel
                </button>

                {/* Primary Save Button */}
                <button
                  type="button"
                  id="lila-save-all-settings-btn"
                  onClick={() => handleSaveSettings()}
                  className={`px-5 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                    hasUnsavedChanges
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/30'
                      : 'bg-emerald-700 text-white hover:bg-emerald-800'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </button>

                {/* Done Button */}
                <button
                  id="lila-done-settings-btn"
                  type="button"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      handleSaveSettings();
                    }
                    onClose();
                  }}
                  className={`px-5 py-2 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                    isDark
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
});
