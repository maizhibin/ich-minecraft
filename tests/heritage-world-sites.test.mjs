/**
 * 非遗场地体素冒烟：确认新工坊落点有确定性方块。
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sites = readFileSync(join(root, "app/heritage/world-sites.ts"), "utf8");

test("world sites mention kiln, papercut desk and yunjin hall", () => {
  assert.match(sites, /龙泉窑场/);
  assert.match(sites, /剪纸案台/);
  assert.match(sites, /云锦织机廊/);
  assert.match(sites, /x >= 48 && x <= 58/);
  assert.match(sites, /x >= -7 && x <= -3/);
  assert.match(sites, /x >= 45 && x <= 52/);
});

test("world sites include wooden signposts for kiln, yunjin and papercut", () => {
  assert.match(sites, /简易木柱路标：窑场入口/);
  assert.match(sites, /简易木柱路标：织机廊入口/);
  assert.match(sites, /简易木柱路标：剪纸案旁/);
  assert.match(sites, /x === 47 && z === 10/);
  assert.match(sites, /x === 48 && z === -8/);
  assert.match(sites, /x === -8 && z === 8/);
});
