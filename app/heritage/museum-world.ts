// 博物馆体素生成：从 voxel-game 抽出，便于展柜编号与后续展陈扩展。
// 返回 undefined 表示该格不由博物馆覆盖。

export type MuseumBlockType = "grass" | "dirt" | "stone" | "sand" | "wood" | "leaves";

/**
 * 七项技艺固定展柜（博物馆局部坐标 museumX/museumZ）。
 * 编号与档案页签 index 对应，便于图鉴与世界对照。
 */
export const MUSEUM_EXHIBIT_SLOTS: Array<{
  trackIndex: string;
  trackId: string;
  label: string;
  museumX: number;
  museumZ: number;
  block: MuseumBlockType;
}> = [
  { trackIndex: "01", trackId: "joinery", label: "榫卯营造", museumX: 11, museumZ: 1, block: "wood" },
  { trackIndex: "02", trackId: "printing", label: "木活字印刷", museumX: 17, museumZ: 1, block: "stone" },
  { trackIndex: "03", trackId: "tea", label: "传统制茶", museumX: 27, museumZ: 1, block: "leaves" },
  { trackIndex: "04", trackId: "shadow", label: "中国皮影戏", museumX: 33, museumZ: 1, block: "sand" },
  { trackIndex: "05", trackId: "porcelain", label: "龙泉青瓷", museumX: 11, museumZ: 7, block: "leaves" },
  { trackIndex: "06", trackId: "papercut", label: "中国剪纸", museumX: 17, museumZ: 7, block: "dirt" },
  { trackIndex: "07", trackId: "yunjin", label: "南京云锦", museumX: 27, museumZ: 7, block: "sand" },
];

export function museumBlock(
  x: number,
  y: number,
  z: number,
): MuseumBlockType | null | undefined {
  const museumX = x - 13;
  const museumZ = z + 10;
  const inside = museumX >= 7 && museumX <= 37 && museumZ >= -4 && museumZ <= 18;
  const entrance = museumZ === 18 && museumX >= 20 && museumX <= 24 && y <= 10;
  const sideWindow =
    (museumX === 7 || museumX === 37) &&
    ([0, 1, 5, 6, 10, 11, 15, 16].includes(museumZ)) &&
    y >= 7 &&
    y <= 10;
  const backWindow =
    museumZ === -4 &&
    ([11, 12, 17, 18, 26, 27, 32, 33].includes(museumX)) &&
    y >= 7 &&
    y <= 10;
  const skylight = y === 14 && museumX >= 20 && museumX <= 24 && museumZ >= 4 && museumZ <= 10;

  if (inside && y === 4) return "wood";
  if (
    inside &&
    y >= 5 &&
    y <= 13 &&
    (museumX === 7 || museumX === 37 || museumZ === -4 || museumZ === 18) &&
    !entrance &&
    !sideWindow &&
    !backWindow
  ) return "stone";
  if (inside && y === 14 && !skylight) return "stone";

  // 西侧榫卯台与东侧木活字印刷台。
  if (museumZ === 4 && y === 5 && (museumX === 14 || museumX === 15)) return "wood";
  if (museumZ === 4 && y === 5 && (museumX === 29 || museumX === 30)) return "stone";
  if (museumZ === 4 && museumX === 30 && y === 6) return "wood";

  // 宽台阶、六柱门廊、横梁与高耸山花。
  if (museumZ === 19 && museumX >= 16 && museumX <= 28 && y === 4) return "sand";
  if (museumZ === 20 && museumX >= 18 && museumX <= 26 && y === 4) return "sand";
  if (museumZ === 19 && [9, 14, 19, 25, 30, 35].includes(museumX) && y >= 5 && y <= 13) return "sand";
  if (museumZ === 18 && y === 15 && museumX >= 9 && museumX <= 35) return "stone";
  if (museumZ === 18 && y === 16 && museumX >= 12 && museumX <= 32) return "stone";
  if (museumZ === 18 && y === 17 && museumX >= 15 && museumX <= 29) return "stone";
  if (museumZ === 18 && y === 18 && museumX >= 19 && museumX <= 25) return "stone";

  // 七项编号展柜（与档案页签对应）
  const slot = MUSEUM_EXHIBIT_SLOTS.find(
    (item) => item.museumX === museumX && item.museumZ === museumZ,
  );
  if (slot && y === 5) return "sand";
  if (slot && y === 6) return slot.block;
  // 展柜编号灯柱（矮石柱，便于辨认）
  if (slot && y === 7) return "stone";

  // 其余主题展台（填充展廊）
  const fillers: Array<{ x: number; z: number; block: MuseumBlockType }> = [
    { x: 33, z: 7, block: "wood" },
    { x: 11, z: 13, block: "sand" },
    { x: 17, z: 13, block: "dirt" },
    { x: 27, z: 13, block: "stone" },
    { x: 33, z: 13, block: "grass" },
  ];
  const filler = fillers.find((item) => item.x === museumX && item.z === museumZ);
  if (filler && y === 5) return "sand";
  if (filler && y === 6) return filler.block;

  // 中央挑空大厅中的树形主展品和基座。
  if (museumX >= 21 && museumX <= 23 && museumZ >= 7 && museumZ <= 9 && y === 5) return "sand";
  if (museumX === 22 && museumZ === 8 && y >= 6 && y <= 10) return "wood";
  if (y >= 9 && y <= 12 && Math.abs(museumX - 22) + Math.abs(museumZ - 8) <= 3) return "leaves";

  return undefined;
}
