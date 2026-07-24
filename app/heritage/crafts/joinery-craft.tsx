"use client";

// 榫卯营造：选材 → 墨线 → 卯位图 → 制榫对齐 → 试装点击 → 合架顺序。
// 任一子步骤失败只重置该步输入，不回退已完成大阶段。

import { useMemo, useState } from "react";
import {
  CraftCompleteCard,
  CraftFeedback,
  CraftShell,
  StepRail,
  inRange,
  playCraftSound,
  usePersistedPhase,
} from "./craft-ui";

const PHASES = ["识材", "墨线放样", "画卯位", "凿卯制榫", "试装校正", "合榫成架"] as const;

const WOODS = [
  { id: "pine", label: "松木", note: "易得但易裂，不宜作主承重榫。" },
  { id: "fir", label: "杉木", note: "轻而直，适合门架立柱与横梁。" },
  { id: "oak", label: "硬杂木", note: "过硬难凿，教学门架不必强求。" },
] as const;

/** 墨线要点：按「左上 → 右上 → 右下 → 左下」点选 */
const INK_ORDER = ["tl", "tr", "br", "bl"] as const;
const INK_LABELS: Record<(typeof INK_ORDER)[number], string> = {
  tl: "左上",
  tr: "右上",
  br: "右下",
  bl: "左下",
};

/** 5×3 卯位模板：1 表示凿空 */
const MORTISE_TEMPLATE = [
  [0, 1, 1, 1, 0],
  [0, 1, 0, 1, 0],
  [0, 1, 1, 1, 0],
];

const ASSEMBLY = ["左柱", "横梁", "右柱", "销钉"] as const;

type JoineryCraftProps = {
  completed: boolean;
  onComplete: () => void;
};

