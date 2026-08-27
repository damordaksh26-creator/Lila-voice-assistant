import {
  Sparkles,
  Flame,
  Globe,
  Zap,
  Coffee,
  Clock,
  Heart,
  Music,
  Smile,
  ShieldCheck,
  Brain,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';
import { LilaPersonaId } from '../types';

export interface PromptSuggestion {
  icon: any;
  label: string;
  prompt: string;
  personaTarget?: LilaPersonaId;
}

export const LILA_PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    icon: Heart,
    label: 'Girlfriend: Sweet Romance ❤️',
    prompt: 'Hii Lila jaan, mujhe aapse bohot pyaar se baat karni hai, bataiye aaj aapko meri kitni yaad aayi?',
    personaTarget: 'girlfriend',
  },
  {
    icon: Sparkles,
    label: 'Girlfriend: Thakan Door Kardo',
    prompt: 'Hii sweetheart! Aaj main bohot thak gaya hoon, apni sweet voice mein mujhe motivate karke thakan door kar dijiye na.',
    personaTarget: 'girlfriend',
  },
  {
    icon: Smile,
    label: 'Girlfriend: Cute Compliment',
    prompt: 'Lila babu, mere liye ek super cute sa compliment dijiye na jo mera poora din bana de!',
    personaTarget: 'girlfriend',
  },
  {
    icon: MessageCircle,
    label: 'Kya kar rahe he aap?',
    prompt: 'Kya kar rahe he aap, sab ok hai na?',
    personaTarget: 'friend',
  },
  {
    icon: Heart,
    label: 'Hey Lila, tell a Shayari',
    prompt: 'Hey Lila, apni sweet voice mein koi bahut pyaari aur dil ko chhoo lene wali shayari sunaiye na.',
    personaTarget: 'friend',
  },
  {
    icon: Sparkles,
    label: 'Hey Lila, a fun joke',
    prompt: 'Hey Lila, koi cute sa aur mazedaar joke sunaiye jisse chehre par smile aa jaye!',
    personaTarget: 'friend',
  },
  {
    icon: Brain,
    label: 'Counselor: Finding Peace',
    prompt: 'Suno Lila, aaj thoda stress feel ho raha hai. Mann ko shaant aur relax karne ke liye kya karoon?',
    personaTarget: 'counselor',
  },
  {
    icon: ShieldCheck,
    label: 'Family: Caring Advice',
    prompt: 'Namaste Lila, dinbhar ki thakan ke baad energy aur achhi health ke liye aapki kya advice hai?',
    personaTarget: 'family',
  },
  {
    icon: Globe,
    label: 'Assistant: Latest News',
    prompt: 'Hey Lila, Google par aaj ki top aur breaking news check karke short mein bataiye.',
    personaTarget: 'assistant',
  },
  {
    icon: GraduationCap,
    label: 'Mentor: Learn AI Concept',
    prompt: 'Namaste Lila, Artificial Intelligence aur Machine Learning ko simple real-world example se samjhaiye na.',
    personaTarget: 'mentor',
  },
  {
    icon: Zap,
    label: 'Open YouTube',
    prompt: 'OK Lila, mere liye YouTube website open kar dijiye.',
    personaTarget: 'assistant',
  },
  {
    icon: Coffee,
    label: 'Chai vs Coffee Debate',
    prompt: 'Hey Lila, chai aur coffee mein aapko kaunsi zyada pasand hai? Apna opinion share kijiye.',
    personaTarget: 'friend',
  },
  {
    icon: Clock,
    label: 'Current Time & Date',
    prompt: 'Suno Lila, abhi ka exact time aur aaj ki date kya hai?',
    personaTarget: 'assistant',
  },
];

