import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Sparkles,
  Mic,
  MicOff,
  AlertCircle,
  Heart,
  Home,
  Brain,
  Briefcase,
  GraduationCap,
  BellRing,
  ShieldCheck,
  Play,
} from 'lucide-react';
import { Header } from './components/Header';
import { VoiceOrb } from './components/VoiceOrb';
import { ToolHUD } from './components/ToolHUD';
import { TranscriptView } from './components/TranscriptView';
import { VoiceSettingsModal } from './components/VoiceSettings';
import {
  VoiceState,
  VoiceSettingsConfig,
  ToolCallEvent,
  TranscriptMessage,
  LilaPersonaId,
  ThemeMode,
} from './types';
import {
  LILA_IDENTITY,
  LILA_ACOUSTIC_PRESETS,
  LILA_PERSONAS,
  LILA_WAKE_WORDS,
  detectWakeWord,
} from './lila';
import {
  AudioQueuePlayer,
  MicRecorder,
  playSoundCue,
  getMicrophonePermissionStatus,
  requestMicrophoneAccess,
} from './utils/audio';

const PERSONA_QUICK_ICONS: Record<LilaPersonaId, any> = {
  friend: Heart,
  family: Home,
  counselor: Brain,
  assistant: Briefcase,
  mentor: GraduationCap,
  girlfriend: Heart,
};

const DEFAULT_SETTINGS: VoiceSettingsConfig = {
  voice: LILA_IDENTITY.defaultVoice,
  pitch: 1.10, // Default pitch 1.1x (Sweet Young Girl)
  persona: LILA_IDENTITY.defaultPersona,
  wakeWordEnabled: true,
  wakeWord: LILA_IDENTITY.defaultWakeWord,
  wakeWordChime: true,
  alwaysAllowMic: true, // Permanent Mic Access enabled by default
  continuousMode: true,
  soundEffects: true,
  showSubtitles: true,
  connectionMode: 'live_websocket',
  secretGirlfriendUnlocked: false,
};

