import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Sparkles, Radio, Loader2, PhoneOff } from 'lucide-react';
import { VoiceState, RingAnimationStyle } from '../types';

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
  ringAnimation?: RingAnimationStyle;
  isDark?: boolean;
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
  ringAnimation = 'golden_spirals',
  isDark = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Perfectly centered, high-craft canvas visualizer with selectable animations and zero ring clutter
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let smoothLevel = 0.05;
    let lastTime = performance.now();
    let animAngle = 0;
    let wavePhase = 0;

    // Orbital particles for dynamic animations
    const particles = Array.from({ length: 18 }, (_, i) => ({
      orbitIndex: i % 3,
      angle: (i / 18) * Math.PI * 2,
      speed: 0.8 + (i % 5) * 0.25,
      radiusOffset: (i * 11) % 40,
      size: 1.2 + (i % 3) * 0.8,
      alpha: 0.25 + (i % 4) * 0.15,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Equalizer bars data for soundwave mode
    const barFrequencies = Array.from({ length: 44 }, () => Math.random());

    const render = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const rect = container.getBoundingClientRect();
      const displaySize = Math.min(rect.width, rect.height) || 320;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
        canvas.width = displaySize * dpr;
        canvas.height = displaySize * dpr;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Exact mathematical center aligned with the central orb
      const centerX = displaySize / 2;
      const centerY = displaySize / 2;

      // Base radius of central button (64px on mobile, 76px on desktop)
      const baseRadius = displaySize > 340 ? 76 : 64;

      // Target level based on active voice state
      let targetLevel = 0.04;
      if (voiceState === 'speaking') {
        targetLevel = Math.max(0.18, audioLevel);
      } else if (voiceState === 'listening') {
        targetLevel = Math.max(0.14, micLevel);
      } else if (voiceState === 'thinking') {
        targetLevel = 0.26 + Math.sin(currentTime * 0.005) * 0.08;
      } else if (voiceState === 'connecting') {
        targetLevel = 0.16 + Math.sin(currentTime * 0.004) * 0.05;
      }

      // Dynamic stroke and particle palette based on theme
      const strokeBase = isDark ? '240, 240, 248' : '24, 24, 27';
      const particleBase = isDark ? '255, 255, 255' : '20, 20, 25';

      // Smooth exponential interpolation for fluid organic motion without abrupt jumps
      smoothLevel += (targetLevel - smoothLevel) * (voiceState === 'speaking' ? 0.2 : 0.14);

      // Speed multipliers
      const speedMultiplier =
        voiceState === 'speaking'
          ? 1.8 + smoothLevel * 2.2
          : voiceState === 'listening'
          ? 1.2 + smoothLevel * 1.5
          : voiceState === 'thinking'
          ? 1.4
          : 0.6;

      animAngle += delta * 0.6 * speedMultiplier;
      wavePhase += delta * 2.2 * speedMultiplier;

      // ----------------------------------------------------
      // AMBIENT BACKGROUND GLOW (Soft atmospheric back-light)
      // ----------------------------------------------------
      const maxGlowRadius = baseRadius + 50 + smoothLevel * 30;
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.6,
        centerX,
        centerY,
        maxGlowRadius
      );
      if (voiceState === 'speaking') {
        bgGrad.addColorStop(0, `rgba(244, 114, 182, ${0.1 + smoothLevel * 0.16})`);
        bgGrad.addColorStop(0.5, `rgba(168, 85, 247, ${0.05 + smoothLevel * 0.08})`);
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (voiceState === 'listening') {
        bgGrad.addColorStop(0, `rgba(129, 140, 248, ${0.09 + smoothLevel * 0.14})`);
        bgGrad.addColorStop(0.6, `rgba(192, 132, 252, ${0.04 + smoothLevel * 0.06})`);
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (voiceState === 'thinking') {
        bgGrad.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        bgGrad.addColorStop(0, 'rgba(0, 0, 0, 0.025)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // ----------------------------------------------------
      // 6 SUPER COOL ANIMATION STYLES
      // ----------------------------------------------------
      if (ringAnimation === 'golden_spirals') {
        // 1. GOLDEN FIBONACCI SPIRALS (Clean Dual Spiral Ribbons - No Clutter Rings)
        const spiralArms = [
          { angleOffset: 0, direction: 1, alpha: 0.4 },
          { angleOffset: Math.PI, direction: -1, alpha: 0.3 },
        ];

        spiralArms.forEach((arm) => {
          ctx.beginPath();
          const points = 140;
          const startRad = baseRadius + 4;
          const endRad = baseRadius + 48 + smoothLevel * 38;

          for (let i = 0; i <= points; i++) {
            const t = i / points;
            const r = startRad + (endRad - startRad) * Math.pow(t, 0.92);
            const spiralAngle =
              arm.angleOffset +
              arm.direction * (animAngle + t * 1.5 * Math.PI * 2) +
              Math.sin(t * Math.PI * 3 + wavePhase * arm.direction) * (smoothLevel * 0.08);

            const x = centerX + Math.cos(spiralAngle) * r;
            const y = centerY + Math.sin(spiralAngle) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          const strokeAlpha =
            voiceState === 'speaking'
              ? Math.min(0.65, 0.26 + smoothLevel * 0.45) * arm.alpha * 2.2
              : voiceState === 'listening'
              ? Math.min(0.55, 0.22 + smoothLevel * 0.35) * arm.alpha * 2.2
              : isDark ? 0.18 : 0.12;

          ctx.strokeStyle = `rgba(${strokeBase}, ${strokeAlpha})`;
          ctx.lineWidth = Math.max(1.2, 1.8 + smoothLevel * 1.2);
          ctx.lineCap = 'round';
          ctx.stroke();
        });

        // Floating Stardust in Spiral Trajectory
        if (voiceState !== 'disconnected') {
          particles.slice(0, 10).forEach((p) => {
            p.angle += delta * 0.5 * p.speed * speedMultiplier;
            const pRad = baseRadius + 14 + p.radiusOffset + Math.sin(wavePhase + p.pulse) * 4;
            const px = centerX + Math.cos(p.angle) * pRad;
            const py = centerY + Math.sin(p.angle) * pRad;

            ctx.beginPath();
            ctx.arc(px, py, p.size * (0.8 + smoothLevel * 0.6), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${particleBase}, ${p.alpha * (0.4 + smoothLevel * 0.5)})`;
            ctx.fill();
          });
        }
      } else if (ringAnimation === 'cosmic_pulse') {
        // 2. COSMIC WAVE PULSES (Expanding Concentric Shockwaves)
        const waveCount = 3;
        for (let w = 0; w < waveCount; w++) {
          const waveProgress = ((animAngle * 0.4 + w / waveCount) % 1);
          const currentRadius = baseRadius + 6 + waveProgress * (54 + smoothLevel * 40);
          const waveAlpha = (1 - waveProgress) * (voiceState === 'speaking' ? 0.45 + smoothLevel * 0.4 : 0.22);

          ctx.beginPath();
          const wavePoints = 80;
          for (let i = 0; i <= wavePoints; i++) {
            const angle = (i / wavePoints) * Math.PI * 2;
            const harmonic = Math.sin(angle * 4 + wavePhase + w) * (smoothLevel * 6);
            const r = currentRadius + harmonic;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(${strokeBase}, ${waveAlpha})`;
          ctx.lineWidth = Math.max(1, 2.2 * (1 - waveProgress) + smoothLevel * 0.8);
          ctx.stroke();
        }
      } else if (ringAnimation === 'quantum_orbit') {
        // 3. QUANTUM 3D ORBITS (3 Tilted Elliptical Rings with Orbiting Quantum Particles)
        const orbits = [
          { tiltAngle: Math.PI / 6, aspect: 0.45, speed: 1.1, rotOffset: 0 },
          { tiltAngle: -Math.PI / 4, aspect: 0.42, speed: -0.9, rotOffset: Math.PI / 3 },
          { tiltAngle: Math.PI / 2.2, aspect: 0.48, speed: 1.3, rotOffset: (Math.PI * 2) / 3 },
        ];

        orbits.forEach((orbConfig, idx) => {
          const orbitRadius = baseRadius + 22 + idx * 8 + smoothLevel * 20;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(orbConfig.rotOffset + animAngle * 0.15 * orbConfig.speed);

          // Elliptical Ring
          ctx.beginPath();
          ctx.ellipse(0, 0, orbitRadius, orbitRadius * orbConfig.aspect, 0, 0, Math.PI * 2);
          const orbitAlpha =
            voiceState === 'speaking'
              ? 0.35 + smoothLevel * 0.25
              : voiceState === 'listening'
              ? 0.28 + smoothLevel * 0.2
              : isDark ? 0.18 : 0.14;
          ctx.strokeStyle = `rgba(${strokeBase}, ${orbitAlpha})`;
          ctx.lineWidth = 1.3 + smoothLevel * 0.6;
          ctx.stroke();

          // Orbiting Quantum Electron Particle
          const particleAngle = animAngle * orbConfig.speed * 1.5;
          const px = Math.cos(particleAngle) * orbitRadius;
          const py = Math.sin(particleAngle) * (orbitRadius * orbConfig.aspect);

          ctx.beginPath();
          ctx.arc(px, py, 2.8 + smoothLevel * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = isDark
            ? 'rgba(255, 255, 255, 0.9)'
            : voiceState === 'speaking'
            ? 'rgba(0, 0, 0, 0.85)'
            : 'rgba(30, 30, 35, 0.65)';
          ctx.fill();

          // Subtle Particle Glow
          ctx.beginPath();
          ctx.arc(px, py, 6 + smoothLevel * 4, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)';
          ctx.fill();

          ctx.restore();
        });
      } else if (ringAnimation === 'soundwave_bars') {
        // 4. RADIAL SOUNDWAVE EQUALIZER (Dynamic 360° Audio Frequency Bars)
        const barCount = 44;
        const innerRad = baseRadius + 6;

        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2 + animAngle * 0.2;
          const freqMod =
            Math.sin(i * 0.8 + wavePhase * 1.4) * 0.4 +
            Math.cos(i * 1.2 - wavePhase * 0.8) * 0.3 +
            barFrequencies[i] * 0.3;

          const barHeight = Math.max(3, (freqMod + 0.3) * (smoothLevel * 42 + 8));
          const outerRad = innerRad + barHeight;

          const x1 = centerX + Math.cos(angle) * innerRad;
          const y1 = centerY + Math.sin(angle) * innerRad;
          const x2 = centerX + Math.cos(angle) * outerRad;
          const y2 = centerY + Math.sin(angle) * outerRad;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);

          const barAlpha =
            voiceState === 'speaking'
              ? Math.min(0.75, 0.32 + smoothLevel * 0.5)
              : voiceState === 'listening'
              ? Math.min(0.6, 0.25 + smoothLevel * 0.4)
              : isDark ? 0.22 : 0.16;

          ctx.strokeStyle = `rgba(${strokeBase}, ${barAlpha})`;
          ctx.lineWidth = 1.8;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      } else if (ringAnimation === 'celestial_gyro') {
        // 5. CELESTIAL GYROSCOPE (Interlocking 3D Gimbal Rings)
        const gyroRings = [
          { radius: baseRadius + 16 + smoothLevel * 14, rotSpeed: 0.8, tilt: 0.75, angle: 0 },
          { radius: baseRadius + 28 + smoothLevel * 22, rotSpeed: -0.6, tilt: 0.55, angle: Math.PI / 3 },
          { radius: baseRadius + 42 + smoothLevel * 30, rotSpeed: 1.0, tilt: 0.35, angle: (Math.PI * 2) / 3 },
        ];

        gyroRings.forEach((ring, idx) => {
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(ring.angle + animAngle * ring.rotSpeed);

          // 3D Ellipse
          ctx.beginPath();
          ctx.ellipse(0, 0, ring.radius, ring.radius * ring.tilt, 0, 0, Math.PI * 2);
          const ringAlpha =
            voiceState === 'speaking'
              ? 0.38 - idx * 0.06 + smoothLevel * 0.2
              : voiceState === 'listening'
              ? 0.3 - idx * 0.05 + smoothLevel * 0.15
              : isDark ? 0.18 : 0.12;
          ctx.strokeStyle = `rgba(${strokeBase}, ${ringAlpha})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();

          // Axis Ticks
          for (let a = 0; a < 4; a++) {
            const tickAngle = (a * Math.PI) / 2;
            const tx = Math.cos(tickAngle) * ring.radius;
            const ty = Math.sin(tickAngle) * (ring.radius * ring.tilt);
            ctx.beginPath();
            ctx.arc(tx, ty, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${strokeBase}, ${ringAlpha * 1.5})`;
            ctx.fill();
          }

          ctx.restore();
        });
      } else if (ringAnimation === 'supernova_flares') {
        // 6. SUPERNOVA SOLAR FLARES (Corona Flares & Radiating Energy Sparks)
        const flareCount = 14;
        const innerRad = baseRadius + 4;

        ctx.beginPath();
        for (let i = 0; i <= flareCount * 4; i++) {
          const t = i / (flareCount * 4);
          const angle = t * Math.PI * 2 + animAngle * 0.3;
          const flareIndex = Math.floor(t * flareCount);
          const flarePulse = Math.sin(flareIndex * 2 + wavePhase * 1.6);
          const flareHeight =
            10 + Math.max(0, flarePulse) * (26 + smoothLevel * 36) + (i % 2 === 0 ? 6 : 0);

          const r = innerRad + flareHeight;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const flareAlpha =
          voiceState === 'speaking'
            ? Math.min(0.55, 0.24 + smoothLevel * 0.4)
            : voiceState === 'listening'
            ? Math.min(0.42, 0.18 + smoothLevel * 0.3)
            : isDark ? 0.16 : 0.1;

        ctx.strokeStyle = `rgba(${strokeBase}, ${flareAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Radiating Energy Spark Particles
        if (voiceState !== 'disconnected') {
          particles.slice(0, 12).forEach((p) => {
            const pProgress = (wavePhase * 0.3 * p.speed + p.angle) % 1;
            const pRad = innerRad + pProgress * (52 + smoothLevel * 35);
            const px = centerX + Math.cos(p.angle + animAngle * 0.2) * pRad;
            const py = centerY + Math.sin(p.angle + animAngle * 0.2) * pRad;

            ctx.beginPath();
            ctx.arc(px, py, p.size * (1 - pProgress * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${particleBase}, ${(1 - pProgress) * (0.35 + smoothLevel * 0.4)})`;
            ctx.fill();
          });
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [voiceState, audioLevel, micLevel, ringAnimation, isDark]);

  // Status text & color styling
  const getStatusBadge = () => {
    switch (voiceState) {
      case 'connecting':
        return {
          text: 'Connecting to Lila...',
          color: 'bg-white/90 dark:bg-[#1A1A22]/90 text-gray-700 dark:text-gray-200 border-gray-200/80 dark:border-white/10 shadow-xs',
          dot: 'bg-amber-500 animate-ping',
        };
      case 'listening':
        return {
          text: isMuted ? 'Microphone Muted' : 'Lila is listening (Hindi Voice)...',
          color: 'bg-white/90 dark:bg-[#1A1A22]/90 text-gray-800 dark:text-gray-100 border-gray-200/80 dark:border-white/10 shadow-xs',
          dot: 'bg-black dark:bg-white animate-pulse',
        };
      case 'thinking':
        return {
          text: 'Lila is thinking...',
          color: 'bg-white/90 dark:bg-[#1A1A22]/90 text-gray-800 dark:text-gray-100 border-gray-200/80 dark:border-white/10 shadow-xs',
          dot: 'bg-black dark:bg-white animate-spin',
        };
      case 'speaking':
        return {
          text: 'Lila is speaking — Tap orb to interrupt',
          color: 'bg-white/90 dark:bg-[#1A1A22]/90 text-gray-900 dark:text-white border-gray-300 dark:border-white/20 shadow-xs font-semibold',
          dot: 'bg-black dark:bg-white animate-pulse',
        };
      case 'disconnected':
      default:
        if (isWakeWordDetected) {
          return {
            text: 'Wake Word Detected! Activating...',
            color: 'bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 shadow-xs font-semibold animate-pulse',
            dot: 'bg-emerald-600 dark:bg-emerald-400 animate-ping',
          };
        }
        if (wakeWordEnabled) {
          return {
            text: `Say "${wakeWordLabel}" or tap to talk`,
            color: 'bg-white/90 dark:bg-[#1A1A22]/90 text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-white/10 shadow-xs',
            dot: 'bg-emerald-500 animate-pulse',
          };
        }
        return {
          text: 'Tap orb to start voice conversation',
          color: 'bg-white/90 dark:bg-[#1A1A22]/90 text-gray-600 dark:text-gray-400 border-gray-200/80 dark:border-white/10 shadow-xs',
          dot: 'bg-gray-400 dark:bg-gray-500',
        };
    }
  };

  const status = getStatusBadge();

  return (
    <div id="lila-voice-orb-container" className="relative flex flex-col items-center justify-center py-4 select-none">
      {/* Orb Stage Canvas — Perfectly centered layout container */}
      <div
        ref={containerRef}
        className="relative w-76 h-76 sm:w-88 sm:h-88 flex items-center justify-center"
      >
        {/* Background Visualizer Canvas for Smooth Rings & Dynamic Animations */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* Ambient Subtle Aura with Spring Transition */}
        <motion.div
          animate={{
            scale:
              voiceState === 'speaking'
                ? 1 + audioLevel * 0.28
                : voiceState === 'listening'
                ? 1 + micLevel * 0.18
                : voiceState === 'thinking'
                ? [1, 1.06, 1]
                : [1, 1.02, 1],
            opacity:
              voiceState === 'speaking'
                ? 0.32 + audioLevel * 0.25
                : voiceState === 'listening'
                ? 0.25 + micLevel * 0.2
                : voiceState === 'thinking'
                ? 0.28
                : 0.08,
          }}
          transition={{
            duration: voiceState === 'thinking' ? 1.6 : 0.25,
            repeat: voiceState === 'thinking' || voiceState === 'disconnected' ? Infinity : 0,
            ease: [0.25, 0.1, 0.25, 1.0],
          }}
          className={`absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full filter blur-2xl pointer-events-none z-0 transition-colors duration-700 ${
            voiceState === 'speaking'
              ? 'bg-neutral-400/30'
              : voiceState === 'listening'
              ? 'bg-neutral-300/40'
              : voiceState === 'thinking'
              ? 'bg-neutral-400/30'
              : 'bg-neutral-200/40'
          }`}
        />

        {/* Main Central Minimalist Orb */}
        <motion.button
          id="lila-interactive-orb-btn"
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onClick={() => {
            if (voiceState === 'speaking') {
              onInterrupt();
            } else {
              onToggleConnect();
            }
          }}
          className={`relative z-10 w-32 h-32 sm:w-38 sm:h-38 rounded-full flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 shadow-[0_10px_35px_rgba(0,0,0,0.08)] border ${
            voiceState === 'speaking'
              ? 'bg-black text-white border-black shadow-[0_14px_45px_rgba(0,0,0,0.22)] ring-4 ring-black/10'
              : voiceState === 'listening'
              ? 'bg-black text-white border-black shadow-[0_14px_45px_rgba(0,0,0,0.22)] ring-4 ring-black/10'
              : voiceState === 'thinking'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-4 ring-neutral-900/10'
              : voiceState === 'connecting'
              ? 'bg-neutral-900 text-white border-neutral-900 shadow-[0_10px_35px_rgba(0,0,0,0.12)]'
              : 'bg-black text-white border-black hover:bg-neutral-900 shadow-[0_10px_35px_rgba(0,0,0,0.12)]'
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
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 h-7"
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: [6, Math.max(8, audioLevel * 32 * (0.8 + i * 0.15)), 6],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.28 + i * 0.05,
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
                  transition={{ duration: 0.15 }}
                  className="relative flex items-center justify-center"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1 + micLevel * 0.5, 1],
                    }}
                    transition={{ repeat: Infinity, duration: 0.45, ease: 'easeInOut' }}
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
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={`mt-2 px-4 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2.5 text-xs ${status.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        <span className="font-medium text-xs tracking-tight">{status.text}</span>
      </motion.div>

      {/* Audio Controls Bar when connected (Single Action Set) */}
      {voiceState !== 'disconnected' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 flex items-center gap-2.5"
        >
          {/* Mute / Unmute Mic Button */}
          <button
            id="lila-mute-mic-btn"
            onClick={onToggleMute}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              isMuted
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-white dark:bg-[#1C1C24] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-[#252530]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* End Call / Disconnect Button */}
          <button
            id="lila-disconnect-session-btn"
            onClick={onToggleConnect}
            className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1C1C24] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300 hover:border-rose-200 dark:hover:border-rose-800 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5 text-rose-500" />
            <span>End Call</span>
          </button>
        </motion.div>
      )}
    </div>
  );
};
