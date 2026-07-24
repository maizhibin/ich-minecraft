"use client";

// 工坊共用：音效、阶段条、反馈文案。失败只重试当前步，不整关清空。

import type { ReactNode } from "react";
import type { GameSound } from "../../game-audio";

export function playCraftSound(sound: GameSound = "craft") {
  window.dispatchEvent(new CustomEvent("game-sound", { detail: sound }));
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
      </div>
      {children}
    </article>
  );
}

/** 数值是否落在闭区间内 */
export function inRange(value: number, min: number, max: number) {
  return value >= min && value <= max;
}
