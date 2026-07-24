"use client";

// 村落节庆演练：装饰 → 准备 → 短演 → 评价。
// 不计入博物馆七项进度，完成后可点亮广场节庆装饰（世界事件）。

import { useState } from "react";
import {
  CraftCompleteCard,
  CraftFeedback,
  CraftShell,
  StepRail,
  playCraftSound,
} from "./craft-ui";

const PHASES = ["挂彩", "备席", "短演", "评价"] as const;
const DECOR = ["灯笼", "窗花", "彩带"] as const;
const PREP = ["茶点", "鼓点", "座位"] as const;
const SHOW = ["开场白", "技艺展示", "谢幕"] as const;

type FestivalCraftProps = {
  completed: boolean;
  onComplete: () => void;
};

export function FestivalCraft({ completed, onComplete }: FestivalCraftProps) {
  const [phase, setPhase] = useState(0);
  const [feedback, setFeedback] = useState("先为广场挂上三样节庆装饰。");
  const [decor, setDecor] = useState<string[]>([]);
  const [prep, setPrep] = useState<string[]>([]);
  const [show, setShow] = useState<string[]>([]);
  const [rating, setRating] = useState("");

  const advance = (message: string) => {
    playCraftSound("craft");
    const next = phase + 1;
    if (next >= PHASES.length) {
      playCraftSound("complete");
      onComplete();
      return;
    }
    setPhase(next);
    setFeedback(message);
  };

  const toggle = (
    list: string[],
    setList: (value: string[]) => void,
    item: string,
    target: readonly string[],
    doneMessage: string,
  ) => {
    playCraftSound("ui");
    if (list.includes(item)) return;
    const next = [...list, item];
    setList(next);
    if (next.length === target.length) {
      advance(doneMessage);
    } else {
      setFeedback(`已选「${item}」（${next.length}/${target.length}）。`);
    }
  };

  const submitRating = (value: string) => {
    playCraftSound("ui");
    if (value !== "和气圆满") {
      setFeedback("教学评价请选「和气圆满」——强调社区参与而非攀比。本步可重选。");
      return;
    }
    setRating(value);
    advance("节庆演练完成。");
  };

  if (completed) {
    return (
      <CraftShell
        tag="村落节庆演练"
        title="一起准备，一起看见"
        lead="节庆是社区协作的练习场：装饰、备席、短演与评价连成一圈。"
      >
        <CraftCompleteCard
          eyebrow="节庆档案"
          title="和气圆满"
          detail="广场节庆装饰已点亮。这不是排行榜，而是共同完成的记忆。"
        />
      </CraftShell>
    );
  }

  return (
    <CraftShell
      tag="村落节庆演练"
      title="一起准备，一起看见"
      lead="约 5 分钟。不计入七项博物馆进度；强调协作与礼敬，不做攀比或收藏炒作。"
    >
      <StepRail label="节庆进度" steps={PHASES} current={phase} />

      {phase === 0 && (
        <div className="craft-panel">
          <p className="craft-hint">点选三样装饰挂上广场。</p>
          <div className="craft-actions">
            {[...DECOR].reverse().map((item) => (
              <button
                key={item}
                type="button"
                disabled={decor.includes(item)}
                onClick={() => toggle(decor, setDecor, item, DECOR, "装饰妥当。开始备席：茶点、鼓点、座位。")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 1 && (
        <div className="craft-panel">
          <p className="craft-hint">备齐三样席面要素。</p>
          <div className="craft-actions">
            {[...PREP].reverse().map((item) => (
              <button
                key={item}
                type="button"
                disabled={prep.includes(item)}
                onClick={() => toggle(prep, setPrep, item, PREP, "席面就绪。按开场白→技艺展示→谢幕排练短演。")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 2 && (
        <div className="craft-panel">
          <p className="craft-hint">按顺序点选短演三拍（点错只清空本步）。</p>
          <div className="assembly-slots">
            {SHOW.map((item, index) => (
              <span key={item} className={show[index] ? "filled" : ""}>
                {show[index] ?? "·"}
              </span>
            ))}
          </div>
          <div className="craft-actions">
            {[...SHOW].reverse().map((item) => (
              <button
                key={item}
                type="button"
                disabled={show.includes(item)}
                onClick={() => {
                  playCraftSound("ui");
                  const expected = SHOW[show.length];
                  if (item !== expected) {
                    setShow([]);
                    setFeedback(`顺序应为 ${SHOW.join("→")}。本步已清空。`);
                    return;
                  }
                  const next = [...show, item];
                  setShow(next);
                  if (next.length === SHOW.length) {
                    advance("短演完成。请以社区眼光给出评价。");
                  } else {
                    setFeedback(`已完成「${item}」。`);
                  }
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 3 && (
        <div className="craft-panel">
          <p className="craft-hint">村民更在意什么？</p>
          <div className="craft-actions">
            {["谁家更豪华", "和气圆满", "收藏升值"].map((item) => (
              <button
                key={item}
                type="button"
                className={rating === item ? "selected" : ""}
                onClick={() => submitRating(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      <CraftFeedback>{feedback}</CraftFeedback>
    </CraftShell>
  );
}
