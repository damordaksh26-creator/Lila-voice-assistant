import { useEffect, useState } from 'react';

/**
 * Check if the current client is running on an Android device
 */
export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * Check if the application is currently running in standalone PWA / APK webview mode
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Trigger subtle Android tactile haptic vibration
 */
export function triggerHaptic(pattern: number | number[] = 25) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Ignore unsupported devices
  }
}

/**
 * Manage Screen WakeLock so Android phone doesn't sleep while user is talking to Lila
 */
let activeWakeLock: any = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  try {
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      if (!activeWakeLock) {
        activeWakeLock = await (navigator as any).wakeLock.request('screen');
        activeWakeLock.addEventListener('release', () => {
          activeWakeLock = null;
        });
      }
      return true;
    }
  } catch (err) {
    console.debug('Wake lock request note:', err);
  }
  return false;
}

export async function releaseScreenWakeLock() {
  try {
    if (activeWakeLock) {
      await activeWakeLock.release();
      activeWakeLock = null;
    }
  } catch (e) {
    activeWakeLock = null;
  }
}

/**
 * Custom React hook to capture and trigger Android PWA installation prompt
 */
export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneApp());

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent automatic browser mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (!deferredPrompt) {
      return 'unsupported';
    }
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return 'accepted';
      }
      return 'dismissed';
    } catch (e) {
      return 'unsupported';
    }
  };

  return {
    isInstallable,
    isInstalled,
    triggerInstall,
  };
}
