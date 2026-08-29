import {
  AppControlCommand,
  AppControlAction,
  NativeBridgeStatus,
  ContactEntry,
  DevicePermissionInfo,
  DevicePermissionType,
} from '../types';

declare global {
  interface Window {
    AndroidBridge?: {
      makeCall?: (phoneNumber: string, contactName?: string) => boolean;
      operateCalculator?: (mathExpression: string) => string;
      controlMedia?: (action: string) => boolean;
      openApp?: (targetApp: string, packageOrUrl?: string) => boolean;
      searchApp?: (targetApp: string, query: string) => boolean;
      playMedia?: (targetApp: string, query: string) => boolean;
      typeTextIntoApp?: (targetApp: string, text: string) => boolean;
      executeAppCommand?: (commandJson: string) => string;
      isNativeCompanionAvailable?: () => boolean;
      hasPhonePermission?: () => boolean;
      hasContactsPermission?: () => boolean;
      hasMicPermission?: () => boolean;
      hasNotificationAccess?: () => boolean;
      hasAccessibilityAccess?: () => boolean;
      requestPhonePermission?: () => void;
      requestContactsPermission?: () => void;
      openNotificationAccessSettings?: () => void;
      openAccessibilitySettings?: () => void;
      getContactsJson?: () => string;
      toggleFlashlight?: (enabled: boolean) => boolean;
    };
    LilaAndroidBridge?: Window['AndroidBridge'];
    AndroidAppControl?: Window['AndroidBridge'];
  }
}

export const DEFAULT_CONTACTS: ContactEntry[] = [
  {
    id: 'mom',
    name: 'Mom',
    hindiName: 'मम्मी',
    relationship: 'Mother',
    phoneNumber: '+91 98765 43210',
    avatarColor: 'bg-pink-500',
  },
  {
    id: 'dad',
    name: 'Papa',
    hindiName: 'पापा',
    relationship: 'Father',
    phoneNumber: '+91 98765 43211',
    avatarColor: 'bg-blue-500',
  },
  {
    id: 'rahul',
    name: 'Rahul',
    hindiName: 'राहुल',
    relationship: 'Brother',
    phoneNumber: '+91 98765 43212',
    avatarColor: 'bg-emerald-500',
  },
  {
    id: 'priya',
    name: 'Priya',
    hindiName: 'प्रिया',
    relationship: 'Sister',
    phoneNumber: '+91 98765 43213',
    avatarColor: 'bg-purple-500',
  },
  {
    id: 'home',
    name: 'Home',
    hindiName: 'घर',
    relationship: 'Residence',
    phoneNumber: '+91 11 2345 6789',
    avatarColor: 'bg-amber-500',
  },
  {
    id: 'emergency',
    name: 'Emergency',
    hindiName: 'इमरजेंसी',
    relationship: 'National Helpline',
    phoneNumber: '112',
    avatarColor: 'bg-red-500',
  },
];

// Helper to get all active contacts (combines custom and active default contacts)
export function getAllActiveContacts(
  customList: ContactEntry[] = [],
  removedDefaultIds: string[] = []
): ContactEntry[] {
  const activeDefaults = DEFAULT_CONTACTS.filter(
    (c) => !removedDefaultIds.includes(c.id)
  );
  return [...customList, ...activeDefaults];
}

