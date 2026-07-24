/**
 * 世界 NPC 冒烟：小方块机器人系统与保护接入。
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const npcs = readFileSync(join(root, "app/heritage/world-npcs.ts"), "utf8");
const game = readFileSync(join(root, "app/voxel-game.tsx"), "utf8");

test("world npcs build robot from mini blocks only", () => {
  assert.match(npcs, /茶客/);
  assert.match(npcs, /讲解员/);
  assert.match(npcs, /窑工学徒/);
  assert.match(npcs, /buildRobotParts/);
  assert.match(npcs, /createWorldNpcSystem/);
  assert.match(npcs, /npcMiniBlock/);
  assert.match(npcs, /pickRandomWalkableTarget/);
  assert.match(npcs, /canStandAt/);
  assert.match(npcs, /overlapsSolidBlocks/);
  assert.match(npcs, /update: \(delta: number, isBlocked/);
});

test("voxel game mounts npc meshes and protects occupied cells", () => {
  assert.match(game, /createWorldNpcSystem/);
  assert.match(game, /worldNpcs\.occupiesCell/);
  assert.match(game, /worldNpcs\.update\(delta,/);
  assert.match(game, /访客与学徒不可破坏或覆盖/);
  assert.match(game, /worldNpcs\.dispose/);
  assert.doesNotMatch(game, /npcBlock\(/);
});
