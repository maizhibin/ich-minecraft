"use client";

// 木活字：识镜像 → 排字 → 校对 → 上墨 → 覆纸 → 拓印。
// 错序或力度不当只重置当前子步骤。

import { useEffect, useRef, useState } from "react";
import {
  CraftCompleteCard,
  CraftFeedback,
  CraftShell,
  StepRail,
  inRange,
  playCraftSound,
} from "./craft-ui";

const PHASES = ["识镜像", "排字", "校对", "上墨", "覆纸", "拓印"] as const;
/** 字盘从右向左排，拓印后读作「传承技艺」 */
const PLATE_ORDER = ["艺", "技", "承", "传"] as const;
const CHAR_POOL = ["传", "技", "艺", "承"] as const;
const QUIZ = [
  {
    prompt: "要印出纸上的「传」，字盘上应放哪一个朝向？",
    options: ["正向「传」", "镜像反字「传」", "任意朝向"],
    answer: 1,
  },
  {
    prompt: "阅读顺序与排字顺序的关系是？",
    options: ["完全相同", "左右镜像，右起排字", "上下颠倒即可"],
    answer: 1,
  },
] as const;

/** 校对关：找出混入的错字位置 */
const PROOF_ROW = ["艺", "技", "永", "传"] as const;
const PROOF_WRONG_INDEX = 2;

type PrintingCraftProps = {
  completed: boolean;
  onComplete: () => void;
};

