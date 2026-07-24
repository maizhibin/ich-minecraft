// 技艺完成后的世界体素奖励。
// 既有四项坐标保持不变；新增三项写入各自工坊附近展陈。

import type { HeritageTrack } from "./types";

/** 与体素世界一致的方块类型子集 */
export type RewardBlockType = "grass" | "dirt" | "stone" | "sand" | "wood" | "leaves";

export type SetRewardBlock = (x: number, y: number, z: number, block: RewardBlockType) => void;
export type MarkDirtyAt = (x: number, z: number) => void;

/**
 * 按技艺写入世界奖励方块，并标记相关区块为脏。
 * 不负责「是否已完成」判断；调用方应在完成事件中触发一次。
 */
export function applyHeritageReward(
  track: HeritageTrack,
  setBlock: SetRewardBlock,
  markDirtyAt: MarkDirtyAt,
) {
  if (track === "joinery") {
    for (let y = 4; y <= 9; y += 1) {
      setBlock(8, y, 4, "wood");
      setBlock(14, y, 4, "wood");
    }
    for (let x = 8; x <= 14; x += 1) setBlock(x, 10, 4, "wood");
    for (let x = 7; x <= 15; x += 1) setBlock(x, 11, 4, "sand");
    setBlock(9, 9, 4, "wood");
    setBlock(10, 8, 4, "wood");
    setBlock(12, 8, 4, "wood");
    setBlock(13, 9, 4, "wood");
    markDirtyAt(8, 4);
    markDirtyAt(14, 4);
    return;
  }

  if (track === "printing") {
    for (let x = 40; x <= 44; x += 1) setBlock(x, 5, 2, "sand");
    for (let y = 6; y <= 10; y += 1) {
      setBlock(40, y, 2, "wood");
      setBlock(44, y, 2, "wood");
    }
    for (let x = 40; x <= 44; x += 1) setBlock(x, 11, 2, "wood");
    for (let x = 41; x <= 43; x += 1) {
      for (let y = 7; y <= 10; y += 1) setBlock(x, y, 2, "stone");
    }
    markDirtyAt(40, 2);
    markDirtyAt(44, 2);
    return;
  }

  if (track === "tea") {
    for (let x = -18; x <= -11; x += 1) setBlock(x, 5, 11, "wood");
    setBlock(-15, 6, 11, "sand");
    setBlock(-14, 6, 11, "sand");
    for (let y = 5; y <= 8; y += 1) {
      setBlock(-20, y, 3, "wood");
      setBlock(-9, y, 3, "wood");
    }
    for (let x = -20; x <= -9; x += 1) setBlock(x, 9, 3, "leaves");
    markDirtyAt(-20, 3);
    markDirtyAt(-9, 11);
    return;
  }

  if (track === "shadow") {
    for (let y = 6; y <= 10; y += 1) {
      setBlock(-37, y, -15, "wood");
      setBlock(-31, y, -15, "wood");
    }
    for (let x = -37; x <= -31; x += 1) setBlock(x, 11, -15, "wood");
    setBlock(-35, 7, -14, "stone");
    setBlock(-34, 8, -14, "stone");
    setBlock(-33, 7, -14, "stone");
    markDirtyAt(-37, -15);
    markDirtyAt(-31, -14);
    return;
  }

  if (track === "porcelain") {
    // 窑场旁青瓷展架
    for (let x = 50; x <= 55; x += 1) setBlock(x, 5, 14, "sand");
    for (let y = 6; y <= 9; y += 1) {
      setBlock(50, y, 14, "stone");
      setBlock(55, y, 14, "stone");
    }
    for (let x = 50; x <= 55; x += 1) setBlock(x, 10, 14, "wood");
    setBlock(52, 6, 14, "leaves");
    setBlock(53, 7, 14, "leaves");
    setBlock(54, 6, 14, "leaves");
    markDirtyAt(50, 14);
    markDirtyAt(55, 14);
    return;
  }

  if (track === "papercut") {
    // 案台旁窗花展陈（红纸感用 leaves 点缀）
    for (let y = 5; y <= 9; y += 1) {
      setBlock(-6, y, 11, "wood");
      setBlock(-4, y, 11, "wood");
    }
    setBlock(-5, 6, 11, "leaves");
    setBlock(-5, 7, 11, "leaves");
    setBlock(-5, 8, 11, "sand");
    setBlock(-5, 9, 11, "leaves");
    markDirtyAt(-6, 11);
    markDirtyAt(-4, 11);
    return;
  }

  if (track === "yunjin") {
    // 织机廊纹样挂幅
    for (let x = 46; x <= 50; x += 1) setBlock(x, 5, -14, "wood");
    for (let y = 6; y <= 10; y += 1) {
      setBlock(46, y, -14, "wood");
      setBlock(50, y, -14, "wood");
    }
    for (let x = 47; x <= 49; x += 1) {
      for (let y = 7; y <= 9; y += 1) setBlock(x, y, -14, "sand");
    }
    setBlock(48, 8, -14, "leaves");
    markDirtyAt(46, -14);
    markDirtyAt(50, -14);
  }
}

/** 根据已完成进度批量恢复世界奖励（用于刷新后重放） */
export function restoreHeritageRewards(
  completed: Record<HeritageTrack, boolean>,
  setBlock: SetRewardBlock,
  markDirtyAt: MarkDirtyAt,
) {
  (Object.keys(completed) as HeritageTrack[]).forEach((track) => {
    if (completed[track]) applyHeritageReward(track, setBlock, markDirtyAt);
  });
}
