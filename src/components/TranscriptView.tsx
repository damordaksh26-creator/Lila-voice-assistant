import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Trash2, Volume2, Sparkles, User, ExternalLink, X, Play, Square } from 'lucide-react';
import { TranscriptMessage, VoiceState } from '../types';

interface TranscriptViewProps {
  messages: TranscriptMessage[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  onReplayAudio?: (text: string, id?: string) => void;
  liveSubtitle?: { role: 'user' | 'assistant'; text: string } | null;
  showSubtitles: boolean;
  theme?: 'light' | 'dark';
  currentlyPlayingId?: string | null;
  voiceState?: VoiceState;
}

export const TranscriptView: React.FC<TranscriptViewProps> = React.memo(({
  messages,
  isOpen,
  onClose,
  onClear,
  onReplayAudio,
  liveSubtitle,
  showSubtitles,
  theme = 'light',
  currentlyPlayingId = null,
  voiceState = 'disconnected',
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveSubtitle]);

  return (
    <>
      {/* Live Subtitle HUD overlay (shown when closed & subtitle enabled) */}
      {showSubtitles && !isOpen && liveSubtitle && liveSubtitle.text && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-28 inset-x-4 max-w-xl mx-auto z-20 pointer-events-none flex justify-center"
        >
          <div
            className={`px-5 py-2.5 rounded-full border text-xs sm:text-sm font-medium leading-snug flex items-center gap-3 backdrop-blur-xl shadow-lg transition-all ${
              isDark
                ? 'bg-zinc-900/90 text-zinc-100 border-white/[0.12] shadow-black/40'
                : 'bg-white/95 text-zinc-900 border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                liveSubtitle.role === 'assistant'
                  ? isDark
                    ? 'bg-white animate-pulse'
                    : 'bg-zinc-900 animate-pulse'
                  : isDark
                  ? 'bg-zinc-500'
                  : 'bg-zinc-400'
              }`}
            />
            <p className="line-clamp-2">
              <span className={`font-semibold mr-1.5 uppercase text-[10px] tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {liveSubtitle.role === 'assistant' ? 'Lila' : 'You'}:
              </span>
              {liveSubtitle.text}
            </p>
          </div>
        </motion.div>
      )}

      {/* Full Transcript Drawer Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`w-full max-w-md border-l h-full flex flex-col shadow-2xl ${
                isDark
                  ? 'bg-[#0f1015] border-white/[0.08] text-zinc-100'
                  : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              {/* Drawer Header */}
              <div
                className={`p-5 border-b flex items-center justify-between backdrop-blur-md ${
                  isDark
                    ? 'bg-[#0f1015]/90 border-white/[0.08]'
                    : 'bg-white/90 border-zinc-200/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full border flex items-center justify-center ${
                      isDark
                        ? 'bg-zinc-900 border-white/[0.08] text-zinc-300'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Conversation History
                    </h3>
                    <p className={`text-[11px] font-light ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {messages.length} {messages.length === 1 ? 'turn' : 'turns'} recorded
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {messages.length > 0 && (
                    <button
                      id="lila-clear-transcript-btn"
                      onClick={onClear}
                      className={`p-2 rounded-full transition-colors cursor-pointer ${
                        isDark
                          ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40'
                          : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title="Clear History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    id="lila-close-transcript-btn"
                    onClick={onClose}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      isDark
                        ? 'text-zinc-400 hover:text-white hover:bg-white/10'
                        : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div
                ref={scrollRef}
                className={`flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm custom-scrollbar ${
                  isDark ? 'bg-[#0a0a0e]' : 'bg-[#FAFAFA]'
                }`}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        isDark
                          ? 'bg-zinc-900 border-white/[0.08] text-zinc-500'
                          : 'bg-white border-zinc-200 text-zinc-400 shadow-sm'
                      }`}
                    >
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className={`text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      No messages yet
                    </p>
                    <p className={`text-xs max-w-xs font-light ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      Start speaking with Lila or type a message in Hinglish to begin your conversation.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAssistant = msg.role === 'assistant';
                    const isPlaying = currentlyPlayingId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                      >
                        {isAssistant && (
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                              isDark ? 'bg-white text-black' : 'bg-zinc-950 text-white'
                            }`}
                          >
                            <span className="text-[10px] font-bold">L</span>
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl p-4 space-y-2.5 shadow-sm transition-all ${
                            isAssistant
                              ? isDark
                                ? 'bg-zinc-900/90 border border-white/[0.08] text-zinc-100 rounded-tl-sm'
                                : 'bg-white border border-zinc-200/80 text-zinc-900 rounded-tl-sm'
                              : isDark
                              ? 'bg-white text-zinc-950 font-medium rounded-tr-sm'
                              : 'bg-zinc-950 text-white rounded-tr-sm'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between gap-4 text-[10px] ${
                              isAssistant
                                ? isDark
                                  ? 'text-zinc-400'
                                  : 'text-zinc-500'
                                : isDark
                                ? 'text-zinc-600'
                                : 'text-zinc-400'
                            }`}
                          >
                            <span className="font-semibold uppercase tracking-wider">
                              {isAssistant ? 'Lila' : 'You'}
                            </span>
                            <span className="font-mono">{msg.timestamp}</span>
                          </div>

                          <p className="leading-relaxed whitespace-pre-wrap font-normal text-xs sm:text-sm">
                            {msg.text}
                          </p>

                          {/* Render Tool Executions if attached */}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div
                              className={`pt-2.5 border-t space-y-1.5 ${
                                isDark ? 'border-white/[0.08]' : 'border-zinc-100'
                              }`}
                            >
                              {msg.toolCalls.map((tc, idx) => (
                                <div
                                  key={idx}
                                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                                    isDark
                                      ? 'bg-white/[0.04] border-white/[0.08] text-zinc-300'
                                      : 'bg-zinc-50 border-zinc-100 text-zinc-700'
                                  }`}
                                >
                                  <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                    {tc.name}
                                  </span>
                                  {tc.result?.message && (
                                    <span className="truncate opacity-80">{tc.result.message}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Render Grounded Web Search Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div
                              className={`pt-2 border-t flex flex-wrap gap-1.5 ${
                                isDark ? 'border-white/[0.08]' : 'border-zinc-100'
                              }`}
                            >
                              {msg.sources.slice(0, 3).map((s, idx) => (
                                <a
                                  key={idx}
                                  href={s.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                                    isDark
                                      ? 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/[0.08]'
                                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                                  }`}
                                >
                                  <span className="truncate max-w-[130px]">{s.title || s.uri}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Replay voice audio button for Lila */}
                          {isAssistant && onReplayAudio && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => onReplayAudio(msg.text, msg.id)}
                                className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer px-2 py-0.5 rounded-full ${
                                  isPlaying
                                    ? isDark
                                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : isDark
                                    ? 'text-zinc-400 hover:text-white'
                                    : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                                title="Replay voice audio"
                              >
                                {isPlaying ? (
                                  <>
                                    <Square className="w-3 h-3 fill-current" />
                                    <span>Playing</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3 h-3" />
                                    <span>Replay</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {!isAssistant && (
                          <div
                            className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                              isDark
                                ? 'bg-zinc-800 border-white/[0.08] text-zinc-300'
                                : 'bg-zinc-200 border-zinc-300 text-zinc-700'
                            }`}
                          >
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});


