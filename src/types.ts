export type VoiceState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export type VoiceName = 'Kore' | 'Aoede' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type LilaPersonaId = 'friend' | 'family' | 'counselor' | 'assistant' | 'mentor' | 'girlfriend';

export type WakeWordOption = 'hey_lila' | 'ok_lila' | 'suno_lila' | 'namaste_lila' | 'any';

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
  secretGirlfriendEnabled?: boolean;
  alwaysAllowMic: boolean;
}

