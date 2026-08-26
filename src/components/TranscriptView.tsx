import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Trash2, Volume2, Sparkles, User, ExternalLink, X } from 'lucide-react';
import { TranscriptMessage } from '../types';

interface TranscriptViewProps {
  messages: TranscriptMessage[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  onReplayAudio?: (text: string) => void;
  liveSubtitle?: { role: 'user' | 'assistant'; text: string } | null;
  showSubtitles: boolean;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  messages,
  isOpen,
  onClose,
  onClear,
  onReplayAudio,
  liveSubtitle,
  showSubtitles,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed bottom-28 inset-x-4 max-w-xl mx-auto z-20 pointer-events-none flex justify-center"
        >
          <div className="px-5 py-2.5 rounded-full bg-white/95 border border-gray-200 text-[#1D1D1F] backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex items-center gap-3">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                liveSubtitle.role === 'assistant' ? 'bg-black animate-pulse' : 'bg-gray-400'
              }`}
            />
            <p className="text-xs sm:text-sm font-medium leading-snug">
              <span className="text-gray-400 font-semibold mr-1.5 uppercase text-[10px] tracking-wider">
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
            className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full max-w-md bg-white border-l border-gray-200 h-full flex flex-col shadow-2xl text-[#1D1D1F]"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1D1D1F]">Conversation History</h3>
                    <p className="text-[11px] text-gray-400 font-light">
                      {messages.length} {messages.length === 1 ? 'turn' : 'turns'} recorded
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {messages.length > 0 && (
                    <button
                      id="lila-clear-transcript-btn"
                      onClick={onClear}
                      className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Clear History"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    id="lila-close-transcript-btn"
                    onClick={onClose}
                    className="p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm custom-scrollbar bg-[#FAFAFA]"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-gray-300" />
                    <p className="text-sm font-medium text-gray-700">No messages yet</p>
                    <p className="text-xs max-w-xs font-light">
                      Start speaking with Lila or tap any suggested invocation on the main screen.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAssistant = msg.role === 'assistant';

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                      >
                        {isAssistant && (
                          <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0 shadow-sm">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </div>
                        )}

                        <div
                          className={`max-w-[84%] rounded-2xl p-4 space-y-2 shadow-sm ${
                            isAssistant
                              ? 'bg-white border border-gray-200 text-[#1D1D1F] rounded-tl-sm'
                              : 'bg-black text-white rounded-tr-sm'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between gap-4 text-[10px] ${
                              isAssistant ? 'text-gray-400' : 'text-gray-400'
                            }`}
                          >
                            <span className="font-semibold uppercase tracking-wider">
                              {isAssistant ? 'Lila' : 'You'}
                            </span>
                            <span className="font-mono">{msg.timestamp}</span>
                          </div>

                          <p className="leading-relaxed whitespace-pre-wrap font-light">{msg.text}</p>

                          {/* Render Tool Executions if attached */}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 space-y-1.5">
                              {msg.toolCalls.map((tc, idx) => (
                                <div
                                  key={idx}
                                  className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-700 flex items-center justify-between gap-2"
                                >
                                  <span className="font-mono text-gray-900 font-medium">{tc.name}</span>
                                  {tc.result?.message && (
                                    <span className="truncate opacity-80">{tc.result.message}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Render Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                              {msg.sources.slice(0, 2).map((s, idx) => (
                                <a
                                  key={idx}
                                  href={s.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors"
                                >
                                  <span className="truncate max-w-[130px]">{s.title || s.uri}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Replay voice button for Lila */}
                          {isAssistant && onReplayAudio && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => onReplayAudio(msg.text)}
                                className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-black transition-colors"
                                title="Replay voice audio"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>Replay</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {!isAssistant && (
                          <div className="w-7 h-7 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-gray-700" />
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
};

