export type GameSound = "place" | "break" | "jump" | "ui" | "craft" | "complete" | "tea" | "shadow";

export type GameAudioStatus = "idle" | "starting" | "running" | "muted" | "unavailable";

export type GameAudioState = {
  enabled: boolean;
  status: GameAudioStatus;
};

export function createGameAudio(onStateChange: (state: GameAudioState) => void) {
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let bgmGain: GainNode | null = null;
  let sfxGain: GainNode | null = null;
  let ambientTimer = 0;
  let ambientStep = 0;
  let enabled = true;
  let status: GameAudioStatus = "idle";
  let playedActivationSound = false;

  const emitState = () => {
    const state = { enabled, status };
    onStateChange(state);
    return state;
  };

  const ensureContext = () => {
    if (context) return context;
    if (typeof AudioContext === "undefined") {
      throw new Error("当前浏览器不支持 Web Audio API");
    }
    context = new AudioContext({ latencyHint: "interactive" });
    masterGain = context.createGain();
    bgmGain = context.createGain();
    sfxGain = context.createGain();
    masterGain.gain.value = enabled ? 0.82 : 0;
    bgmGain.gain.value = 0.28;
    sfxGain.gain.value = 0.68;
    bgmGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(context.destination);
    return context;
  };

  const tone = (
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    destination: AudioNode,
    delay = 0,
  ) => {
    if (!context) return;
    const startTime = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(volume, startTime + Math.min(0.04, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      envelope.disconnect();
    }, { once: true });
  };

  const scheduleAmbientPhrase = () => {
    if (!context || !bgmGain || !enabled || context.state !== "running") return;
    const scale = [220, 246.94, 293.66, 329.63, 392];
    const root = scale[ambientStep % scale.length];
    tone(root, 2.8, 0.09, "sine", bgmGain);
    tone(root * 2, 1.1, 0.06, "triangle", bgmGain, 0.18);
    tone(scale[(ambientStep + 2) % scale.length], 0.9, 0.05, "triangle", bgmGain, 0.82);
    tone(scale[(ambientStep + 4) % scale.length] * 2, 0.35, 0.03, "sine", bgmGain, 1.48);
    ambientStep += 1;
  };

  const playNoise = () => {
    if (!context || !sfxGain) return;
    const length = Math.floor(context.sampleRate * 0.11);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      samples[index] = (Math.random() * 2 - 1) * (1 - index / length);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1100;
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(sfxGain);
    source.start();
    source.addEventListener("ended", () => {
      source.disconnect();
      filter.disconnect();
    }, { once: true });
  };

  const play = (sound: GameSound) => {
    if (!enabled || !context || !sfxGain || context.state !== "running") return false;
    if (sound === "break") {
      playNoise();
      tone(105, 0.13, 0.2, "square", sfxGain);
    } else if (sound === "place") {
      tone(145, 0.1, 0.18, "triangle", sfxGain);
      tone(110, 0.12, 0.12, "sine", sfxGain, 0.04);
    } else if (sound === "jump") {
      tone(220, 0.16, 0.14, "sine", sfxGain);
      tone(330, 0.16, 0.11, "sine", sfxGain, 0.07);
    } else if (sound === "complete") {
      [261.63, 329.63, 392, 523.25].forEach((frequency, index) =>
        tone(frequency, 0.45, 0.14, "triangle", sfxGain!, index * 0.12),
      );
    } else if (sound === "tea") {
      tone(523.25, 0.3, 0.1, "sine", sfxGain);
      tone(659.25, 0.35, 0.08, "sine", sfxGain, 0.13);
    } else if (sound === "shadow") {
      tone(164.81, 0.22, 0.15, "triangle", sfxGain);
      tone(246.94, 0.32, 0.1, "square", sfxGain, 0.1);
    } else {
      tone(sound === "craft" ? 360 : 523.25, 0.11, 0.12, "sine", sfxGain);
    }
    return true;
  };

  const start = async () => {
    if (!enabled) {
      status = "muted";
      return emitState();
    }
    status = "starting";
    emitState();
    try {
      const audioContext = ensureContext();
      if (audioContext.state === "suspended") await audioContext.resume();
      if (audioContext.state !== "running") {
        throw new Error(`音频上下文未能启动：${audioContext.state}`);
      }
      masterGain?.gain.setTargetAtTime(0.82, audioContext.currentTime, 0.02);
      status = "running";
      const state = emitState();
      if (!ambientTimer) {
        scheduleAmbientPhrase();
        ambientTimer = window.setInterval(scheduleAmbientPhrase, 3200);
      }
      if (!playedActivationSound) {
        playedActivationSound = true;
        tone(523.25, 0.14, 0.13, "sine", sfxGain!);
        tone(659.25, 0.2, 0.11, "triangle", sfxGain!, 0.1);
      }
      return state;
    } catch (error) {
      console.warn("游戏音频启动失败", error);
      status = "unavailable";
      return emitState();
    }
  };

  const toggle = async () => {
    if (!context || status === "idle" || status === "unavailable") {
      enabled = true;
      return start();
    }
    if (enabled) {
      enabled = false;
      status = "muted";
      masterGain?.gain.setTargetAtTime(0, context.currentTime, 0.02);
      return emitState();
    }
    enabled = true;
    const state = await start();
    if (state.status === "running") play("ui");
    return state;
  };

  const stop = () => {
    window.clearInterval(ambientTimer);
    ambientTimer = 0;
    if (context && context.state !== "closed") void context.close();
    context = null;
    masterGain = null;
    bgmGain = null;
    sfxGain = null;
  };

  return { start, play, toggle, stop };
}
