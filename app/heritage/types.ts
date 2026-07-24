// 非遗 track 与进度相关的共享类型。
// 后续新增青瓷 / 剪纸 / 云锦时，只需在此扩展联合类型并在注册表登记。

export type HeritageTrack = "joinery" | "printing" | "tea" | "shadow";

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
};
