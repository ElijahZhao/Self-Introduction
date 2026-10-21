import * as Tone from 'tone';
import { PersonaId } from '../types';
import { resolveAssetUrl } from '../utils/assetUrl';

export type SFXType = 'hover' | 'tap' | 'ripple' | 'dressup' | 'close' | 'mode';

class AudioEngineService {
  private initialized = false;
  private bgmPlaying = false;
  private sfxEnabled = true;
  private bgmLoop: Tone.Loop | null = null;
  private bgmSynth: Tone.PolySynth | null = null;
  private uiSynth: Tone.PolySynth | null = null;
  private chimeSynth: Tone.PolySynth | null = null;
  private currentPersona: PersonaId = 'explorer';
  private isSpeaking = false;
  private speakingListeners: ((speaking: boolean) => void)[] = [];
  private bgmListeners: ((playing: boolean) => void)[] = [];
  private sfxListeners: ((enabled: boolean) => void)[] = [];

  public async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await Tone.start();

      // Soft music-box / electric piano synth for BGM with lush spatial reverb
      const reverb = new Tone.Reverb({ decay: 3.5, wet: 0.42 }).toDestination();
      this.bgmSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.025, decay: 1.2, sustain: 0.12, release: 2.0 },
        volume: -15,
      }).connect(reverb);

      // Crisp UI pop/tap synth (inspired by Kenney UI Audio clean pops)
      this.uiSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.003, decay: 0.18, sustain: 0.0, release: 0.15 },
        volume: -9,
      }).toDestination();

      // Sparkling chime synth for dressup & ripples
      this.chimeSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.45, sustain: 0.05, release: 0.6 },
        volume: -12,
      }).connect(reverb);

      // Soothing arpeggios tailored per persona
      const chordsByPersona: Record<PersonaId, string[]> = {
        explorer: ['C5', 'E5', 'G5', 'B5', 'A4', 'C5', 'E5', 'G5', 'F4', 'A4', 'C5', 'E5', 'G4', 'B4', 'D5', 'G5'],
        creator: ['D5', 'F5', 'A5', 'C6', 'A4', 'C5', 'E5', 'G5', 'C5', 'E5', 'G5', 'B5', 'G4', 'A4', 'D5', 'F5'],
        lifestyle: ['F4', 'A4', 'C5', 'E5', 'G4', 'B4', 'D5', 'G5', 'E4', 'G4', 'B4', 'D5', 'A4', 'C5', 'E5', 'A5'],
      };

      let step = 0;
      this.bgmLoop = new Tone.Loop((time) => {
        if (!this.bgmPlaying || !this.bgmSynth) return;
        const notes = chordsByPersona[this.currentPersona] || chordsByPersona.explorer;
        const note = notes[step % notes.length];
        this.bgmSynth.triggerAttackRelease(note, '8n', time);
        step++;
      }, '4n');

      Tone.Transport.bpm.value = 86;
      Tone.Transport.start();
      this.bgmLoop.start(0);
      this.initialized = true;
    } catch (err) {
      console.warn('Web Audio init deferred:', err);
    }
  }

  public setPersona(persona: PersonaId): void {
    this.currentPersona = persona;
  }

  public getBGMState(): boolean {
    return this.bgmPlaying;
  }

  public getSFXState(): boolean {
    return this.sfxEnabled;
  }

  public getSpeakingState(): boolean {
    return this.isSpeaking;
  }

  public onSpeakingChange(cb: (speaking: boolean) => void): () => void {
    this.speakingListeners.push(cb);
    return () => {
      this.speakingListeners = this.speakingListeners.filter((l) => l !== cb);
    };
  }

  public onBGMChange(cb: (playing: boolean) => void): () => void {
    this.bgmListeners.push(cb);
    return () => {
      this.bgmListeners = this.bgmListeners.filter((l) => l !== cb);
    };
  }

  public onSFXChange(cb: (enabled: boolean) => void): () => void {
    this.sfxListeners.push(cb);
    return () => {
      this.sfxListeners = this.sfxListeners.filter((l) => l !== cb);
    };
  }

  private notifySpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
    this.speakingListeners.forEach((fn) => fn(speaking));
  }

  private notifyBGM(playing: boolean) {
    this.bgmPlaying = playing;
    this.bgmListeners.forEach((fn) => fn(playing));
  }

  private notifySFX(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.sfxListeners.forEach((fn) => fn(enabled));
  }

  public async toggleBGM(forceState?: boolean): Promise<boolean> {
    await this.init();
    const nextState = typeof forceState === 'boolean' ? forceState : !this.bgmPlaying;
    this.notifyBGM(nextState);
    return nextState;
  }

  public toggleSFX(): boolean {
    const nextState = !this.sfxEnabled;
    this.notifySFX(nextState);
    if (nextState) this.playSFX('tap');
    return nextState;
  }

  public async playSFX(type: SFXType): Promise<void> {
    if (!this.sfxEnabled) return;
    await this.init();
    if (!this.uiSynth) return;
    const now = Tone.now();

    if (type === 'hover') {
      this.uiSynth.triggerAttackRelease('A5', '64n', now, 0.2);
    } else if (type === 'tap') {
      this.uiSynth.triggerAttackRelease('C6', '32n', now, 0.45);
    } else if (type === 'mode') {
      // Gentle switch pop
      this.uiSynth.triggerAttackRelease('E5', '32n', now, 0.35);
      this.uiSynth.triggerAttackRelease('B5', '32n', now + 0.05, 0.4);
    } else if (type === 'ripple') {
      // Water-drop resonant harmonic ripple
      if (this.chimeSynth) {
        this.chimeSynth.triggerAttackRelease(['E5', 'B5'], '16n', now, 0.6);
        this.chimeSynth.triggerAttackRelease('E6', '16n', now + 0.08, 0.55);
        this.chimeSynth.triggerAttackRelease('G#6', '16n', now + 0.16, 0.45);
      } else {
        this.uiSynth.triggerAttackRelease('E6', '16n', now, 0.6);
      }
    } else if (type === 'dressup') {
      // Sparkling outfit transformation chime
      if (this.chimeSynth) {
        this.chimeSynth.triggerAttackRelease('C5', '16n', now, 0.5);
        this.chimeSynth.triggerAttackRelease('E5', '16n', now + 0.06, 0.6);
        this.chimeSynth.triggerAttackRelease('G5', '16n', now + 0.12, 0.65);
        this.chimeSynth.triggerAttackRelease('B5', '16n', now + 0.18, 0.7);
        this.chimeSynth.triggerAttackRelease('E6', '8n', now + 0.24, 0.75);
      } else {
        this.uiSynth.triggerAttackRelease('C6', '16n', now, 0.7);
      }
    } else if (type === 'close') {
      this.uiSynth.triggerAttackRelease('G5', '32n', now, 0.35);
      this.uiSynth.triggerAttackRelease('D5', '32n', now + 0.05, 0.3);
    }
  }

  public stopVoice(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.notifySpeaking(false);
  }

  // Cache reused <audio> elements so repeated plays start instantly and
  // mobile browsers see an already-loaded resource inside the tap gesture.
  private voiceCache = new Map<string, HTMLAudioElement>();

  private ensureVoiceElement(key: string): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    const cached = this.voiceCache.get(key);
    if (cached) return cached;
    const url = resolveAssetUrl(`audio/voice/voice-${key}.mp3`);
    const audio = new Audio(url);
    audio.preload = 'auto';
    this.voiceCache.set(key, audio);
    return audio;
  }

  public playVoiceIntro(
    textToRead: string,
    voiceKey?: string,
    onFallbackError?: (msg: string) => void
  ): void {
    this.playSFX('tap');
    if (this.isSpeaking) {
      this.stopVoice();
      return;
    }

    // Prefer bundled edge-tts voice clips (natural male voice) when a key exists.
    if (voiceKey) {
      const audio = this.ensureVoiceElement(voiceKey);
      const fallback = () => {
        if (audio) audio.pause();
        this.speakViaSynthesis(textToRead, onFallbackError);
      };
      if (!audio) {
        this.speakViaSynthesis(textToRead, onFallbackError);
        return;
      }
      const onError = () => {
        this.notifySpeaking(false);
        fallback();
      };
      audio.onerror = onError;
      audio.onended = () => this.notifySpeaking(false);
      try {
        audio.currentTime = 0;
      } catch (e) {
        /* not seekable yet */
      }
      audio.play().catch(onError);
      this.notifySpeaking(true);
      return;
    }

    this.speakViaSynthesis(textToRead, onFallbackError);
  }

  private speakViaSynthesis(
    textToRead: string,
    onFallbackError?: (msg: string) => void
  ): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(textToRead);
      utter.lang = 'zh-CN';
      utter.rate = 1.02;
      utter.pitch = 1.08;

      // Select natural Chinese voice if available
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(
        (v) => v.lang.startsWith('zh') || v.name.includes('Chinese') || v.name.includes('Xiaoxiao')
      );
      if (zhVoice) {
        utter.voice = zhVoice;
      }

      utter.onstart = () => this.notifySpeaking(true);
      utter.onend = () => this.notifySpeaking(false);
      utter.onerror = () => this.notifySpeaking(false);
      this.notifySpeaking(true);
      window.speechSynthesis.speak(utter);
    } else {
      if (onFallbackError) {
        onFallbackError('当前浏览器环境暂不支持语音合成，可在右上角上传真人录音文件');
      }
    }
  }
}

export const audioEngine = new AudioEngineService();
