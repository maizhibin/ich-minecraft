/**
 * 氛围分区：确认各非遗场地盒与解析函数存在。
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zones = readFileSync(join(root, "app/heritage/ambient-zones.ts"), "utf8");
const audio = readFileSync(join(root, "app/game-audio.ts"), "utf8");
const game = readFileSync(join(root, "app/voxel-game.tsx"), "utf8");

test("ambient zones cover museum tea shadow porcelain papercut yunjin", () => {
  assert.match(zones, /museum/);
  assert.match(zones, /tea/);
  assert.match(zones, /shadow/);
  assert.match(zones, /porcelain/);
  assert.match(zones, /papercut/);
  assert.match(zones, /yunjin/);
  assert.match(zones, /export function resolveAmbientZone/);
});

test("game audio switches ambient profiles by zone", () => {
  assert.match(audio, /AMBIENT_PROFILES/);
  assert.match(audio, /setAmbientZone/);
  assert.match(game, /resolveAmbientZone/);
  assert.match(game, /setAmbientZone/);
});
