// 氛围区域：按玩家坐标解析当前非遗场景，供 BGM 换风格（仍用程序化音频）。

export type AmbientZone =
  | "wild"
  | "museum"
  | "tea"
  | "shadow"
  | "porcelain"
  | "papercut"
  | "yunjin";

type ZoneBox = {
  zone: AmbientZone;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** 同框重叠时优先（越大越优先） */
  priority: number;
};

/** 与 world-sites / 博物馆范围大致对齐的氛围盒 */
const ZONE_BOXES: ZoneBox[] = [
  { zone: "shadow", minX: -46, maxX: -24, minZ: -18, maxZ: -1, priority: 30 },
  { zone: "tea", minX: -44, maxX: -6, minZ: 0, maxZ: 18, priority: 28 },
  { zone: "papercut", minX: -10, maxX: 0, minZ: 5, maxZ: 12, priority: 32 },
  { zone: "porcelain", minX: 46, maxX: 60, minZ: 4, maxZ: 18, priority: 30 },
  { zone: "yunjin", minX: 43, maxX: 54, minZ: -18, maxZ: -7, priority: 30 },
  // 博物馆主体（榫卯/印刷在其内，用舒缓馆内氛围）
  { zone: "museum", minX: 18, maxX: 52, minZ: -16, maxZ: 12, priority: 10 },
];

/**
 * 根据世界坐标解析氛围区。
 * 重叠时取 priority 更高者（如剪纸案压过茶馆大框）。
 */
export function resolveAmbientZone(x: number, z: number): AmbientZone {
  let best: ZoneBox | null = null;
  for (const box of ZONE_BOXES) {
    if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
    if (!best || box.priority > best.priority) best = box;
  }
  return best?.zone ?? "wild";
}
