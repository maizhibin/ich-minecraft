"use client";

// 传承人讲述页：进入工序前可读，不阻断已完成档案。

import { CRAFT_LORE } from "./craft-lore";
import { playCraftSound } from "./craft-ui";
import type { HeritageTrack } from "../types";

type CraftNarratorProps = {
  track: HeritageTrack;
  onContinue: () => void;
};

export function CraftNarrator({ track, onContinue }: CraftNarratorProps) {
  const lore = CRAFT_LORE[track];
  return (
    <div className="craft-narrator" role="region" aria-label="传承人讲述">
      <span className="craft-tag">{lore.speaker}</span>
      <h3>{lore.title}</h3>
      {lore.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <button
        type="button"
        className="craft-primary"
        onClick={() => {
          playCraftSound("ui");
          onContinue();
        }}
      >
        听完了，开始工序
      </button>
    </div>
  );
}
