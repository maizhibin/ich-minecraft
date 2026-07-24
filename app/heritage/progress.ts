// 非遗学习进度的浏览器端持久化。
// 仅使用 localStorage；完成态 + 可选中途 phase 草稿。

import { createEmptyProgress, isHeritageTrack } from "./registry";
import type { HeritageProgress, HeritageSaveData, HeritageTrack } from "./types";

const STORAGE_KEY = "dtcoder-blocklands-heritage-v1";

const serverSnapshot = createEmptyProgress();
let clientSnapshot: HeritageProgress = serverSnapshot;
let hasClientSnapshot = false;
/** 中途草稿缓存，与完成态一并读写 */
let clientDrafts: Partial<Record<HeritageTrack, number>> = {};
let festivalDone = false;

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

function sanitizeDrafts(raw: unknown): Partial<Record<HeritageTrack, number>> {
  if (!raw || typeof raw !== "object") return {};
  const result: Partial<Record<HeritageTrack, number>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isHeritageTrack(key) && typeof value === "number" && value >= 0) {
      result[key] = Math.floor(value);
    }
  }
  return result;
}

function readSave(): {
  completed: HeritageProgress;
  drafts: Partial<Record<HeritageTrack, number>>;
  festivalDone: boolean;
} {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: createEmptyProgress(), drafts: {}, festivalDone: false };
    const parsed = JSON.parse(raw) as Partial<HeritageSaveData>;
    return {
      completed: sanitizeProgress(parsed.completed),
      drafts: sanitizeDrafts(parsed.drafts),
      festivalDone: Boolean(parsed.festivalDone),
    };
  } catch {
    return { completed: createEmptyProgress(), drafts: {}, festivalDone: false };
  }
}

function writeSave(
  completed: HeritageProgress,
  drafts: Partial<Record<HeritageTrack, number>>,
  festival = festivalDone,
): boolean {
  if (typeof window === "undefined") return false;
  const payload: HeritageSaveData = {
    version: 1,
    completed,
    drafts,
    festivalDone: festival,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    clientSnapshot = { ...completed };
    clientDrafts = { ...drafts };
    festivalDone = festival;
    hasClientSnapshot = true;
    notifyHeritageProgressListeners();
    return true;
  } catch {
    return false;
  }
}

function notifyHeritageProgressListeners() {
  for (const listener of listeners) listener();
}

export function subscribeHeritageProgress(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getHeritageProgressSnapshot(): HeritageProgress {
  if (typeof window === "undefined") return serverSnapshot;
  if (!hasClientSnapshot) {
    const save = readSave();
    clientSnapshot = save.completed;
    clientDrafts = save.drafts;
    festivalDone = save.festivalDone;
    hasClientSnapshot = true;
  }
  return clientSnapshot;
}

export function getServerHeritageProgressSnapshot(): HeritageProgress {
  return serverSnapshot;
}

export function loadHeritageProgress(): HeritageProgress {
  if (typeof window === "undefined") return createEmptyProgress();
  const save = readSave();
  clientSnapshot = save.completed;
  clientDrafts = save.drafts;
  festivalDone = save.festivalDone;
  hasClientSnapshot = true;
  return clientSnapshot;
}

export function saveHeritageProgress(completed: HeritageProgress): boolean {
  return writeSave(completed, clientDrafts);
}

export function clearHeritageProgress(): HeritageProgress {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  clientSnapshot = createEmptyProgress();
  clientDrafts = {};
  festivalDone = false;
  hasClientSnapshot = true;
  notifyHeritageProgressListeners();
  return clientSnapshot;
}

export function markTrackCompleted(
  current: HeritageProgress,
  track: HeritageTrack,
): HeritageProgress {
  if (!isHeritageTrack(track) || current[track]) return current;
  const next = { ...current, [track]: true };
  const drafts = { ...clientDrafts };
  delete drafts[track];
  writeSave(next, drafts);
  return next;
}

/** 读取某技艺中途阶段；无草稿返回 null */
export function loadCraftDraft(track: HeritageTrack): number | null {
  if (typeof window === "undefined") return null;
  if (!hasClientSnapshot) loadHeritageProgress();
  const value = clientDrafts[track];
  return typeof value === "number" ? value : null;
}

/** 写入中途阶段（已完成的技艺不会写草稿） */
export function saveCraftDraft(track: HeritageTrack, phase: number): void {
  if (typeof window === "undefined") return;
  if (!hasClientSnapshot) loadHeritageProgress();
  if (clientSnapshot[track]) return;
  writeSave(clientSnapshot, { ...clientDrafts, [track]: Math.max(0, Math.floor(phase)) });
}

/** 清除单项中途草稿 */
export function clearCraftDraft(track: HeritageTrack): void {
  if (typeof window === "undefined") return;
  if (!hasClientSnapshot) loadHeritageProgress();
  if (!(track in clientDrafts)) return;
  const drafts = { ...clientDrafts };
  delete drafts[track];
  writeSave(clientSnapshot, drafts);
}

/** 节庆演练是否完成 */
export function isFestivalDone(): boolean {
  if (typeof window === "undefined") return false;
  if (!hasClientSnapshot) loadHeritageProgress();
  return festivalDone;
}

/** 标记节庆演练完成并落盘 */
export function markFestivalDone(): void {
  if (typeof window === "undefined") return;
  if (!hasClientSnapshot) loadHeritageProgress();
  if (festivalDone) return;
  writeSave(clientSnapshot, clientDrafts, true);
}
