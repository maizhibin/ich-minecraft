"use client";

// 博物馆学习档案壳：进度、页签与资料来源；具体玩法拆到 crafts/*。

import {
  HERITAGE_TRACKS,
  SOURCE_LINKS,
  countCompleted,
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
import { playCraftSound } from "./heritage/crafts/craft-ui";

export type { HeritageTrack };

type HeritageWorkshopProps = {
  open: boolean;
  activeTrack: HeritageTrack;
  completed: HeritageProgress;
  onClose: () => void;
  onSelectTrack: (track: HeritageTrack) => void;
  onComplete: (track: HeritageTrack) => void;
  /** 清除本地学习进度并刷新世界（由父组件执行落盘与重载） */
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
  if (!open) return null;

  const completedCount = countCompleted(completed);
  const trackTotal = HERITAGE_TRACKS.length;
  const source = SOURCE_LINKS[activeTrack] ?? SOURCE_LINKS.joinery;

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

      <nav className="heritage-tabs" aria-label="选择非遗项目">
        {HERITAGE_TRACKS.map((track) => (
          <button
            key={track.id}
            className={activeTrack === track.id ? "active" : ""}
            onClick={() => {
              playCraftSound("ui");
              onSelectTrack(track.id);
            }}
          >
            <span>{track.index}</span> {track.label} {completed[track.id] && <b>已完成</b>}
          </button>
        ))}
        {/* 方位一览：方便找到窑场 / 剪纸案 / 织机廊等新增落点 */}
        <div className="heritage-map" aria-label="工坊方位">
          <strong>工坊方位</strong>
          {HERITAGE_TRACKS.map((track) => (
            <p key={`map-${track.id}`}>
              <span>{track.index}</span>
              {track.workshop.label} · {track.workshop.guide}
              {completed[track.id] ? " · 已完成" : ""}
            </p>
          ))}
        </div>
      </nav>

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

      <footer className="heritage-source">
        <div className="heritage-source-row">
          <span>
            资料参考：
            <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a>
          </span>
          <button
            type="button"
            className="heritage-clear"
            onClick={() => {
              if (window.confirm("清除本机学习进度？世界奖励将在刷新后回滚。")) {
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