const loadInitialSettings = (): VoiceSettingsConfig => {
  try {
    const saved = localStorage.getItem('lila_settings_v2');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old pitch 1.0 or 1.06 to 1.10 default if not customized
      const pitch =
        parsed.pitch === undefined || parsed.pitch === 1.0 || parsed.pitch === 1.06
          ? 1.10
          : parsed.pitch;
      return { ...DEFAULT_SETTINGS, ...parsed, pitch, alwaysAllowMic: true };
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_SETTINGS;
};

export default function App() {
  // Voice State & Engine Config
  const [voiceState, setVoiceState] = useState<VoiceState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Settings & Theme
  const [settings, setSettings] = useState<VoiceSettingsConfig>(loadInitialSettings);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('lila_theme');
      return (saved === 'dark' || saved === 'light') ? saved : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('lila_theme', next);
      } catch (e) {
        // ignore
      }
      return next;
    });
  }, []);

  // Synchronize dark class to html document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Tools & Transcripts
  const [activeTools, setActiveTools] = useState<ToolCallEvent[]>([]);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState<
    'granted' | 'prompt' | 'denied' | 'checking'
  >('checking');
  const [liveSubtitle, setLiveSubtitle] = useState<{
    role: 'user' | 'assistant';
    text: string;
  } | null>(null);

  // Wake Word & Persona Visual Feedback
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [personaToast, setPersonaToast] = useState<string | null>(null);
  const [secretGirlfriendUnlocked, setSecretGirlfriendUnlocked] = useState(() => {
    return settings.persona === 'girlfriend';
  });

  // UI Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isProcessingText, setIsProcessingText] = useState(false);

  // Refs for Audio Nodes & WebSocket to prevent stale closures
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<AudioQueuePlayer | null>(null);
  const micRecorderRef = useRef<MicRecorder | null>(null);
  const animationIntervalRef = useRef<any>(null);
  const voiceStateRef = useRef<VoiceState>('disconnected');
  const settingsRef = useRef<VoiceSettingsConfig>(settings);
  const isMutedRef = useRef(isMuted);
  const startSpeechRecognitionRef = useRef<() => void>(() => {});
  const handleTurnBasedMessageRef = useRef<(text: string) => void>(() => {});
  const speakWithBrowserSpeechRef = useRef<(text: string, onEnd?: () => void) => void>(() => {});

  // Wake Word Standby Recognizer Ref
  const wakeWordRecognitionRef = useRef<any>(null);

  // Keep refs synchronized and enforce absolute safety against stuck states
  useEffect(() => {
    voiceStateRef.current = voiceState;
    if (voiceState === 'thinking') {
      // 2.5s absolute watchdog: thinking state can never hang permanently
      const safetyTimer = setTimeout(() => {
        if (voiceStateRef.current === 'thinking') {
          console.warn('Thinking safety recovery: restoring conversation listening mode');
          setVoiceState('listening');
          micRecorderRef.current?.resumeStreaming();
          if (settingsRef.current.connectionMode === 'turn_based') {
            startSpeechRecognitionRef.current();
          }
        }
      }, 2500);
      return () => clearTimeout(safetyTimer);
    }
  }, [voiceState]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Initialize Audio Player
  useEffect(() => {
    const player = new AudioQueuePlayer(24000);
    player.setOnQueueEnd(() => {
      if (voiceStateRef.current === 'speaking' || voiceStateRef.current === 'thinking') {
        setVoiceState('listening');
        if (micRecorderRef.current) {
          micRecorderRef.current.resumeStreaming();
        }
        if (settingsRef.current.connectionMode === 'turn_based') {
          startSpeechRecognitionRef.current();
        }
      }
    });
    audioQueueRef.current = player;

    // Preload speech synthesis voices for zero-latency fallback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      player.close();
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, []);

  // Synchronize pitch modifications to active audio queue in real-time
  useEffect(() => {
    if (audioQueueRef.current && settings.pitch !== undefined) {
      audioQueueRef.current.setPitch(settings.pitch);
    }
  }, [settings.pitch]);

  // Animation Loop for Metering
  useEffect(() => {
    const updateLevels = () => {
      if (audioQueueRef.current && voiceStateRef.current === 'speaking') {
        setAudioLevel(audioQueueRef.current.getAmplitude());
      } else {
        setAudioLevel(0);
      }

      if (micRecorderRef.current && voiceStateRef.current === 'listening' && !isMutedRef.current) {
        setMicLevel(micRecorderRef.current.getMicLevel());
      } else {
        setMicLevel(0);
      }
    };

    const interval = setInterval(updateLevels, 40);
    animationIntervalRef.current = interval;

    return () => clearInterval(interval);
  }, []);

  // Append a message to transcripts
  const addTranscript = useCallback(
    (
      role: 'user' | 'assistant' | 'system',
      text: string,
      toolCalls?: ToolCallEvent[],
      sources?: any[]
    ) => {
      const newMsg: TranscriptMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls,
        sources,
      };
      setMessages((prev) => [...prev, newMsg]);
    },
    []
  );

  // Stop / Interrupt Lila's speech or thinking
  const handleInterrupt = useCallback(() => {
    if (audioQueueRef.current) {
      audioQueueRef.current.stop();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setVoiceState('listening');
    if (micRecorderRef.current) {
      micRecorderRef.current.resumeStreaming();
    }
    if (settingsRef.current.connectionMode === 'turn_based') {
      startSpeechRecognitionRef.current();
    }
  }, []);

  // Web Speech Recognition for Turn-Based Conversation
  const recognitionRef = useRef<any>(null);
  const speechSilenceTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');

  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN';

    recognition.onstart = () => {
      setVoiceState('listening');
      latestTranscriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let accumulated = '';
      for (let i = 0; i < event.results.length; ++i) {
        accumulated += ' ' + event.results[i][0].transcript;
      }
      const currentText = accumulated.trim();
      if (currentText) {
        latestTranscriptRef.current = currentText;
        setLiveSubtitle({ role: 'user', text: currentText });

        // Smart Silence VAD: automatically submit after 950ms of user silence
        if (speechSilenceTimerRef.current) {
          clearTimeout(speechSilenceTimerRef.current);
        }
        speechSilenceTimerRef.current = setTimeout(() => {
          if (latestTranscriptRef.current && voiceStateRef.current === 'listening') {
            const captured = latestTranscriptRef.current;
            latestTranscriptRef.current = '';
            try {
              recognition.stop();
            } catch (e) {
              // ignore
            }
            handleTurnBasedMessageRef.current(captured);
          }
        }, 950);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition status:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicPermissionDenied(true);
      }
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setVoiceState('listening');
      }
    };

    recognition.onend = () => {
      if (
        voiceStateRef.current === 'listening' &&
        settingsRef.current.connectionMode === 'turn_based' &&
        !latestTranscriptRef.current
      ) {
        try {
          recognition.start();
        } catch (e) {
          // ignore
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
    }
  }, []);

  useEffect(() => {
    startSpeechRecognitionRef.current = startSpeechRecognition;
  }, [startSpeechRecognition]);

  // Helper for immediate browser synthesis fallback (strictly respectful in Hinglish)
  const speakWithBrowserSpeech = useCallback(
    (text: string, onEndCallback?: () => void) => {
      if (!('speechSynthesis' in window)) {
        if (onEndCallback) onEndCallback();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = LILA_ACOUSTIC_PRESETS.speechSynthesisRate;
        utterance.pitch = settingsRef.current.pitch || LILA_ACOUSTIC_PRESETS.speechSynthesisPitch;
        utterance.volume = LILA_ACOUSTIC_PRESETS.speechSynthesisVolume;
        utterance.lang = 'en-IN'; // Indian English / Hinglish phonetics

        const voices = window.speechSynthesis.getVoices();
        const indianVoice = voices.find(
          (v) =>
            v.lang.startsWith('en-IN') ||
            v.lang === 'en_IN' ||
            v.lang.startsWith('hi') ||
            v.lang === 'hi_IN' ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('hindi') ||
            v.name.includes('Lekha') ||
            v.name.includes('Swara') ||
            v.name.includes('Rishi') ||
            v.name.includes('Heera') ||
            v.name.includes('Neerja')
        );
        const naturalVoice = voices.find(
          (v) =>
            v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Karen')
        );

        if (indianVoice) {
          utterance.voice = indianVoice;
        } else if (naturalVoice) {
          utterance.voice = naturalVoice;
        }

        setVoiceState('speaking');
        utterance.onend = () => {
          setVoiceState('listening');
          micRecorderRef.current?.resumeStreaming();
          if (onEndCallback) {
            onEndCallback();
          }
          if (settingsRef.current.connectionMode === 'turn_based') {
            startSpeechRecognitionRef.current();
          }
        };
        utterance.onerror = () => {
          setVoiceState('listening');
          micRecorderRef.current?.resumeStreaming();
          if (onEndCallback) {
            onEndCallback();
          }
          if (settingsRef.current.connectionMode === 'turn_based') {
            startSpeechRecognitionRef.current();
          }
        };
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        setVoiceState('listening');
        micRecorderRef.current?.resumeStreaming();
        if (settingsRef.current.connectionMode === 'turn_based') {
          startSpeechRecognitionRef.current();
        }
      }
    },
    []
  );

  useEffect(() => {
    speakWithBrowserSpeechRef.current = speakWithBrowserSpeech;
  }, [speakWithBrowserSpeech]);

  // Turn-Based Conversation Engine (Fast Chat + Persona Injection + Pipelined TTS)
  const handleTurnBasedMessage = async (userText: string) => {
    const cleanUserText = userText.trim();
    if (!cleanUserText) return;

    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
    }

    addTranscript('user', cleanUserText);
    setLiveSubtitle({ role: 'user', text: cleanUserText });
    setVoiceState('thinking');

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanUserText,
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.role,
            text: m.text,
          })),
          voice: settings.voice,
          persona: settings.persona,
        }),
      });

      let data: any = null;
      const contentType = chatRes.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await chatRes.json();
      } else {
        data = {
          reply: 'Ji, main aapke saath hoon! Bataiye kya help karoon?',
          toolExecutions: [],
        };
      }

      if (!chatRes.ok && data?.error) {
        throw new Error(data.error);
      }

      const reply = data.reply || 'Ji, main sun rahi hoon!';
      const toolExecs = data.toolExecutions || [];

      // Process any tool executions immediately
      if (toolExecs.length > 0) {
        for (const tool of toolExecs) {
          const toolEvent: ToolCallEvent = {
            id: tool.id || Math.random().toString(),
            name: tool.name,
            args: tool.args,
            result: tool.result,
            status: 'completed',
            timestamp: new Date().toLocaleTimeString(),
          };
          setActiveTools((prev) => [toolEvent, ...prev.slice(0, 3)]);

          if (tool.name === 'openWebsite' && tool.result?.data?.url) {
            try {
              window.open(tool.result.data.url, '_blank');
            } catch (e) {
              console.warn('Popup blocked, URL in HUD:', tool.result.data.url);
            }
          }
          if (settings.soundEffects) {
            playSoundCue('tool');
          }
        }
      }

      // Add Lila's reply to transcripts & display subtitle
      addTranscript('assistant', reply, toolExecs, data.sources);
      setLiveSubtitle({ role: 'assistant', text: reply });

      // 2. Parallel Cloud TTS Request
      let audioPlayed = false;
      try {
        const ttsPromise = fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: reply,
            voice: settings.voice,
          }),
        });

        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1800));
        const ttsResult: any = await Promise.race([ttsPromise, timeoutPromise]);

        if (ttsResult && ttsResult.ok) {
          const ttsContentType = ttsResult.headers.get('content-type') || '';
          if (ttsContentType.includes('application/json')) {
            const ttsData = await ttsResult.json();
            if (ttsData.audio && audioQueueRef.current) {
              setVoiceState('speaking');
              audioQueueRef.current.playPcm16Chunk(ttsData.audio);
              audioPlayed = true;
            }
          }
        }
      } catch (ttsErr) {
        console.warn('TTS request error, falling back to browser speech:', ttsErr);
      }

      if (!audioPlayed) {
        speakWithBrowserSpeech(reply);
      }
    } catch (err: any) {
      console.error('Turn based error:', err);
      setErrorMessage(err.message || 'Error communicating with Lila');
      setVoiceState('listening');
      speakWithBrowserSpeech('Namaste! Network mein thodi rukawat aayi, par main sunne ke liye ready hoon.');
    }
  };

  useEffect(() => {
    handleTurnBasedMessageRef.current = handleTurnBasedMessage;
  });

  // Replay speech for past transcript
  const replayAudioMessage = async (text: string) => {
    if (!text.trim()) return;
    try {
      setVoiceState('speaking');
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: settings.voice }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (data.audio && audioQueueRef.current) {
          audioQueueRef.current.playPcm16Chunk(data.audio);
          return;
        }
      }
      speakWithBrowserSpeech(text);
    } catch (e) {
      speakWithBrowserSpeech(text);
    }
  };

  // Start Real-Time WebSocket Live Audio Session
  const connectLiveWebSocket = async (initialSpokenPrompt?: string) => {
    setVoiceState('connecting');
    setErrorMessage(null);

    if (audioQueueRef.current) {
      audioQueueRef.current.warmup();
    }

    if (settings.soundEffects) {
      playSoundCue('connect');
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live?voice=${settings.voice}&persona=${settings.persona}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      let recorder = micRecorderRef.current;
      if (!recorder) {
        recorder = new MicRecorder((base64Chunk) => {
          if (
            wsRef.current?.readyState === WebSocket.OPEN &&
            voiceStateRef.current === 'listening' &&
            !isMutedRef.current
          ) {
            wsRef.current.send(JSON.stringify({ type: 'audio', audio: base64Chunk }));
          }
        }, settingsRef.current.alwaysAllowMic);
        micRecorderRef.current = recorder;

        const micStarted = await recorder.start();
        if (!micStarted) {
          setMicPermissionDenied(true);
          setSettings((prev) => ({ ...prev, connectionMode: 'turn_based' }));
          setVoiceState('listening');
        } else {
          setMicPermissionDenied(false);
          setMicPermissionStatus('granted');
        }
      } else {
        recorder.resumeStreaming();
      }

      ws.onopen = () => {
        setVoiceState('listening');
        micRecorderRef.current?.resumeStreaming();
        if (initialSpokenPrompt && initialSpokenPrompt.trim()) {
          addTranscript('user', initialSpokenPrompt);
          setLiveSubtitle({ role: 'user', text: initialSpokenPrompt });
          ws.send(JSON.stringify({ type: 'text', text: initialSpokenPrompt }));
          setVoiceState('thinking');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'socket_ready' || data.type === 'ready' || data.type === 'connected') {
            setVoiceState('listening');
            micRecorderRef.current?.resumeStreaming();
          } else if (data.type === 'audio' && data.data) {
            setVoiceState('speaking');
            micRecorderRef.current?.pauseStreaming();
            if (audioQueueRef.current) {
              audioQueueRef.current.playPcm16Chunk(data.data);
            }
          } else if (data.type === 'transcript') {
            const role = data.role === 'user' ? 'user' : 'assistant';
            setLiveSubtitle({ role, text: data.text });
            if (role === 'assistant') {
              addTranscript('assistant', data.text);
            } else {
              addTranscript('user', data.text);
            }
          } else if (data.type === 'interrupted') {
            handleInterrupt();
            micRecorderRef.current?.resumeStreaming();
          } else if (data.type === 'tool_start') {
            setVoiceState('thinking');
            const newTool: ToolCallEvent = {
              id: data.id || Math.random().toString(),
              name: data.name,
              args: data.args || {},
              status: 'running',
              timestamp: new Date().toLocaleTimeString(),
            };
            setActiveTools((prev) => [newTool, ...prev.slice(0, 3)]);
          } else if (data.type === 'tool_complete') {
            if (settings.soundEffects) {
              playSoundCue('tool');
            }
            setActiveTools((prev) =>
              prev.map((t) =>
                t.id === data.id ? { ...t, status: 'completed', result: data.result } : t
              )
            );

            if (data.name === 'openWebsite' && data.result?.data?.url) {
              try {
                window.open(data.result.data.url, '_blank');
              } catch (e) {
                console.warn('Popup blocked, URL in HUD');
              }
            }

            // Fast Safety Watchdog: If audio stream does not start within 1000ms after tool completion,
            // immediately speak the result summary and reopen conversation mode (listening)
            const resultMsg = data.result?.message;
            setTimeout(() => {
              if (voiceStateRef.current === 'thinking') {
                if (resultMsg && typeof resultMsg === 'string' && resultMsg.length > 0) {
                  speakWithBrowserSpeech(resultMsg, () => {
                    setVoiceState('listening');
                    micRecorderRef.current?.resumeStreaming();
                  });
                } else {
                  setVoiceState('listening');
                  micRecorderRef.current?.resumeStreaming();
                }
              }
            }, 1000);
          } else if (data.type === 'turn_complete') {
            if (voiceStateRef.current === 'thinking') {
              setVoiceState('listening');
              micRecorderRef.current?.resumeStreaming();
            }
          } else if (data.type === 'live_unavailable') {
            console.warn('Gemini Live fallback to Turn-Based mode:', data.message);
            setSettings((prev) => ({ ...prev, connectionMode: 'turn_based' }));
            disconnectSession();
            setVoiceState('listening');
            startSpeechRecognition();
          }
        } catch (e) {
          console.error('Error parsing live WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setErrorMessage('Connection error. Switching to Turn-Based voice mode...');
        disconnectSession();
        setSettings((prev) => ({ ...prev, connectionMode: 'turn_based' }));
        setVoiceState('listening');
        startSpeechRecognition();
      };

      ws.onclose = () => {
        if (voiceStateRef.current !== 'disconnected') {
          disconnectSession();
        }
      };
    } catch (err: any) {
      console.error('Failed to connect:', err);
      setErrorMessage(err.message || 'Could not start voice session.');
      disconnectSession();
    }
  };

  // Disconnect voice session
  const disconnectSession = useCallback((forceCloseMic: boolean = false) => {
    if (settings.soundEffects && voiceStateRef.current !== 'disconnected') {
      playSoundCue('disconnect');
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }

    if (micRecorderRef.current) {
      if (forceCloseMic || !settingsRef.current.alwaysAllowMic) {
        micRecorderRef.current.stop(true);
        micRecorderRef.current = null;
      } else {
        micRecorderRef.current.pauseStreaming();
      }
    }

    if (audioQueueRef.current) {
      audioQueueRef.current.stop();
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    setVoiceState('disconnected');
    setLiveSubtitle(null);
  }, [settings.soundEffects]);

  // Main Toggle Button Action
  const toggleVoiceConnection = () => {
    if (voiceState === 'disconnected') {
      if (settings.connectionMode === 'live_websocket') {
        connectLiveWebSocket();
      } else {
        setVoiceState('listening');
        if (settings.soundEffects) {
          playSoundCue('connect');
        }
        startSpeechRecognition();
      }
    } else {
      disconnectSession();
    }
  };

  // Wake-Up Trigger Action (handles both voice wake detection and manual test trigger)
  const triggerWakeWordActivation = useCallback(
    (remainingQuery?: string) => {
      setIsWakeWordDetected(true);
      setTimeout(() => setIsWakeWordDetected(false), 1400);

      if (settingsRef.current.wakeWordChime) {
        playSoundCue('wake');
      }

      const activePersona = LILA_PERSONAS[settingsRef.current.persona] || LILA_PERSONAS.friend;

      if (remainingQuery && remainingQuery.trim()) {
        // User asked a specific question right after wake word (e.g. "Hey Lila, what time is it?")
        if (settingsRef.current.connectionMode === 'live_websocket') {
          connectLiveWebSocket(remainingQuery);
        } else {
          handleTurnBasedMessage(remainingQuery);
        }
      } else {
        // User just said the wake word ("Hey Lila") -> Greet respectfully in Hinglish and listen!
        const wakeGreeting =
          settingsRef.current.persona === 'girlfriend'
            ? 'Hii sweetheart! Main aapki Lila. Kya kar rahe he aap, sab ok hai na? Bataiye kya chal raha hai!'
            : settingsRef.current.persona === 'friend'
            ? 'Ji, bataiye! Kya kar rahe he aap, sab ok hai na? Aapki dost Lila sun rahi hai.'
            : settingsRef.current.persona === 'family'
            ? 'Namaste! Aapke parivaar ki Lila haazir hai, kya kar rahe he aap, sab theek hai na? Bataiye kya help karoon?'
            : settingsRef.current.persona === 'counselor'
            ? 'Namaste. Main aapki baat dhyan se sun rahi hoon, dil kholkar kahiye.'
            : settingsRef.current.persona === 'assistant'
            ? 'Namaste! Aapki personal assistant Lila ready hai, bataiye kya task hai aapka.'
            : 'Namaste! Main aapki guide Lila, bataiye aaj kya naya topic explore karna chahte hain aap?';

        addTranscript('assistant', wakeGreeting);
        setLiveSubtitle({ role: 'assistant', text: wakeGreeting });

        // Speak the sweet respectful greeting then enter listening state
        speakWithBrowserSpeech(wakeGreeting, () => {
          if (settingsRef.current.connectionMode === 'live_websocket') {
            connectLiveWebSocket();
          } else {
            setVoiceState('listening');
            startSpeechRecognition();
          }
        });
      }
    },
    [speakWithBrowserSpeech, addTranscript, startSpeechRecognition]
  );

  // Standby Wake Word Listener Effect
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition || !settings.wakeWordEnabled || voiceState !== 'disconnected') {
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
        wakeWordRecognitionRef.current = null;
      }
      return;
    }

    let isAbortedCleanly = false;
    const standbyRecognizer = new SpeechRecognition();
    standbyRecognizer.continuous = true;
    standbyRecognizer.interimResults = true;
    standbyRecognizer.lang = 'hi-IN';

    standbyRecognizer.onresult = (event: any) => {
      let accumulated = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        accumulated += event.results[i][0].transcript + ' ';
      }
      const rawText = accumulated.trim();
      if (!rawText) return;

      const detection = detectWakeWord(rawText, settingsRef.current.wakeWord);
      if (detection.detected) {
        try {
          standbyRecognizer.stop();
        } catch (e) {
          // ignore
        }
        triggerWakeWordActivation(detection.remainingQuery);
      }
    };

    standbyRecognizer.onerror = (e: any) => {
      // Ignore background standby errors silently
      if (e.error === 'not-allowed') {
        setMicPermissionDenied(true);
      }
    };

    standbyRecognizer.onend = () => {
      if (!isAbortedCleanly && voiceStateRef.current === 'disconnected' && settingsRef.current.wakeWordEnabled) {
        try {
          standbyRecognizer.start();
        } catch (e) {
          // ignore
        }
      }
    };

    wakeWordRecognitionRef.current = standbyRecognizer;
    try {
      standbyRecognizer.start();
    } catch (e) {
      console.warn('Standby recognizer start:', e);
    }

    return () => {
      isAbortedCleanly = true;
      try {
        standbyRecognizer.abort();
      } catch (e) {
        // ignore
      }
      wakeWordRecognitionRef.current = null;
    };
  }, [settings.wakeWordEnabled, settings.wakeWord, voiceState, triggerWakeWordActivation]);

  // Toggle Microphone Mute
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  // Handle Text/Chip Submission
  const handleTextSubmit = async (textToSubmit?: string) => {
    const rawMessage = textToSubmit || textInput;
    if (!rawMessage.trim() || isProcessingText) return;

    const trimmed = rawMessage.trim();

    // Secret trigger command for girlfriend mode
    if (
      trimmed.toLowerCase() === '/girlfriend' ||
      trimmed.toLowerCase() === 'secret girlfriend' ||
      trimmed.toLowerCase() === 'unlock girlfriend'
    ) {
      setTextInput('');
      handleSecretUnlockGirlfriend();
      return;
    }

    setTextInput('');
    setIsProcessingText(true);

    if (voiceState === 'disconnected') {
      setVoiceState('thinking');
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      addTranscript('user', trimmed);
      setLiveSubtitle({ role: 'user', text: trimmed });
      wsRef.current.send(JSON.stringify({ type: 'text', text: trimmed }));
      setVoiceState('thinking');
    } else {
      await handleTurnBasedMessage(trimmed);
    }

    setIsProcessingText(false);
  };

  // Secret girlfriend unlock handler
  const handleSecretUnlockGirlfriend = useCallback(() => {
    setSecretGirlfriendUnlocked(true);
    setSettings((prev) => ({ ...prev, persona: 'girlfriend' }));
    setPersonaToast('💖 Secret Girlfriend Mode Activated');
    setTimeout(() => setPersonaToast(null), 3500);
    if (settingsRef.current.soundEffects) {
      playSoundCue('pop');
    }
  }, []);

  // Quick switch persona handler
  const handleSelectPersona = (pId: LilaPersonaId) => {
    setSettings((prev) => ({ ...prev, persona: pId }));
    const p = LILA_PERSONAS[pId];
    setPersonaToast(`${p.name} Active (${p.hindiName})`);
    setTimeout(() => setPersonaToast(null), 3000);
    if (settings.soundEffects) {
      playSoundCue('pop');
    }
  };

  // Check microphone permission status on mount
  useEffect(() => {
    getMicrophonePermissionStatus().then((status) => {
      setMicPermissionStatus(status);
      if (status === 'granted') {
        setMicPermissionDenied(false);
      }
    });
  }, []);

  const handleRequestAlwaysAllowMic = async () => {
    try {
      const ok = await requestMicrophoneAccess();
      if (ok) {
        setMicPermissionStatus('granted');
        setMicPermissionDenied(false);
        setSettings((prev) => ({ ...prev, alwaysAllowMic: true }));
        setPersonaToast('Permanent Mic Access Enabled! (माइक हमेशा चालू रहेगा)');
        setTimeout(() => setPersonaToast(null), 3000);
      }
    } catch (e) {
      console.warn('Error enabling permanent mic:', e);
    }
  };

  // Dismiss a tool card from HUD
  const handleDismissTool = (id: string) => {
    setActiveTools((prev) => prev.filter((t) => t.id !== id));
  };

  // Keyboard shortcut listener (Space = talk/interrupt)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (voiceState === 'speaking') {
          handleInterrupt();
        } else {
          toggleVoiceConnection();
        }
      } else if (e.code === 'Escape') {
        if (voiceState === 'speaking') {
          handleInterrupt();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voiceState, handleInterrupt]);

  const isDark = theme === 'dark';
  const activePersonaObj = LILA_PERSONAS[settings.persona] || LILA_PERSONAS.friend;
  const activeWakeObj =
    LILA_WAKE_WORDS.find((w) => w.id === settings.wakeWord) || LILA_WAKE_WORDS[0];

  return (
    <div
      id="lila-app-root"
      className={`min-h-screen flex flex-col justify-between selection:bg-rose-500 selection:text-white font-sans relative overflow-x-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0E1015] text-[#ECEFF4]' : 'bg-[#FAFAFA] text-[#1D1D1F]'
      }`}
    >
      {/* Animated Subtle Background Glow & Floating Mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 20, 0],
            y: [0, -15, 0],
            opacity: isDark ? [0.12, 0.22, 0.12] : [0.35, 0.55, 0.35],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full blur-3xl ${
            settings.persona === 'girlfriend'
              ? 'bg-rose-500/30'
              : isDark
              ? 'bg-purple-600/20'
              : 'bg-rose-100/70'
          }`}
        />
        <motion.div
          animate={{
            scale: [1.1, 0.95, 1.1],
            x: [0, -25, 0],
            y: [0, 20, 0],
            opacity: isDark ? [0.08, 0.16, 0.08] : [0.25, 0.45, 0.25],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className={`absolute -bottom-24 right-1/4 w-[480px] h-[480px] rounded-full blur-3xl ${
            isDark ? 'bg-indigo-600/15' : 'bg-orange-100/50'
          }`}
        />
      </div>

      {/* Top Header */}
      <Header
        voiceState={voiceState}
        currentVoice={settings.voice}
        pitch={settings.pitch}
        persona={settings.persona}
        wakeWordEnabled={settings.wakeWordEnabled}
        wakeWord={settings.wakeWord}
        alwaysAllowMic={settings.alwaysAllowMic}
        micPermissionStatus={micPermissionStatus}
        onRequestAlwaysAllowMic={handleRequestAlwaysAllowMic}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTranscripts={() => setIsTranscriptOpen(true)}
        transcriptCount={messages.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSecretUnlockGirlfriend={handleSecretUnlockGirlfriend}
        isGirlfriendMode={settings.persona === 'girlfriend'}
      />

      {/* Main Interactive Stage */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-3 z-10 max-w-4xl mx-auto w-full">
        {/* Persona Switch Toast */}
        <AnimatePresence>
          {personaToast && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              className={`fixed top-18 z-40 px-4 py-2 rounded-full text-xs font-medium shadow-xl flex items-center gap-2 border ${
                isDark
                  ? 'bg-[#181A20] text-white border-[#2B2F3A] shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
                  : 'bg-black text-white border-black/10'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400 animate-pulse" />
              <span>{personaToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Microphone Permission Guidance Banner */}
        {micPermissionDenied && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-lg mb-3 px-4 py-3 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
              isDark
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : 'bg-amber-50/90 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MicOff className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className={`font-medium ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
                  Microphone Access Needed
                </span>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-amber-300/90' : 'text-amber-800/90'}`}>
                  Allow mic for voice and wake word "{activeWakeObj.label}", or type below.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={async () => {
                  try {
                    const ok = await micRecorderRef.current?.start();
                    if (ok) {
                      setMicPermissionDenied(false);
                      connectLiveWebSocket();
                    } else if (navigator?.mediaDevices?.getUserMedia) {
                      await navigator.mediaDevices.getUserMedia({ audio: true });
                      setMicPermissionDenied(false);
                      connectLiveWebSocket();
                    }
                  } catch (e) {
                    console.warn('Retry mic permission:', e);
                  }
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-amber-900/60 border-amber-700 text-amber-100 hover:bg-amber-800'
                    : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                }`}
              >
                Allow Mic
              </button>
              <button
                onClick={() => setMicPermissionDenied(false)}
                className={`text-sm font-semibold p-1 cursor-pointer ${
                  isDark ? 'text-amber-400 hover:text-amber-200' : 'text-amber-600 hover:text-amber-900'
                }`}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`w-full max-w-lg mb-3 px-4 py-3 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
              isDark
                ? 'bg-red-950/40 border-red-800/60 text-red-200'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className={`font-semibold cursor-pointer ${isDark ? 'text-red-400 hover:text-red-200' : 'text-red-500 hover:text-red-800'}`}
            >
              ✕
            </button>
          </motion.div>
        )}

        {/* Hero Title & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-xl mx-auto mb-2 space-y-1.5 select-none"
        >
          <h1
            className={`text-3xl sm:text-4xl font-serif font-normal tracking-tight ${
              isDark ? 'text-white' : 'text-[#1D1D1F]'
            }`}
          >
            What can I do for you today?
          </h1>
          <p className={`text-xs sm:text-sm font-light max-w-md mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Lila responds in friendly, natural Hinglish using{' '}
            <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>"आप"</span>{' '}
            with the tone of your chosen persona.
          </p>
        </motion.div>

        {/* Persona Quick Switcher Pill Bar (Girlfriend mode strictly hidden unless unlocked/active) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 my-2.5 max-w-xl mx-auto"
        >
          {(Object.keys(LILA_PERSONAS) as LilaPersonaId[])
            .filter((pId) => !LILA_PERSONAS[pId].isSecret || (secretGirlfriendUnlocked && settings.persona === 'girlfriend'))
            .map((pId) => {
              const p = LILA_PERSONAS[pId];
              const isSelected = settings.persona === pId;
              const isSecret = p.isSecret;
              const Icon = PERSONA_QUICK_ICONS[pId] || Sparkles;

              return (
                <button
                  key={pId}
                  id={`quick-persona-${pId}`}
                  onClick={() => handleSelectPersona(pId)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                    isSelected
                      ? isSecret
                        ? 'bg-rose-600 text-white border-rose-600 font-semibold ring-2 ring-rose-300'
                        : isDark
                        ? 'bg-white text-black border-white font-semibold ring-2 ring-white/20'
                        : 'bg-black text-white border-black font-semibold ring-2 ring-black/10'
                      : isSecret
                      ? isDark
                        ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      : isDark
                      ? 'bg-[#181A20] text-gray-300 border-[#2B2F3A] hover:border-gray-500 hover:bg-white/10'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  title={p.description}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isSelected
                        ? isSecret
                          ? 'text-white'
                          : isDark
                          ? 'text-rose-500'
                          : 'text-pink-300'
                        : isSecret
                        ? 'text-rose-400'
                        : isDark
                        ? 'text-gray-400'
                        : 'text-gray-400'
                    }`}
                  />
                  <span>{p.name.split(' ')[0]}</span>
                  {isSecret ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-200/60 text-rose-900 font-semibold">
                      Secret
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] opacity-75 ${
                        isSelected
                          ? isDark
                            ? 'text-gray-700'
                            : 'text-gray-200'
                          : isDark
                          ? 'text-gray-500'
                          : 'text-gray-400'
                      }`}
                    >
                      ({p.hindiName.split('/')[0].trim().slice(0, 8)})
                    </span>
                  )}
                </button>
              );
            })}
        </motion.div>

        {/* Wake Word Trigger Banner & Test Button */}
        {voiceState === 'disconnected' && settings.wakeWordEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 my-1 px-3.5 py-1.5 rounded-full border text-[11px] shadow-2xs ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-emerald-50/70 border-emerald-200/60 text-emerald-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>
              Wake Word Active: Say <strong>"{activeWakeObj.label}"</strong>
            </span>
            <button
              id="simulate-wake-word-hero-btn"
              onClick={() => triggerWakeWordActivation()}
              className={`ml-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#181A20] text-emerald-200 border-emerald-700 hover:bg-emerald-900/50'
                  : 'text-emerald-950 bg-white hover:bg-emerald-100 border-emerald-300'
              }`}
              title="Test Wake Word flow"
            >
              <Play className="w-2.5 h-2.5 fill-emerald-500" />
              <span>Test Wake</span>
            </button>
          </motion.div>
        )}

        {/* Real-time Tool Execution HUD (Website opener, Search Grounding, Date/Time) */}
        <ToolHUD activeTools={activeTools} onDismiss={handleDismissTool} theme={theme} />

        {/* Central Reactive Voice Orb & Waveform Visualizer */}
        <VoiceOrb
          voiceState={voiceState}
          audioLevel={audioLevel}
          micLevel={micLevel}
          onToggleConnect={toggleVoiceConnection}
          onInterrupt={handleInterrupt}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          currentVoice={settings.voice}
          wakeWordEnabled={settings.wakeWordEnabled}
          wakeWordLabel={activeWakeObj.label}
          isWakeWordDetected={isWakeWordDetected}
          theme={theme}
        />
      </main>

      {/* Bottom Floating Bar with Input Fallback, Status Info & Footer Credits */}
      <footer className="w-full max-w-2xl mx-auto px-4 pb-4 pt-1.5 z-10 space-y-2.5">
        {/* Clean Minimalist Rounded-Full Input Bar */}
        <form
          id="lila-text-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleTextSubmit();
          }}
          className={`relative flex items-center rounded-full border p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all ${
            isDark
              ? 'bg-[#181A20] border-[#2B2F3A] hover:border-gray-500 focus-within:ring-2 focus-within:ring-white/10 focus-within:border-white'
              : 'bg-white border-gray-200 hover:border-gray-300 focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black'
          }`}
        >
          <input
            id="lila-text-input"
            type="text"
            placeholder={
              voiceState === 'speaking'
                ? 'Lila is speaking... Type or press Space to interrupt'
                : voiceState === 'listening'
                ? 'Lila is listening... Speak or type your message'
                : `Ask Lila (${activePersonaObj.name.split(' ')[0]}) anything in Hinglish...`
            }
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isProcessingText}
            className={`flex-1 bg-transparent px-4 py-2 text-xs sm:text-sm placeholder-gray-400 focus:outline-none font-light ${
              isDark ? 'text-white' : 'text-[#1D1D1F]'
            }`}
          />

          <button
            type="submit"
            id="lila-submit-text-btn"
            disabled={!textInput.trim() || isProcessingText}
            className={`p-2 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm cursor-pointer ${
              isDark
                ? 'bg-white text-black hover:bg-gray-200'
                : 'bg-black text-white hover:bg-neutral-800'
            }`}
            title="Send to Lila"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Status Hint */}
        <div className={`flex items-center justify-between text-[11px] px-3 font-light ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Respect: "आप" (Hinglish)</span>
            <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>·</span>
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Persona: {activePersonaObj.name.split(' ')[0]}</span>
          </span>
          <span className="hidden sm:inline">Tip: Press Spacebar to talk or interrupt</span>
        </div>

        {/* Requested Attribution Credits */}
        <div
          id="lila-footer-credits"
          className={`pt-2 border-t flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-xs tracking-wide select-none ${
            isDark ? 'border-white/5 text-gray-400' : 'border-gray-200/80 text-gray-500'
          }`}
        >
          <span className="flex items-center gap-1">
            Made by <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Daksh Damor</span>
          </span>
          <span className={`hidden sm:inline ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>•</span>
          <span className="flex items-center gap-1">
            Inspired by <span className={`font-medium ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Meera</span>
          </span>
        </div>
      </footer>

      {/* Transcript Log & Live Subtitles */}
      <TranscriptView
        messages={messages}
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        onClear={() => setMessages([])}
        onReplayAudio={(text) => {
          replayAudioMessage(text);
        }}
        liveSubtitle={liveSubtitle}
        showSubtitles={settings.showSubtitles}
        theme={theme}
      />

      {/* Voice, Persona & Wake Word Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={settings}
        onChangeConfig={(newCfg) => setSettings((prev) => ({ ...prev, ...newCfg }))}
        onPreviewGreeting={(greeting) => {
          speakWithBrowserSpeech(greeting);
        }}
        theme={theme}
      />
    </div>
  );
}
