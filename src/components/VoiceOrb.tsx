import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Volume2, Sparkles, Radio, Loader2, Heart } from 'lucide-react';
import { VoiceState } from '../types';

interface VoiceOrbProps {
  voiceState: VoiceState;
  audioLevel?: number;
  micLevel?: number;
  getAudioLevel?: () => number;
  getMicLevel?: () => number;
  onToggleConnect: () => void;
  onInterrupt: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentVoice: string;
  wakeWordEnabled?: boolean;
  wakeWordLabel?: string;
  isWakeWordDetected?: boolean;
  theme?: 'light' | 'dark';
  isGirlfriendMode?: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = React.memo(({
  voiceState,
  audioLevel = 0,
  micLevel = 0,
  getAudioLevel,
  getMicLevel,
  onToggleConnect,
  onInterrupt,
  isMuted,
  onToggleMute,
  currentVoice: _currentVoice,
  wakeWordEnabled = true,
  wakeWordLabel = 'Hey Lila',
  isWakeWordDetected = false,
  theme = 'light',
  isGirlfriendMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDark = theme === 'dark';

  // Keep stable getters & latest props in refs so RAF loop doesn't recreate/flicker
  const stateRef = useRef({
    getAudioLevel,
    getMicLevel,
    audioLevel,
    micLevel,
    voiceState,
    isMuted,
    isDark,
    isGirlfriendMode,
  });
  stateRef.current = {
    getAudioLevel,
    getMicLevel,
    audioLevel,
    micLevel,
    voiceState,
    isMuted,
    isDark,
    isGirlfriendMode,
  };

  // High-performance decoupled Canvas visualizer with Retina 4K scaling & ultra-smooth harmonic curves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;
    let smoothedLevel = 0.04;
    let smoothHarmonic1 = 0;
    let smoothHarmonic2 = 0;

    // Retina Hi-DPI setup
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssSize = 360;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;

    // Floating particles for girlfriend / active mode
    interface Particle {
      x: number;
      y: number;
      size: number;
      angle: number;
      speed: number;
      opacity: number;
      radius: number;
    }
    const particles: Particle[] = Array.from({ length: 16 }, () => ({
      x: 0,
      y: 0,
      size: Math.random() * 2 + 1,
      angle: Math.random() * Math.PI * 2,
      speed: (Math.random() * 0.008 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
      opacity: Math.random() * 0.6 + 0.2,
      radius: Math.random() * 40 + 95,
    }));

    const render = () => {
      const {
        getAudioLevel: getAudio,
        getMicLevel: getMic,
        audioLevel: aLevel,
        micLevel: mLevel,
        voiceState: vState,
        isMuted: muted,
        isDark: dark,
        isGirlfriendMode: gfMode,
      } = stateRef.current;

      // Sample raw amplitude
      let rawLevel = 0.03;
      if (vState === 'speaking') {
        rawLevel = getAudio ? getAudio() : aLevel;
        rawLevel = Math.max(0.12, Math.min(1.0, rawLevel * 1.1));
      } else if (vState === 'listening' && !muted) {
        rawLevel = getMic ? getMic() : mLevel;
        rawLevel = Math.max(0.08, Math.min(1.0, rawLevel * 1.05));
      } else if (vState === 'thinking') {
        rawLevel = 0.24 + Math.sin(phase * 2) * 0.08;
      }

      // Asymmetric fluid damping physics: fast silky attack, luxurious lingering release
      const attackSpeed = 0.15;
      const decaySpeed = 0.042;
      const targetDelta = rawLevel - smoothedLevel;
      smoothedLevel += targetDelta > 0 ? targetDelta * attackSpeed : targetDelta * decaySpeed;

      // Smooth multi-frequency phase oscillators
      phase += 0.024 + smoothedLevel * 0.015;
      smoothHarmonic1 += 0.018;
      smoothHarmonic2 += 0.031;

      // Clear Canvas
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssSize, cssSize);

      const centerX = cssSize / 2;
      const centerY = cssSize / 2;
      const baseRadius = 78;

      // Draw concentric multi-harmonic fluid rings (Ultra-smooth 240+ points)
      const ringCount = vState === 'speaking' || vState === 'listening' ? 5 : vState === 'thinking' ? 4 : 3;
      const numPoints = 240;

      for (let r = 0; r < ringCount; r++) {
        ctx.beginPath();
        const ringSpacing = 16 + r * 3;
        const ringRadius = baseRadius + r * ringSpacing + smoothedLevel * (32 + r * 10);
        const direction = r % 2 === 0 ? 1 : -1;
        const ringSpeed = (1 - r * 0.12) * direction;

        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;

          // 3-Octave parametric harmonic wave equation for liquid smoothness
          const harmonic1 = Math.sin(angle * (3 + r) + phase * ringSpeed);
          const harmonic2 = Math.sin(angle * (5 - (r % 2)) - smoothHarmonic1 * direction) * 0.35;
          const harmonic3 = Math.cos(angle * 2 + smoothHarmonic2) * 0.18;

          const compositeWave = (harmonic1 + harmonic2 + harmonic3) / 1.53;
          const waveHeight = compositeWave * (smoothedLevel * (12 + r * 6) + (vState === 'thinking' ? 6 : 2));

          const rad = ringRadius + waveHeight;
          const x = centerX + Math.cos(angle) * rad;
          const y = centerY + Math.sin(angle) * rad;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // High-fidelity strokes with smooth antialiased line join
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (gfMode) {
          // Girlfriend Mode: Radiant Rose, Magenta, Peach Glow
          const gfOpacity = Math.max(0.12, (0.65 - r * 0.11) * (smoothedLevel * 1.1 + 0.35));
          if (r === 0) {
            ctx.strokeStyle = dark
              ? `rgba(244, 63, 94, ${gfOpacity})`
              : `rgba(225, 29, 72, ${gfOpacity * 0.9})`;
            ctx.lineWidth = 2.2 + smoothedLevel * 1.5;
          } else if (r === 1) {
            ctx.strokeStyle = dark
              ? `rgba(251, 113, 133, ${gfOpacity})`
              : `rgba(244, 63, 94, ${gfOpacity * 0.85})`;
            ctx.lineWidth = 1.8 + smoothedLevel * 1.2;
          } else if (r === 2) {
            ctx.strokeStyle = dark
              ? `rgba(249, 168, 212, ${gfOpacity * 0.8})`
              : `rgba(251, 113, 133, ${gfOpacity * 0.75})`;
            ctx.lineWidth = 1.4;
          } else {
            ctx.strokeStyle = dark
              ? `rgba(253, 164, 175, ${gfOpacity * 0.5})`
              : `rgba(254, 205, 211, ${gfOpacity * 0.6})`;
            ctx.lineWidth = 1.1;
          }
        } else if (vState === 'speaking') {
          // Speaking: Radiant White / Charcoal Smooth Glow
          const speakOpacity = Math.max(0.1, (0.6 - r * 0.1) * (smoothedLevel + 0.32));
          ctx.strokeStyle = dark
            ? `rgba(255, 255, 255, ${speakOpacity})`
            : `rgba(29, 29, 31, ${speakOpacity * 0.85})`;
          ctx.lineWidth = 1.6 + (r === 0 ? 0.8 : 0) + smoothedLevel * 1.0;
        } else if (vState === 'listening') {
          // Listening: Soft Emerald / Charcoal
          const listenOpacity = Math.max(0.08, (0.5 - r * 0.09) * (smoothedLevel + 0.35));
          ctx.strokeStyle = dark
            ? `rgba(52, 211, 153, ${listenOpacity})`
            : `rgba(29, 29, 31, ${listenOpacity * 0.8})`;
          ctx.lineWidth = 1.5 + (r === 0 ? 0.6 : 0);
        } else if (vState === 'thinking') {
          // Thinking: Velvety Shimmer
          ctx.strokeStyle = dark
            ? `rgba(167, 139, 250, ${0.4 - r * 0.08})`
            : `rgba(109, 40, 217, ${0.3 - r * 0.06})`;
          ctx.lineWidth = 1.3;
        } else {
          // Idle / Standby: Pristine Whisper Rings
          ctx.strokeStyle = dark ? `rgba(255, 255, 255, ${0.08 - r * 0.02})` : `rgba(0, 0, 0, ${0.06 - r * 0.015})`;
          ctx.lineWidth = 1.0;
        }

        ctx.stroke();
      }

      // Render Floating Shimmer Particles for Girlfriend / Active speaking mode
      if (gfMode || vState === 'speaking' || vState === 'listening') {
        for (const p of particles) {
          p.angle += p.speed;
          const currentRadius = p.radius + smoothedLevel * 35;
          const px = centerX + Math.cos(p.angle) * currentRadius;
          const py = centerY + Math.sin(p.angle) * currentRadius;

          ctx.beginPath();
          ctx.arc(px, py, p.size * (smoothedLevel * 1.2 + 0.8), 0, Math.PI * 2);
          ctx.fillStyle = gfMode
            ? dark
              ? `rgba(251, 113, 133, ${p.opacity * (smoothedLevel * 0.8 + 0.4)})`
              : `rgba(225, 29, 72, ${p.opacity * (smoothedLevel * 0.8 + 0.3)})`
            : dark
            ? `rgba(255, 255, 255, ${p.opacity * (smoothedLevel * 0.6 + 0.2)})`
            : `rgba(29, 29, 31, ${p.opacity * (smoothedLevel * 0.6 + 0.15)})`;
          ctx.fill();
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Status text & color styling (Clean Minimalism style)
  const getStatusBadge = () => {
    switch (voiceState) {
      case 'connecting':
        return {
          text: 'Connecting to Lila...',
          color: isDark
            ? 'bg-[#181A20] text-gray-300 border-[#2B2F3A] shadow-sm'
            : 'bg-white text-gray-700 border-gray-200 shadow-sm',
          dot: 'bg-amber-500 animate-ping',
        };
      case 'listening':
        return {
          text: isMuted ? 'Microphone Muted' : 'Lila is listening (Hindi Voice)...',
          color: isDark
            ? 'bg-[#181A20] text-white border-[#2B2F3A] shadow-sm'
            : 'bg-white text-gray-800 border-gray-200 shadow-sm',
          dot: isDark ? 'bg-emerald-400 animate-pulse' : 'bg-black animate-pulse',
        };
      case 'thinking':
        return {
          text: 'Lila is thinking...',
          color: isDark
            ? 'bg-[#181A20] text-white border-[#2B2F3A] shadow-sm'
            : 'bg-white text-gray-800 border-gray-200 shadow-sm',
          dot: isDark ? 'bg-white animate-spin' : 'bg-black animate-spin',
        };
      case 'speaking':
        return {
          text: 'Lila is speaking — Tap orb to interrupt',
          color: isDark
            ? 'bg-[#181A20] text-white border-white/20 shadow-sm font-semibold'
            : 'bg-white text-gray-900 border-gray-300 shadow-sm font-semibold',
          dot: isDark ? 'bg-pink-400 animate-pulse' : 'bg-black animate-pulse',
        };
      case 'disconnected':
      default:
        if (isWakeWordDetected) {
          return {
            text: 'Wake Word Detected! Activating...',
            color: isDark
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 shadow-sm font-semibold animate-pulse'
              : 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-sm font-semibold animate-pulse',
            dot: 'bg-emerald-500 animate-ping',
          };
        }
        if (wakeWordEnabled) {
          return {
            text: `Say "${wakeWordLabel}" or tap to talk`,
            color: isDark
              ? 'bg-[#181A20] text-gray-300 border-[#2B2F3A] shadow-sm'
              : 'bg-white text-gray-700 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
            dot: 'bg-emerald-500 animate-pulse',
          };
        }
        return {
          text: 'Tap orb to start voice conversation',
          color: isDark
            ? 'bg-[#181A20] text-gray-400 border-[#2B2F3A] shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
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
          className="absolute inset-0 w-full h-full pointer-events-none z-0 will-change-transform"
        />

        {/* Ambient Subtle Aura (CSS Transitions for 60fps efficiency) */}
        <div
          className={`absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full filter blur-2xl pointer-events-none z-0 transition-all duration-700 ${
            isGirlfriendMode
              ? isDark
                ? 'bg-rose-500/30 scale-115 opacity-75 animate-pulse'
                : 'bg-rose-300/45 scale-115 opacity-65 animate-pulse'
              : voiceState === 'speaking'
              ? isDark
                ? 'bg-indigo-500/25 scale-110 opacity-70 animate-pulse'
                : 'bg-neutral-400/30 scale-110 opacity-60 animate-pulse'
              : voiceState === 'listening'
              ? isDark
                ? 'bg-emerald-500/25 scale-105 opacity-60'
                : 'bg-neutral-300/40 scale-105 opacity-50'
              : voiceState === 'thinking'
              ? isDark
                ? 'bg-violet-500/25 scale-110 opacity-50 animate-pulse'
                : 'bg-neutral-400/30 scale-110 opacity-40 animate-pulse'
              : isDark
              ? 'bg-white/10 scale-100 opacity-20'
              : 'bg-neutral-200/40 scale-100 opacity-30'
          }`}
        />

        {/* Main Central Interactive Minimalist Orb */}
        <motion.button
          id="lila-interactive-orb-btn"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (voiceState === 'speaking' || voiceState === 'thinking') {
              onInterrupt();
            } else {
              onToggleConnect();
            }
          }}
          className={`relative z-10 w-32 h-32 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border ${
            isGirlfriendMode
              ? isDark
                ? 'bg-gradient-to-b from-[#2D141E] via-[#1D0C14] to-[#12070C] text-white border-rose-500/40 hover:border-rose-400/60 shadow-[0_12px_40px_rgba(244,63,94,0.3)] ring-4 ring-rose-500/10'
                : 'bg-gradient-to-b from-[#1E1015] via-[#140B0E] to-black text-white border-rose-400/50 shadow-[0_12px_40px_rgba(225,29,72,0.25)] ring-4 ring-rose-500/15'
              : isDark
              ? 'bg-gradient-to-b from-[#1C1F28] via-[#14161C] to-[#0A0B0E] text-white border-white/20 hover:border-white/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)]'
              : voiceState === 'speaking' || voiceState === 'listening'
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
                        height: [6, 22 + (i % 2 === 0 ? 6 : 0), 6],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.35 + i * 0.08,
                        ease: 'easeInOut',
                      }}
                      className={`w-1 rounded-full will-change-transform ${
                        isGirlfriendMode ? 'bg-rose-300' : 'bg-white'
                      }`}
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
                  <div
                    className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
                      isGirlfriendMode ? 'bg-rose-400' : 'bg-white/20'
                    }`}
                  />
                  <Mic
                    className={`w-7 h-7 relative z-10 ${
                      isGirlfriendMode ? 'text-rose-300' : 'text-white'
                    }`}
                  />
                </motion.div>
              ) : voiceState === 'thinking' ? (
                <motion.div
                  key="thinking-loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Loader2
                    className={`w-7 h-7 animate-spin ${
                      isGirlfriendMode ? 'text-rose-300' : 'text-white'
                    }`}
                  />
                </motion.div>
              ) : voiceState === 'connecting' ? (
                <motion.div
                  key="connecting-radar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Radio
                    className={`w-7 h-7 animate-pulse ${
                      isGirlfriendMode ? 'text-rose-300' : 'text-white'
                    }`}
                  />
                </motion.div>
              ) : isGirlfriendMode ? (
                <motion.div
                  key="gf-heart"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center"
                >
                  <Heart className="w-7 h-7 text-rose-400 fill-rose-500/80" />
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
          <span className="text-xs sm:text-sm font-medium tracking-tight text-white flex items-center gap-1">
            {isGirlfriendMode ? (
              <>
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400 inline" />
                <span>Lila · Jaan</span>
              </>
            ) : voiceState === 'disconnected' ? (
              'Talk to Lila'
            ) : (
              'LILA'
            )}
          </span>
          <span className="text-[10px] text-gray-400 font-light">
            {voiceState === 'speaking'
              ? 'Tap to Interrupt'
              : voiceState === 'listening'
              ? isGirlfriendMode ? 'Jaan is listening...' : 'Listening...'
              : voiceState === 'disconnected'
              ? isGirlfriendMode ? 'Sweet & Loving' : 'Voice Assistant'
              : 'Active'}
          </span>
        </motion.button>
      </div>

      {/* Dynamic Status Capsule Pill */}
      <div
        id="lila-status-capsule"
        className={`mt-2 px-4 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2.5 text-xs transition-all ${status.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        <span className="font-medium text-xs tracking-tight">{status.text}</span>
      </div>

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
            className={`p-2.5 rounded-full border transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : isDark
                ? 'bg-[#181A20] text-gray-300 border-[#2B2F3A] hover:bg-white/10 shadow-sm'
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
              className={`px-4 py-2 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isDark
                  ? 'bg-white text-black border-white hover:bg-gray-200'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Interrupt</span>
            </button>
          )}

          {/* End Call / Disconnect Button */}
          <button
            id="lila-disconnect-session-btn"
            onClick={onToggleConnect}
            className={`px-4 py-2 rounded-full border text-xs font-medium transition-all shadow-sm cursor-pointer ${
              isDark
                ? 'bg-[#181A20] text-gray-300 border-[#2B2F3A] hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-800'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
            }`}
          >
            End Session
          </button>
        </motion.div>
      )}
    </div>
  );
});
