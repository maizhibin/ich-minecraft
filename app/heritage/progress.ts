// 非遗学习进度的浏览器端持久化。
// 仅使用 localStorage，不引入账号或服务端；失败时静默回退为空进度。
// 通过订阅 + 稳定快照配合 useSyncExternalStore，避免 SSR 水合文本不一致。

import { createEmptyProgress, isHeritageTrack } from "./registry";
import type { HeritageProgress, HeritageSaveData, HeritageTrack } from "./types";

const STORAGE_KEY = "dtcoder-blocklands-heritage-v1";

/** 服务端与水合阶段共用的空进度引用（必须稳定，不能每次新建） */
const serverSnapshot = createEmptyProgress();

/** 客户端当前快照；写入存档后更新，供 useSyncExternalStore 比较 */
let clientSnapshot: HeritageProgress = serverSnapshot;
let hasClientSnapshot = false;

const listeners = new Set<() => void>();

function sanitizeProgress(raw: unknown): HeritageProgress {
  const empty = createEmptyProgress();
  if (!raw || typeof raw !== "object") return empty;
  const record = raw as Record<string, unknown>;
  for (const key of Object.keys(empty) as HeritageTrack[]) {
    if (typeof record[key] === "boolean") empty[key] = record[key];
  }
  return empty;
}

function readFromStorage(): HeritageProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProgress();
    const parsed = JSON.parse(raw) as Partial<HeritageSaveData>;
    return sanitizeProgress(parsed.completed);
  } catch {
    return createEmptyProgress();
  }
}

function notifyHeritageProgressListeners() {
  for (const listener of listeners) listener();
}

/** 订阅进度变更；供 useSyncExternalStore 使用 */
export function subscribeHeritageProgress(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** 客户端快照：首次读取时从 localStorage 填充，之后返回缓存引用 */
export function getHeritageProgressSnapshot(): HeritageProgress {
  if (typeof window === "undefined") return serverSnapshot;
  if (!hasClientSnapshot) {
    clientSnapshot = readFromStorage();
    hasClientSnapshot = true;
  }
  return clientSnapshot;
}

/** SSR / 水合阶段快照：始终为空进度，与服务端 HTML 一致 */
export function getServerHeritageProgressSnapshot(): HeritageProgress {
  return serverSnapshot;
}

/** 读取存档；无存档或损坏时返回空进度（同时刷新客户端缓存） */
export function loadHeritageProgress(): HeritageProgress {
  if (typeof window === "undefined") return createEmptyProgress();
  clientSnapshot = readFromStorage();
  hasClientSnapshot = true;
  return clientSnapshot;
}

/** 写入进度；返回是否写入成功 */
export function saveHeritageProgress(completed: HeritageProgress): boolean {
  if (typeof window === "undefined") return false;
  const payload: HeritageSaveData = {
    version: 1,
    completed,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // 使用新对象引用，确保订阅方能检测到变更
    clientSnapshot = { ...completed };
    hasClientSnapshot = true;
    notifyHeritageProgressListeners();
    return true;
  } catch {
    return false;
  }
}

/** 清除存档并返回空进度 */
export function clearHeritageProgress(): HeritageProgress {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略清除失败，仍返回空进度供界面使用
    }
  }
  clientSnapshot = createEmptyProgress();
  hasClientSnapshot = true;
  notifyHeritageProgressListeners();
  return clientSnapshot;
}

/** 标记单项完成并立刻落盘 */
export function markTrackCompleted(
  current: HeritageProgress,
  track: HeritageTrack,
): HeritageProgress {
  if (!isHeritageTrack(track) || current[track]) return current;
  const next = { ...current, [track]: true };
  saveHeritageProgress(next);
  return next;
}