// Helper to resolve contact from name or number
export function resolveContact(
  query: string,
  customList: ContactEntry[] = [],
  removedDefaultIds: string[] = []
): ContactEntry | null {
  const clean = query.toLowerCase().trim();
  if (!clean) return null;

  const allContacts = getAllActiveContacts(customList, removedDefaultIds);

  // 1. Direct phone number check
  const digitsOnly = clean.replace(/[^0-9+]/g, '');
  if (digitsOnly.length >= 3 && !/[a-z]/.test(clean)) {
    const existing = allContacts.find((c) => c.phoneNumber.replace(/[^0-9+]/g, '') === digitsOnly);
    if (existing) return existing;
    return {
      id: `custom_${digitsOnly}`,
      name: query,
      phoneNumber: digitsOnly,
      avatarColor: 'bg-indigo-500',
    };
  }

  // 2. Exact or partial name match
  const found = allContacts.find((c) => {
    const nameLow = c.name.toLowerCase();
    const relLow = (c.relationship || '').toLowerCase();
    const hindiLow = (c.hindiName || '').toLowerCase();

    return (
      nameLow === clean ||
      clean.includes(nameLow) ||
      nameLow.includes(clean) ||
      (relLow && clean.includes(relLow)) ||
      (hindiLow && clean.includes(hindiLow))
    );
  });

  if (found) return found;

  // 3. Fallback name-based contact
  return {
    id: `unknown_${Date.now()}`,
    name: query,
    phoneNumber: '+91 98000 00000',
    avatarColor: 'bg-slate-500',
  };
}

// Safe client-side math evaluator
export function evaluateMathExpression(expr: string): { result: number | null; formatted: string; steps: string[] } {
  try {
    let clean = expr
      .replace(/times|into|x|X|×/g, '*')
      .replace(/plus/g, '+')
      .replace(/minus/g, '-')
      .replace(/divided by|divide by|÷|\//g, '/')
      .replace(/percent of|% of/g, '* 0.01 *')
      .replace(/%/g, '* 0.01')
      .replace(/[^0-9+\-*/().\s]/g, '');

    if (!clean.trim()) {
      return { result: null, formatted: '', steps: [] };
    }

    const calc = Function(`"use strict"; return (${clean})`)();
    if (typeof calc === 'number' && !isNaN(calc) && isFinite(calc)) {
      const rounded = Number.isInteger(calc) ? calc : Number(calc.toFixed(4));
      // Generate button click sequence
      const steps = clean
        .split('')
        .filter((char) => char.trim() !== '')
        .map((c) => (c === '*' ? '×' : c === '/' ? '÷' : c));
      return { result: rounded, formatted: String(rounded), steps: [...steps, '='] };
    }
    return { result: null, formatted: '', steps: [] };
  } catch (e) {
    return { result: null, formatted: '', steps: [] };
  }
}

// Global command event listener callbacks
type BridgeListener = (status: NativeBridgeStatus) => void;
const listeners: Set<BridgeListener> = new Set();

let currentStatus: NativeBridgeStatus = {
  isAvailable: false,
  bridgeType: 'none',
  micGranted: false,
  phoneCallGranted: false,
  contactsGranted: false,
  notificationAccessGranted: false,
  accessibilityAccessGranted: false,
  preferredNotesApp: 'google_keep',
  commandHistory: [],
};

// Initialize bridge detection
export function initAppBridge(preferredNotesApp: 'google_keep' | 'samsung_notes' | 'notepad' = 'google_keep'): NativeBridgeStatus {
  const nativeBridge = window.AndroidBridge || window.LilaAndroidBridge || window.AndroidAppControl;

  if (nativeBridge && typeof nativeBridge === 'object') {
    const isAvailable = nativeBridge.isNativeCompanionAvailable ? nativeBridge.isNativeCompanionAvailable() : true;
    const micGranted = nativeBridge.hasMicPermission ? nativeBridge.hasMicPermission() : true;
    const phoneGranted = nativeBridge.hasPhonePermission ? nativeBridge.hasPhonePermission() : false;
    const contactsGranted = nativeBridge.hasContactsPermission ? nativeBridge.hasContactsPermission() : false;
    const notificationGranted = nativeBridge.hasNotificationAccess ? nativeBridge.hasNotificationAccess() : false;
    const accessibilityGranted = nativeBridge.hasAccessibilityAccess ? nativeBridge.hasAccessibilityAccess() : false;

    currentStatus = {
      ...currentStatus,
      isAvailable: Boolean(isAvailable),
      bridgeType: 'native_webview',
      micGranted: Boolean(micGranted),
      phoneCallGranted: Boolean(phoneGranted),
      contactsGranted: Boolean(contactsGranted),
      notificationAccessGranted: Boolean(notificationGranted),
      accessibilityAccessGranted: Boolean(accessibilityGranted),
      preferredNotesApp,
    };
  } else {
    // Running in browser or simulated dev mode
    currentStatus = {
      ...currentStatus,
      isAvailable: false,
      bridgeType: 'browser_simulated',
      micGranted: true, // will be confirmed by Web Audio API
      phoneCallGranted: false,
      contactsGranted: false,
      notificationAccessGranted: false,
      accessibilityAccessGranted: false,
      preferredNotesApp,
    };
  }

  notifyListeners();
  return currentStatus;
}

export function getAppBridgeStatus(): NativeBridgeStatus {
  return currentStatus;
}

export function subscribeToAppBridge(callback: BridgeListener): () => void {
  listeners.add(callback);
  callback(currentStatus);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb({ ...currentStatus });
    } catch (e) {
      console.warn('Error in bridge listener:', e);
    }
  });
}

