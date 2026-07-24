"use client";

// 工坊共用：音效、阶段条、反馈文案、中途阶段持久化。

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { GameSound } from "../../game-audio";
import { clearCraftDraft, loadCraftDraft, saveCraftDraft } from "../progress";
import type { HeritageTrack } from "../types";

export function playCraftSound(sound: GameSound = "craft") {
  window.dispatchEvent(new CustomEvent("game-sound", { detail: sound }));
}

/** 工序阶段持久化：刷新后可从中途继续；完成后清除草稿 */
export function usePersistedPhase(track: HeritageTrack, completed: boolean) {
  const [phase, setPhaseRaw] = useState(() => {
    if (completed) return 0;
    return loadCraftDraft(track) ?? 0;
  });

  const setPhase = useCallback(
    (updater: number | ((current: number) => number)) => {
      setPhaseRaw((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        if (!completed) saveCraftDraft(track, next);
        return next;
      });
    },
    [completed, track],
  );

  useEffect(() => {
    if (completed) clearCraftDraft(track);
  }, [completed, track]);

  return [phase, setPhase] as const;
}

type StepRailProps = {
  label: string;
  steps: readonly string[];
  current: number;
};

export function StepRail({ label, steps, current }: StepRailProps) {
  return (
    <ol className="process-line craft-step-rail" aria-label={label}>
      {steps.map((step, index) => (
        <li
          key={step}
          className={index < current ? "done" : index === current ? "current" : ""}
        >
          <span>{index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

export function CraftFeedback({ children }: { children: ReactNode }) {
  return (
    <p className="craft-feedback" aria-live="polite">
      {children}
    </p>
  );
}

export function CraftCompleteCard({
  eyebrow,
  title,
  detail,
  className = "",
}: {
  eyebrow: string;
  title: string;
  detail: string;
  className?: string;
}) {
  return (
    <div className={`craft-complete ${className}`.trim()}>
      <span>{eyebrow}</span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

type CraftShellProps = {
  tag: string;
  title: string;
  lead: string;
  children: ReactNode;
};

export function CraftShell({ tag, title, lead, children }: CraftShellProps) {
  return (
    <article className="heritage-content craft-rich">
      <div className="heritage-copy">
        <span className="craft-tag">{tag}</span>
        <h3>{title}</h3>
        <p>{lead}</p>
        <p className="craft-eta">建议用时约 5—8 分钟 · 出错只重试当前步骤 · 中途进度会自动保存</p>
      </div>
      {children}
    </article>
  );
}

/** 数值是否落在闭区间内 */
export function inRange(value: number, min: number, max: number) {
  return value >= min && value <= max;
}
