"use client";

// 龙泉青瓷：备泥→练泥→制坯→晾坯→施釉→装窑→窑温曲线→开窑。
// 装窑后可选哥窑开片 / 弟窑梅子青对比；窑温为教学化三段；失败只重试当前步。

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

const PHASES = ["备泥", "练泥", "制坯", "晾坯", "施釉", "装窑", "窑温曲线", "开窑"] as const;
const SHAPES = [
  { id: "bowl", label: "碗", trim: [48, 62] as const },
  { id: "vase", label: "瓶", trim: [40, 55] as const },
  { id: "plate", label: "盘", trim: [55, 70] as const },
] as const;
const GLAZES = [
  { id: "pale", label: "淡青" },
  { id: "plum", label: "梅子青" },
  { id: "deep", label: "深翠" },
] as const;
/** 哥窑强调开片；弟窑强调梅子青温润（教学对比） */
const KILN_STYLES = [
  { id: "ge", label: "哥窑开片", inspect: ["生烧灰哑", "哥窑开片", "过烧起泡"] as const },
  { id: "di", label: "弟窑梅子青", inspect: ["生烧灰哑", "梅子青温润", "过烧起泡"] as const },
] as const;
/** 窑温三段目标：升温终点、保温区间、降温终点（教学抽象数值） */
const KILN_TARGETS = [
  { name: "升温", min: 72, max: 88, hint: "把火焰抬到橙白交界（72—88）后确认。" },
  { name: "保温", min: 78, max: 92, hint: "稳住高温区（78—92）并保持，再确认。" },
  { name: "降温", min: 28, max: 42, hint: "缓慢降至余温区（28—42）后开窑前确认。" },
] as const;

type PorcelainStyle = (typeof KILN_STYLES)[number]["id"];

type PorcelainCraftProps = {
  completed: boolean;
  onComplete: () => void;
};

