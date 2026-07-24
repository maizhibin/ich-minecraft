/**
 * 非遗进度存档与注册表的轻量校验（不依赖浏览器 DOM）。
 * 通过动态 import 已编译前的 ESM TypeScript 不可行时，这里直接复刻关键契约断言。
 * 完整行为以 app/heritage/* 为准；本测试防止注册表分母与空进度键漂移。
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("heritage registry lists exactly four shipped tracks", () => {
  const registry = readFileSync(join(root, "app/heritage/registry.ts"), "utf8");
  for (const id of ["joinery", "printing", "tea", "shadow"]) {
    assert.match(registry, new RegExp(`id: "${id}"`));
  }
  assert.equal([...registry.matchAll(/id: "/g)].length, 4);
});

test("heritage types keep track union aligned with registry ids", () => {
  const types = readFileSync(join(root, "app/heritage/types.ts"), "utf8");
  assert.match(types, /"joinery" \| "printing" \| "tea" \| "shadow"/);
});

test("world rewards cover all four tracks", () => {
  const rewards = readFileSync(join(root, "app/heritage/world-rewards.ts"), "utf8");
  assert.match(rewards, /track === "joinery"/);
  assert.match(rewards, /track === "printing"/);
  assert.match(rewards, /track === "tea"/);
  assert.match(rewards, /shadow：/);
});
