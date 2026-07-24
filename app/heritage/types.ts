// 非遗 track 与进度相关的共享类型。
// 新增项目时：扩展联合类型，并在 registry / world-rewards / crafts 中登记。

export type HeritageTrack =
  | "joinery"
  | "printing"
  | "tea"
  | "shadow"
  | "porcelain"
  | "papercut"
  | "yunjin";

export type HeritageWorkshopSpot = {
  x: number;
  z: number;
  label: string;
  /** 距离过远时按 E 显示的路线提示 */
  guide: string;
};

export type HeritageSourceLink = {
  label: string;
  href: string;
};

export type HeritageTrackMeta = {
  id: HeritageTrack;
  index: string;
  label: string;
  workshop: HeritageWorkshopSpot;
  source: HeritageSourceLink;
};

/** 各技艺是否已完成 */
export type HeritageProgress = Record<HeritageTrack, boolean>;

/** localStorage 存档结构；version 便于以后迁移 */
export type HeritageSaveData = {
  version: 1;
  completed: HeritageProgress;
  updatedAt: string;
  /** 未完成技艺的中途阶段（仅 phase 索引） */
  drafts?: Partial<Record<HeritageTrack, number>>;
  /** 村落节庆演练是否完成（不计入七项进度） */
  festivalDone?: boolean;
};