/**
 * Get device permissions descriptor list
 */
export function getDevicePermissions(status: NativeBridgeStatus): DevicePermissionInfo[] {
  return [
    {
      id: 'microphone',
      title: 'Microphone Access',
      hindiTitle: 'माइक्रोफ़ोन एक्सेस',
      whyNeeded: 'Required for Lila to hear your voice commands, wake words, and continuous conversation.',
      hindiWhy: 'लीला को आपकी आवाज़ और वेक-वर्ड सुनने के लिए ज़रूरी है।',
      category: 'runtime',
      granted: status.micGranted,
    },
    {
      id: 'phone',
      title: 'Phone Calling',
      hindiTitle: 'फ़ोन कॉल अनुमति',
      whyNeeded: 'Allows Lila to directly place phone calls to your contacts and dial numbers on command.',
      hindiWhy: 'लीला को संपर्कों या नंबरों पर सीधे कॉल लगाने की अनुमति देता है।',
      category: 'runtime',
      granted: status.phoneCallGranted,
    },
    {
      id: 'contacts',
      title: 'Contacts Read Access',
      hindiTitle: 'संपर्क (Contacts) एक्सेस',
      whyNeeded: 'Enables Lila to resolve voice commands like "Call Mom", "Call Papa", or "Call Rahul".',
      hindiWhy: '"मम्मी को कॉल करो" या "पापा को फ़ोन लगाओ" जैसे नामों को खोजने के लिए।',
      category: 'runtime',
      granted: status.contactsGranted,
    },
    {
      id: 'notifications',
      title: 'Notification Access',
      hindiTitle: 'नोटिफ़िकेशन एक्सेस (Media Control)',
      whyNeeded: 'Enables MediaSessionManager to pause, play, and skip music/YouTube in the background.',
      hindiWhy: 'बैकग्राउंड में चल रहे यूट्यूब या स्पॉटिफ़ाई को पॉज़/प्ले करने के लिए।',
      category: 'special_settings',
      granted: status.notificationAccessGranted,
      settingsAction: 'android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS',
    },
    {
      id: 'accessibility',
      title: 'Accessibility Service',
      hindiTitle: 'एक्सेसिबिलिटी सर्विस (UI Automation)',
      whyNeeded: 'Enables Lila to read screens, operate Calculator buttons, and dictate text into Notepad.',
      hindiWhy: 'कैलकुलेटर के बटन दबाने और नोटपैड में टेक्स्ट टाइप करने के लिए।',
      category: 'special_settings',
      granted: status.accessibilityAccessGranted,
      settingsAction: 'android.settings.ACCESSIBILITY_SETTINGS',
    },
  ];
}

