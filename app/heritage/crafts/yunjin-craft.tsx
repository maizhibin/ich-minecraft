"use client";

// 南京云锦：识经纬→穿经→挑花→投梭→校花→上机。
// 经纬纹样网格为教学抽象，强调规则与协作织造概念。

import { useEffect, useMemo, useState } from "react";
import {
  CraftCompleteCard,
  CraftFeedback,
  CraftShell,
  StepRail,
  inRange,
  playCraftSound,
} from "./craft-ui";

const PHASES = ["识经纬", "穿经", "挑花", "投梭", "校花", "上机"] as const;
const WARP_TARGET = ["金", "青", "金", "赤", "金", "青"] as const;
const WARP_POOL = ["赤", "金", "青", "素"] as const;
/** 6×4 挑花目标：1 表示在经线上显花 */
const PATTERN: number[][] = [
  [0, 1, 1, 1, 1, 0],
  [1, 0, 1, 1, 0, 1],
  [1, 1, 0, 0, 1, 1],
  [0, 1, 1, 1, 1, 0],
];
const QUIZ = [
  {
    prompt: "云锦织造中，纵向固定、决定骨架的是？",
    options: ["纬线", "经线", "梭子本身"],
    answer: 1,
  },
  {
    prompt: "「寸锦寸金」主要提醒我们什么？",
    options: ["可以当作炒作藏品", "织造耗时耗材、技艺珍贵", "越贵越好卖"],
    answer: 1,
  },
] as const;

type YunjinCraftProps = {
  completed: boolean;
  onComplete: () => void;
};

