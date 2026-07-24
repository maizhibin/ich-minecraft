// 非遗场地体素：茶园、茶馆、皮影、窑场、剪纸案、织机廊。
// 返回 undefined 表示此处不由非遗场地覆盖，交回地形生成。

export type SiteBlockType = "grass" | "dirt" | "stone" | "sand" | "wood" | "leaves";

export function heritageSiteBlock(
  x: number,
  y: number,
  z: number,
): SiteBlockType | null | undefined {
  // 茶园：成行茶垄、泥土根基与低矮茶树。
  const inTeaGarden = x >= -44 && x <= -24 && z >= 0 && z <= 18;
  const teaPlant = inTeaGarden && (x + 44) % 3 !== 2 && z % 3 !== 2;
  if (teaPlant && y === 4) return "dirt";
  if (teaPlant && y === 5) return "leaves";

  // 开放式茶馆，面向茶园，并设置制茶案台和茶客。
  const inTeaHouse = x >= -21 && x <= -8 && z >= 2 && z <= 14;
  if (inTeaHouse && y === 4) return "wood";
  if (
    inTeaHouse &&
    y >= 5 &&
    y <= 9 &&
    ((x === -21 || x === -8) && (z === 2 || z === 14))
  ) return "wood";
  if (inTeaHouse && y === 10) return "sand";
  if ((x === -15 || x === -14) && z === 6 && y === 5) return "wood";
  if (x === -11 && z === 10 && y === 5) return "sand";
  if (x === -11 && z === 10 && y === 6) return "dirt";
  if (x === -11 && z === 10 && y === 7) return "sand";

  // 皮影戏台：木台、半透明感幕布、后台操纵案与挑檐。
  const inShadowStage = x >= -44 && x <= -26 && z >= -16 && z <= -3;
  if (inShadowStage && y === 4) return "wood";
  if (z === -16 && x >= -42 && x <= -28 && y >= 5 && y <= 11) return "sand";
  if (inShadowStage && y >= 5 && y <= 12 && [-44, -26].includes(x) && [-16, -3].includes(z)) return "wood";
  if (inShadowStage && y === 13) return "wood";
  if ((x === -34 || x === -33) && z === -7 && y === 5) return "stone";
  if (x === -33 && z === -7 && y === 6) return "wood";

  // 从中央广场通往窑场的简易沙径路标（帮助找到新工坊）
  if (z === 10 && x >= 20 && x <= 47 && y === 4 && x % 3 === 0) return "sand";
  // 通往织机廊的短径
  if (x === 48 && z >= -8 && z <= 5 && y === 4 && z % 2 === 0) return "sand";
  // 茶馆到剪纸案的短径
  if (z === 8 && x >= -10 && x <= -8 && y === 4) return "sand";

  // 龙泉窑场：窑炉、晾坯架与釉缸（博物馆东侧广场）
  const inKilnYard = x >= 48 && x <= 58 && z >= 6 && z <= 16;
  if (inKilnYard && y === 4) return "sand";
  if (x >= 51 && x <= 54 && z >= 9 && z <= 12 && y >= 5 && y <= 10) {
    if (x === 51 || x === 54 || z === 9 || z === 12) return "stone";
  }
  if ((x === 52 || x === 53) && z === 10 && y === 5) return "wood";
  if (x === 56 && z === 8 && y === 5) return "dirt";
  if (x === 56 && z === 8 && y === 6) return "sand";
  if (x === 49 && (z === 7 || z === 14) && y >= 5 && y <= 8) return "wood";

  // 剪纸案台：茶馆东侧木案
  if (x >= -7 && x <= -3 && z >= 7 && z <= 10 && y === 4) return "wood";
  if ((x === -6 || x === -5) && z === 8 && y === 5) return "sand";
  if (x === -5 && z === 8 && y === 6) return "leaves";

  // 云锦织机廊：博物馆东南延伸
  const inYunjinHall = x >= 45 && x <= 52 && z >= -16 && z <= -9;
  if (inYunjinHall && y === 4) return "wood";
  if (inYunjinHall && y === 11 && x >= 46 && x <= 51) return "sand";
  if ((x === 45 || x === 52) && z >= -16 && z <= -9 && y >= 5 && y <= 10) return "wood";
  if ((x === 48 || x === 49) && z === -12 && y === 5) return "stone";
  if (x === 48 && z === -12 && y === 6) return "wood";

  return undefined;
}
