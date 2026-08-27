import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Search, Clock, CheckCircle2, X } from 'lucide-react';
import { ToolCallEvent } from '../types';

interface ToolHUDProps {
  activeTools: ToolCallEvent[];
  onDismiss: (id: string) => void;
  theme?: 'light' | 'dark';
}

export const ToolHUD: React.FC<ToolHUDProps> = ({ activeTools, onDismiss, theme = 'light' }) => {
  if (activeTools.length === 0) return null;
  const isDark = theme === 'dark';

  return (
    <div id="lila-tool-hud-container" className="w-full max-w-lg mx-auto px-4 mb-4 space-y-2.5">
      <AnimatePresence>
        {activeTools.map((tool) => {
          const isSearch = tool.name === 'searchWeb';
          const isOpenWeb = tool.name === 'openWebsite';
          const isClock = tool.name === 'getDateTime';

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-colors ${
                isDark
                  ? 'bg-[#181A20] border-[#2B2F3A] text-white shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
                  : 'bg-white border-gray-200 text-[#1D1D1F]'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-[#12141A] border-[#2B2F3A]' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {isOpenWeb && <ExternalLink className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />}
                    {isSearch && <Search className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />}
                    {isClock && <Clock className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {isOpenWeb
                          ? 'Opening Website'
                          : isSearch
                          ? 'Web Search'
                          : 'Clock & Time'}
                      </span>
                      {tool.status === 'completed' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-white' : 'text-[#1D1D1F]'}`}>
                      {isOpenWeb
                        ? tool.args.url
                        : isSearch
                        ? `"${tool.args.query}"`
                        : 'System Time Check'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onDismiss(tool.id)}
                  className={`p-1 rounded-full transition-colors cursor-pointer ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-black hover:bg-gray-100'
                  }`}
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body / Result Preview */}
              {tool.result && (
                <div
                  className={`mt-3 pt-2.5 border-t text-xs space-y-2 ${
                    isDark ? 'border-white/10 text-gray-300' : 'border-gray-100 text-gray-600'
                  }`}
                >
                  <p className="leading-relaxed">{tool.result.message}</p>

                  {/* If Website Open */}
                  {isOpenWeb && tool.result.data?.url && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={tool.result.data.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
                          isDark
                            ? 'bg-white text-black hover:bg-gray-200'
                            : 'bg-black text-white hover:bg-neutral-800'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Visit {new URL(tool.result.data.url).hostname}</span>
                      </a>
                    </div>
                  )}

                  {/* If Search Sources */}
                  {isSearch && tool.result.data?.sources && tool.result.data.sources.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1.5">
                        Sources
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tool.result.data.sources.slice(0, 3).map((src: any, idx: number) => (
                          <a
                            key={idx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border truncate max-w-xs transition-colors ${
                              isDark
                                ? 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            <span className="truncate">{src.title || src.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* If Date/Time result */}
                  {isClock && tool.result.data && (
                    <div
                      className={`flex items-center gap-3 pt-1 font-mono text-xs ${
                        isDark ? 'text-gray-200' : 'text-gray-800'
                      }`}
                    >
                      <span className="font-semibold">{tool.result.data.time}</span>
                      <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>•</span>
                      <span>{tool.result.data.date}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

