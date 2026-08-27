import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Trash2, Volume2, Sparkles, User, ExternalLink, X, Activity } from 'lucide-react';
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

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  messages,
  isOpen,
  onClose,
  onClear,
  onReplayAudio,
  liveSubtitle,
  showSubtitles,
  theme = 'light',
  currentlyPlayingId,
  voiceState = 'disconnected',
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';
  const isAssistantSpeaking = voiceState === 'speaking';

  // Auto-scroll to bottom of transcripts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveSubtitle, currentlyPlayingId]);

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
          <motion.div
            animate={
              isAssistantSpeaking && liveSubtitle.role === 'assistant'
                ? {
                    boxShadow: isDark
                      ? [
                          '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(244,63,94,0.3)',
                          '0 8px 30px rgba(0,0,0,0.12), 0 0 16px 2px rgba(244,63,94,0.35), 0 0 0 1.5px rgba(244,63,94,0.8)',
                          '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(244,63,94,0.3)',
                        ]
                      : [
                          '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(244,63,94,0.3)',
                          '0 8px 30px rgba(0,0,0,0.12), 0 0 14px 2px rgba(244,63,94,0.25), 0 0 0 1.5px rgba(244,63,94,0.7)',
                          '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(244,63,94,0.3)',
                        ],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`px-5 py-2.5 rounded-full border backdrop-blur-md flex items-center gap-3 transition-colors ${
              isAssistantSpeaking && liveSubtitle.role === 'assistant'
                ? isDark
                  ? 'bg-[#181A20]/95 border-rose-500/80 text-white'
                  : 'bg-white/95 border-rose-400/90 text-[#1D1D1F]'
                : isDark
                ? 'bg-[#181A20]/95 border-[#2B2F3A] text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
                : 'bg-white/95 border-gray-200 text-[#1D1D1F] shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                liveSubtitle.role === 'assistant'
                  ? isDark
                    ? 'bg-rose-400 animate-pulse'
                    : 'bg-rose-600 animate-pulse'
                  : 'bg-gray-400'
              }`}
            />
            <p className="text-xs sm:text-sm font-medium leading-snug">
              <span
                className={`font-semibold mr-1.5 uppercase text-[10px] tracking-wider ${
                  liveSubtitle.role === 'assistant'
                    ? isDark
                      ? 'text-rose-400'
                      : 'text-rose-600'
                    : 'text-gray-400'
                }`}
              >
                {liveSubtitle.role === 'assistant' ? 'Lila' : 'You'}:
              </span>
              {liveSubtitle.text}
            </p>
          </motion.div>
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
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className={`w-full max-w-md border-l h-full flex flex-col shadow-2xl transition-colors ${
                isDark
                  ? 'bg-[#12141A] border-[#22252D] text-white'
                  : 'bg-white border-gray-200 text-[#1D1D1F]'
              }`}
            >
              {/* Drawer Header */}
              <div
                className={`p-5 border-b flex items-center justify-between transition-colors ${
                  isDark ? 'bg-[#14161C] border-[#22252D]' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full border flex items-center justify-center ${
                      isDark ? 'bg-[#1C1F28] border-[#2B2F3A]' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <MessageSquare className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-[#1D1D1F]'}`}>
                      Conversation History
                    </h3>
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
                      className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
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
                        ? 'text-gray-400 hover:text-white hover:bg-white/10'
                        : 'text-gray-400 hover:text-black hover:bg-gray-100'
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
                className={`flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm custom-scrollbar transition-colors ${
                  isDark ? 'bg-[#0E1015]' : 'bg-[#FAFAFA]'
                }`}
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                    <Sparkles className="w-8 h-8 opacity-40" />
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      No messages yet
                    </p>
                    <p className="text-xs max-w-xs font-light opacity-80">
                      Start speaking with Lila or tap any suggested invocation on the main screen.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isAssistant = msg.role === 'assistant';
                    const isLastAssistantMessage =
                      isAssistant &&
                      idx === messages.map((m) => m.role).lastIndexOf('assistant');
                    const isCurrentlyPlaying =
                      isAssistant &&
                      (voiceState === 'speaking' || currentlyPlayingId === msg.id) &&
                      (msg.id === currentlyPlayingId ||
                        (voiceState === 'speaking' && !currentlyPlayingId && isLastAssistantMessage));

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                      >
                        {isAssistant && (
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${
                              isCurrentlyPlaying
                                ? isDark
                                  ? 'bg-rose-500 ring-2 ring-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.45)]'
                                  : 'bg-rose-600 ring-2 ring-rose-400/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                                : isDark
                                ? 'bg-white'
                                : 'bg-black'
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCurrentlyPlaying
                                  ? 'bg-white animate-ping'
                                  : isDark
                                  ? 'bg-black'
                                  : 'bg-white'
                              }`}
                            />
                          </div>
                        )}

                        <motion.div
                          animate={
                            isCurrentlyPlaying
                              ? {
                                  boxShadow: isDark
                                    ? [
                                        '0 0 0 1px rgba(244,63,94,0.35), 0 0 0px rgba(244,63,94,0)',
                                        '0 0 0 1.5px rgba(244,63,94,0.8), 0 0 18px 2px rgba(244,63,94,0.32)',
                                        '0 0 0 1px rgba(244,63,94,0.35), 0 0 0px rgba(244,63,94,0)',
                                      ]
                                    : [
                                        '0 0 0 1px rgba(244,63,94,0.35), 0 0 0px rgba(244,63,94,0)',
                                        '0 0 0 1.5px rgba(244,63,94,0.7), 0 0 16px 2px rgba(244,63,94,0.22)',
                                        '0 0 0 1px rgba(244,63,94,0.35), 0 0 0px rgba(244,63,94,0)',
                                      ],
                                }
                              : {}
                          }
                          transition={
                            isCurrentlyPlaying
                              ? {
                                  duration: 2.2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }
                              : { duration: 0.2 }
                          }
                          className={`max-w-[84%] rounded-2xl p-4 space-y-2 transition-all relative ${
                            isAssistant
                              ? isCurrentlyPlaying
                                ? isDark
                                  ? 'bg-[#191520] border border-rose-500/80 text-white rounded-tl-sm'
                                  : 'bg-rose-50/25 border border-rose-400/90 text-[#1D1D1F] rounded-tl-sm'
                                : isDark
                                ? 'bg-[#181A20] border border-[#2B2F3A] text-white rounded-tl-sm shadow-xs'
                                : 'bg-white border border-gray-200 text-[#1D1D1F] rounded-tl-sm shadow-xs'
                              : isDark
                              ? 'bg-white text-black font-normal rounded-tr-sm shadow-xs'
                              : 'bg-black text-white rounded-tr-sm shadow-xs'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between gap-4 text-[10px] ${
                              isAssistant
                                ? 'text-gray-400'
                                : isDark
                                ? 'text-gray-600'
                                : 'text-gray-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-semibold uppercase tracking-wider ${
                                  isCurrentlyPlaying
                                    ? isDark
                                      ? 'text-rose-400'
                                      : 'text-rose-600'
                                    : ''
                                }`}
                              >
                                {isAssistant ? 'Lila' : 'You'}
                              </span>

                              {isCurrentlyPlaying && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
                                  <span className="flex items-center gap-0.5">
                                    <span className="w-0.5 h-2 bg-rose-500 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="w-0.5 h-2.5 bg-rose-500 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="w-0.5 h-1.5 bg-rose-500 rounded-full animate-bounce [animation-delay:300ms]" />
                                  </span>
                                  <span>Speaking...</span>
                                </span>
                              )}
                            </div>
                            <span className="font-mono">{msg.timestamp}</span>
                          </div>

                          <p className="leading-relaxed whitespace-pre-wrap font-light">{msg.text}</p>

                          {/* Render Tool Executions if attached */}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div
                              className={`pt-2 border-t space-y-1.5 ${
                                isDark ? 'border-white/10' : 'border-gray-100'
                              }`}
                            >
                              {msg.toolCalls.map((tc, tIdx) => (
                                <div
                                  key={tIdx}
                                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                                    isDark
                                      ? 'bg-black/30 border-white/10 text-gray-300'
                                      : 'bg-gray-50 border-gray-100 text-gray-700'
                                  }`}
                                >
                                  <span className={`font-mono font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {tc.name}
                                  </span>
                                  {tc.result?.message && (
                                    <span className="truncate opacity-80">{tc.result.message}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Render Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div
                              className={`pt-2 border-t flex flex-wrap gap-1.5 ${
                                isDark ? 'border-white/10' : 'border-gray-100'
                              }`}
                            >
                              {msg.sources.slice(0, 2).map((s, sIdx) => (
                                <a
                                  key={sIdx}
                                  href={s.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                                    isDark
                                      ? 'bg-white/10 hover:bg-white/20 text-gray-200 border-white/15'
                                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                                  }`}
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
                                onClick={() => onReplayAudio(msg.text, msg.id)}
                                className={`inline-flex items-center gap-1.5 text-[10px] transition-all px-2.5 py-1 rounded-full cursor-pointer ${
                                  isCurrentlyPlaying
                                    ? 'bg-rose-500/15 text-rose-500 font-medium border border-rose-500/30 shadow-xs'
                                    : isDark
                                    ? 'text-gray-400 hover:text-white hover:bg-white/5'
                                    : 'text-gray-400 hover:text-black hover:bg-gray-100'
                                }`}
                                title={isCurrentlyPlaying ? 'Currently speaking' : 'Play audio with Lila'}
                              >
                                <Volume2 className={`w-3 h-3 ${isCurrentlyPlaying ? 'animate-pulse text-rose-500' : ''}`} />
                                <span>{isCurrentlyPlaying ? 'Speaking...' : 'Play'}</span>
                              </button>
                            </div>
                          )}
                        </motion.div>

                        {!isAssistant && (
                          <div
                            className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                              isDark ? 'bg-[#22252D] border-[#2B2F3A]' : 'bg-gray-200 border-gray-300'
                            }`}
                          >
                            <User className={`w-3.5 h-3.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
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


