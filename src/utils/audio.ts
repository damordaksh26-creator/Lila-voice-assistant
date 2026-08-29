/**
 * Audio processing utilities for Lila Voice Assistant
 * Implements PCM16 encoding/decoding, Web Audio playback queue with gapless scheduling,
 * and microphone capture at 16kHz for Gemini Live and Gemini TTS.
 */

export function float32ToPcm16(float32: Float32Array): Int16Array {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const out = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    out[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return out;
}

/**
 * High-quality linear audio resampler for converting microphone input
 * (from 44100Hz or 48000Hz) to 16000Hz PCM required by Gemini Live.
 */
export function resampleAudio(
  inputBuffer: Float32Array,
  fromSampleRate: number,
  toSampleRate: number = 16000
): Float32Array {
  if (fromSampleRate === toSampleRate || inputBuffer.length === 0) {
    return inputBuffer;
  }
  const ratio = fromSampleRate / toSampleRate;
  const newLength = Math.max(1, Math.round(inputBuffer.length / ratio));
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const origIndex = i * ratio;
    const indexLow = Math.floor(origIndex);
    const indexHigh = Math.min(indexLow + 1, inputBuffer.length - 1);
    const weight = origIndex - indexLow;
    result[i] = inputBuffer[indexLow] * (1 - weight) + inputBuffer[indexHigh] * weight;
  }
  return result;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export class AudioQueuePlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying = false;
  private sampleRate = 24000;
  private onQueueEndCallback?: () => void;
  private endCheckTimeout: any = null;
  private lowpassFilter?: BiquadFilterNode;
  private warmFilter?: BiquadFilterNode;
  private pitchMultiplier = 1.10;
  private detuneCents = Math.round(Math.log2(1.10) * 1200);

  constructor(sampleRate = 24000, initialPitch = 1.10) {
    this.sampleRate = sampleRate;
    this.setPitch(initialPitch);
  }

  public warmup() {
    this.initContext();
  }

  public setPitch(pitch: number) {
    const clamped = Math.max(0.70, Math.min(1.40, pitch));
    this.pitchMultiplier = clamped;
    this.detuneCents = Math.round(Math.log2(clamped) * 1200);

    // Dynamic real-time adjustment for currently active sources
    for (const source of this.activeSources) {
      try {
        if (source.detune && this.audioCtx) {
          source.detune.setValueAtTime(this.detuneCents, this.audioCtx.currentTime);
        } else if (this.audioCtx) {
          source.playbackRate.setValueAtTime(this.pitchMultiplier, this.audioCtx.currentTime);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  public getPitch(): number {
    return this.pitchMultiplier;
  }

  private initContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: this.sampleRate });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.75;

      // Soft Voice Acoustic Filters (Silky smooth, gentle top-end & warm low-mid presence)
      this.lowpassFilter = this.audioCtx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.setValueAtTime(7200, this.audioCtx.currentTime);
      this.lowpassFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime);

      this.warmFilter = this.audioCtx.createBiquadFilter();
      this.warmFilter.type = 'peaking';
      this.warmFilter.frequency.setValueAtTime(280, this.audioCtx.currentTime);
      this.warmFilter.Q.setValueAtTime(1.0, this.audioCtx.currentTime);
      this.warmFilter.gain.setValueAtTime(1.5, this.audioCtx.currentTime);

      // Connect chain: analyser -> lowpass -> warm -> destination
      this.analyser.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.warmFilter);
      this.warmFilter.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public setOnQueueEnd(cb: () => void) {
    this.onQueueEndCallback = cb;
  }

  public async playPcm16Chunk(base64Data: string) {
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    try {
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = pcm16ToFloat32(int16Array);

      const buffer = this.audioCtx.createBuffer(1, float32Array.length, this.sampleRate);
      buffer.copyToChannel(float32Array, 0);

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      // Apply Pitch Detuning / Playback Rate
      if (source.detune) {
        source.detune.setValueAtTime(this.detuneCents, this.audioCtx.currentTime);
      } else {
        source.playbackRate.setValueAtTime(this.pitchMultiplier, this.audioCtx.currentTime);
      }

      source.connect(this.analyser);

      const now = this.audioCtx.currentTime;
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now + 0.002; // Ultra-low 2ms buffer for immediate speech start
      }

      source.start(this.nextPlayTime);
      this.activeSources.push(source);
      this.isPlaying = true;

      // Effective chunk duration accounting for pitch multiplier
      const effectiveDuration = buffer.duration / (this.pitchMultiplier || 1);
      this.nextPlayTime += effectiveDuration;

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          if (this.onQueueEndCallback) {
            clearTimeout(this.endCheckTimeout);
            this.endCheckTimeout = setTimeout(() => {
              if (this.activeSources.length === 0 && this.onQueueEndCallback) {
                this.onQueueEndCallback();
              }
            }, 60);
          }
        }
      };
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  public stop() {
    clearTimeout(this.endCheckTimeout);
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.activeSources = [];
    this.isPlaying = false;
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    } else {
      this.nextPlayTime = 0;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying || this.activeSources.length > 0;
  }

  public getAmplitude(): number {
    if (!this.analyser || !this.isPlaying) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(1, avg / 128);
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser || !this.isPlaying) return new Uint8Array(32);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public close() {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.audioCtx = null;
    this.analyser = null;
  }
}

