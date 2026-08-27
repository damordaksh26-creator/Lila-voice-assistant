import { VoiceName } from '../types';

export interface VoiceOption {
  id: VoiceName;
  name: string;
  vibe: string;
  tag?: string;
  isSoft?: boolean;
}

export const LILA_VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore (Young & Sweet Girl)',
    vibe: 'Clear, vibrant, feminine & full of youthful warmth — Lila’s signature voice',
    tag: 'Signature Girl (Default)',
    isSoft: false,
  },
  {
    id: 'Puck',
    name: 'Puck (Cheerful & Cute Girl)',
    vibe: 'High-spirited, cheeky, bubbly, playful & youthful girl tone',
    tag: 'Playful Girl',
    isSoft: false,
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (Soft & Gentle Girl)',
    vibe: 'Airy, sweet, soothing, calm & delicate young feminine tone',
    tag: 'Soft & Airy',
    isSoft: true,
  },
  {
    id: 'Aoede',
    name: 'Aoede (Smooth & Melodic)',
    vibe: 'Velvety, mellow, smooth and gentle tone',
    tag: 'Smooth',
    isSoft: true,
  },
  {
    id: 'Charon',
    name: 'Charon (Deep & Warm)',
    vibe: 'Deep, calm, warm & mellow',
    tag: 'Deep',
    isSoft: true,
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (Bold & Strong)',
    vibe: 'Bold, punchy & energetic',
    tag: 'Bold',
    isSoft: false,
  },
];

export const LILA_PITCH_CONFIG = {
  min: 0.80,
  max: 1.35,
  default: 1.10, // 1.10x Default Pitch
  step: 0.01,
  presets: [
    { label: 'Mature / Warm', value: 0.90, tag: 'Warm' },
    { label: 'Natural Standard', value: 1.00, tag: 'Neutral' },
    { label: 'Sweet Young Girl ⭐ (Default 1.1x)', value: 1.10, tag: 'Default 1.1x' },
    { label: 'Cute & Cheerful', value: 1.18, tag: 'Youthful' },
    { label: 'Bubbly / Anime', value: 1.28, tag: 'Playful' },
  ],
};

export const getPitchDescription = (pitch: number): string => {
  if (pitch < 0.88) return 'Deeper & mature tone';
  if (pitch <= 0.98) return 'Natural standard register';
  if (pitch <= 1.12) return 'Signature sweet young girl tone (1.1x Default)';
  if (pitch <= 1.22) return 'Cute, bright & cheerful young girl';
  return 'Super bubbly, playful & anime style';
};

export const LILA_ACOUSTIC_PRESETS = {
  presenceFrequency: 3600, // Boost clarity & female voice presence
  presenceGain: 2.2,       // dB boost
  lowCutFrequency: 110,    // Highpass to eliminate heavy male bass rumble
  highAirFrequency: 9000,  // Subtle sparkle
  speechSynthesisRate: 1.02, // Natural lively pace
  speechSynthesisPitch: 1.10, // 1.10x default sweet pitch
  speechSynthesisVolume: 1.0,
};

