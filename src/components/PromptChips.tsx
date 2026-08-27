import React from 'react';
import { LILA_PROMPT_SUGGESTIONS } from '../lila';

interface PromptChipsProps {
  onSelectPrompt: (text: string) => void;
  disabled?: boolean;
}

export const PromptChips: React.FC<PromptChipsProps> = ({ onSelectPrompt, disabled }) => {
  return (
    <div id="lila-prompt-chips-container" className="w-full max-w-2xl mx-auto px-4 mt-3">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase">
          Suggested Invocations
        </span>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-light">
          Tap or speak naturally
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
        {LILA_PROMPT_SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              id={`prompt-chip-${idx}`}
              disabled={disabled}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-[#1A1A22] border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50/80 dark:hover:bg-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
              <span className="tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};