// Global persistent stream cache for seamless zero-flicker mic operation
let sharedMicStream: MediaStream | null = null;
let sharedAudioCtx: AudioContext | null = null;

export async function getWarmSharedMicStream(): Promise<MediaStream | null> {
  try {
    if (sharedMicStream && sharedMicStream.active && sharedMicStream.getAudioTracks().some(t => t.readyState === 'live')) {
      return sharedMicStream;
    }
    if (!navigator?.mediaDevices?.getUserMedia) return null;

    sharedMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return sharedMicStream;
  } catch (e) {
    console.warn('Failed to obtain shared warm mic stream:', e);
    return null;
  }
}

export function releaseSharedMicStream() {
  if (sharedMicStream) {
    sharedMicStream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        // ignore
      }
    });
    sharedMicStream = null;
  }
  if (sharedAudioCtx && sharedAudioCtx.state !== 'closed') {
    try {
      sharedAudioCtx.close();
    } catch (e) {
      // ignore
    }
    sharedAudioCtx = null;
  }
}

export class MicRecorder {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private muteGain: GainNode | null = null;
  private isRecording = false;
  private isMuted = false;
  private keepWarm = true;

  constructor(
    private onChunk: (base64Chunk: string) => void,
    keepWarm: boolean = true
  ) {
    this.keepWarm = keepWarm;
  }

  public async start(): Promise<boolean> {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        console.warn('getUserMedia is not supported or accessible in this environment.');
        return false;
      }

      // Reuse warm shared stream if available, otherwise obtain fresh stream
      if (this.keepWarm) {
        this.stream = await getWarmSharedMicStream();
      }

