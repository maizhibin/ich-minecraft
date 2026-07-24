"use client";

// 中国剪纸：选纸→对称→识纹→半边剪刻→展开校对→修整→贴窗。
// 对称像素编辑：只剪半边或四分之一，预览自动镜像。

import { useMemo, useState } from "react";
import {
  CraftCompleteCard,
  CraftFeedback,
  CraftShell,
  StepRail,
  playCraftSound,
} from "./craft-ui";

const PHASES = ["选纸", "对称", "识纹", "剪刻", "展开", "修整", "贴窗"] as const;
const PAPER_COLORS = [
  { id: "red", label: "大红", css: "#c23b2e" },
  { id: "gold", label: "金黄", css: "#d4a017" },
  { id: "ink", label: "墨色", css: "#2a2a2a" },
] as const;
const SYMMETRIES = [
  { id: "lr", label: "左右对称" },
  { id: "quad", label: "四折对称" },
] as const;

/** 8×8 目标窗花（1=保留纸面）。剪刻只编辑左上/左半，再展开比对。 */
const TARGET_FULL: number[][] = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 0, 1, 1, 0, 1, 1],
  [1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1],
  [1, 1, 0, 1, 1, 0, 1, 1],
  [0, 1, 1, 0, 0, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

/** 从完整目标提取剪刻区示意，避免玩家盲剪 */
function editTarget(mode: "lr" | "quad"): number[][] {
  if (mode === "lr") {
    return TARGET_FULL.map((row) => row.slice(0, 4));
  }
  return TARGET_FULL.slice(0, 4).map((row) => row.slice(0, 4));
}

const QUIZ = {
  prompt: "窗花常在何时张贴以寄托祈愿？",
  options: ["仅在葬礼", "春节等节庆与日常喜事", "只在宫廷仪式"],
  answer: 1,
};

type PapercutCraftProps = {
  completed: boolean;
  onComplete: () => void;
};

function emptyHalf(cols: number, rows: number) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 1));
}

/** 将编辑区按对称方式展开为完整 8×8 */
function expandPattern(half: number[][], mode: "lr" | "quad"): number[][] {
  const size = 8;
  const full = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  if (mode === "lr") {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const cell = half[y]?.[x] ?? 0;
        full[y][x] = cell;
        full[y][size - 1 - x] = cell;
      }
    }
    return full;
  }
  // 四折：编辑左上 4×4
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const cell = half[y]?.[x] ?? 0;
      full[y][x] = cell;
      full[y][size - 1 - x] = cell;
      full[size - 1 - y][x] = cell;
      full[size - 1 - y][size - 1 - x] = cell;
    }
  }
  return full;
}

function matchScore(a: number[][], b: number[][]) {
  let same = 0;
  let total = 0;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      total += 1;
      if (a[y][x] === b[y][x]) same += 1;
    }
  }
  return same / total;
}

