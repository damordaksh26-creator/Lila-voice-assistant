import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, Sparkles, Radio, Loader2 } from 'lucide-react';
import { VoiceState } from '../types';

interface VoiceOrbProps {
  voiceState: VoiceState;
  audioLevel: number;
  micLevel: number;
  onToggleConnect: () => void;
  onInterrupt: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentVoice: string;
  wakeWordEnabled?: boolean;
  wakeWordLabel?: string;
  isWakeWordDetected?: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  voiceState,
  audioLevel,
  micLevel,
  onToggleConnect,
  onInterrupt,
  isMuted,
  onToggleMute,
  currentVoice,
  wakeWordEnabled = true,
  wakeWordLabel = 'Hey Lila',
  isWakeWordDetected = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic particle & waveform canvas visualizer adapted for Clean Minimalism light canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 75;

      // Determine active level depending on state
      const currentLevel =
        voiceState === 'speaking'
          ? Math.max(0.12, audioLevel)
          : voiceState === 'listening'
          ? Math.max(0.1, micLevel)
          : voiceState === 'thinking'
          ? 0.25
          : 0.04;

      phase += 0.03;

      // Draw concentric reactive rings in clean minimalist monochrome & subtle tones
      const ringCount = voiceState === 'speaking' || voiceState === 'listening' ? 4 : 2;
      for (let r = 0; r < ringCount; r++) {
        ctx.beginPath();
        const numPoints = 64;
        const ringRadius = baseRadius + r * 18 + currentLevel * 30 * (r + 1);

        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const wave =
            Math.sin(angle * (4 + r) + phase * (r % 2 === 0 ? 1 : -1)) *
            (currentLevel * 12 * (r + 1));
          const rad = ringRadius + wave;
          const x = centerX + Math.cos(angle) * rad;
          const y = centerY + Math.sin(angle) * rad;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Dynamic gradients based on Lila's state (refined for light background #FAFAFA)
        if (voiceState === 'speaking') {
          ctx.strokeStyle = `rgba(29, 29, 31, ${Math.max(0.1, (0.45 - r * 0.1) * (currentLevel + 0.3))})`;
          ctx.lineWidth = 1.5 + r * 0.3;
        } else if (voiceState === 'listening') {
          ctx.strokeStyle = `rgba(29, 29, 31, ${Math.max(0.08, (0.4 - r * 0.09) * (currentLevel + 0.3))})`;
          ctx.lineWidth = 1.5;
        } else if (voiceState === 'thinking') {
          ctx.strokeStyle = `rgba(0, 0, 0, ${0.25 - r * 0.08})`;
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = `rgba(0, 0, 0, 0.05)`;
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [voiceState, audioLevel, micLevel]);

  // Status text & color styling (Clean Minimalism style)
  const getStatusBadge = () => {
    switch (voiceState) {
      case 'connecting':
        return {
          text: 'Connecting to Lila...',
          color: 'bg-white text-gray-700 border-gray-200 shadow-sm',
          dot: 'bg-amber-500 animate-ping',
        };
      case 'listening':
        return {
          text: isMuted ? 'Microphone Muted' : 'Lila is listening (Hindi Voice)...',
          color: 'bg-white text-gray-800 border-gray-200 shadow-sm',
          dot: 'bg-black animate-pulse',
        };
      case 'thinking':
        return {
          text: 'Lila is thinking...',
          color: 'bg-white text-gray-800 border-gray-200 shadow-sm',
          dot: 'bg-black animate-spin',
        };
      case 'speaking':
        return {
          text: 'Lila is speaking — Tap orb to interrupt',
          color: 'bg-white text-gray-900 border-gray-300 shadow-sm font-semibold',
          dot: 'bg-black animate-pulse',
        };
      case 'disconnected':
      default:
        if (isWakeWordDetected) {
          return {
            text: 'Wake Word Detected! Activating...',
            color: 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-sm font-semibold animate-pulse',
            dot: 'bg-emerald-600 animate-ping',
          };
        }
        if (wakeWordEnabled) {
          return {
            text: `Say "${wakeWordLabel}" or tap to talk`,
            color: 'bg-white text-gray-700 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
            dot: 'bg-emerald-500 animate-pulse',
          };
        }
        return {
          text: 'Tap orb to start voice conversation',
          color: 'bg-white text-gray-600 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
          dot: 'bg-gray-400',
        };
    }
  };

  const status = getStatusBadge();

  return (
    <div id="lila-voice-orb-container" className="relative flex flex-col items-center justify-center py-4 select-none">
      {/* Orb Stage Canvas */}
      <div className="relative w-72 h-72 sm:w-84 sm:h-84 flex items-center justify-center">
        {/* Background Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          width={336}
          height={336}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* Ambient Subtle Aura */}
        <motion.div
          animate={{
            scale:
              voiceState === 'speaking'
                ? 1 + audioLevel * 0.35
                : voiceState === 'listening'
                ? 1 + micLevel * 0.25
                : voiceState === 'thinking'
                ? [1, 1.1, 1]
                : [1, 1.03, 1],
            opacity:
              voiceState === 'speaking'
                ? 0.45 + audioLevel * 0.2
                : voiceState === 'listening'
                ? 0.35 + micLevel * 0.2
                : voiceState === 'thinking'
                ? 0.35
                : 0.15,
          }}
          transition={{
            duration: voiceState === 'thinking' ? 1.5 : 0.2,
            repeat: voiceState === 'thinking' || voiceState === 'disconnected' ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full filter blur-2xl pointer-events-none z-0 transition-colors duration-700 ${
            voiceState === 'speaking'
              ? 'bg-neutral-400/30'
              : voiceState === 'listening'
              ? 'bg-neutral-300/40'
              : voiceState === 'thinking'
              ? 'bg-neutral-400/30'
              : 'bg-neutral-200/40'
          }`}
        />

        {/* Main Central Interactive Minimalist Orb */}
        <motion.button
          id="lila-interactive-orb-btn"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (voiceState === 'speaking' || voiceState === 'thinking') {
              onInterrupt();
            } else {
              onToggleConnect();
            }
          }}
          className={`relative z-10 w-32 h-32 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border ${
            voiceState === 'speaking'
              ? 'bg-black text-white border-black shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-4 ring-black/10'
              : voiceState === 'listening'
              ? 'bg-black text-white border-black shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-4 ring-black/10'
              : voiceState === 'thinking'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.15)] ring-4 ring-neutral-900/10'
              : voiceState === 'connecting'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.1)]'
              : 'bg-black text-white border-black hover:bg-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.1)]'
          }`}
        >
          {/* Subtle Specular Highlight */}
          <div className="absolute inset-x-4 top-2 h-6 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

          {/* Central Animated Icon / Equalizer */}
          <div className="relative flex items-center justify-center mb-1.5">
            <AnimatePresence mode="wait">
              {voiceState === 'speaking' ? (
                <motion.div
                  key="speaking-bars"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 h-7"
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: [6, Math.max(8, audioLevel * 30 * (0.8 + i * 0.15)), 6],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.25 + i * 0.05,
                        ease: 'easeInOut',
                      }}
                      className="w-1 rounded-full bg-white"
                    />
                  ))}
                </motion.div>
              ) : voiceState === 'listening' ? (
                <motion.div
                  key="listening-mic"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative flex items-center justify-center"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1 + micLevel * 0.5, 1],
                    }}
                    transition={{ repeat: Infinity, duration: 0.4 }}
                    className="absolute inset-0 rounded-full bg-white/20"
                  />
                  <Mic className="w-7 h-7 text-white" />
                </motion.div>
              ) : voiceState === 'thinking' ? (
                <motion.div
                  key="thinking-loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                </motion.div>
              ) : voiceState === 'connecting' ? (
                <motion.div
                  key="connecting-radar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Radio className="w-7 h-7 text-white animate-pulse" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle-sparkle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <Sparkles className="w-7 h-7 text-white/90" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Label inside Orb */}
          <span className="text-xs sm:text-sm font-medium tracking-tight text-white">
            {voiceState === 'disconnected' ? 'Talk to Lila' : 'LILA'}
          </span>
          <span className="text-[10px] text-gray-400 font-light">
            {voiceState === 'speaking'
              ? 'Tap to Interrupt'
              : voiceState === 'listening'
              ? 'Listening...'
              : voiceState === 'disconnected'
              ? 'Voice Assistant'
              : 'Active'}
          </span>
        </motion.button>
      </div>

      {/* Dynamic Status Capsule Pill */}
      <motion.div
        id="lila-status-capsule"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mt-2 px-4 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2.5 text-xs ${status.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        <span className="font-medium text-xs tracking-tight">{status.text}</span>
      </motion.div>

      {/* Audio Controls Bar */}
      {voiceState !== 'disconnected' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2.5"
        >
          {/* Mute Mic Button */}
          <button
            id="lila-mute-mic-btn"
            onClick={onToggleMute}
            className={`p-2.5 rounded-full border transition-all ${
              isMuted
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Interrupt / Stop Speaking Button */}
          {voiceState === 'speaking' && (
            <button
              id="lila-interrupt-btn"
              onClick={onInterrupt}
              className="px-4 py-2 rounded-full bg-white text-black border border-gray-300 text-xs font-medium hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Interrupt</span>
            </button>
          )}

          {/* End Call / Disconnect Button */}
          <button
            id="lila-disconnect-session-btn"
            onClick={onToggleConnect}
            className="px-4 py-2 rounded-full bg-white text-gray-600 border border-gray-200 text-xs font-medium hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
          >
            End Session
          </button>
        </motion.div>
      )}
    </div>
  );
};

