import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Mic,
  PhoneCall,
  Users,
  BellRing,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  X,
  Smartphone,
  Info,
} from 'lucide-react';
import { NativeBridgeStatus, DevicePermissionType } from '../types';
import {
  getAppBridgeStatus,
  subscribeToAppBridge,
  requestPhonePermission,
  requestContactsPermission,
  requestNotificationAccessSettings,
  requestAccessibilitySettings,
} from '../utils/appBridge';
import { requestMicrophoneAccess } from '../utils/audio';

interface DeviceOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  theme?: 'light' | 'dark';
}

export function DeviceOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  theme = 'light',
}: DeviceOnboardingModalProps) {
  const isDark = theme === 'dark';
  const [bridgeStatus, setBridgeStatus] = useState<NativeBridgeStatus>(getAppBridgeStatus);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isRequestingMic, setIsRequestingMic] = useState(false);

  useEffect(() => {
    return subscribeToAppBridge((status) => {
      setBridgeStatus(status);
    });
  }, []);

  if (!isOpen) return null;

  const permissions = [
    {
      id: 'microphone' as DevicePermissionType,
      title: 'Microphone Access',
      hindiTitle: 'माइक्रोफ़ोन एक्सेस',
      desc: 'Required so Lila can hear your voice queries, wake words, and continuous natural conversations.',
      hindiDesc: 'लीला को आपकी आवाज़, वेक-वर्ड और बातें सुनने के लिए आवश्यक है।',
      icon: Mic,
      granted: bridgeStatus.micGranted,
      actionLabel: 'Allow Microphone',
      actionHandler: async () => {
        setIsRequestingMic(true);
        const granted = await requestMicrophoneAccess();
        setIsRequestingMic(false);
        if (granted) {
          setBridgeStatus((prev) => ({ ...prev, micGranted: true }));
        }
      },
    },
    {
      id: 'phone' as DevicePermissionType,
      title: 'Phone Calls (Calling)',
      hindiTitle: 'फ़ोन कॉल अनुमति (Step 1)',
      desc: 'Allows Lila to dial phone numbers and place calls directly on voice commands like "Call Mom" or "Call 9876543210".',
      hindiDesc: 'लीला को संपर्कों पर सीधे कॉल लगाने की अनुमति देता है।',
      icon: PhoneCall,
      granted: bridgeStatus.phoneCallGranted,
      actionLabel: 'Grant Call Permission',
      actionHandler: () => {
        requestPhonePermission();
      },
    },
    {
      id: 'contacts' as DevicePermissionType,
      title: 'Contacts Access',
      hindiTitle: 'कांटेक्ट एक्सेस (Names)',
      desc: 'Enables Lila to resolve contact names like "Call Papa", "Call Sister", or "Call Rahul" from your address book.',
      hindiDesc: 'नामों ("मम्मी", "पापा", "राहुल") को सीधे फ़ोन नंबर से जोड़ने के लिए।',
      icon: Users,
      granted: bridgeStatus.contactsGranted,
      actionLabel: 'Grant Contacts Access',
      actionHandler: () => {
        requestContactsPermission();
      },
    },
    {
      id: 'notifications' as DevicePermissionType,
      title: 'Notification Access (Media Control)',
      hindiTitle: 'नोटिफ़िकेशन एक्सेस (Step 2)',
      desc: 'Required by MediaSessionManager so Lila can pause, play, and skip YouTube & Spotify while they run separately in the background.',
      hindiDesc: 'यूट्यूब या स्पॉटिफ़ाई को बैकग्राउंड में पॉज़/प्ले और ट्रैक बदलने के लिए।',
      icon: BellRing,
      granted: bridgeStatus.notificationAccessGranted,
      actionLabel: 'Open Notification Settings',
      isSettings: true,
      actionHandler: () => {
        requestNotificationAccessSettings();
      },
    },
    {
      id: 'accessibility' as DevicePermissionType,
      title: 'Accessibility Service (UI Actions)',
      hindiTitle: 'एक्सेसिबिलिटी सर्विस (Step 3)',
      desc: 'Enables Lila to operate Calculator buttons (e.g. "45 × 12") and inject dictated notes into Notepad & Google Keep.',
      hindiDesc: 'कैलकुलेटर के बटन दबाने और नोटपैड में सीधे नोट्स टाइप करने के लिए।',
      icon: Smartphone,
      granted: bridgeStatus.accessibilityAccessGranted,
      actionLabel: 'Open Accessibility Settings',
      isSettings: true,
      actionHandler: () => {
        requestAccessibilitySettings();
      },
    },
  ];

  const totalGranted = permissions.filter((p) => p.granted).length;
  const allGranted = totalGranted === permissions.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 dark:from-rose-950/40 dark:via-amber-950/40 dark:to-orange-950/40 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Device Control Permissions</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold">
                    v3 Upgrade
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  डिवाइस नियंत्रण और सिस्टम-वाइड एक्सेस सेटअप
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Granted: <strong className="text-rose-600 dark:text-rose-400">{totalGranted}</strong> of {permissions.length}
            </span>
            <div className="w-48 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${(totalGranted / permissions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Permissions List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
            {permissions.map((perm, idx) => {
              const IconComponent = perm.icon;
              return (
                <div key={perm.id} className={`pt-3 first:pt-0 flex items-start justify-between gap-4`}>
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        perm.granted
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {perm.title}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          ({perm.hindiTitle})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {perm.desc}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                        {perm.hindiDesc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {perm.granted ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Granted</span>
                      </span>
                    ) : (
                      <button
                        onClick={perm.actionHandler}
                        disabled={isRequestingMic && perm.id === 'microphone'}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-rose-600 dark:hover:bg-rose-500 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                      >
                        {perm.isSettings ? (
                          <>
                            <span>Settings</span>
                            <ExternalLink className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>Allow</span>
                            <ChevronRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Note for Web / Companion Mode */}
            <div className="pt-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start space-x-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="leading-relaxed">
                  <strong>Notice:</strong> When running inside the Android companion app, Lila directly invokes native phone calls, media transport, and accessibility nodes. In browser mode, Lila will gracefully open <code>tel:</code> and deep links.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline font-medium"
            >
              Continue in Standard Mode (Leave remaining)
            </button>
            <button
              onClick={() => {
                onComplete();
                onClose();
              }}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{allGranted ? 'Done & Ready' : 'Save & Continue'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
