// 游戏音频：程序化音效 + 分区氛围 BGM（无外部音乐文件）。

import type { AmbientZone } from "./heritage/ambient-zones";

export type GameSound = "place" | "break" | "jump" | "ui" | "craft" | "complete" | "tea" | "shadow";

export type GameAudioStatus = "idle" | "starting" | "running" | "muted" | "unavailable";

export type GameAudioState = {
  enabled: boolean;
  status: GameAudioStatus;
};

/** 各区域 BGM 音色参数：音阶、间隔、波形与音量略有不同 */
type AmbientProfile = {
  scale: number[];
  intervalMs: number;
  padVolume: number;
  sparkleVolume: number;
  padType: OscillatorType;
  sparkleType: OscillatorType;
};

const AMBIENT_PROFILES: Record<AmbientZone, AmbientProfile> = {
  // 野外：现有五声氛围
  wild: {
    scale: [220, 246.94, 293.66, 329.63, 392],
    intervalMs: 3200,
    padVolume: 0.09,
    sparkleVolume: 0.05,
    padType: "sine",
    sparkleType: "triangle",
  },
  // 博物馆：更低、更疏、偏舒缓
  museum: {
    scale: [174.61, 196, 220, 261.63, 293.66],
    intervalMs: 4200,
    padVolume: 0.07,
    sparkleVolume: 0.03,
    padType: "sine",
    sparkleType: "sine",
  },
  // 茶区：偏高、轻柔
  tea: {
    scale: [261.63, 293.66, 329.63, 392, 440],
    intervalMs: 3600,
    padVolume: 0.08,
    sparkleVolume: 0.045,
    padType: "sine",
    sparkleType: "triangle",
  },
  // 皮影：偏低、带一点方波戏剧感
  shadow: {
    scale: [146.83, 164.81, 196, 220, 261.63],
    intervalMs: 2800,
    padVolume: 0.085,
    sparkleVolume: 0.055,
    padType: "triangle",
    sparkleType: "square",
  },
  // 窑场：中低、沉稳
  porcelain: {
    scale: [196, 220, 246.94, 293.66, 329.63],
    intervalMs: 3800,
    padVolume: 0.075,
    sparkleVolume: 0.04,
    padType: "sine",
    sparkleType: "triangle",
  },
  // 剪纸：更亮、短句更密
  papercut: {
    scale: [293.66, 329.63, 392, 440, 523.25],
    intervalMs: 2600,
    padVolume: 0.07,
    sparkleVolume: 0.06,
    padType: "triangle",
    sparkleType: "sine",
  },
  // 云锦：流畅上行感
  yunjin: {
    scale: [220, 246.94, 277.18, 329.63, 369.99],
    intervalMs: 3400,
    padVolume: 0.08,
    sparkleVolume: 0.05,
    padType: "sine",
    sparkleType: "triangle",
  },
};

export function createGameAudio(onStateChange: (state: GameAudioState) => void) {
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let bgmGain: GainNode | null = null;
  let sfxGain: GainNode | null = null;
  let ambientTimer = 0;
  let ambientStep = 0;
  let ambientZone: AmbientZone = "wild";
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
    const profile = AMBIENT_PROFILES[ambientZone];
    const scale = profile.scale;
    const root = scale[ambientStep % scale.length];
    // 皮影区：根音更长、点缀更短，偏戏剧
    if (ambientZone === "shadow") {
      tone(root, 2.2, profile.padVolume, profile.padType, bgmGain);
      tone(root * 1.5, 0.55, profile.sparkleVolume, profile.sparkleType, bgmGain, 0.35);
      tone(scale[(ambientStep + 3) % scale.length], 0.7, profile.sparkleVolume * 0.9, "triangle", bgmGain, 1.0);
    } else if (ambientZone === "museum") {
      // 舒缓：长垫音 + 稀疏泛音
      tone(root, 3.6, profile.padVolume, profile.padType, bgmGain);
      tone(root * 2, 2.0, profile.sparkleVolume, profile.sparkleType, bgmGain, 0.6);
      tone(scale[(ambientStep + 2) % scale.length], 1.4, profile.sparkleVolume * 0.7, "sine", bgmGain, 1.8);
    } else if (ambientZone === "papercut") {
      // 更轻快的短句
      tone(root, 1.4, profile.padVolume, profile.padType, bgmGain);
      tone(scale[(ambientStep + 1) % scale.length], 0.45, profile.sparkleVolume, profile.sparkleType, bgmGain, 0.2);
      tone(scale[(ambientStep + 3) % scale.length], 0.4, profile.sparkleVolume, "sine", bgmGain, 0.55);
      tone(scale[(ambientStep + 4) % scale.length] * 2, 0.28, profile.sparkleVolume * 0.8, "triangle", bgmGain, 0.95);
    } else if (ambientZone === "yunjin") {
      // 上行织纹感
      tone(root, 2.4, profile.padVolume, profile.padType, bgmGain);
      tone(scale[(ambientStep + 1) % scale.length], 0.8, profile.sparkleVolume, profile.sparkleType, bgmGain, 0.35);
      tone(scale[(ambientStep + 2) % scale.length], 0.8, profile.sparkleVolume, profile.sparkleType, bgmGain, 0.85);
      tone(scale[(ambientStep + 4) % scale.length], 1.0, profile.sparkleVolume * 0.85, "sine", bgmGain, 1.4);
    } else {
      // wild / tea / porcelain 共用清晰五声短语，音阶与节奏由 profile 区分
      tone(root, ambientZone === "tea" ? 3.0 : 2.8, profile.padVolume, profile.padType, bgmGain);
      tone(root * 2, ambientZone === "tea" ? 1.3 : 1.1, profile.sparkleVolume, profile.sparkleType, bgmGain, 0.18);
      tone(scale[(ambientStep + 2) % scale.length], 0.9, profile.sparkleVolume, profile.sparkleType, bgmGain, 0.82);
      tone(scale[(ambientStep + 4) % scale.length] * 2, 0.35, profile.sparkleVolume * 0.65, "sine", bgmGain, 1.48);
    }
    ambientStep += 1;
  };

  const restartAmbientTimer = () => {
    window.clearInterval(ambientTimer);
    ambientTimer = 0;
    if (!enabled || !context || context.state !== "running") return;
    const profile = AMBIENT_PROFILES[ambientZone];
    scheduleAmbientPhrase();
    ambientTimer = window.setInterval(scheduleAmbientPhrase, profile.intervalMs);
  };

  /**
   * 玩家进入不同非遗区域时切换 BGM 风格。
   * 同区不重复切换；切换时轻微淡入淡出，不写 React state。
   */
  const setAmbientZone = (zone: AmbientZone) => {
    if (zone === ambientZone) return;
    ambientZone = zone;
    ambientStep = 0;
    if (!context || !bgmGain || context.state !== "running" || !enabled) return;
    const now = context.currentTime;
    // 短交叉淡化，避免硬切
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
    bgmGain.gain.linearRampToValueAtTime(0.04, now + 0.18);
    bgmGain.gain.linearRampToValueAtTime(0.28, now + 0.55);
    restartAmbientTimer();
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
      if (!ambientTimer) restartAmbientTimer();
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

  return { start, play, toggle, stop, setAmbientZone };
}
