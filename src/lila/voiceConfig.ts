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

export interface RingAnimationOption {
  id: import('../types').RingAnimationStyle;
  name: string;
  hindiName: string;
  description: string;
  hindiDescription: string;
  tag: string;
  iconName: string;
}

export const LILA_RING_ANIMATIONS: RingAnimationOption[] = [
  {
    id: 'golden_spirals',
    name: 'Golden Fibonacci Spirals',
    hindiName: 'स्वर्ण सर्पिल (गोल्डन स्पाइरल्स)',
    description: 'Clean, dual logarithmic spiral ribbons with fluid tapered curves flowing around the orb.',
    hindiDescription: 'सुंदर और सहज स्वर्णिम सर्पिल किरणें जो केंद्र से चारों ओर सहजता से घूमती हैं।',
    tag: 'Signature',
    iconName: 'Sparkles',
  },
  {
    id: 'cosmic_pulse',
    name: 'Cosmic Wave Pulses',
    hindiName: 'कॉस्मिक तरंगें (वेव पल्स)',
    description: 'Deep breathing harmonic shockwave ripples expanding smoothly with live voice amplitude.',
    hindiDescription: 'लयबद्ध कॉस्मिक तरंगें जो आवाज़ के साथ फैलती और सांस लेती हैं।',
    tag: 'Harmonic',
    iconName: 'Radio',
  },
  {
    id: 'quantum_orbit',
    name: 'Quantum 3D Orbits',
    hindiName: 'क्वांटम 3D ऑर्बिट (ग्रह कक्षा)',
    description: 'Multi-axis tilted elliptical orbital rings with luminous quantum nodes revolving in 3D.',
    hindiDescription: '3D में झुकी हुई कक्षीय रिंग्स और घूमते हुए चमकते क्वांटम कण।',
    tag: 'Futuristic',
    iconName: 'Atom',
  },
  {
    id: 'soundwave_bars',
    name: 'Radial Soundwave Equalizer',
    hindiName: 'रेडियल साउंड स्पेक्ट्रम (इक्वलाइज़र)',
    description: 'Dynamic 360° frequency audio bars pulsating in direct sync with speech audio energy.',
    hindiDescription: '360 डिग्री में आवाज़ की आवृत्ति के साथ उछलते हुए लाइव ऑडियो बार्स।',
    tag: 'Reactive',
    iconName: 'Activity',
  },
  {
    id: 'celestial_gyro',
    name: 'Celestial Gyroscope',
    hindiName: 'जाइरोस्कोप गिम्बल (खगोलीय चक्र)',
    description: 'Three interlocking gyroscope gimbal rings rotating smoothly with parallax depth perspective.',
    hindiDescription: 'एक दूसरे से जुड़े हुए 3D जाइरोस्कोप चक्र जो निरंतर घूमते हैं।',
    tag: 'Dynamic 3D',
    iconName: 'Compass',
  },
  {
    id: 'supernova_flares',
    name: 'Supernova Solar Flares',
    hindiName: 'सुपरनोवा फ्लेयर्स (ऊर्जा ज्वाला)',
    description: 'Energetic solar corona flares and stardust sparks radiating dynamically from the center.',
    hindiDescription: 'ऊर्जावान सौर ज्वालाएं और तैरते हुए चमकते सितारे।',
    tag: 'High Energy',
    iconName: 'Flame',
  },
];

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