/**
 * Execute an app control command either via Native Android Bridge or Fallback Deep Link / Web Intent
 */
export async function executeAppControlCommand(
  command: AppControlCommand,
  customContacts: ContactEntry[] = [],
  removedDefaultContactIds: string[] = []
): Promise<{
  success: boolean;
  message: string;
  method: 'native_call' | 'native_calculator' | 'native_mediasession' | 'native_intent' | 'native_accessibility' | 'browser_tel' | 'browser_deeplink' | 'browser_simulated';
  fallbackUrl?: string;
  details?: Record<string, any>;
}> {
  const nativeBridge = window.AndroidBridge || window.LilaAndroidBridge || window.AndroidAppControl;
  const timestamp = Date.now();
  const fullCommand: AppControlCommand = { ...command, timestamp };

  // Update command history
  currentStatus = {
    ...currentStatus,
    lastCommandExecuted: fullCommand,
    commandHistory: [fullCommand, ...currentStatus.commandHistory.slice(0, 19)],
  };
  notifyListeners();

  const {
    action,
    target_app,
    query,
    text_to_type,
    phone_number,
    contact_name,
    math_expression,
    setting_name,
  } = command;

  const cleanApp = (target_app || '').toLowerCase().trim();

  // 1. If Native Android Bridge is connected
  if (nativeBridge) {
    try {
      // Direct full JSON command dispatcher if supported
      if (typeof nativeBridge.executeAppCommand === 'function') {
        const rawRes = nativeBridge.executeAppCommand(JSON.stringify(fullCommand));
        return {
          success: true,
          message: `Executed via Native Android Companion: ${action} on ${target_app}`,
          method: action === 'call' ? 'native_call' : action === 'calculate' ? 'native_calculator' : 'native_intent',
          details: { nativeResponse: rawRes },
        };
      }

      // 1A. Phone Calling (Step 1)
      if (action === 'call') {
        const targetNumber = phone_number || (contact_name ? resolveContact(contact_name, customContacts, removedDefaultContactIds)?.phoneNumber : query);
        if (targetNumber && typeof nativeBridge.makeCall === 'function') {
          const res = nativeBridge.makeCall(targetNumber, contact_name || query || '');
          return {
            success: Boolean(res),
            message: `Initiated native phone call to ${contact_name || targetNumber}`,
            method: 'native_call',
            details: { phoneNumber: targetNumber, contactName: contact_name },
          };
        }
      }

      // 1B. Calculator Automation (Step 3)
      if (action === 'calculate') {
        const expr = math_expression || query || '';
        if (expr && typeof nativeBridge.operateCalculator === 'function') {
          const res = nativeBridge.operateCalculator(expr);
          return {
            success: true,
            message: `Operated native Calculator for "${expr}": ${res}`,
            method: 'native_calculator',
            details: { expression: expr, result: res },
          };
        }
      }

      // 1C. Media Session Controls (Step 2)
      if (['play', 'pause', 'resume', 'next', 'previous', 'volume_up', 'volume_down'].includes(action)) {
        if (typeof nativeBridge.controlMedia === 'function') {
          const res = nativeBridge.controlMedia(action);
          return {
            success: Boolean(res),
            message: `Sent MediaSession.${action}() to active player (${target_app || 'system'})`,
            method: 'native_mediasession',
          };
        }
      }

      // 1D. Typing / Text Injection via Accessibility (Step 3)
      if (action === 'type_text') {
        if (typeof nativeBridge.typeTextIntoApp === 'function') {
          const res = nativeBridge.typeTextIntoApp(cleanApp || 'notepad', text_to_type || '');
          return {
            success: Boolean(res),
            message: `Injected text into ${cleanApp || 'Notepad'} via AccessibilityService`,
            method: 'native_accessibility',
          };
        }
      }

      // 1E. App Launch & Search via Intents
      if (action === 'search' || action === 'play_media') {
        if (typeof nativeBridge.searchApp === 'function') {
          const res = nativeBridge.searchApp(cleanApp, query || '');
          return {
            success: Boolean(res),
            message: `Launched search Intent for ${cleanApp} with query "${query}"`,
            method: 'native_intent',
          };
        }
      }

      if (action === 'open') {
        if (typeof nativeBridge.openApp === 'function') {
          const res = nativeBridge.openApp(cleanApp);
          return {
            success: Boolean(res),
            message: `Launched Intent for app: ${cleanApp}`,
            method: 'native_intent',
          };
        }
      }

      // 1F. Flashlight toggle
      if (action === 'toggle_setting' && setting_name === 'flashlight') {
        if (typeof nativeBridge.toggleFlashlight === 'function') {
          const res = nativeBridge.toggleFlashlight(true);
          return {
            success: Boolean(res),
            message: `Toggled device flashlight`,
            method: 'native_intent',
          };
        }
      }
    } catch (nativeErr: any) {
      console.warn('Native bridge call encountered error, falling back to browser:', nativeErr);
    }
  }

  // 2. Browser & Web Fallback Mode (with tel:, Deep Links & Web URLs)
  let fallbackUrl = '';
  let fallbackMessage = '';

  switch (action) {
    case 'call': {
      const resolved = resolveContact(contact_name || phone_number || query || '', customContacts, removedDefaultContactIds);
      const dialNum = resolved ? resolved.phoneNumber.replace(/[\s-]/g, '') : (phone_number || query || '');
      fallbackUrl = `tel:${dialNum}`;
      fallbackMessage = `Dialing ${resolved ? resolved.name : dialNum} (${dialNum})...`;
      break;
    }

    case 'calculate': {
      const mathExpr = math_expression || query || '';
      const evaluated = evaluateMathExpression(mathExpr);
      fallbackMessage = evaluated.result !== null
        ? `Calculator: ${mathExpr} = ${evaluated.formatted}`
        : `Calculated ${mathExpr}`;
      break;
    }

    case 'pause':
    case 'play':
    case 'resume':
    case 'next':
    case 'previous':
    case 'volume_up':
    case 'volume_down':
      fallbackMessage = `Dispatched ${action.toUpperCase()} command for ${cleanApp || 'media player'}. (Requires Native Companion for background player control)`;
      break;

    case 'open':
      if (cleanApp.includes('phone') || cleanApp.includes('dialer')) {
        fallbackUrl = 'tel:';
        fallbackMessage = 'Opening phone dialer...';
      } else if (cleanApp.includes('youtube')) {
        fallbackUrl = 'https://www.youtube.com';
        fallbackMessage = 'Opening YouTube...';
      } else if (cleanApp.includes('spotify')) {
        fallbackUrl = 'https://open.spotify.com';
        fallbackMessage = 'Opening Spotify...';
      } else if (cleanApp.includes('keep') || cleanApp.includes('note')) {
        fallbackUrl = 'https://keep.google.com';
        fallbackMessage = 'Opening Google Keep / Notes...';
      } else if (cleanApp.includes('whatsapp')) {
        fallbackUrl = 'https://web.whatsapp.com';
        fallbackMessage = 'Opening WhatsApp...';
      } else if (cleanApp.includes('map')) {
        fallbackUrl = 'https://maps.google.com';
        fallbackMessage = 'Opening Google Maps...';
      } else if (cleanApp.includes('chrome') || cleanApp.includes('browser')) {
        fallbackUrl = 'https://google.com';
        fallbackMessage = 'Opening browser...';
      } else if (cleanApp.includes('camera')) {
        fallbackMessage = 'Launching camera interface...';
      } else {
        fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanApp)}`;
        fallbackMessage = `Launching ${cleanApp}...`;
      }
      break;

    case 'search':
    case 'play_media': {
      const q = encodeURIComponent(query || '');
      if (cleanApp.includes('youtube')) {
        fallbackUrl = `https://www.youtube.com/results?search_query=${q}`;
        fallbackMessage = `Searching YouTube for "${query}"...`;
      } else if (cleanApp.includes('spotify')) {
        fallbackUrl = `https://open.spotify.com/search/${q}`;
        fallbackMessage = `Searching Spotify for "${query}"...`;
      } else if (cleanApp.includes('map')) {
        fallbackUrl = `https://www.google.com/maps/search/${q}`;
        fallbackMessage = `Searching Maps for "${query}"...`;
      } else {
        fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(`${cleanApp} ${query}`)}`;
        fallbackMessage = `Searching ${cleanApp} for "${query}"...`;
      }
      break;
    }

    case 'type_text': {
      const textParam = encodeURIComponent(text_to_type || '');
      fallbackUrl = `https://keep.google.com/#create?text=${textParam}`;
      fallbackMessage = `Typed text into notes: "${text_to_type}"`;
      // Also save locally for persistence
      try {
        const saved = JSON.parse(localStorage.getItem('lila_saved_notes') || '[]');
        saved.unshift({ text: text_to_type, timestamp: Date.now() });
        localStorage.setItem('lila_saved_notes', JSON.stringify(saved.slice(0, 50)));
      } catch (e) {
        // ignore
      }
      break;
    }

    default:
      fallbackMessage = `Action ${action} prepared for ${cleanApp}`;
      break;
  }

  // Auto-launch web fallback if URL is constructed and user action triggered
  if (fallbackUrl) {
    try {
      if (fallbackUrl.startsWith('tel:')) {
        window.location.href = fallbackUrl;
      } else {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.warn('Popup or link blocked, fallback URL ready:', fallbackUrl);
    }
  }

  return {
    success: true,
    message: fallbackMessage,
    method: action === 'call' ? 'browser_tel' : fallbackUrl ? 'browser_deeplink' : 'browser_simulated',
    fallbackUrl,
    details: {
      action,
      target_app: cleanApp,
      query,
      text_to_type,
      phone_number,
      contact_name,
      math_expression,
    },
  };
}

