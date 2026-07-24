"use client";

// 皮影戏：选角 → 连关节 → 调姿态 → 定灯光 → 录四拍 → 排练 → 开演。
// 关节顺序或时间轴拍名错误只重置当前步。

import { useEffect, useState, type CSSProperties } from "react";
import {
  CraftCompleteCard,
  CraftFeedback,
  CraftShell,
  StepRail,
  inRange,
  playCraftSound,
} from "./craft-ui";

const PHASES = ["选角", "连关节", "调姿态", "定灯光", "录动作", "排练", "开演"] as const;
const ROLES = [
  { id: "人物", blurb: "生旦净丑皆可入戏，先把握身段开合。" },
  { id: "瑞兽", blurb: "瑞兽影人强调头颈与四肢夸张摆动。" },
  { id: "花鸟", blurb: "花鸟影人靠翅羽开合表现灵动。" },
] as const;
const JOINTS = ["肩", "肘", "腕"] as const;
const BEATS = ["登场", "亮相", "转身", "谢幕"] as const;

type Pose = { left: number; right: number; tilt: number };

const DEFAULT_POSE: Pose = { left: 18, right: -24, tilt: 0 };

type ShadowCraftProps = {
  completed: boolean;
  onComplete: () => void;
};

export function ShadowCraft({ completed, onComplete }: ShadowCraftProps) {
  const [phase, setPhase] = useState(0);
  const [feedback, setFeedback] = useState("先选定本场影人角色，并阅读简短提示。");
  const [role, setRole] = useState("");
  const [joints, setJoints] = useState<string[]>([]);
  const [pose, setPose] = useState<Pose>(DEFAULT_POSE);
  const [light, setLight] = useState(30);
  const [beatIndex, setBeatIndex] = useState(0);
  const [timeline, setTimeline] = useState<Array<{ beat: string; pose: Pose }>>([]);
  const [pickedBeat, setPickedBeat] = useState("");
  const [rehearseIndex, setRehearseIndex] = useState(-1);
  const [rehearseDone, setRehearseDone] = useState(false);
  const [rehearsing, setRehearsing] = useState(false);

  const advance = (message: string) => {
    playCraftSound("shadow");
    const next = phase + 1;
    if (next >= PHASES.length) {
      setFeedback("首演完成，灯影传情。");
      playCraftSound("complete");
      onComplete();
      return;
    }
    setPhase(next);
    setFeedback(message);
  };

  const selectRole = (id: string) => {
    playCraftSound("shadow");
    setRole(id);
    setJoints([]);
    advance(`已选「${id}」。请按肩→肘→腕顺序连接操纵关节。`);
  };

  const connectJoint = (joint: string) => {
    playCraftSound("ui");
    if (joints.includes(joint)) return;
    const expected = JOINTS[joints.length];
    if (joint !== expected) {
      setJoints([]);
      setFeedback(`关节应接「肩→肘→腕」。本步已清空，请从「${JOINTS[0]}」重来。`);
      return;
    }
    const next = [...joints, joint];
    setJoints(next);
    if (next.length === JOINTS.length) {
      setPose(DEFAULT_POSE);
      advance("关节已活。调整双臂与身倾，使影人具备可演姿态后锁定。");
    } else {
      setFeedback(`已接「${joint}」，继续。`);
    }
  };

  const lockPose = () => {
    playCraftSound("shadow");
    // 要求玩家至少做过一定幅度调整，避免一键跳过
    const moved =
      Math.abs(pose.left - DEFAULT_POSE.left) >= 8 ||
      Math.abs(pose.right - DEFAULT_POSE.right) >= 8 ||
      Math.abs(pose.tilt) >= 6;
    if (!moved) {
      setFeedback("姿态几乎未改。请至少明显调整一处手臂或身倾（本步重试）。");
      return;
    }
    advance("姿态可用。把背光调到 45%—80% 并锁定。");
  };

  const lockLight = () => {
    playCraftSound("shadow");
    if (!inRange(light, 45, 80)) {
      setFeedback(`当前亮度 ${light}% 不宜演出。请只调整本步灯光。`);
      return;
    }
    setTimeline([]);
    setBeatIndex(0);
    setPickedBeat("");
    advance("灯光合适。为「登场→亮相→转身→谢幕」各录一拍姿态。");
  };

  const recordBeat = () => {
    playCraftSound("shadow");
    const expected = BEATS[beatIndex];
    if (pickedBeat !== expected) {
      setPickedBeat("");
      setFeedback(`这一拍应录「${expected}」。拍名选错只重试当前拍。`);
      return;
    }
    const entry = { beat: expected, pose: { ...pose } };
    const next = [...timeline, entry];
    setTimeline(next);
    setPickedBeat("");
    if (next.length === BEATS.length) {
      setRehearseIndex(-1);
      setRehearseDone(false);
      setRehearsing(false);
      advance("四拍已录。先排练一遍，确认影人动作连贯。");
      return;
    }
    setBeatIndex(next.length);
    setFeedback(`「${expected}」已录（${next.length}/4）。调整姿态后录下一拍。`);
  };

  const startRehearse = () => {
    if (rehearsing || timeline.length === 0) return;
    playCraftSound("shadow");
    setRehearsing(true);
    setRehearseDone(false);
    setRehearseIndex(0);
    setFeedback("排练开始…");
  };

  // 排练计时器：由「开始排练」按钮启动，回调里更新拍号
  useEffect(() => {
    if (!rehearsing) return;
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      if (index >= timeline.length) {
        window.clearInterval(id);
        setRehearsing(false);
        setRehearseDone(true);
        setRehearseIndex(-1);
        setFeedback("排练结束。可以点灯开演。");
        return;
      }
      setRehearseIndex(index);
      playCraftSound("shadow");
    }, 900);
    return () => window.clearInterval(id);
  }, [rehearsing, timeline.length]);

  const livePose =
    phase === 5 && rehearseIndex >= 0 && timeline[rehearseIndex]
      ? timeline[rehearseIndex].pose
      : pose;

  if (completed) {
    return (
      <CraftShell
        tag="中国皮影戏"
        title="让雕刻人物在灯幕后活起来"
        lead="角色、关节、背光与动作时间轴构成一场教学化短演。"
      >
        <CraftCompleteCard
          className="shadow-complete"
          eyebrow="首演完成"
          title="灯影传情"
          detail="皮影戏台亮起，演出档案已经收入博物馆。"
        />
      </CraftShell>
    );
  }

  return (
    <CraftShell
      tag="中国皮影戏"
      title="让雕刻人物在灯幕后活起来"
      lead="预计 5—8 分钟。真实皮影含唱腔与地方流派差异，本关只练基本构成；出错重试当前步。"
    >
      <StepRail label="皮影进度" steps={PHASES} current={phase} />

      <div className="shadow-workbench craft-shadow-rich">
        <div
          className="shadow-preview"
          style={{ "--shadow-light": `${light}%` } as CSSProperties}
          aria-label="皮影角色预览"
        >
          <div
            className={`puppet ${joints.length === JOINTS.length ? "articulated" : ""}`}
            style={{
              transform: `rotate(${livePose.tilt}deg)`,
              // 预览手臂角度跟随姿态滑块
              ["--arm-left" as string]: `${livePose.left}deg`,
              ["--arm-right" as string]: `${livePose.right}deg`,
            }}
          >
            <i className="puppet-head" />
            <i className="puppet-body" />
            <i className="puppet-arm left" />
            <i className="puppet-arm right" />
          </div>
          <span>
            {role || "未选择角色"}
            {phase === 5 && rehearseIndex >= 0 ? ` · ${timeline[rehearseIndex]?.beat}` : ""}
          </span>
        </div>

        <div className="shadow-controls">
          {phase === 0 && (
            <fieldset>
              <legend>选择角色</legend>
              {ROLES.map((item) => (
                <button key={item.id} type="button" onClick={() => selectRole(item.id)}>
                  <strong>{item.id}</strong>
                  <small>{item.blurb}</small>
                </button>
              ))}
            </fieldset>
          )}

          {phase === 1 && (
            <fieldset>
              <legend>连接关节（肩→肘→腕）</legend>
              <div className="joint-progress">
                {JOINTS.map((joint) => (
                  <span key={joint} className={joints.includes(joint) ? "on" : ""}>
                    {joint}
                  </span>
                ))}
              </div>
              {[...JOINTS].reverse().map((joint) => (
                <button
                  key={joint}
                  type="button"
                  disabled={joints.includes(joint)}
                  onClick={() => connectJoint(joint)}
                >
                  连接{joint}
                </button>
              ))}
            </fieldset>
          )}

          {phase === 2 && (
            <fieldset>
              <legend>调整姿态后锁定</legend>
              <label className="craft-slider">
                <span>左臂 {pose.left}°</span>
                <input
                  type="range"
                  min={-40}
                  max={70}
                  value={pose.left}
                  onChange={(e) => setPose((p) => ({ ...p, left: Number(e.target.value) }))}
                />
              </label>
              <label className="craft-slider">
                <span>右臂 {pose.right}°</span>
                <input
                  type="range"
                  min={-70}
                  max={40}
                  value={pose.right}
                  onChange={(e) => setPose((p) => ({ ...p, right: Number(e.target.value) }))}
                />
              </label>
              <label className="craft-slider">
                <span>身倾 {pose.tilt}°</span>
                <input
                  type="range"
                  min={-20}
                  max={20}
                  value={pose.tilt}
                  onChange={(e) => setPose((p) => ({ ...p, tilt: Number(e.target.value) }))}
                />
              </label>
              <button type="button" className="craft-primary" onClick={lockPose}>
                锁定姿态
              </button>
            </fieldset>
          )}

          {phase === 3 && (
            <label className="light-control">
              <span>背光亮度 <b>{light}%</b></span>
              <input
                type="range"
                min={20}
                max={100}
                value={light}
                onChange={(e) => setLight(Number(e.target.value))}
              />
              <small>适宜演出：45%—80%</small>
              <button type="button" className="craft-primary" onClick={lockLight}>
                锁定灯光
              </button>
            </label>
          )}

          {phase === 4 && (
            <fieldset>
              <legend>
                录制第 {beatIndex + 1} 拍（应为「{BEATS[beatIndex]}」）
              </legend>
              <p className="craft-hint">可先改姿态，再点正确拍名，最后确认录入。</p>
              <label className="craft-slider">
                <span>左臂 {pose.left}°</span>
                <input
                  type="range"
                  min={-40}
                  max={70}
                  value={pose.left}
                  onChange={(e) => setPose((p) => ({ ...p, left: Number(e.target.value) }))}
                />
              </label>
              <label className="craft-slider">
                <span>右臂 {pose.right}°</span>
                <input
                  type="range"
                  min={-70}
                  max={40}
                  value={pose.right}
                  onChange={(e) => setPose((p) => ({ ...p, right: Number(e.target.value) }))}
                />
              </label>
              <div className="shadow-timeline">
                {timeline.map((item) => (
                  <span key={item.beat}>{item.beat}</span>
                ))}
              </div>
              <div className="craft-actions">
                {BEATS.map((beat) => (
                  <button
                    key={beat}
                    type="button"
                    className={pickedBeat === beat ? "selected" : ""}
                    disabled={timeline.some((item) => item.beat === beat)}
                    onClick={() => {
                      playCraftSound("ui");
                      setPickedBeat(beat);
                    }}
                  >
                    {beat}
                  </button>
                ))}
              </div>
              <button type="button" className="craft-primary" onClick={recordBeat}>
                录入本拍
              </button>
            </fieldset>
          )}

          {phase === 5 && (
            <fieldset>
              <legend>排练</legend>
              <p className="craft-hint">
                {rehearseDone
                  ? "排练完成，可以开演。"
                  : rehearsing
                    ? "影人正在按时间轴演示…"
                    : "点击开始排练，观看四拍动作。"}
              </p>
              {!rehearseDone && (
                <button
                  type="button"
                  className="craft-primary"
                  disabled={rehearsing}
                  onClick={startRehearse}
                >
                  {rehearsing ? "排练中…" : "开始排练"}
                </button>
              )}
              <button
                type="button"
                className="craft-primary"
                disabled={!rehearseDone}
                onClick={() => advance("排练确认，准备开演。")}
              >
                排练通过，进入开演
              </button>
            </fieldset>
          )}

          {phase === 6 && (
            <button
              type="button"
              className="shadow-perform"
              onClick={() => advance("开演完成。")}
            >
              点灯 · 击乐 · 开演
            </button>
          )}
        </div>
      </div>

      <CraftFeedback>{feedback}</CraftFeedback>
    </CraftShell>
  );
}