      if (!this.stream || !this.stream.active) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (this.keepWarm) {
          sharedMicStream = this.stream;
        }
      }

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const inputSampleRate = this.audioCtx.sampleRate;

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.7;

      // Disconnect prior source if re-initializing
      if (this.source) {
        try {
          this.source.disconnect();
        } catch (e) {
          // ignore
        }
      }

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      const bufferSize = inputSampleRate >= 44100 ? 2048 : 1024;
      this.processor = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);

      // Create a zero-gain node to prevent feedback loop to speakers
      this.muteGain = this.audioCtx.createGain();
      this.muteGain.gain.setValueAtTime(0, this.audioCtx.currentTime);

      this.source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.muteGain);
      this.muteGain.connect(this.audioCtx.destination);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording || this.isMuted) return;
        const float32 = e.inputBuffer.getChannelData(0);
        // Resample from device native rate (48kHz/44.1kHz) down to 16000Hz for Gemini
        const resampled16k = resampleAudio(float32, inputSampleRate, 16000);
        const pcm16 = float32ToPcm16(resampled16k);
        const base64 = arrayBufferToBase64(pcm16.buffer);
        this.onChunk(base64);
      };

      this.isRecording = true;
      this.isMuted = false;
      return true;
    } catch (err: any) {
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('Permission denied')
      ) {
        console.warn('Microphone permission was not granted by user/browser.');
      } else {
        console.warn('Microphone access issue:', err?.message || err);
      }
      return false;
    }
  }

  public pauseStreaming() {
    this.isMuted = true;
  }

  public resumeStreaming() {
    this.isMuted = false;
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public stop(forceClose: boolean = false) {
    this.isRecording = false;
    this.isMuted = true;

    if (forceClose || !this.keepWarm) {
      if (this.processor) {
        try {
          this.processor.disconnect();
          this.processor.onaudioprocess = null;
        } catch (e) {
          // ignore
        }
        this.processor = null;
      }
      if (this.muteGain) {
        try {
          this.muteGain.disconnect();
        } catch (e) {
          // ignore
        }
        this.muteGain = null;
      }
      if (this.source) {
        try {
          this.source.disconnect();
        } catch (e) {
          // ignore
        }
        this.source = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            // ignore
          }
        });
        this.stream = null;
        if (sharedMicStream === this.stream) {
          sharedMicStream = null;
        }
      }
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        try {
          this.audioCtx.close();
        } catch (e) {
          // ignore
        }
        this.audioCtx = null;
      }
    }
  }

  public getMicLevel(): number {
    if (!this.analyser || !this.isRecording) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(1, (avg / 120) * 1.5);
  }

  public getIsRecording(): boolean {
    return this.isRecording && !this.isMuted;
  }
}

/**
 * Web Audio Synth for UI sound cues (Chimes, pops, tool alerts, wake up)
 */
export function playSoundCue(type: 'connect' | 'disconnect' | 'tool' | 'speak' | 'pop' | 'wake') {
  // Mic on (connect) and mic off (disconnect) sounds are disabled for completely silent seamless audio sessions
  if (type === 'connect' || type === 'disconnect') {
    return;
  }

  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const now = ctx.currentTime;

    if (type === 'wake') {
      // Sparkling rising two-tone wake chime (F5 -> A5 -> C6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now); // F5
      osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18); // C6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(349.23, now);
      osc2.frequency.exponentialRampToValueAtTime(523.25, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.32);
      osc2.stop(now + 0.32);
    } else if (type === 'tool') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.21);
    }
  } catch (e) {
    // Sound playback optional
  }
}

/**
 * Preview pitch test chime at the configured pitch multiplier
 */
export function previewPitchTone(pitchMultiplier: number) {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtxClass();
    const now = ctx.currentTime;
    const p = Math.max(0.7, Math.min(1.4, pitchMultiplier));

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25 * p, now); // C5 * pitch
    osc1.frequency.exponentialRampToValueAtTime(659.25 * p, now + 0.1); // E5 * pitch
    osc1.frequency.exponentialRampToValueAtTime(783.99 * p, now + 0.2); // G5 * pitch

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(261.63 * p, now);
    osc2.frequency.exponentialRampToValueAtTime(329.63 * p, now + 0.2);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  } catch (e) {
    // ignore
  }
}

/**
 * Check browser microphone permission state
 */
export async function getMicrophonePermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  try {
    if (!navigator?.permissions?.query) {
      return 'prompt';
    }
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state as 'granted' | 'denied' | 'prompt';
  } catch (e) {
    return 'prompt';
  }
}

/**
 * Request persistent browser microphone access
 */
export async function requestMicrophoneAccess(): Promise<boolean> {
  try {
    if (!navigator?.mediaDevices?.getUserMedia) {
      return false;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    // Immediately stop the temporary test tracks once permission has been granted
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err: any) {
    console.warn('Microphone permission request:', err);
    return false;
  }
}