/**
 * Request Phone Call Permission
 */
export function requestPhonePermission(): void {
  const nativeBridge = window.AndroidBridge || window.LilaAndroidBridge;
  if (nativeBridge && typeof nativeBridge.requestPhonePermission === 'function') {
    nativeBridge.requestPhonePermission();
  } else {
    currentStatus.phoneCallGranted = true;
    notifyListeners();
  }
}

/**
 * Request Contacts Permission
 */
export function requestContactsPermission(): void {
  const nativeBridge = window.AndroidBridge || window.LilaAndroidBridge;
  if (nativeBridge && typeof nativeBridge.requestContactsPermission === 'function') {
    nativeBridge.requestContactsPermission();
  } else {
    currentStatus.contactsGranted = true;
    notifyListeners();
  }
}

/**
 * Open Android Settings to grant Notification Listener access (required for MediaSessionManager)
 */
export function requestNotificationAccessSettings(): void {
  const nativeBridge = window.AndroidBridge || window.LilaAndroidBridge;
  if (nativeBridge && typeof nativeBridge.openNotificationAccessSettings === 'function') {
    nativeBridge.openNotificationAccessSettings();
  } else {
    currentStatus.notificationAccessGranted = true;
    notifyListeners();
  }
}

/**
 * Open Android Settings to grant Accessibility Service (required for UI typing/tapping into Calculator and Notepad)
 */
export function requestAccessibilitySettings(): void {
  const nativeBridge = window.AndroidBridge || window.LilaAndroidBridge;
  if (nativeBridge && typeof nativeBridge.openAccessibilitySettings === 'function') {
    nativeBridge.openAccessibilitySettings();
  } else {
    currentStatus.accessibilityAccessGranted = true;
    notifyListeners();
  }
}
