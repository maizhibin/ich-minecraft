// 非遗项目注册表：工坊坐标、展示名与权威资料来源集中在此。
// 玩法面板与世界奖励仍分文件实现，但 id / 进度分母一律由此推导。

import type { HeritageProgress, HeritageTrack, HeritageTrackMeta } from "./types";

export const HERITAGE_TRACKS: HeritageTrackMeta[] = [
  {
    id: "joinery",
    index: "01",
    label: "榫卯营造",
    workshop: { x: 27.5, z: -5.5, label: "榫卯营造台", guide: "右前方博物馆展厅" },
    source: {
      label: "UNESCO 中国传统木结构建筑营造技艺",
      href: "https://ich.unesco.org/en/RL/chinese-traditional-architectural-craftsmanship-for-timber-framed-structures-00223",
    },
  },
  {
    id: "printing",
    index: "02",
    label: "木活字印刷",
    workshop: { x: 42.5, z: -5.5, label: "木活字印刷台", guide: "右前方博物馆展厅" },
    source: {
      label: "UNESCO 木活字印刷",
      href: "https://ich.unesco.org/en/USL/wooden-movable-type-printing-of-china-00322",
    },
  },
  {
    id: "tea",
    index: "03",
    label: "传统制茶",
    workshop: { x: -14.5, z: 6.5, label: "传统制茶工坊", guide: "左前方茶园茶馆" },
    source: {
      label: "UNESCO 中国传统制茶技艺及相关习俗",
      href: "https://ich.unesco.org/en/RL/traditional-tea-processing-techniques-and-associated-social-practices-in-china-01884",
    },
  },
  {
    id: "shadow",
    index: "04",
    label: "中国皮影戏",
    workshop: { x: -33.5, z: -6.5, label: "皮影戏台", guide: "左前方皮影戏台" },
    source: {
      label: "UNESCO 中国皮影戏",
      href: "https://ich.unesco.org/en/RL/chinese-shadow-puppetry-00421",
    },
  },
  {
    id: "porcelain",
    index: "05",
    label: "龙泉青瓷",
    workshop: { x: 52.5, z: 10.5, label: "龙泉窑场", guide: "右前方龙泉窑场" },
    source: {
      label: "UNESCO 龙泉青瓷传统烧制技艺",
      href: "https://ich.unesco.org/en/RL/traditional-firing-technology-of-longquan-celadon-00205",
    },
  },
  {
    id: "papercut",
    index: "06",
    label: "中国剪纸",
    workshop: { x: -5.5, z: 8.5, label: "剪纸案台", guide: "左前方茶馆旁剪纸案" },
    source: {
      label: "UNESCO 中国剪纸",
      href: "https://ich.unesco.org/en/RL/chinese-paper-cut-00219",
    },
  },
  {
    id: "yunjin",
    index: "07",
    label: "南京云锦",
    workshop: { x: 48.5, z: -12.5, label: "云锦织机廊", guide: "右前方博物馆织机廊" },
    source: {
      label: "UNESCO 南京云锦木机妆花手工织造技艺",
      href: "https://ich.unesco.org/en/RL/craftsmanship-of-nanjing-yunjin-brocade-00200",
    },
  },
];

export const HERITAGE_TRACK_IDS = HERITAGE_TRACKS.map((track) => track.id);

/** 工坊坐标表，供世界层按距离提示与 E 键路由使用 */
export const WORKSHOPS = Object.fromEntries(
  HERITAGE_TRACKS.map((track) => [track.id, track.workshop]),
) as Record<HeritageTrack, HeritageTrackMeta["workshop"]>;

export const SOURCE_LINKS = Object.fromEntries(
  HERITAGE_TRACKS.map((track) => [track.id, track.source]),
) as Record<HeritageTrack, HeritageTrackMeta["source"]>;

/** 空进度：全部未完成 */
export function createEmptyProgress(): HeritageProgress {
  return {
    joinery: false,
    printing: false,
    tea: false,
    shadow: false,
    porcelain: false,
    papercut: false,
    yunjin: false,
  };
}

export function countCompleted(progress: HeritageProgress): number {
  return HERITAGE_TRACK_IDS.filter((id) => progress[id]).length;
}

export function isHeritageTrack(value: unknown): value is HeritageTrack {
  return typeof value === "string" && HERITAGE_TRACK_IDS.includes(value as HeritageTrack);
}
