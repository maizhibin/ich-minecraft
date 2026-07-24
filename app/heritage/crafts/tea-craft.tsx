"use client";

// 传统制茶：种茶→采摘→萎凋→杀青→揉捻→发酵→烘焙→奉茶。
// 开局可选绿茶 / 乌龙教学路线；失败只重试当前步。流程为教学综合抽象。

import { useEffect, useRef, useState } from "react";
import {
  CraftCompleteCard,
  CraftFeedback,
  CraftShell,
  StepRail,
  inRange,
  playCraftSound,
  usePersistedPhase,
} from "./craft-ui";

const PHASES = ["种茶", "采摘", "萎凋", "杀青", "揉捻", "发酵", "烘焙", "奉茶"] as const;
/** 绿茶几乎不发酵；乌龙保留教学发酵区间 */
type TeaRoute = "green" | "oolong";

type TeaCraftProps = {
  completed: boolean;
  onComplete: () => void;
};

export function TeaCraft({ completed, onComplete }: TeaCraftProps) {
  const [phase, setPhase] = usePersistedPhase("tea", completed);
  const [route, setRoute] = useState<TeaRoute | "">("");
  const [feedback, setFeedback] = useState("先选定绿茶或乌龙教学路线，再在茶垄栽下 4 株茶苗。");
  const [planted, setPlanted] = useState<number[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [wither, setWither] = useState(88);
  const [witherRunning, setWitherRunning] = useState(false);
  const [killTemp, setKillTemp] = useState(150);
  const [killHold, setKillHold] = useState(0);
  const [killRunning, setKillRunning] = useState(false);
  const killDoneRef = useRef(false);
  const [rollHits, setRollHits] = useState(0);
  const [rollPos, setRollPos] = useState(0);
  const [ferment, setFerment] = useState(8);
  const [fermentRunning, setFermentRunning] = useState(false);
  const [bakeTemp, setBakeTemp] = useState(90);
  const [bakeTime, setBakeTime] = useState(20);
  const [serveStep, setServeStep] = useState(0);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearInterval(id));
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const advance = (message: string) => {
    playCraftSound("tea");
    const next = phase + 1;
    if (next >= PHASES.length) {
      setFeedback("茶客满意，以茶待客完成。");
      playCraftSound("complete");
      onComplete();
      return;
    }
    setPhase(next);
    setFeedback(message);
  };

  const selectRoute = (next: TeaRoute) => {
    playCraftSound("ui");
    setRoute(next);
    setFeedback(
      next === "green"
        ? "绿茶路线：杀青后基本不发酵。请栽下 4 株茶苗。"
        : "乌龙路线：保留半发酵教学段。请栽下 4 株茶苗。",
    );
  };

  const togglePlant = (index: number) => {
    playCraftSound("ui");
    setPlanted((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  };

  const confirmPlant = () => {
    playCraftSound("tea");
    if (planted.length !== 4) {
      setFeedback(`需要正好 4 株（当前 ${planted.length}）。本步可继续调整。`);
      return;
    }
    setPicked([]);
    advance("茶苗已成行。采摘 5 片成熟叶（金色），避开嫩芽与老叶。");
  };

  const pickLeaf = (index: number, ripe: boolean) => {
    playCraftSound("ui");
    if (!ripe) {
      setFeedback("这片不宜采。本步重试：请只点金色成熟叶。");
      return;
    }
    if (picked.includes(index)) return;
    const next = [...picked, index];
    setPicked(next);
    if (next.length >= 5) {
      setWither(88);
      setWitherRunning(true);
      advance("鲜叶已够。萎凋中水分下降，在 38%—52% 时停止。");
      const id = window.setInterval(() => {
        setWither((value) => Math.max(12, value - 1.2));
      }, 120);
      timers.current.push(id);
    } else {
      setFeedback(`已采 ${next.length}/5 片成熟叶。`);
    }
  };

  const stopWither = () => {
    playCraftSound("tea");
    clearTimers();
    setWitherRunning(false);
    if (!inRange(wither, 38, 52)) {
      setWither(88);
      setWitherRunning(true);
      const id = window.setInterval(() => {
        setWither((value) => Math.max(12, value - 1.2));
      }, 120);
      timers.current.push(id);
      setFeedback(`含水 ${Math.round(wither)}% 不在目标区。已重新萎凋，请再抓时机。`);
      return;
    }
    setKillTemp(150);
    setKillHold(0);
    killDoneRef.current = false;
    setKillRunning(true);
    advance("开始杀青：把锅温维持在 175—215，累计稳住 6 秒。");
  };

  const nudgeKill = (delta: number) => {
    playCraftSound("ui");
    setKillTemp((value) => Math.max(120, Math.min(250, value + delta)));
  };

  // 杀青：温度自然漂移，区间内累加稳住进度
  useEffect(() => {
    if (!killRunning) return;
    const id = window.setInterval(() => {
      setKillTemp((temp) => {
        const next = Math.max(120, Math.min(250, temp + (Math.random() * 6 - 1.5)));
        setKillHold((hold) => {
          if (inRange(next, 175, 215)) return Math.min(6, hold + 1);
          return Math.max(0, hold - 1);
        });
        return next;
      });
    }, 300);
    return () => window.clearInterval(id);
  }, [killRunning]);

  // 杀青达标后进入揉捻，避免在 setState 里直接切阶段
  useEffect(() => {
    if (!killRunning || killHold < 6 || killDoneRef.current) return;
    killDoneRef.current = true;
    clearTimers();
    setKillRunning(false);
    setRollHits(0);
    setRollPos(0);
    advance("杀青完成。揉捻：当拍子落在中心时点击，需 6 次。");
    const rollId = window.setInterval(() => {
      setRollPos((pos) => (pos + 4) % 100);
    }, 50);
    timers.current.push(rollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [killHold, killRunning]);

  const tryRoll = () => {
    playCraftSound("tea");
    if (!inRange(rollPos, 42, 58)) {
      setFeedback(`拍点偏了（位置 ${rollPos}）。本击不计，继续找中心。`);
      return;
    }
    const next = rollHits + 1;
    setRollHits(next);
    if (next >= 6) {
      clearTimers();
      if (route === "green") {
        // 绿茶路线：发酵步改为「确认略过」
        setFermentRunning(false);
        advance("揉捻完成。绿茶路线几乎不发酵——确认后进入烘焙。");
        return;
      }
      setFerment(8);
      setFermentRunning(true);
      advance("揉捻完成。乌龙路线：发酵色泽推进，在琥珀色区间（55—70）停止。");
      const id = window.setInterval(() => {
        setFerment((value) => Math.min(100, value + 1.4));
      }, 90);
      timers.current.push(id);
      return;
    }
    setFeedback(`揉捻到位 ${next}/6。`);
  };

  const confirmGreenSkipFerment = () => {
    playCraftSound("tea");
    advance("已确认略过发酵。设定烘焙温度 95—115、时长 35—55 后确认。");
  };

  const stopFerment = () => {
    playCraftSound("tea");
    clearTimers();
    setFermentRunning(false);
    if (!inRange(ferment, 55, 70)) {
      setFerment(8);
      setFermentRunning(true);
      const id = window.setInterval(() => {
        setFerment((value) => Math.min(100, value + 1.4));
      }, 90);
      timers.current.push(id);
      setFeedback(`发酵程度 ${Math.round(ferment)} 不合适。已重来本步。`);
      return;
    }
    advance("发酵完成。设定烘焙温度 95—115、时长 35—55 后确认。");
  };

  const confirmBake = () => {
    playCraftSound("tea");
    if (!inRange(bakeTemp, 95, 115) || !inRange(bakeTime, 35, 55)) {
      setFeedback("烘焙参数不在教学推荐区间，请只调整本步数值。");
      return;
    }
    setServeStep(0);
    advance("茶已烘焙。按「温器 → 注水 → 奉茶」招待林先生，再回答他的口味。");
  };

  const doServe = (action: string) => {
    playCraftSound("tea");
    const order = ["温器", "注水", "奉茶"] as const;
    if (serveStep < 3) {
      if (action !== order[serveStep]) {
        setFeedback(`请先「${order[serveStep]}」。顺序错了只重试当前动作。`);
        return;
      }
      const next = serveStep + 1;
      setServeStep(next);
      if (next < 3) {
        setFeedback(`已完成「${action}」，继续。`);
        return;
      }
      setFeedback(
        route === "oolong"
          ? "茶已奉上。乌龙教学茶请选「醇厚」。"
          : "茶已奉上。绿茶教学茶请选「清香」。",
      );
      return;
    }
    const expect = route === "oolong" ? "醇厚" : "清香";
    if (action !== expect) {
      setFeedback(`本路线口味应答应为「${expect}」。请再选一次（本步重试）。`);
      return;
    }
    advance("奉茶完成。");
  };

  if (completed) {
    return (
      <CraftShell
        tag="传统制茶技艺及相关习俗"
        title="从一片鲜叶到一席待客茶"
        lead="茶园管理、手工加工与待客习俗连成一条活态链路。"
      >
        <CraftCompleteCard
          className="tea-complete"
          eyebrow="茶客满意"
          title="以茶待客"
          detail="茶园和茶馆已经成为博物馆的活态展区。"
        />
      </CraftShell>
    );
  }

  const leaves = [
    { ripe: true },
    { ripe: false },
    { ripe: true },
    { ripe: true },
    { ripe: false },
    { ripe: true },
    { ripe: false },
    { ripe: true },
    { ripe: false },
  ];

  return (
    <CraftShell
      tag="传统制茶技艺及相关习俗"
      title="从一片鲜叶到一席待客茶"
      lead="预计 5—8 分钟。开局可选绿茶 / 乌龙差异路线；仍是教学抽象，失败只重试当前工序。"
    >
      <StepRail label="制茶进度" steps={PHASES} current={phase} />

      {phase === 0 && !route && (
        <div className="craft-panel">
          <p className="craft-hint">选择本关茶类路线（教学对比，非完整茶类规范）。</p>
          <div className="type-choices" role="group" aria-label="茶类路线">
            <button type="button" onClick={() => selectRoute("green")}>绿茶 · 清香少发酵</button>
            <button type="button" onClick={() => selectRoute("oolong")}>乌龙 · 半发酵醇厚</button>
          </div>
        </div>
      )}

      {phase === 0 && route && (
        <div className="craft-panel">
          <p className="craft-hint">
            当前：{route === "green" ? "绿茶" : "乌龙"}路线。点击空位栽苗，正好 4 株后确认（{planted.length}/4）。
          </p>
          <div className="garden-grid" role="grid" aria-label="茶垄">
            {Array.from({ length: 9 }, (_, index) => (
              <button
                key={index}
                type="button"
                role="gridcell"
                className={planted.includes(index) ? "planted" : ""}
                onClick={() => togglePlant(index)}
                aria-label={`垄位 ${index + 1}`}
              >
                {planted.includes(index) ? "苗" : "·"}
              </button>
            ))}
          </div>
          <button type="button" className="craft-primary" onClick={confirmPlant}>
            确认种茶
          </button>
        </div>
      )}

      {phase === 1 && (
        <div className="craft-panel">
          <p className="craft-hint">只采金色成熟叶（{picked.length}/5）。</p>
          <div className="leaf-field">
            {leaves.map((leaf, index) => (
              <button
                key={index}
                type="button"
                className={`leaf ${leaf.ripe ? "ripe" : "raw"} ${picked.includes(index) ? "taken" : ""}`}
                disabled={picked.includes(index)}
                onClick={() => pickLeaf(index, leaf.ripe)}
              >
                {leaf.ripe ? "熟" : "芽"}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 2 && (
        <div className="craft-panel">
          <p className="craft-hint">含水率 {Math.round(wither)}%（目标 38—52）{witherRunning ? " · 萎凋中" : ""}</p>
          <div className="align-meter" aria-hidden="true">
            <i className="align-zone wither-zone" />
            <b style={{ left: `${wither}%` }} />
          </div>
          <button type="button" className="craft-primary" onClick={stopWither}>
            停止萎凋
          </button>
        </div>
      )}

      {phase === 3 && (
        <div className="craft-panel">
          <p className="craft-hint">锅温 {Math.round(killTemp)}℃ · 稳住进度 {killHold}/6</p>
          <div className="align-meter" aria-hidden="true">
            <i className="align-zone kill-zone" />
            <b style={{ left: `${((killTemp - 120) / 130) * 100}%` }} />
          </div>
          <div className="craft-actions">
            <button type="button" onClick={() => nudgeKill(-12)}>吹风降温</button>
            <button type="button" onClick={() => nudgeKill(12)}>添火升温</button>
          </div>
        </div>
      )}

      {phase === 4 && (
        <div className="craft-panel">
          <p className="craft-hint">拍子过中心时点击（{rollHits}/6）。</p>
          <div className="align-meter" aria-hidden="true">
            <i className="align-zone" />
            <b style={{ left: `${rollPos}%` }} />
          </div>
          <button type="button" className="craft-primary" onClick={tryRoll}>
            揉捻一拍
          </button>
        </div>
      )}

      {phase === 5 && route === "green" && (
        <div className="craft-panel">
          <p className="craft-hint">绿茶教学路线：杀青后基本不走氧化发酵，点确认进入烘焙。</p>
          <button type="button" className="craft-primary" onClick={confirmGreenSkipFerment}>
            确认略过发酵
          </button>
        </div>
      )}

      {phase === 5 && route !== "green" && (
        <div className="craft-panel">
          <p className="craft-hint">发酵色泽 {Math.round(ferment)}（目标 55—70）{fermentRunning ? " · 进行中" : ""}</p>
          <div
            className="ferment-swatch"
            style={{ background: `color-mix(in srgb, #c6d48a ${100 - ferment}%, #a85a2a ${ferment}%)` }}
            aria-hidden="true"
          />
          <div className="align-meter" aria-hidden="true">
            <i className="align-zone ferment-zone" />
            <b style={{ left: `${ferment}%` }} />
          </div>
          <button type="button" className="craft-primary" onClick={stopFerment}>
            停止发酵
          </button>
        </div>
      )}

      {phase === 6 && (
        <div className="craft-panel">
          <label className="craft-slider">
            <span>烘焙温度 {bakeTemp}℃（95—115）</span>
            <input type="range" min={70} max={140} value={bakeTemp} onChange={(e) => setBakeTemp(Number(e.target.value))} />
          </label>
          <label className="craft-slider">
            <span>时长 {bakeTime} 分（35—55）</span>
            <input type="range" min={10} max={80} value={bakeTime} onChange={(e) => setBakeTime(Number(e.target.value))} />
          </label>
          <button type="button" className="craft-primary" onClick={confirmBake}>
            确认烘焙
          </button>
        </div>
      )}

      {phase === 7 && (
        <div className="craft-panel">
          <div className="tea-guest">
            <div className="npc-avatar" aria-hidden="true">茶</div>
            <div>
              <strong>茶客 · 林先生</strong>
              <p>
                {serveStep < 3
                  ? "请按序温器、注水、奉茶。"
                  : route === "oolong"
                    ? "这盏乌龙教学茶，您觉得更接近清香还是醇厚？"
                    : "这盏绿茶教学茶，您觉得更接近清香还是醇厚？"}
              </p>
            </div>
          </div>
          <div className="craft-actions">
            {serveStep < 3
              ? ["奉茶", "温器", "注水"].map((action) => (
                  <button key={action} type="button" onClick={() => doServe(action)}>
                    {action}
                  </button>
                ))
              : ["醇厚", "清香"].map((action) => (
                  <button key={action} type="button" onClick={() => doServe(action)}>
                    {action}
                  </button>
                ))}
          </div>
        </div>
      )}

      <CraftFeedback>{feedback}</CraftFeedback>
    </CraftShell>
  );
}