export function PorcelainCraft({ completed, onComplete }: PorcelainCraftProps) {
  const [phase, setPhase] = usePersistedPhase("porcelain", completed);
  const [feedback, setFeedback] = useState("按教学比例调配泥料：黏土 45—55、石英 20—30、草木灰 15—25。");
  const [clay, setClay] = useState(30);
  const [quartz, setQuartz] = useState(40);
  const [ash, setAsh] = useState(10);
  const [kneadHits, setKneadHits] = useState(0);
  const [kneadPos, setKneadPos] = useState(10);
  const [shapeId, setShapeId] = useState("");
  const [trim, setTrim] = useState(30);
  const [dry, setDry] = useState(90);
  const [drying, setDrying] = useState(false);
  const [glazeId, setGlazeId] = useState("");
  const [coat, setCoat] = useState(0);
  const [coating, setCoating] = useState(false);
  const [shelf, setShelf] = useState<number[]>([]);
  const [kilnStyle, setKilnStyle] = useState<PorcelainStyle | "">("");
  const [kilnStage, setKilnStage] = useState(0);
  const [flame, setFlame] = useState(20);
  const [pickGood, setPickGood] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearInterval(id));
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const advance = (message: string) => {
    playCraftSound("craft");
    const next = phase + 1;
    if (next >= PHASES.length) {
      setFeedback("开窑验坯通过，青瓷窑火印记已得。");
      playCraftSound("complete");
      onComplete();
      return;
    }
    setPhase(next);
    setFeedback(message);
  };

  useEffect(() => {
    if (phase !== 1) return;
    const id = window.setInterval(() => setKneadPos((p) => (p + 5) % 100), 55);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!drying) return;
    const id = window.setInterval(() => setDry((v) => Math.max(10, v - 1.1)), 110);
    timers.current.push(id);
    return () => window.clearInterval(id);
  }, [drying]);

  useEffect(() => {
    if (!coating) return;
    const id = window.setInterval(() => {
      setCoat((v) => Math.min(100, v + 2.4 + Math.sin(Date.now() / 160)));
    }, 40);
    return () => window.clearInterval(id);
  }, [coating]);

  const confirmClay = () => {
    playCraftSound("craft");
    if (!inRange(clay, 45, 55) || !inRange(quartz, 20, 30) || !inRange(ash, 15, 25)) {
      setFeedback("泥料比例仍偏离教学区间，请只调整本步三项数值。");
      return;
    }
    const sum = clay + quartz + ash;
    if (!inRange(sum, 85, 105)) {
      setFeedback(`三项合计 ${sum}，教学配方宜接近 100。请微调本步。`);
      return;
    }
    setKneadHits(0);
    advance("泥料可用。练泥：拍子过中心时按压，需 5 次。");
  };

  const knead = () => {
    playCraftSound("ui");
    if (!inRange(kneadPos, 42, 58)) {
      setFeedback("力道落点偏了，本击不计，继续找中心。");
      return;
    }
    const next = kneadHits + 1;
    setKneadHits(next);
    if (next >= 5) {
      setShapeId("");
      setTrim(30);
      advance("练泥完成。选择器形并修坯到该器的推荐厚度。");
      return;
    }
    setFeedback(`练泥到位 ${next}/5。`);
  };

  const confirmShape = () => {
    playCraftSound("craft");
    const shape = SHAPES.find((item) => item.id === shapeId);
    if (!shape) {
      setFeedback("请先选择碗、瓶或盘。");
      return;
    }
    if (!inRange(trim, shape.trim[0], shape.trim[1])) {
      setFeedback(`「${shape.label}」修坯宜在 ${shape.trim[0]}—${shape.trim[1]}，请继续本步微调。`);
      return;
    }
    setDry(90);
    setDrying(true);
    advance("坯体成形。晾坯至含水 35%—48% 时停止。");
  };

  const stopDry = () => {
    playCraftSound("craft");
    clearTimers();
    setDrying(false);
    if (!inRange(dry, 35, 48)) {
      setDry(90);
      setDrying(true);
      setFeedback(`含水 ${Math.round(dry)}% 不合适，已重新晾坯（本步重试）。`);
      return;
    }
    setGlazeId("");
    setCoat(0);
    advance("晾坯完成。选择梅子青釉，并按住施釉，在绿色带松手。");
  };

  const releaseCoat = () => {
    if (!coating) return;
    setCoating(false);
    playCraftSound("craft");
    if (glazeId !== "plum") {
      setCoat(0);
      setFeedback("教学关请选用梅子青。釉种可重选，施釉力度本遍作废。");
      return;
    }
    if (!inRange(coat, 52, 76)) {
      setCoat(0);
      setFeedback(`釉层 ${Math.round(coat)} 不匀（宜 52—76），请再施本遍。`);
      return;
    }
    setShelf([]);
    advance("施釉完成。在窑架三层中各放一件，避免叠压同一层。");
  };

  const toggleShelf = (slot: number) => {
    playCraftSound("ui");
    setShelf((current) =>
      current.includes(slot) ? current.filter((s) => s !== slot) : [...current, slot].slice(0, 3),
    );
  };

  const confirmShelf = () => {
    playCraftSound("craft");
    // 三个槽位 0/1/2 必须各占一层：用 0、1、2 且恰好三个
    const unique = new Set(shelf);
    if (shelf.length !== 3 || unique.size !== 3) {
      setFeedback("请在三层各放一件（点选 上/中/下 层位）。本步可重选。");
      return;
    }
    setKilnStage(0);
    setFlame(20);
    setKilnStyle("");
    advance("装窑完成。先选哥窑开片或弟窑梅子青，再走窑温曲线。");
  };

  const selectKilnStyle = (id: PorcelainStyle) => {
    playCraftSound("ui");
    setKilnStyle(id);
    setFeedback(
      id === "ge"
        ? "哥窑路线：开窑时认开片纹。进入窑温曲线：升温→保温→降温。"
        : "弟窑路线：开窑时认梅子青温润。进入窑温曲线：升温→保温→降温。",
    );
  };

  const confirmKilnStage = () => {
    playCraftSound("craft");
    if (!kilnStyle) {
      setFeedback("请先选择哥窑或弟窑教学路线。");
      return;
    }
    const target = KILN_TARGETS[kilnStage];
    if (!inRange(flame, target.min, target.max)) {
      setFeedback(`${target.name}未到位（当前 ${flame}）。请只调整本段火焰。`);
      return;
    }
    if (kilnStage + 1 < KILN_TARGETS.length) {
      const next = kilnStage + 1;
      setKilnStage(next);
      setFeedback(`${target.name}完成。下一段：${KILN_TARGETS[next].hint}`);
      return;
    }
    setPickGood(null);
    advance(
      kilnStyle === "ge"
        ? "窑温曲线完成。开窑验坯：选出带开片特征的一件。"
        : "窑温曲线完成。开窑验坯：选出梅子青温润的一件。",
    );
  };

  const finishInspect = (index: number) => {
    playCraftSound("craft");
    // 中间一件为合格教学件（标签随哥窑/弟窑路线变化）
    if (index !== 1) {
      setFeedback("这件有过烧或生烧痕迹。请再选（本步重试）。");
      return;
    }
    setPickGood(index);
    advance("验坯通过。");
  };

  if (completed) {
    return (
      <CraftShell
        tag="龙泉青瓷传统烧制技艺"
        title="泥、坯、釉、火，炼出梅子青"
        lead="教学化呈现备泥到开窑的链路；真实窑温与配方远更复杂。"
      >
        <CraftCompleteCard
          className="porcelain-complete"
          eyebrow="技艺印记已获得"
          title="青瓷窑火"
          detail="窑场旁已生成青瓷展架，档案写入博物馆。"
        />
      </CraftShell>
    );
  }

  return (
    <CraftShell
      tag="龙泉青瓷传统烧制技艺"
      title="泥、坯、釉、火，炼出梅子青"
      lead="预计 5—8 分钟。窑温曲线分升温、保温、降温三段；出错只重试当前步。不作真实化学仿真。"
    >
      <StepRail label="青瓷进度" steps={PHASES} current={phase} />

      {phase === 0 && (
        <div className="craft-panel">
          <label className="craft-slider"><span>黏土 {clay}</span><input type="range" min={10} max={80} value={clay} onChange={(e) => setClay(Number(e.target.value))} /></label>
          <label className="craft-slider"><span>石英 {quartz}</span><input type="range" min={5} max={60} value={quartz} onChange={(e) => setQuartz(Number(e.target.value))} /></label>
          <label className="craft-slider"><span>草木灰 {ash}</span><input type="range" min={5} max={50} value={ash} onChange={(e) => setAsh(Number(e.target.value))} /></label>
          <p className="craft-hint">合计 {clay + quartz + ash}（宜约 100；单项亦须落入教学区间）</p>
          <button type="button" className="craft-primary" onClick={confirmClay}>确认泥料</button>
        </div>
      )}

      {phase === 1 && (
        <div className="craft-panel">
          <p className="craft-hint">练泥拍点 {kneadHits}/5</p>
          <div className="align-meter" aria-hidden="true"><i className="align-zone" /><b style={{ left: `${kneadPos}%` }} /></div>
          <button type="button" className="craft-primary" onClick={knead}>按压练泥</button>
        </div>
      )}

      {phase === 2 && (
        <div className="craft-panel">
          <div className="craft-actions">
            {SHAPES.map((shape) => (
              <button key={shape.id} type="button" className={shapeId === shape.id ? "selected" : ""} onClick={() => { setShapeId(shape.id); playCraftSound("ui"); }}>
                {shape.label}
              </button>
            ))}
          </div>
          <label className="craft-slider"><span>修坯厚度 {trim}</span><input type="range" min={20} max={80} value={trim} onChange={(e) => setTrim(Number(e.target.value))} /></label>
          <button type="button" className="craft-primary" onClick={confirmShape}>确认制坯</button>
        </div>
      )}

      {phase === 3 && (
        <div className="craft-panel">
          <p className="craft-hint">含水 {Math.round(dry)}%（目标 35—48）</p>
          <div className="align-meter" aria-hidden="true"><i className="align-zone wither-zone" /><b style={{ left: `${dry}%` }} /></div>
          <button type="button" className="craft-primary" onClick={stopDry}>停止晾坯</button>
        </div>
      )}

      {phase === 4 && (
        <div className="craft-panel">
          <div className="craft-actions">
            {GLAZES.map((glaze) => (
              <button key={glaze.id} type="button" className={glazeId === glaze.id ? "selected" : ""} onClick={() => { setGlazeId(glaze.id); playCraftSound("ui"); }}>
                {glaze.label}
              </button>
            ))}
          </div>
          <div className="align-meter ink-meter" aria-hidden="true"><i className="align-zone ink-zone" /><b style={{ left: `${coat}%` }} /></div>
          <button
            type="button"
            className="craft-primary hold-btn"
            onPointerDown={() => { setCoat(0); setCoating(true); }}
            onPointerUp={releaseCoat}
            onPointerLeave={releaseCoat}
            onPointerCancel={releaseCoat}
          >
            {coating ? "施釉中…松手" : "按住施釉"}
          </button>
        </div>
      )}

      {phase === 5 && (
        <div className="craft-panel">
          <p className="craft-hint">点选三层窑位各放一件（已选 {shelf.length}/3）。</p>
          <div className="kiln-shelf">
            {["上层", "中层", "下层"].map((label, index) => (
              <button key={label} type="button" className={shelf.includes(index) ? "filled" : ""} onClick={() => toggleShelf(index)}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="craft-primary" onClick={confirmShelf}>确认装窑</button>
        </div>
      )}

      {phase === 6 && !kilnStyle && (
        <div className="craft-panel">
          <p className="craft-hint">选择窑系对比路线（教学抽象，非完整窑口复原）。</p>
          <div className="type-choices" role="group" aria-label="哥窑与弟窑">
            {KILN_STYLES.map((style) => (
              <button key={style.id} type="button" onClick={() => selectKilnStyle(style.id)}>
                {style.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 6 && kilnStyle && (
        <div className="craft-panel">
          <p className="craft-hint">当前：{kilnStyle === "ge" ? "哥窑开片" : "弟窑梅子青"}</p>
          <ol className="process-line craft-step-rail" aria-label="窑温三段">
            {KILN_TARGETS.map((stage, index) => (
              <li
                key={stage.name}
                className={index < kilnStage ? "done" : index === kilnStage ? "current" : ""}
              >
                <span>{index + 1}</span>
                {stage.name}
              </li>
            ))}
          </ol>
          <p className="craft-hint">{KILN_TARGETS[kilnStage].name} · {KILN_TARGETS[kilnStage].hint}</p>
          <div
            className="kiln-flame"
            style={{ ["--flame" as string]: `${flame}%` }}
            aria-hidden="true"
          >
            火
          </div>
          <div className="align-meter" aria-hidden="true">
            <i
              className="align-zone"
              style={{
                left: `${KILN_TARGETS[kilnStage].min}%`,
                width: `${KILN_TARGETS[kilnStage].max - KILN_TARGETS[kilnStage].min}%`,
              }}
            />
            <b style={{ left: `${flame}%` }} />
          </div>
          <label className="craft-slider">
            <span>火焰观测值 {flame}</span>
            <input type="range" min={0} max={100} value={flame} onChange={(e) => setFlame(Number(e.target.value))} />
          </label>
          <button type="button" className="craft-primary" onClick={confirmKilnStage}>
            确认本段窑温
          </button>
        </div>
      )}

      {phase === 7 && (
        <div className="craft-panel">
          <p className="craft-hint">
            三件出窑，选出{kilnStyle === "ge" ? "开片特征明确" : "梅子青温润"}者。
          </p>
          <div className="inspect-row">
            {(KILN_STYLES.find((s) => s.id === kilnStyle) ?? KILN_STYLES[1]).inspect.map((label, index) => (
              <button
                key={label}
                type="button"
                className={pickGood === index ? "selected" : ""}
                onClick={() => finishInspect(index)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <CraftFeedback>{feedback}</CraftFeedback>
    </CraftShell>
  );
}