export function PapercutCraft({ completed, onComplete }: PapercutCraftProps) {
  const [phase, setPhase] = useState(0);
  const [feedback, setFeedback] = useState("先选择纸色。民间窗花常用大红寄托喜庆。");
  const [paperId, setPaperId] = useState("");
  const [symmetry, setSymmetry] = useState<"lr" | "quad" | "">("");
  const [half, setHalf] = useState<number[][]>(() => emptyHalf(4, 8));
  const [, setHistory] = useState<number[][][]>([]);

  const paper = PAPER_COLORS.find((item) => item.id === paperId);
  const expanded = useMemo(
    () => (symmetry ? expandPattern(half, symmetry) : TARGET_FULL.map((row) => [...row])),
    [half, symmetry],
  );
  const score = useMemo(() => matchScore(expanded, TARGET_FULL), [expanded]);

  const advance = (message: string) => {
    playCraftSound("craft");
    const next = phase + 1;
    if (next >= PHASES.length) {
      setFeedback("窗花入藏，纸上乾坤。");
      playCraftSound("complete");
      onComplete();
      return;
    }
    setPhase(next);
    setFeedback(message);
  };

  const pickPaper = (id: string) => {
    playCraftSound("ui");
    if (id !== "red") {
      setFeedback("本关教学窗花请用大红纸。可重选本步。");
      return;
    }
    setPaperId(id);
    advance("纸色已定。选择对称方式：左右或四折。");
  };

  const pickSymmetry = (id: "lr" | "quad") => {
    playCraftSound("ui");
    setSymmetry(id);
    setHalf(id === "lr" ? emptyHalf(4, 8) : emptyHalf(4, 4));
    setHistory([]);
    advance("对称已定。回答一道民俗小问。");
  };

  const answerQuiz = (index: number) => {
    playCraftSound("ui");
    if (index !== QUIZ.answer) {
      setFeedback("再想想节庆与窗花的关系。本问可重选。");
      return;
    }
    advance("开始剪刻：点击格子剪去（变空）。只编辑半边/一角，右侧实时展开。");
  };

  const toggleCell = (x: number, y: number) => {
    if (!symmetry) return;
    playCraftSound("ui");
    setHistory((prev) => [...prev.slice(-20), half.map((row) => [...row])]);
    setHalf((current) =>
      current.map((row, rowIndex) =>
        row.map((cell, colIndex) => (rowIndex === y && colIndex === x ? (cell ? 0 : 1) : cell)),
      ),
    );
  };

  const undo = () => {
    playCraftSound("ui");
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setHalf(last);
      return prev.slice(0, -1);
    });
  };

  const resetCut = () => {
    playCraftSound("ui");
    if (!symmetry) return;
    setHistory([]);
    setHalf(symmetry === "lr" ? emptyHalf(4, 8) : emptyHalf(4, 4));
    setFeedback("已重置本步剪刻，对称方式保留。");
  };

  const confirmCut = () => {
    playCraftSound("craft");
    // 至少剪去若干格，避免空白交卷
    const cutCount = half.flat().filter((cell) => cell === 0).length;
    if (cutCount < 4) {
      setFeedback("剪口太少。请至少剪去 4 格再展开（本步继续）。");
      return;
    }
    advance(`展开预览：当前与目标相似度 ${Math.round(score * 100)}%。继续修到 ≥80%。`);
  };

  const confirmExpand = () => {
    playCraftSound("craft");
    if (score < 0.8) {
      setFeedback(`相似度 ${Math.round(score * 100)}% 不足。请返回剪刻感仍在本步——可点「继续修整」。`);
      return;
    }
    advance("展开合格。再核对一次，确认没有误剪关键连接。");
  };

  const backToCut = () => {
    playCraftSound("ui");
    setPhase(3);
    setFeedback("继续剪刻半边，展开预览会同步更新。");
  };

  const confirmFix = () => {
    playCraftSound("craft");
    if (score < 0.85) {
      setFeedback(`修整后需 ≥85%（当前 ${Math.round(score * 100)}%）。可回剪刻或继续改。`);
      return;
    }
    advance("纹样稳定。将窗花贴上示意窗格。");
  };

  const pasteWindow = () => {
    playCraftSound("craft");
    advance("贴窗完成。");
  };

  if (completed) {
    return (
      <CraftShell
        tag="中国剪纸"
        title="对称之间，剪出纸上乾坤"
        lead="用对称像素体验剪纸基本方法；作品入藏博物馆，世界出现窗花展陈。"
      >
        <CraftCompleteCard
          className="papercut-complete"
          eyebrow="技艺印记已获得"
          title="纸上乾坤"
          detail="案台旁已挂起窗花展陈。"
        />
      </CraftShell>
    );
  }

  const editCols = symmetry === "quad" ? 4 : 4;
  const editRows = symmetry === "quad" ? 4 : 8;

  return (
    <CraftShell
      tag="中国剪纸"
      title="对称之间，剪出纸上乾坤"
      lead="预计 5—8 分钟。只剪半边或一角，预览自动对称展开。失败只重试当前步。"
    >
      <StepRail label="剪纸进度" steps={PHASES} current={phase} />

      {phase === 0 && (
        <div className="craft-panel">
          <div className="craft-choice-cards">
            {PAPER_COLORS.map((item) => (
              <button key={item.id} type="button" onClick={() => pickPaper(item.id)}>
                <strong>{item.label}</strong>
                <span style={{ color: item.css }}>■■■■</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 1 && (
        <div className="craft-panel">
          <div className="craft-actions">
            {SYMMETRIES.map((item) => (
              <button key={item.id} type="button" onClick={() => pickSymmetry(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 2 && (
        <div className="craft-panel">
          <p className="craft-hint">{QUIZ.prompt}</p>
          <div className="craft-actions">
            {QUIZ.options.map((option, index) => (
              <button key={option} type="button" onClick={() => answerQuiz(index)}>{option}</button>
            ))}
          </div>
        </div>
      )}

      {(phase === 3 || phase === 4 || phase === 5) && symmetry && (
        <div className="craft-panel papercut-board">
          <div>
            <span className="craft-mini-label">剪刻区（对照下方示意点击剪去）</span>
            <div
              className="pixel-grid"
              style={{
                gridTemplateColumns: `repeat(${editCols}, 22px)`,
                ["--paper-color" as string]: paper?.css ?? "#c23b2e",
              }}
              role="grid"
              aria-label="剪纸编辑"
            >
              {Array.from({ length: editRows }, (_, y) =>
                Array.from({ length: editCols }, (_, x) => (
                  <button
                    key={`${x}-${y}`}
                    type="button"
                    role="gridcell"
                    className={half[y]?.[x] ? "paper" : "cut"}
                    disabled={phase !== 3 && phase !== 5}
                    onClick={() => toggleCell(x, y)}
                    aria-label={`格 ${x + 1},${y + 1}`}
                  />
                )),
              )}
            </div>
            <span className="craft-mini-label">半边示意（剪成与此一致）</span>
            <div
              className="pixel-grid preview ghost"
              style={{
                gridTemplateColumns: `repeat(${editCols}, 22px)`,
                ["--paper-color" as string]: paper?.css ?? "#c23b2e",
              }}
              aria-hidden="true"
            >
              {editTarget(symmetry).map((row, y) =>
                row.map((cell, x) => <span key={`g-${x}-${y}`} className={cell ? "paper" : "cut"} />),
              )}
            </div>
          </div>
          <div>
            <span className="craft-mini-label">展开 / 目标（相似度 {Math.round(score * 100)}%）</span>
            <div className="pixel-compare">
              <div className="pixel-grid preview" style={{ ["--paper-color" as string]: paper?.css ?? "#c23b2e" }}>
                {expanded.map((row, y) =>
                  row.map((cell, x) => <span key={`e-${x}-${y}`} className={cell ? "paper" : "cut"} />),
                )}
              </div>
              <div className="pixel-grid preview target" aria-hidden="true">
                {TARGET_FULL.map((row, y) =>
                  row.map((cell, x) => <span key={`t-${x}-${y}`} className={cell ? "paper" : "cut"} />),
                )}
              </div>
            </div>
          </div>
          {phase === 3 && (
            <div className="craft-actions">
              <button type="button" className="craft-ghost" onClick={undo}>撤销</button>
              <button type="button" className="craft-ghost" onClick={resetCut}>重置剪刻</button>
              <button
                type="button"
                className="craft-ghost"
                onClick={() => {
                  // 一键对齐示意，仍鼓励先手剪；方便验收与降低挫败
                  playCraftSound("ui");
                  setHistory((prev) => [...prev.slice(-20), half.map((row) => [...row])]);
                  setHalf(editTarget(symmetry).map((row) => [...row]));
                  setFeedback("已套用半边示意，可再微调后展开。");
                }}
              >
                套用示意
              </button>
              <button type="button" className="craft-primary" onClick={confirmCut}>展开检查</button>
            </div>
          )}
          {phase === 4 && (
            <div className="craft-actions">
              <button type="button" className="craft-ghost" onClick={backToCut}>继续修整</button>
              <button type="button" className="craft-primary" onClick={confirmExpand}>确认展开</button>
            </div>
          )}
          {phase === 5 && (
            <div className="craft-actions">
              <button type="button" className="craft-ghost" onClick={backToCut}>回剪刻</button>
              <button type="button" className="craft-primary" onClick={confirmFix}>修整完成</button>
            </div>
          )}
        </div>
      )}

      {phase === 6 && (
        <div className="craft-panel">
          <div
            className="window-paste"
            style={{ ["--paper-color" as string]: paper?.css ?? "#c23b2e" }}
            aria-hidden="true"
          >
            <div className="pixel-grid preview">
              {expanded.map((row, y) =>
                row.map((cell, x) => <span key={`w-${x}-${y}`} className={cell ? "paper" : "cut"} />),
              )}
            </div>
          </div>
          <button type="button" className="craft-primary" onClick={pasteWindow}>贴上窗格</button>
        </div>
      )}

      <CraftFeedback>{feedback}</CraftFeedback>
    </CraftShell>
  );
}