export function JoineryCraft({ completed, onComplete }: JoineryCraftProps) {
  const [phase, setPhase] = usePersistedPhase("joinery", completed);
  const [feedback, setFeedback] = useState("先认识木材特性，为门架选出合适的主材。");
  const [inkPicks, setInkPicks] = useState<string[]>([]);
  const [mortise, setMortise] = useState(() =>
    MORTISE_TEMPLATE.map((row) => row.map(() => 0)),
  );
  const [tenonAlign, setTenonAlign] = useState(12);
  const [fitHits, setFitHits] = useState(0);
  const [fitNeedle, setFitNeedle] = useState(20);
  const [assembly, setAssembly] = useState<string[]>([]);

  const mortiseMatch = useMemo(
    () =>
      mortise.every((row, y) =>
        row.every((cell, x) => cell === MORTISE_TEMPLATE[y][x]),
      ),
    [mortise],
  );

  const advance = (message: string) => {
    playCraftSound("craft");
    const next = phase + 1;
    if (next >= PHASES.length) {
      setFeedback("梁柱严丝合缝，木构门架已完成。");
      playCraftSound("complete");
      onComplete();
      return;
    }
    setPhase(next);
    setFeedback(message);
  };

  const pickWood = (id: string) => {
    playCraftSound("ui");
    if (id !== "fir") {
      setFeedback("这批木料不适合主承重榫卯，请重新选择（本步重试）。");
      return;
    }
    advance("杉木已选定。请按顺时针在梁端点出墨线四角。");
  };

  const pickInk = (point: string) => {
    playCraftSound("ui");
    if (inkPicks.includes(point)) return;
    const expected = INK_ORDER[inkPicks.length];
    if (point !== expected) {
      setInkPicks([]);
      setFeedback(`墨线顺序应是左上→右上→右下→左下。已清除本步标记，请从「${INK_LABELS[INK_ORDER[0]]}」重来。`);
      return;
    }
    const next = [...inkPicks, point];
    setInkPicks(next);
    if (next.length === INK_ORDER.length) {
      advance("墨线完成。对照模板，在网格上画出卯口（点击切换凿空）。");
    } else {
      setFeedback(`已点「${INK_LABELS[point as (typeof INK_ORDER)[number]]}」，继续下一角。`);
    }
  };

  const toggleMortise = (x: number, y: number) => {
    playCraftSound("ui");
    setMortise((current) =>
      current.map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          rowIndex === y && colIndex === x ? (cell ? 0 : 1) : cell,
        ),
      ),
    );
  };

  const confirmMortise = () => {
    playCraftSound("craft");
    if (!mortiseMatch) {
      setFeedback("卯位与放样不符。可继续修改本步网格，无需重做前面工序。");
      return;
    }
    advance("卯口已成。拖动榫头对齐卯槽中心（误差 ±8）。");
  };

  const confirmTenon = () => {
    playCraftSound("craft");
    if (!inRange(tenonAlign, 42, 58)) {
      setFeedback("榫头偏了，请把对齐值调到 42—58 之间再确认（本步重试）。");
      return;
    }
    // 进入试装：启动简易摆动针
    setFitNeedle(15 + Math.floor(Math.random() * 70));
    advance("试装：当间隙指针进入绿色区时点击「校正」，需成功 3 次。");
  };

  const tryFit = () => {
    playCraftSound("craft");
    // 每次点击后随机摆动指针，绿区约 40—60
    const hit = inRange(fitNeedle, 40, 60);
    const nextNeedle = 10 + Math.floor(Math.random() * 80);
    setFitNeedle(nextNeedle);
    if (!hit) {
      setFeedback(`间隙过大或过紧（指针 ${fitNeedle}）。本步继续，请再抓绿色区间。`);
      return;
    }
    const nextHits = fitHits + 1;
    setFitHits(nextHits);
    if (nextHits >= 3) {
      setAssembly([]);
      advance("试装通过。按「左柱 → 横梁 → 右柱 → 销钉」合架。");
      return;
    }
    setFeedback(`校正成功 ${nextHits}/3，继续捕捉绿色间隙。`);
  };

  const pickAssembly = (part: string) => {
    playCraftSound("ui");
    if (assembly.includes(part)) return;
    const expected = ASSEMBLY[assembly.length];
    if (part !== expected) {
      setAssembly([]);
      setFeedback(`合架顺序应为左柱→横梁→右柱→销钉。本步已清空，请从「${ASSEMBLY[0]}」重来。`);
      return;
    }
    const next = [...assembly, part];
    setAssembly(next);
    if (next.length === ASSEMBLY.length) {
      advance("合榫完成。");
    } else {
      setFeedback(`已装「${part}」，继续下一构件。`);
    }
  };

  if (completed) {
    return (
      <CraftShell
        tag="传统营造技艺"
        title="不用铁钉，让梁柱彼此咬合"
        lead="木结构营造依靠识材、放样、加工和试装形成稳定连接。本关为教学化抽象，不模拟具体流派尺寸。"
      >
        <CraftCompleteCard
          eyebrow="技艺印记已获得"
          title="木作营造"
          detail="博物馆外已经生成一座木构示范门架。"
        />
      </CraftShell>
    );
  }

  return (
    <CraftShell
      tag="传统营造技艺"
      title="不用铁钉，让梁柱彼此咬合"
      lead="预计 5—8 分钟。失败只重试当前步骤。真实营造远更复杂，这里只保留可理解的核心判断。"
    >
      <StepRail label="榫卯制作进度" steps={PHASES} current={phase} />

      {phase === 0 && (
        <div className="craft-panel">
          <p className="craft-hint">门架主材需要轻而直、便于凿卯的木材。</p>
          <div className="craft-choice-cards">
            {WOODS.map((wood) => (
              <button key={wood.id} type="button" onClick={() => pickWood(wood.id)}>
                <strong>{wood.label}</strong>
                <span>{wood.note}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 1 && (
        <div className="craft-panel">
          <p className="craft-hint">在梁端按顺时针点出墨线四角（点错只清本步）。</p>
          <div className="ink-board" role="group" aria-label="墨线放样">
            {INK_ORDER.map((point) => (
              <button
                key={point}
                type="button"
                className={`ink-point ${point} ${inkPicks.includes(point) ? "marked" : ""}`}
                onClick={() => pickInk(point)}
              >
                {INK_LABELS[point]}
              </button>
            ))}
            <div className="ink-beam" aria-hidden="true" />
          </div>
        </div>
      )}

      {phase === 2 && (
        <div className="craft-panel">
          <p className="craft-hint">对照右侧示意，点击格子凿出卯口（深色为凿空）。</p>
          <div className="mortise-compare">
            <div>
              <span className="craft-mini-label">你的卯位</span>
              <div className="mortise-grid" role="grid" aria-label="卯位编辑">
                {mortise.map((row, y) =>
                  row.map((cell, x) => (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      role="gridcell"
                      className={cell ? "cut" : ""}
                      onClick={() => toggleMortise(x, y)}
                      aria-label={`格子 ${x + 1},${y + 1}`}
                    />
                  )),
                )}
              </div>
            </div>
            <div>
              <span className="craft-mini-label">放样示意</span>
              <div className="mortise-grid preview" aria-hidden="true">
                {MORTISE_TEMPLATE.map((row, y) =>
                  row.map((cell, x) => (
                    <span key={`t-${x}-${y}`} className={cell ? "cut" : ""} />
                  )),
                )}
              </div>
            </div>
          </div>
          <button type="button" className="craft-primary" onClick={confirmMortise}>
            确认卯位
          </button>
        </div>
      )}

      {phase === 3 && (
        <div className="craft-panel">
          <p className="craft-hint">拖动滑块，让榫头中线落入卯槽绿色区（42—58）。</p>
          <div className="align-meter" aria-hidden="true">
            <i className="align-zone" />
            <b style={{ left: `${tenonAlign}%` }} />
          </div>
          <label className="craft-slider">
            <span>榫头对齐 <b>{tenonAlign}</b></span>
            <input
              type="range"
              min={0}
              max={100}
              value={tenonAlign}
              onChange={(event) => setTenonAlign(Number(event.target.value))}
            />
          </label>
          <button type="button" className="craft-primary" onClick={confirmTenon}>
            试装榫头
          </button>
        </div>
      )}

      {phase === 4 && (
        <div className="craft-panel">
          <p className="craft-hint">指针在绿色区（约 40—60）时点击校正。已成功 {fitHits}/3。</p>
          <div className="align-meter fit-meter" aria-hidden="true">
            <i className="align-zone" />
            <b style={{ left: `${fitNeedle}%` }} />
          </div>
          <button type="button" className="craft-primary" onClick={tryFit}>
            校正间隙
          </button>
        </div>
      )}

      {phase === 5 && (
        <div className="craft-panel">
          <p className="craft-hint">按结构顺序合架；点错只清空本步构件。</p>
          <div className="assembly-slots" aria-label="已装构件">
            {ASSEMBLY.map((part, index) => (
              <span key={part} className={assembly[index] ? "filled" : ""}>
                {assembly[index] ?? "·"}
              </span>
            ))}
          </div>
          <div className="craft-actions">
            {[...ASSEMBLY].reverse().map((part) => (
              <button
                key={part}
                type="button"
                disabled={assembly.includes(part)}
                onClick={() => pickAssembly(part)}
              >
                {part}
              </button>
            ))}
          </div>
        </div>
      )}

      <CraftFeedback>{feedback}</CraftFeedback>
    </CraftShell>
  );
}
