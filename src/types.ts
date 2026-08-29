export type VoiceState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export type VoiceName = 'Kore' | 'Aoede' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type LilaPersonaId = 'friend' | 'family' | 'counselor' | 'assistant' | 'mentor' | 'girlfriend';

export type WakeWordOption = 'hey_lila' | 'ok_lila' | 'suno_lila' | 'namaste_lila' | 'any';

export type ThemeMode = 'light' | 'dark';

export interface LilaPersona {
  id: LilaPersonaId;
  name: string;
  hindiName: string;
  role: string;
  tag: string;
  description: string;
  hindiDescription: string;
  sampleGreeting: string;
  promptModifier: string;
  isSecret?: boolean;
}

export interface WakeWordConfig {
  id: WakeWordOption;
  label: string;
  hindiLabel: string;
  phrases: string[];
}

export interface ToolCallEvent {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: {
    success: boolean;
    message: string;
    data?: any;
  };
  status: 'running' | 'completed' | 'error';
  timestamp: string;
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  toolCalls?: ToolCallEvent[];
  sources?: Array<{ title: string; uri: string }>;
}

export type AppControlAction =
  | 'call'
  | 'hang_up'
  | 'calculate'
  | 'play'
  | 'pause'
  | 'resume'
  | 'next'
  | 'previous'
  | 'volume_up'
  | 'volume_down'
  | 'open'
  | 'search'
  | 'play_media'
  | 'type_text'
  | 'set_alarm'
  | 'set_timer'
  | 'toggle_setting';

export type SupportedTargetApp =
  | 'phone'
  | 'calculator'
  | 'notepad'
  | 'keep'
  | 'samsung_notes'
  | 'youtube'
  | 'spotify'
  | 'whatsapp'
  | 'chrome'
  | 'camera'
  | 'clock'
  | 'settings'
  | 'maps'
  | 'music'
  | string;

export interface ContactEntry {
  id: string;
  name: string;
  hindiName?: string;
  relationship?: string;
  phoneNumber: string;
  avatarColor?: string;
}

export interface AppControlCommand {
  intent: 'app_control';
  action: AppControlAction;
  target_app: SupportedTargetApp;
  query?: string;
  text_to_type?: string;
  note_app?: 'google_keep' | 'samsung_notes' | 'notepad' | 'stock_notes';
  phone_number?: string;
  contact_name?: string;
  math_expression?: string;
  calculation_result?: string;
  setting_name?: 'wifi' | 'bluetooth' | 'flashlight' | 'volume';
  setting_value?: 'on' | 'off' | 'toggle' | number | string;
  timestamp?: number;
}

export type DevicePermissionType =
  | 'microphone'
  | 'phone'
  | 'contacts'
  | 'notifications'
  | 'accessibility';

export interface DevicePermissionInfo {
  id: DevicePermissionType;
  title: string;
  hindiTitle: string;
  whyNeeded: string;
  hindiWhy: string;
  category: 'runtime' | 'special_settings';
  granted: boolean;
  settingsAction?: string;
}

export interface NativeBridgeStatus {
  isAvailable: boolean;
  bridgeType: 'native_webview' | 'browser_simulated' | 'none';
  micGranted: boolean;
  phoneCallGranted: boolean;
  contactsGranted: boolean;
  notificationAccessGranted: boolean;
  accessibilityAccessGranted: boolean;
  preferredNotesApp: 'google_keep' | 'samsung_notes' | 'notepad';
  lastCommandExecuted?: AppControlCommand;
  commandHistory: AppControlCommand[];
}

export interface VoiceSettingsConfig {
  voice: VoiceName;
  pitch: number; // 0.70 to 1.35 multiplier
  persona: LilaPersonaId;
  wakeWordEnabled: boolean;
  wakeWord: WakeWordOption;
  wakeWordChime: boolean;
  continuousMode: boolean;
  soundEffects: boolean;
  showSubtitles: boolean;
  connectionMode: 'live_websocket' | 'turn_based';
  secretGirlfriendUnlocked?: boolean;
  alwaysAllowMic: boolean;
  preferredNotesApp?: 'google_keep' | 'samsung_notes' | 'notepad';
  hasCompletedOnboarding?: boolean;
  customContacts?: ContactEntry[];
  preferDirectDial?: boolean;
  nativeBridgeSimulation?: boolean;
}


