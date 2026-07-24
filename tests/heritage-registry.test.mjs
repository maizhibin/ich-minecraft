/**
 * 非遗进度存档与注册表的轻量校验（不依赖浏览器 DOM）。
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TRACK_IDS = [
  "joinery",
  "printing",
  "tea",
  "shadow",
  "porcelain",
  "papercut",
  "yunjin",
];

test("heritage registry lists seven shipped tracks", () => {
  const registry = readFileSync(join(root, "app/heritage/registry.ts"), "utf8");
  for (const id of TRACK_IDS) {
    assert.match(registry, new RegExp(`id: "${id}"`));
  }
  assert.equal([...registry.matchAll(/id: "/g)].length, 7);
});

test("heritage types keep track union aligned with registry ids", () => {
  const types = readFileSync(join(root, "app/heritage/types.ts"), "utf8");
  for (const id of TRACK_IDS) {
    assert.match(types, new RegExp(`"${id}"`));
  }
});

test("world rewards cover all seven tracks", () => {
  const rewards = readFileSync(join(root, "app/heritage/world-rewards.ts"), "utf8");
  for (const id of TRACK_IDS) {
    assert.match(rewards, new RegExp(`track === "${id}"`));
  }
});

test("three new craft modules exist", () => {
  for (const file of [
    "porcelain-craft.tsx",
    "papercut-craft.tsx",
    "yunjin-craft.tsx",
  ]) {
    const body = readFileSync(join(root, "app/heritage/crafts", file), "utf8");
    assert.ok(body.length > 500);
  }
});