export function YunjinCraft({ completed, onComplete }: YunjinCraftProps) {
  const [phase, setPhase] = useState(0);
  const [feedback, setFeedback] = useState("先弄清经线与纬线的角色，以及「寸锦寸金」的含义。");
  const [quizIndex, setQuizIndex] = useState(0);
  const [warp, setWarp] = useState<string[]>([]);
  const [grid, setGrid] = useState(() => PATTERN.map((row) => row.map(() => 0)));
  const [shuttleHits, setShuttleHits] = useState(0);
  const [shuttlePos, setShuttlePos] = useState(0);
  const [proofIndex, setProofIndex] = useState<number | null>(null);

  const patternMatch = useMemo(
    () => grid.every((row, y) => row.every((cell, x) => cell === PATTERN[y][x])),
    [grid],
  );

  const advance = (message: string) => {
    playCraftSound("craft");
    const next = phase + 1;
    if (next >= PHASES.length) {
      setFeedback("上机完成，寸锦寸金。");
      playCraftSound("complete");
      onComplete();
      return;
    }
    setPhase(next);
    setFeedback(message);
  };

  useEffect(() => {
    if (phase !== 3) return;
    const id = window.setInterval(() => setShuttlePos((p) => (p + 4) % 100), 48);
    return () => window.clearInterval(id);
  }, [phase]);

  const answerQuiz = (option: number) => {
    playCraftSound("ui");
    if (option !== QUIZ[quizIndex].answer) {
      setFeedback("再读一遍提示。本问可重选，不整关重来。");
      return;
    }
    if (quizIndex + 1 < QUIZ.length) {
      setQuizIndex(quizIndex + 1);
      setFeedback("答对了，继续下一问。");
      return;
    }
    setWarp([]);
    advance("经纬概念已明。按「金青金赤金青」穿入经线。");
  };

  const addWarp = (color: string) => {
    playCraftSound("ui");
    const expected = WARP_TARGET[warp.length];
    if (color !== expected) {
      setWarp([]);
      setFeedback(`穿经顺序应为 ${WARP_TARGET.join("→")}。本步已清空，请从「${WARP_TARGET[0]}」重来。`);
      return;
    }
    const next = [...warp, color];
    setWarp(next);
    if (next.length === WARP_TARGET.length) {
      setGrid(PATTERN.map((row) => row.map(() => 0)));
      advance("经线就绪。对照示意挑花：点击格子显花/取消。");
      return;
    }
    setFeedback(`已穿「${color}」，继续。`);
  };

  const toggleCell = (x: number, y: number) => {
    playCraftSound("ui");
    setGrid((current) =>
      current.map((row, rowIndex) =>
        row.map((cell, colIndex) => (rowIndex === y && colIndex === x ? (cell ? 0 : 1) : cell)),
      ),
    );
  };

  const confirmPattern = () => {
    playCraftSound("craft");
    if (!patternMatch) {
      setFeedback("挑花与示意不符。请继续修改本步网格。");
      return;
    }
    setShuttleHits(0);
    advance("纹样正确。投梭：拍子过中心时投出，需 6 次。");
  };

  const throwShuttle = () => {
    playCraftSound("ui");
    if (!inRange(shuttlePos, 42, 58)) {
      setFeedback("梭手偏了，本击不计。");
      return;
    }
    const next = shuttleHits + 1;
    setShuttleHits(next);
    if (next >= 6) {
      setProofIndex(null);
      advance("投梭稳定。找出样卡上的错花位置。");
      return;
    }
    setFeedback(`投梭成功 ${next}/6。`);
  };

  /** 样卡故意在 (2,1) 出错 */
  const proofRow = useMemo(() => {
    const copy = PATTERN.map((row) => [...row]);
    copy[1][2] = copy[1][2] ? 0 : 1;
    return copy;
  }, []);

  const pickProof = (x: number, y: number) => {
    playCraftSound("ui");
    if (x !== 2 || y !== 1) {
      setFeedback("这里与正确纹样一致。请点出错花格（本步重试）。");
      return;
    }
    setProofIndex(y * 6 + x);
    advance("校花通过。确认上机，完成教学织段。");
  };

  const confirmLoom = () => {
    playCraftSound("craft");
    advance("上机完成。");
  };

  if (completed) {
    return (
      <CraftShell
        tag="南京云锦木机妆花手工织造技艺"
        title="经纬交织，寸锦寸金"
        lead="以教学网格理解经线、挑花与投梭协作；不做炒作藏品叙事。"
      >
        <CraftCompleteCard
          className="yunjin-complete"
          eyebrow="技艺印记已获得"
          title="寸锦寸金"
          detail="织机廊已挂起纹样展陈。"
        />
      </CraftShell>
    );
  }

  return (
    <CraftShell
      tag="南京云锦木机妆花手工织造技艺"
      title="经纬交织，寸锦寸金"
      lead="预计 5—8 分钟。真实云锦工序上百道，本关只保留可理解的经纬与纹样规则。"
    >
      <StepRail label="云锦进度" steps={PHASES} current={phase} />

      {phase === 0 && (
        <div className="craft-panel">
          <p className="craft-hint">{QUIZ[quizIndex].prompt}</p>
          <div className="craft-actions">
            {QUIZ[quizIndex].options.map((option, index) => (
              <button key={option} type="button" onClick={() => answerQuiz(index)}>{option}</button>
            ))}
          </div>
        </div>
      )}

      {phase === 1 && (
        <div className="craft-panel">
          <div className="warp-slots" aria-label="经线序列">
            {WARP_TARGET.map((color, index) => (
              <span key={`${color}-${index}`} className={`warp-${warp[index] ?? "empty"}`}>
                {warp[index] ?? "·"}
              </span>
            ))}
          </div>
          <div className="craft-actions">
            {WARP_POOL.map((color) => (
              <button key={color} type="button" onClick={() => addWarp(color)}>{color}</button>
            ))}
          </div>
          <button type="button" className="craft-ghost" onClick={() => setWarp([])}>清空本步经线</button>
        </div>
      )}

      {phase === 2 && (
        <div className="craft-panel papercut-board">
          <div>
            <span className="craft-mini-label">你的挑花</span>
            <div className="pixel-grid weave" style={{ gridTemplateColumns: "repeat(6, 22px)" }} role="grid">
              {grid.map((row, y) =>
                row.map((cell, x) => (
                  <button
                    key={`${x}-${y}`}
                    type="button"
                    className={cell ? "paper" : "cut"}
                    onClick={() => toggleCell(x, y)}
                  />
                )),
              )}
            </div>
          </div>
          <div>
            <span className="craft-mini-label">示意纹样</span>
            <div className="pixel-grid weave preview" style={{ gridTemplateColumns: "repeat(6, 22px)" }} aria-hidden="true">
              {PATTERN.map((row, y) =>
                row.map((cell, x) => <span key={`p-${x}-${y}`} className={cell ? "paper" : "cut"} />),
              )}
            </div>
          </div>
          <button type="button" className="craft-primary" onClick={confirmPattern}>确认挑花</button>
          <button
            type="button"
            className="craft-ghost"
            onClick={() => {
              playCraftSound("ui");
              setGrid(PATTERN.map((row) => [...row]));
              setFeedback("已套用示意纹样，可再微调后确认。");
            }}
          >
            套用示意
          </button>
        </div>
      )}

      {phase === 3 && (
        <div className="craft-panel">
          <p className="craft-hint">投梭节奏 {shuttleHits}/6</p>
          <div className="align-meter" aria-hidden="true"><i className="align-zone" /><b style={{ left: `${shuttlePos}%` }} /></div>
          <button type="button" className="craft-primary" onClick={throwShuttle}>投梭</button>
        </div>
      )}

      {phase === 4 && (
        <div className="craft-panel">
          <p className="craft-hint">样卡有一处错花，点出它。</p>
          <div className="pixel-grid weave" style={{ gridTemplateColumns: "repeat(6, 22px)" }} role="grid">
            {proofRow.map((row, y) =>
              row.map((cell, x) => (
                <button
                  key={`pf-${x}-${y}`}
                  type="button"
                  className={`${cell ? "paper" : "cut"} ${proofIndex === y * 6 + x ? "selected" : ""}`}
                  onClick={() => pickProof(x, y)}
                />
              )),
            )}
          </div>
        </div>
      )}

      {phase === 5 && (
        <div className="craft-panel">
          <p className="craft-hint">经线、挑花、投梭与校花已齐，确认上机织出教学纹样段。</p>
          <div className="warp-slots" aria-hidden="true">
            {warp.map((color, index) => (
              <span key={`w-${index}`} className={`warp-${color}`}>{color}</span>
            ))}
          </div>
          <button type="button" className="craft-primary" onClick={confirmLoom}>确认上机</button>
        </div>
      )}

      <CraftFeedback>{feedback}</CraftFeedback>
    </CraftShell>
  );
}
