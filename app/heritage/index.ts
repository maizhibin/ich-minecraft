// 非遗系统公共出口：类型、注册表、进度存档与世界奖励。

export type {
  HeritageProgress,
  HeritageSaveData,
  HeritageSourceLink,
  HeritageTrack,
  HeritageTrackMeta,
  HeritageWorkshopSpot,
} from "./types";

export {
  HERITAGE_TRACK_IDS,
  HERITAGE_TRACKS,
  SOURCE_LINKS,
  WORKSHOPS,
  countCompleted,
  createEmptyProgress,
  isHeritageTrack,
} from "./registry";

export {
  clearHeritageProgress,
  getHeritageProgressSnapshot,
  getServerHeritageProgressSnapshot,
  loadHeritageProgress,
  markTrackCompleted,
  saveHeritageProgress,
  subscribeHeritageProgress,
} from "./progress";

export {
  applyHeritageReward,
  restoreHeritageRewards,
  type MarkDirtyAt,
  type RewardBlockType,
  type SetRewardBlock,
} from "./world-rewards";
