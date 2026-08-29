import React from 'react';
import { LILA_PROMPT_SUGGESTIONS } from '../lila';
import { LilaPersonaId } from '../types';
import { Heart, Sparkles } from 'lucide-react';

interface PromptChipsProps {
  onSelectPrompt: (text: string) => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
  persona?: LilaPersonaId;
}

export const PromptChips: React.FC<PromptChipsProps> = React.memo(({
  onSelectPrompt,
  disabled,
  theme = 'light',
  persona = 'friend',
}) => {
  const isDark = theme === 'dark';
  const isGirlfriend = persona === 'girlfriend';

  // Filter prompts according to active persona or show balanced selection
  const relevantPrompts = isGirlfriend
    ? LILA_PROMPT_SUGGESTIONS.filter((p) => p.personaTarget === 'girlfriend')
    : LILA_PROMPT_SUGGESTIONS.filter((p) => !p.personaTarget || p.personaTarget !== 'girlfriend');

  const displayPrompts = (relevantPrompts.length > 0 ? relevantPrompts : LILA_PROMPT_SUGGESTIONS).slice(0, 5);

  return (
    <div id="lila-prompt-chips-container" className="w-full max-w-2xl mx-auto px-4 mt-1 select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 ${
          isGirlfriend
            ? 'text-rose-500 font-semibold'
            : isDark
            ? 'text-gray-400'
            : 'text-gray-400'
        }`}>
          {isGirlfriend ? (
            <>
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span>Sweet Prompts for Jaan</span>
            </>
          ) : (
            <span>Quick Invocations</span>
          )}
        </span>
        <span className={`text-[11px] font-light ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
          Tap or speak naturally
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {displayPrompts.map((item, idx) => {
          const Icon = item.icon || (isGirlfriend ? Heart : Sparkles);
          return (
            <button
              key={idx}
              id={`prompt-chip-${idx}`}
              disabled={disabled}
              onClick={() => onSelectPrompt(item.prompt)}
              className={`group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs border ${
                isGirlfriend
                  ? isDark
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-200 hover:bg-rose-900/60 hover:border-rose-600'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900 hover:bg-rose-100 hover:border-rose-300'
                  : isDark
                  ? 'bg-[#181A20] border-[#2B2F3A] text-gray-300 hover:text-white hover:border-gray-500 hover:bg-white/10'
                  : 'bg-white border-gray-200 text-gray-700 hover:text-black hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                  isGirlfriend
                    ? 'text-rose-500 group-hover:scale-110'
                    : isDark
                    ? 'text-gray-400 group-hover:text-white'
                    : 'text-gray-400 group-hover:text-black'
                }`}
              />
              <span className="tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});