export function PrintingCraft({ completed, onComplete }: PrintingCraftProps) {
  const [phase, setPhase] = useState(0);
  const [feedback, setFeedback] = useState("先弄清：字模要反向排，印到纸上才是正字。");
  const [quizIndex, setQuizIndex] = useState(0);
  const [plate, setPlate] = useState<string[]>([]);
  const [ink, setInk] = useState(0);
  const [inkGoods, setInkGoods] = useState(0);
  const [inking, setInking] = useState(false);
  const inkTimer = useRef(0);
  const [paperX, setPaperX] = useState(18);
  const [paperY, setPaperY] = useState(70);
  const [rubCount, setRubCount] = useState(0);
  const [rubbing, setRubbing] = useState(false);
  const rubLastX = useRef<number | null>(null);

  const advance = (message: string) => {
    playCraftSound("craft");
    const next = phase + 1;
    if (next >= PHASES.length) {
      setFeedback("拓印完成，「传承技艺」已入藏。");
      playCraftSound("complete");
      onComplete();
      return;
    }
    setPhase(next);
    setFeedback(message);
  };

  useEffect(() => {
    if (!inking) return;
    inkTimer.current = window.setInterval(() => {
      setInk((value) => Math.min(100, value + 2.2 + Math.sin(Date.now() / 180) * 0.8));
    }, 40);
    return () => window.clearInterval(inkTimer.current);
  }, [inking]);

  const answerQuiz = (optionIndex: number) => {
    playCraftSound("ui");
    if (optionIndex !== QUIZ[quizIndex].answer) {
      setFeedback("还差一点点。本问可重选，不影响后面排字。");
      return;
    }
    if (quizIndex + 1 < QUIZ.length) {
      setQuizIndex(quizIndex + 1);
      setFeedback("答对了。继续下一问。");
      return;
    }
    advance("镜像概念已掌握。请把字盘排成「艺技承传」（右起对应纸上「传承技艺」）。");
  };

  const addChar = (character: string) => {
    playCraftSound("ui");
    if (plate.includes(character)) return;
    const expected = PLATE_ORDER[plate.length];
    if (character !== expected) {
      setPlate([]);
      setFeedback(`排字顺序应为「艺→技→承→传」。本步已清空，请从「${PLATE_ORDER[0]}」重来。`);
      return;
    }
    const next = [...plate, character];
    setPlate(next);
    if (next.length === PLATE_ORDER.length) {
      advance("字盘排好。请找出校对行里混入的错字。");
    } else {
      setFeedback(`已排「${character}」，继续。`);
    }
  };

  const pickProof = (index: number) => {
    playCraftSound("ui");
    if (index !== PROOF_WRONG_INDEX) {
      setFeedback("这个字没错。请再找混入的错字（本步重试）。");
      return;
    }
    setInk(0);
    setInkGoods(0);
    advance("校对通过。按住上墨，在绿色墨量区松手，需成功两遍。");
  };

  const releaseInk = () => {
    if (!inking) return;
    setInking(false);
    playCraftSound("craft");
    if (!inRange(ink, 55, 78)) {
      setInk(0);
      setFeedback(`墨量 ${Math.round(ink)} 不合适（宜 55—78）。本遍作废，请再上墨。`);
      return;
    }
    const next = inkGoods + 1;
    setInkGoods(next);
    setInk(0);
    if (next >= 2) {
      advance("墨色均匀。请把纸张对齐到绿色十字附近（X 44—56，Y 44—56）。");
      return;
    }
    setFeedback(`第一遍上墨合格（${next}/2），再来一遍。`);
  };

  const confirmPaper = () => {
    playCraftSound("craft");
    if (!inRange(paperX, 44, 56) || !inRange(paperY, 44, 56)) {
      setFeedback("纸张尚未对准版心。请继续微调本步位置。");
      return;
    }
    setRubCount(0);
    advance("覆纸完成。在墨台上横向匀速拓印三次。");
  };

  const onRubPointerDown = (clientX: number) => {
    setRubbing(true);
    rubLastX.current = clientX;
  };

  const onRubPointerMove = (clientX: number) => {
    if (!rubbing || rubLastX.current === null) return;
    const delta = clientX - rubLastX.current;
    rubLastX.current = clientX;
    // 需要一次足够长的横向行程才计一次有效拓印
    if (Math.abs(delta) > 28) {
      playCraftSound("ui");
      const next = rubCount + 1;
      setRubCount(next);
      rubLastX.current = clientX;
      if (next >= 3) {
        setRubbing(false);
        advance("拓印完成。");
      } else {
        setFeedback(`有效拓印 ${next}/3，继续横向匀速摩擦。`);
      }
    }
  };

  if (completed) {
    return (
      <CraftShell
        tag="急需保护的传统技艺"
        title="木活字需要镜像排版"
        lead="从右向左排列字模，印到纸上后才会得到正确的「传承技艺」。"
      >
        <CraftCompleteCard
          className="print-complete"
          eyebrow="印页已入藏"
          title="传承技艺"
          detail="识镜像、排字、校对、上墨、覆纸与拓印全部完成。"
        />
      </CraftShell>
    );
  }

  return (
    <CraftShell
      tag="急需保护的传统技艺"
      title="木活字需要镜像排版"
      lead="预计 5—8 分钟。排字与上墨都可能失败，但只重做当前步骤。"
    >
      <StepRail label="木活字进度" steps={PHASES} current={phase} />

      {phase === 0 && (
        <div className="craft-panel">
          <p className="craft-hint">{QUIZ[quizIndex].prompt}</p>
          <div className="craft-actions">
            {QUIZ[quizIndex].options.map((option, index) => (
              <button key={option} type="button" onClick={() => answerQuiz(index)}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 1 && (
        <div className="craft-panel">
          <div className="type-slots" aria-label="字盘排版">
            {PLATE_ORDER.map((character, index) => (
              <span key={character}>{plate[index] ?? "·"}</span>
            ))}
          </div>
          <p className="craft-hint">纸上目标：传承技艺 ← 字盘应排：艺技承传</p>
          <div className="type-choices">
            {CHAR_POOL.map((character) => (
              <button
                key={character}
                type="button"
                disabled={plate.includes(character)}
                onClick={() => addChar(character)}
              >
                {character}
              </button>
            ))}
          </div>
          <button type="button" className="craft-ghost" onClick={() => setPlate([])}>
            清空本步排字
          </button>
        </div>
      )}

      {phase === 2 && (
        <div className="craft-panel">
          <p className="craft-hint">校对行混入了一个不该出现的字，点出它。</p>
          <div className="type-slots proof-row">
            {PROOF_ROW.map((character, index) => (
              <button key={`${character}-${index}`} type="button" onClick={() => pickProof(index)}>
                {character}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 3 && (
        <div className="craft-panel">
          <p className="craft-hint">按住上墨，墨量进入绿色带再松手。合格 {inkGoods}/2。</p>
          <div className="align-meter ink-meter" aria-hidden="true">
            <i className="align-zone ink-zone" />
            <b style={{ left: `${ink}%` }} />
          </div>
          <button
            type="button"
            className="craft-primary hold-btn"
            onPointerDown={() => {
              setInk(0);
              setInking(true);
            }}
            onPointerUp={releaseInk}
            onPointerLeave={releaseInk}
            onPointerCancel={releaseInk}
          >
            {inking ? "上墨中…松手确认" : "按住上墨"}
          </button>
        </div>
      )}

      {phase === 4 && (
        <div className="craft-panel">
          <p className="craft-hint">调整纸张位置，使角标落入版心。</p>
          <div className="paper-stage" aria-hidden="true">
            <div className="paper-plate" />
            <div className="paper-sheet" style={{ left: `${paperX}%`, top: `${paperY}%` }} />
            <div className="paper-target" />
          </div>
          <label className="craft-slider">
            <span>水平 {paperX}</span>
            <input type="range" min={10} max={90} value={paperX} onChange={(e) => setPaperX(Number(e.target.value))} />
          </label>
          <label className="craft-slider">
            <span>垂直 {paperY}</span>
            <input type="range" min={10} max={90} value={paperY} onChange={(e) => setPaperY(Number(e.target.value))} />
          </label>
          <button type="button" className="craft-primary" onClick={confirmPaper}>
            确认覆纸
          </button>
        </div>
      )}

      {phase === 5 && (
        <div className="craft-panel">
          <p className="craft-hint">在拓印台上按住并左右拖动，完成 3 次有效行程（{rubCount}/3）。</p>
          <div
            className="rub-pad"
            role="application"
            aria-label="拓印台"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              onRubPointerDown(event.clientX);
            }}
            onPointerMove={(event) => onRubPointerMove(event.clientX)}
            onPointerUp={() => {
              setRubbing(false);
              rubLastX.current = null;
            }}
          >
            <span>拓</span>
          </div>
        </div>
      )}

      <CraftFeedback>{feedback}</CraftFeedback>
    </CraftShell>
  );
}
