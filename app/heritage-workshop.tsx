"use client";

// 博物馆学习档案壳：芯片页签、传承人讲述、展柜编号、节庆演练入口。

import { useState, useSyncExternalStore } from "react";
import {
  HERITAGE_TRACKS,
  MUSEUM_EXHIBIT_SLOTS,
  SOURCE_LINKS,
  countCompleted,
  isFestivalDone,
  loadCraftDraft,
  markFestivalDone,
  subscribeHeritageProgress,
  type HeritageProgress,
  type HeritageTrack,
} from "./heritage";
import { JoineryCraft } from "./heritage/crafts/joinery-craft";
import { PrintingCraft } from "./heritage/crafts/printing-craft";
import { TeaCraft } from "./heritage/crafts/tea-craft";
import { ShadowCraft } from "./heritage/crafts/shadow-craft";
import { PorcelainCraft } from "./heritage/crafts/porcelain-craft";
import { PapercutCraft } from "./heritage/crafts/papercut-craft";
import { YunjinCraft } from "./heritage/crafts/yunjin-craft";
import { FestivalCraft } from "./heritage/crafts/festival-craft";
import { CraftNarrator } from "./heritage/crafts/craft-narrator";
import { playCraftSound } from "./heritage/crafts/craft-ui";

export type { HeritageTrack };

type PanelMode = "craft" | "festival";

type HeritageWorkshopProps = {
  open: boolean;
  activeTrack: HeritageTrack;
  completed: HeritageProgress;
  onClose: () => void;
  onSelectTrack: (track: HeritageTrack) => void;
  onComplete: (track: HeritageTrack) => void;
  onClearProgress: () => void;
};

export function HeritageWorkshop({
  open,
  activeTrack,
  completed,
  onClose,
  onSelectTrack,
  onComplete,
  onClearProgress,
}: HeritageWorkshopProps) {
  const [mode, setMode] = useState<PanelMode>("craft");
  /** 本会话已点过「开始工序」的项目（跳过讲述） */
  const [loreStarted, setLoreStarted] = useState<Partial<Record<HeritageTrack, true>>>({});
  const festivalCompleted = useSyncExternalStore(
    subscribeHeritageProgress,
    isFestivalDone,
    () => false,
  );

  if (!open) return null;

  const completedCount = countCompleted(completed);
  const trackTotal = HERITAGE_TRACKS.length;
  const source = SOURCE_LINKS[activeTrack] ?? SOURCE_LINKS.joinery;
  // 有草稿、已完成或本会话已听完讲述 → 直接进工序
  const loreDone =
    completed[activeTrack] ||
    loadCraftDraft(activeTrack) !== null ||
    Boolean(loreStarted[activeTrack]);

  return (
    <section className="heritage-dialog heritage-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="heritage-title">
      <header className="heritage-header">
        <div>
          <span className="eyebrow">非遗工坊 · 活态传承</span>
          <h2 id="heritage-title">博物馆学习档案</h2>
        </div>
        <button className="heritage-close" onClick={onClose} aria-label="关闭非遗工坊">×</button>
      </header>

      <div className="heritage-progress">
        <div>
          <span>博物馆成长进度</span>
          <strong>{completedCount} / {trackTotal}</strong>
        </div>
        <progress max={trackTotal} value={completedCount} />
      </div>

      {/* 移动端横向芯片栏；桌面仍为左侧列表（CSS 分流） */}
      <nav className="heritage-tabs heritage-chips" aria-label="选择非遗项目">
        <div className="heritage-chip-scroll">
          {HERITAGE_TRACKS.map((track) => (
            <button
              key={track.id}
              type="button"
              className={mode === "craft" && activeTrack === track.id ? "active" : ""}
              onClick={() => {
                playCraftSound("ui");
                setMode("craft");
                onSelectTrack(track.id);
              }}
            >
              <span>{track.index}</span>
              {track.label}
              {completed[track.id] && <b>完成</b>}
            </button>
          ))}
          <button
            type="button"
            className={mode === "festival" ? "active" : ""}
            onClick={() => {
              playCraftSound("ui");
              setMode("festival");
            }}
          >
            <span>节</span>
            村落节庆
            {festivalCompleted && <b>完成</b>}
          </button>
        </div>

        <div className="heritage-map" aria-label="工坊方位与展柜">
          <strong>工坊方位</strong>
          {HERITAGE_TRACKS.map((track) => (
            <p key={`map-${track.id}`}>
              <span>{track.index}</span>
              {track.workshop.label} · {track.workshop.guide}
              {completed[track.id] ? " · 已完成" : ""}
            </p>
          ))}
          <strong>博物馆展柜编号</strong>
          {MUSEUM_EXHIBIT_SLOTS.map((slot) => (
            <p key={slot.trackId}>
              <span>{slot.trackIndex}</span>
              {slot.label} · 展厅柜位
            </p>
          ))}
        </div>
      </nav>

      {mode === "festival" ? (
        <FestivalCraft
          completed={festivalCompleted}
          onComplete={() => {
            markFestivalDone();
            window.dispatchEvent(new CustomEvent("festival-complete"));
          }}
        />
      ) : !loreDone && !completed[activeTrack] ? (
        <article className="heritage-content craft-rich">
          <CraftNarrator
            track={activeTrack}
            onContinue={() => setLoreStarted((prev) => ({ ...prev, [activeTrack]: true }))}
          />
        </article>
      ) : (
        <>
          {activeTrack === "joinery" && (
            <JoineryCraft completed={completed.joinery} onComplete={() => onComplete("joinery")} />
          )}
          {activeTrack === "printing" && (
            <PrintingCraft completed={completed.printing} onComplete={() => onComplete("printing")} />
          )}
          {activeTrack === "tea" && (
            <TeaCraft completed={completed.tea} onComplete={() => onComplete("tea")} />
          )}
          {activeTrack === "shadow" && (
            <ShadowCraft completed={completed.shadow} onComplete={() => onComplete("shadow")} />
          )}
          {activeTrack === "porcelain" && (
            <PorcelainCraft completed={completed.porcelain} onComplete={() => onComplete("porcelain")} />
          )}
          {activeTrack === "papercut" && (
            <PapercutCraft completed={completed.papercut} onComplete={() => onComplete("papercut")} />
          )}
          {activeTrack === "yunjin" && (
            <YunjinCraft completed={completed.yunjin} onComplete={() => onComplete("yunjin")} />
          )}
        </>
      )}

      <footer className="heritage-source">
        <div className="heritage-source-row">
          <span>
            资料参考：
            {mode === "festival" ? (
              "节庆演练为教学化社区协作抽象，资料见各工坊权威链接。"
            ) : (
              <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
            )}
          </span>
          <button
            type="button"
            className="heritage-clear"
            onClick={() => {
              if (window.confirm("清除本机学习进度与节庆档案？世界奖励将在刷新后回滚。")) {
                onClearProgress();
              }
            }}
          >
            清除学习进度
          </button>
        </div>
      </footer>
    </section>
  );
}
