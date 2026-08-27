import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Sparkles,
  Zap,
  Mic,
  ShieldCheck,
  Globe,
  X,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface AndroidAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstallPwa?: () => void;
}

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallPwa,
}) => {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'apk' | 'pwa'>('apk');

  useEffect(() => {
    if (!isOpen) {
      setDownloadStarted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadApk = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/api/download-apk';
    link.download = 'Lila-Voice-Assistant.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadStarted(false);
    }, 4000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#1D1D1F]"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-neutral-900 to-black text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
                <Smartphone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-white">
                    Lila on Android
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-semibold">
                    APK & PWA
                  </span>
                </div>
                <p className="text-xs text-gray-300 font-light">
                  High-speed voice, zero-delay microphone & full native experience
                </p>
              </div>
            </div>

            <button
              id="close-android-modal-btn"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle Tab between APK and PWA */}
          <div className="flex border-b border-gray-100 bg-[#FAFAFA] p-2 gap-2">
            <button
              id="tab-apk-download"
              onClick={() => setActiveTab('apk')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'apk'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200/60 hover:text-black'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Direct Android APK (.apk)</span>
            </button>
            <button
              id="tab-pwa-install"
              onClick={() => setActiveTab('pwa')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'pwa'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200/60 hover:text-black'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Install Web App (PWA)</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm bg-[#FAFAFA]">
            {activeTab === 'apk' ? (
              <div className="space-y-4">
                {/* Main Download Card */}
                <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3.5 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <Download className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[#1D1D1F]">
                      Lila Voice Assistant APK
                    </h4>
                    <p className="text-xs text-gray-500 font-light mt-0.5">
                      Version 2.5.0 · Size: ~16MB · Android 8.0+
                    </p>
                  </div>

                  <button
                    id="download-apk-action-btn"
                    onClick={handleDownloadApk}
                    className="w-full py-3 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {downloadStarted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Starting Download...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download APK for Android</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Installation Steps */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-2.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
                    Simple 3-Step Installation
                  </span>
                  <ol className="space-y-2 text-xs text-gray-700">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0 font-bold">
                        1
                      </span>
                      <span>
                        Tap <strong>"Download APK for Android"</strong> above to save the package.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0 font-bold">
                        2
                      </span>
                      <span>
                        Tap the downloaded notification or open your <strong>Downloads</strong> folder and tap <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">Lila-Voice-Assistant.apk</code>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0 font-bold">
                        3
                      </span>
                      <span>
                        If prompted by Android, allow <em>"Install unknown apps"</em> for your browser or files manager, then tap <strong>Install</strong>.
                      </span>
                    </li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* PWA Install Card */}
                <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3.5 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[#1D1D1F]">
                      Install as Android Web App
                    </h4>
                    <p className="text-xs text-gray-500 font-light mt-0.5">
                      Add Lila directly to your home screen with zero storage overhead.
                    </p>
                  </div>

                  {deferredPrompt && onInstallPwa ? (
                    <button
                      id="trigger-pwa-install-btn"
                      onClick={onInstallPwa}
                      className="w-full py-3 px-4 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Add to Home Screen</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-700 text-left space-y-1.5">
                      <span className="font-semibold block text-black">
                        How to install on Chrome / Firefox Android:
                      </span>
                      <p className="text-[11px] text-gray-600">
                        1. Tap the <strong>three dots (⋮)</strong> menu in the top-right corner of your browser.
                      </p>
                      <p className="text-[11px] text-gray-600">
                        2. Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                      </p>
                      <p className="text-[11px] text-gray-600">
                        3. Lila will launch fullscreen like a native Android app with full mic support!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Android Highlights */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#1D1D1F]">
                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero-Delay Mic</span>
                </div>
                <p className="text-[11px] text-gray-500 font-light leading-tight">
                  Auto-resampled 16kHz PCM audio stream directly to Gemini.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#1D1D1F]">
                  <Zap className="w-3.5 h-3.5 text-pink-600" />
                  <span>Fast Search & News</span>
                </div>
                <p className="text-[11px] text-gray-500 font-light leading-tight">
                  Instant Google Grounding in 1-2 punchy Hinglish sentences.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
            <span className="text-[11px] text-gray-400">
              Respect Guarantee: Always speaks with "Aap"
            </span>
            <button
              id="close-android-modal-done-btn"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-all cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
