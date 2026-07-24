"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createNoise2D } from "simplex-noise";
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { createGameAudio, type GameAudioState, type GameSound } from "./game-audio";
import { HeritageWorkshop } from "./heritage-workshop";
import {
  HERITAGE_TRACKS,
  WORKSHOPS,
  applyFestivalReward,
  applyHeritageReward,
  countCompleted,
  clearHeritageProgress,
  getHeritageProgressSnapshot,
  getServerHeritageProgressSnapshot,
  isFestivalDone,
  loadHeritageProgress,
  markTrackCompleted,
  restoreHeritageRewards,
  subscribeHeritageProgress,
  type HeritageTrack,
} from "./heritage";
import { heritageSiteBlock } from "./heritage/world-sites";
import { museumBlock } from "./heritage/museum-world";
import { resolveAmbientZone } from "./heritage/ambient-zones";
import { createWorldNpcSystem } from "./heritage/world-npcs";
import { createVoxelSky, SKY_HORIZON } from "./voxel-sky";

type BlockType = "grass" | "dirt" | "stone" | "sand" | "wood" | "leaves";
type Hit = { x: number; y: number; z: number; normal: THREE.Vector3 };
type Chunk = { mesh: THREE.Mesh; key: string };

const BLOCKS: Array<{ type: BlockType; label: string; color: string }> = [
  { type: "grass", label: "草地", color: "#75a83e" },
  { type: "dirt", label: "泥土", color: "#8b5a35" },
  { type: "stone", label: "石头", color: "#778087" },
  { type: "sand", label: "沙子", color: "#d9bd72" },
  { type: "wood", label: "木头", color: "#93623c" },
  { type: "leaves", label: "树叶", color: "#477c3d" },
];

const BLOCK_INDEX = new Map(BLOCKS.map((block, index) => [block.type, index]));
const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 4;
const MAX_HEIGHT = 18;
const EYE_HEIGHT = 1.62;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.32;
const REACH = 7;
// 工坊坐标改由 app/heritage/registry 统一登记，避免与图鉴进度分母脱节
const FACES = [
  { normal: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { normal: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { normal: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
] as const;

const LETTERS: Record<string, string[]> = {
  D: ["1110", "1001", "1001", "1001", "1110"],
  T: ["1111", "0110", "0110", "0110", "0110"],
  C: ["1111", "1000", "1000", "1000", "1111"],
  o: ["0000", "0110", "1001", "1001", "0110"],
  d: ["0001", "0111", "1001", "1001", "0111"],
  e: ["0000", "0110", "1111", "1000", "0111"],
  r: ["0000", "1011", "1100", "1000", "1000"],
};

const noise2D = createNoise2D(() => 0.618033988749895);
const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;
const chunkKey = (x: number, z: number) => `${x},${z}`;
const chunkOf = (value: number) => Math.floor(value / CHUNK_SIZE);
const hash = (x: number, z: number) => {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

function fbm(x: number, z: number) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 0.035;
  for (let octave = 0; octave < 5; octave += 1) {
    value += noise2D(x * frequency, z * frequency) * amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value;
}

function isCentralPlaza(x: number, z: number) {
  return x >= -48 && x <= 55 && z >= -20 && z <= 24;
}

function terrainHeight(x: number, z: number) {
  if (isCentralPlaza(x, z)) return 3;
  return THREE.MathUtils.clamp(Math.round(7 + fbm(x, z) * 7), 2, 14);
}

function isTreeCenter(x: number, z: number) {
  if (Math.abs(x) <= 24 && Math.abs(z) <= 18) return false;
  // 略增树木密度，仍避开中央核心区，控制区块面数
  return hash(x, z) > 0.955 && terrainHeight(x, z) > 4;
}

/** 地表色块：旱斑沙地 / 露岩，仅用于非广场草地顶面 */
function surfaceBlockAt(x: number, z: number): BlockType {
  const patch = hash(x * 3 + 11, z * 5 + 7);
  const moisture = fbm(x * 0.6, z * 0.6);
  if (patch > 0.94 && moisture < -0.15) return "sand";
  if (patch > 0.9 && moisture > 0.35) return "stone";
  return "grass";
}

/**
 * 花草灌木装饰：草地上方偶发 1–2 格树叶。
 * 避开近广场核心与树干中心，避免堵路。
 */
function decorationBlock(x: number, y: number, z: number): BlockType | null {
  if (Math.abs(x) <= 24 && Math.abs(z) <= 18) return null;
  if (isCentralPlaza(x, z)) return null;
  if (isTreeCenter(x, z)) return null;
  const height = terrainHeight(x, z);
  if (surfaceBlockAt(x, z) !== "grass") return null;
  const roll = hash(x + 41, z + 97);
  // 矮花草：地表上一格
  if (roll > 0.91 && y === height + 1) return "leaves";
  // 矮灌木：两格高，概率更低
  if (roll > 0.975 && y >= height + 1 && y <= height + 2) return "leaves";
  return null;
}

const letterBlocks = new Set<string>();
let letterCursor = -17;
for (const letter of "DTCoder") {
  LETTERS[letter].forEach((row, rowIndex) => {
    [...row].forEach((pixel, columnIndex) => {
      if (pixel === "1") letterBlocks.add(keyOf(letterCursor + columnIndex, 4 + 4 - rowIndex, -10));
    });
  });
  letterCursor += 5;
}

function createTextureAtlas() {
  const tileSize = 16;
  const canvas = document.createElement("canvas");
  canvas.width = tileSize * BLOCKS.length;
  canvas.height = tileSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建纹理图集");

  BLOCKS.forEach((block, tile) => {
    context.fillStyle = block.color;
    context.fillRect(tile * tileSize, 0, tileSize, tileSize);
    for (let index = 0; index < 46; index += 1) {
      const x = Math.floor(hash(tile * 19 + index, 2) * tileSize);
      const y = Math.floor(hash(tile * 7, index * 13) * tileSize);
      const light = hash(index, tile) > 0.5;
      context.fillStyle = light ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.14)";
      context.fillRect(tile * tileSize + x, y, tile === 5 ? 2 : 1, tile === 5 ? 2 : 1);
    }
    if (block.type === "wood") {
      context.fillStyle = "rgba(50,25,12,.22)";
      for (let x = 2; x < tileSize; x += 5) context.fillRect(tile * tileSize + x, 0, 1, tileSize);
    }
    if (block.type === "grass") {
      // 顶面高光条 + 稀疏黄绿斑点，让草地不那么平
      context.fillStyle = "rgba(218,255,109,.22)";
      context.fillRect(tile * tileSize, 1, tileSize, 3);
      for (let index = 0; index < 10; index += 1) {
        const px = Math.floor(hash(tile * 3 + index, 9) * tileSize);
        const py = Math.floor(hash(index * 5, tile + 2) * (tileSize - 4)) + 3;
        context.fillStyle = hash(index, tile + 4) > 0.5 ? "rgba(255,230,90,.2)" : "rgba(40,90,20,.16)";
        context.fillRect(tile * tileSize + px, py, 1, 1);
      }
    }
    if (block.type === "leaves") {
      // 叶面加点亮斑，花草装饰时也更有层次
      for (let index = 0; index < 8; index += 1) {
        const px = Math.floor(hash(tile * 11 + index, 4) * tileSize);
        const py = Math.floor(hash(index * 7, tile) * tileSize);
        context.fillStyle = "rgba(180,255,140,.22)";
        context.fillRect(tile * tileSize + px, py, 2, 1);
      }
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

function voxelRaycast(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  getBlock: (x: number, y: number, z: number) => BlockType | null,
): Hit | null {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);
  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);
  const deltaX = direction.x === 0 ? Infinity : Math.abs(1 / direction.x);
  const deltaY = direction.y === 0 ? Infinity : Math.abs(1 / direction.y);
  const deltaZ = direction.z === 0 ? Infinity : Math.abs(1 / direction.z);
  let maxX = direction.x === 0 ? Infinity : ((stepX > 0 ? x + 1 : x) - origin.x) / direction.x;
  let maxY = direction.y === 0 ? Infinity : ((stepY > 0 ? y + 1 : y) - origin.y) / direction.y;
  let maxZ = direction.z === 0 ? Infinity : ((stepZ > 0 ? z + 1 : z) - origin.z) / direction.z;
  const normal = new THREE.Vector3();
  let distance = 0;

  while (distance <= REACH) {
    if (getBlock(x, y, z)) return { x, y, z, normal: normal.clone() };
    if (maxX < maxY && maxX < maxZ) {
      x += stepX;
      distance = maxX;
      maxX += deltaX;
      normal.set(-stepX, 0, 0);
    } else if (maxY < maxZ) {
      y += stepY;
      distance = maxY;
      maxY += deltaY;
      normal.set(0, -stepY, 0);
    } else {
      z += stepZ;
      distance = maxZ;
      maxZ += deltaZ;
      normal.set(0, 0, -stepZ);
    }
  }
  return null;
}

function hasCollision(
  getBlock: (x: number, y: number, z: number) => BlockType | null,
  position: THREE.Vector3,
) {
  for (let x = Math.floor(position.x - PLAYER_RADIUS); x <= Math.floor(position.x + PLAYER_RADIUS); x += 1)
    for (let y = Math.floor(position.y - EYE_HEIGHT); y <= Math.floor(position.y - EYE_HEIGHT + PLAYER_HEIGHT); y += 1)
      for (let z = Math.floor(position.z - PLAYER_RADIUS); z <= Math.floor(position.z + PLAYER_RADIUS); z += 1)
        if (getBlock(x, y, z)) return true;
  return false;
}

export function VoxelGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(0);
  const startRef = useRef<() => void>(() => undefined);
  const targetNameRef = useRef("");
  const loadProgressRef = useRef(0);
  const nearbyWorkshopRef = useRef<HeritageTrack | null>(null);
  const [started, setStarted] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [selected, setSelected] = useState(0);
  const [targetName, setTargetName] = useState("");
  const [loadProgress, setLoadProgress] = useState(0);
  const [debug, setDebug] = useState({ fps: 0, x: 0, y: 0, z: 0, chunks: 0 });
  const [heritageOpen, setHeritageOpen] = useState(false);
  const [heritageTrack, setHeritageTrack] = useState<HeritageTrack>("joinery");
  const [nearbyWorkshop, setNearbyWorkshop] = useState<HeritageTrack | null>(null);
  const [interactionNotice, setInteractionNotice] = useState("");
  const [audioState, setAudioState] = useState<GameAudioState>({ enabled: true, status: "idle" });
  // 用外部存档快照驱动 UI：SSR/水合用空进度，挂载后切到 localStorage，避免图鉴计数 mismatch
  const heritageCompleted = useSyncExternalStore(
    subscribeHeritageProgress,
    getHeritageProgressSnapshot,
    getServerHeritageProgressSnapshot,
  );

  const chooseBlock = (index: number) => {
    const next = (index + BLOCKS.length) % BLOCKS.length;
    selectedRef.current = next;
    setSelected(next);
  };

  const completeHeritage = (track: HeritageTrack) => {
    const current = getHeritageProgressSnapshot();
    if (current[track]) return;
    markTrackCompleted(current, track);
    // 世界奖励由 Three.js 层监听；重复写入同一坐标是幂等的
    window.dispatchEvent(new CustomEvent("heritage-complete", { detail: track }));
  };

  /** 清除本机进度并整页刷新，使世界奖励随存档回滚 */
  const resetHeritageProgress = () => {
    clearHeritageProgress();
    window.location.reload();
  };

  const closeHeritage = () => {
    setHeritageOpen(false);
    startRef.current();
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    // 背景与雾取地平线浅蓝，上方蓝色层次由天空穹顶负责
    scene.background = new THREE.Color(SKY_HORIZON);
    scene.fog = new THREE.Fog(SKY_HORIZON, 42, CHUNK_SIZE * (RENDER_DISTANCE + 0.8));
    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 100);
    camera.position.set(0, 5 + EYE_HEIGHT, 12);
    camera.lookAt(0, 6, -10);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);
    const gameAudio = createGameAudio(setAudioState);
    const reportAudioState = (state: GameAudioState) => {
      if (state.status === "unavailable") {
        setInteractionNotice("浏览器未能启动音频，请检查标签页静音和系统输出设备");
      }
    };
    const handleGameSound = (event: Event) => {
      gameAudio.play((event as CustomEvent<GameSound>).detail);
    };
    const handleAudioToggle = () => {
      void gameAudio.toggle().then(reportAudioState);
    };
    window.addEventListener("game-sound", handleGameSound);
    window.addEventListener("game-audio-toggle", handleAudioToggle);

    scene.add(new THREE.HemisphereLight(0xe8f8ff, 0x5a6340, 2.2));
    const sun = new THREE.DirectionalLight(0xfff0c9, 2.1);
    sun.position.set(25, 35, 18);
    scene.add(sun);
    // 蓝天白云：独立模块，帧循环内更新，不触发 React 状态
    const voxelSky = createVoxelSky(scene);
    // NPC 小方块机器人：独立网格，不进入世界方块与热键栏
    const worldNpcs = createWorldNpcSystem(scene);

    const atlas = createTextureAtlas();
    const worldMaterial = new THREE.MeshLambertMaterial({ map: atlas });
    const chunks = new Map<string, Chunk>();
    const modifications = new Map<string, BlockType | null>();
    const dirtyChunks = new Set<string>();
    let generationQueue: Array<{ x: number; z: number; key: string }> = [];
    let desiredChunks = new Set<string>();
    let active = false;
    let lastCenter = "";

    const baseBlock = (x: number, y: number, z: number): BlockType | null => {
      if (y < 0 || y > MAX_HEIGHT + 6) return null;
      if (letterBlocks.has(keyOf(x, y, z))) return "stone";
      const museum = museumBlock(x, y, z);
      if (museum !== undefined) return museum;
      const heritageSite = heritageSiteBlock(x, y, z);
      if (heritageSite !== undefined) return heritageSite;
      const height = terrainHeight(x, z);
      if (y <= height) {
        // 广场保持沙地；野外用色块增加地表变化
        if (y === height) return isCentralPlaza(x, z) ? "sand" : surfaceBlockAt(x, z);
        return y < height - 3 ? "stone" : "dirt";
      }
      if (isTreeCenter(x, z) && y > height && y <= height + 4) return "wood";
      for (let tx = x - 2; tx <= x + 2; tx += 1) {
        for (let tz = z - 2; tz <= z + 2; tz += 1) {
          if (!isTreeCenter(tx, tz)) continue;
          const treeTop = terrainHeight(tx, tz) + 4;
          const dx = Math.abs(tx - x);
          const dz = Math.abs(tz - z);
          if (y >= treeTop - 2 && y <= treeTop + 1 && dx + dz <= (y === treeTop + 1 ? 1 : 3)) return "leaves";
        }
      }
      // 树木之后再铺花草，避免盖住树冠逻辑
      const decor = decorationBlock(x, y, z);
      if (decor) return decor;
      return null;
    };
    const getBlock = (x: number, y: number, z: number) => {
      const key = keyOf(x, y, z);
      return modifications.has(key) ? modifications.get(key) ?? null : baseBlock(x, y, z);
    };
    // 世界方块碰撞 + NPC 碰撞盒（NPC 不可步行穿过）
    const collidesAt = (position: THREE.Vector3) =>
      hasCollision(getBlock, position) ||
      worldNpcs.collides(position, EYE_HEIGHT, PLAYER_HEIGHT, PLAYER_RADIUS);

    const buildChunk = (chunkX: number, chunkZ: number) => {
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      let vertexOffset = 0;
      const startX = chunkX * CHUNK_SIZE;
      const startZ = chunkZ * CHUNK_SIZE;

      for (let x = startX; x < startX + CHUNK_SIZE; x += 1) {
        for (let z = startZ; z < startZ + CHUNK_SIZE; z += 1) {
          for (let y = 0; y <= MAX_HEIGHT + 6; y += 1) {
            const type = getBlock(x, y, z);
            if (!type) continue;
            const tile = BLOCK_INDEX.get(type) ?? 0;
            const u0 = (tile + 0.03) / BLOCKS.length;
            const u1 = (tile + 0.97) / BLOCKS.length;
            for (const face of FACES) {
              const [nx, ny, nz] = face.normal;
              if (getBlock(x + nx, y + ny, z + nz)) continue;
              for (const [cx, cy, cz] of face.corners) {
                positions.push(x + cx, y + cy, z + cz);
                normals.push(nx, ny, nz);
              }
              uvs.push(u0, 0.97, u0, 0.03, u1, 0.03, u1, 0.97);
              indices.push(vertexOffset, vertexOffset + 1, vertexOffset + 2, vertexOffset, vertexOffset + 2, vertexOffset + 3);
              vertexOffset += 4;
            }
          }
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, worldMaterial);
      mesh.receiveShadow = true;
      const key = chunkKey(chunkX, chunkZ);
      const existing = chunks.get(key);
      if (existing) {
        scene.remove(existing.mesh);
        existing.mesh.geometry.dispose();
      }
      scene.add(mesh);
      chunks.set(key, { mesh, key });
      dirtyChunks.delete(key);
    };

    const updateDesiredChunks = (force = false) => {
      const centerX = chunkOf(camera.position.x);
      const centerZ = chunkOf(camera.position.z);
      const centerKey = chunkKey(centerX, centerZ);
      if (!force && centerKey === lastCenter) return;
      lastCenter = centerKey;
      const nextDesired = new Set<string>();
      const candidates: Array<{ x: number; z: number; key: string; distance: number }> = [];
      for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx += 1) {
        for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz += 1) {
          const distance = Math.hypot(dx, dz);
          if (distance > RENDER_DISTANCE + 0.15) continue;
          const x = centerX + dx;
          const z = centerZ + dz;
          const key = chunkKey(x, z);
          nextDesired.add(key);
          if (!chunks.has(key)) candidates.push({ x, z, key, distance });
        }
      }
      candidates.sort((a, b) => a.distance - b.distance);
      desiredChunks = nextDesired;
      generationQueue = [
        ...generationQueue.filter((item) => nextDesired.has(item.key) && !chunks.has(item.key)),
        ...candidates.filter((item) => !generationQueue.some((queued) => queued.key === item.key)),
      ];
      chunks.forEach((chunk, key) => {
        if (nextDesired.has(key)) return;
        scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        chunks.delete(key);
      });
    };

    const markDirtyAt = (x: number, z: number) => {
      const cx = chunkOf(x);
      const cz = chunkOf(z);
      dirtyChunks.add(chunkKey(cx, cz));
      if (x % CHUNK_SIZE === 0) dirtyChunks.add(chunkKey(cx - 1, cz));
      if ((x + 1) % CHUNK_SIZE === 0) dirtyChunks.add(chunkKey(cx + 1, cz));
      if (z % CHUNK_SIZE === 0) dirtyChunks.add(chunkKey(cx, cz - 1));
      if ((z + 1) % CHUNK_SIZE === 0) dirtyChunks.add(chunkKey(cx, cz + 1));
    };

    // 奖励写入抽到 heritage/world-rewards，坐标与改前保持一致；跳过 NPC 占用格
    const writeRewardBlock = (x: number, y: number, z: number, block: BlockType) => {
      if (worldNpcs.occupiesCell(x, y, z)) return;
      modifications.set(keyOf(x, y, z), block);
    };
    const handleHeritageComplete = (event: Event) => {
      applyHeritageReward(
        (event as CustomEvent<HeritageTrack>).detail,
        writeRewardBlock,
        markDirtyAt,
      );
    };
    window.addEventListener("heritage-complete", handleHeritageComplete);
    const handleFestivalComplete = () => {
      applyFestivalReward(writeRewardBlock, markDirtyAt);
    };
    window.addEventListener("festival-complete", handleFestivalComplete);

    // 刷新后按存档重放已完成技艺的世界奖励，再生成首批区块
    restoreHeritageRewards(
      loadHeritageProgress(),
      writeRewardBlock,
      markDirtyAt,
    );
    if (isFestivalDone()) applyFestivalReward(writeRewardBlock, markDirtyAt);

    updateDesiredChunks(true);
    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = 0.75;
    controls.addEventListener("lock", () => {
      active = true;
      setStarted(true);
      setHasPlayed(true);
    });
    controls.addEventListener("unlock", () => {
      active = false;
      setStarted(false);
    });
    startRef.current = () => {
      void gameAudio.start().then(reportAudioState);
      if (matchMedia("(pointer: coarse)").matches) {
        active = true;
        setStarted(true);
        setHasPlayed(true);
      } else controls.lock();
    };
    // track 可能为 null：CustomEvent 未传 detail 时 detail 是 null（不是 undefined），默认参数不会生效
    const openHeritagePanel = (track?: HeritageTrack | null) => {
      const resolved = track ?? nearbyWorkshopRef.current ?? "joinery";
      void gameAudio.start().then((state) => {
        reportAudioState(state);
        if (state.status === "running") gameAudio.play("ui");
      });
      active = false;
      if (controls.isLocked) controls.unlock();
      setHeritageTrack(resolved);
      setHeritageOpen(true);
    };
    const handleHeritageOpen = (event: Event) => {
      openHeritagePanel((event as CustomEvent<HeritageTrack | undefined>).detail);
    };
    window.addEventListener("heritage-open", handleHeritageOpen);

    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.72, 0.28),
      new THREE.MeshLambertMaterial({ color: 0xd39b72 }),
    );
    hand.position.set(0.55, -0.52, -0.85);
    hand.rotation.set(-0.35, 0, -0.2);
    camera.add(hand);
    scene.add(camera);

    const highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.015, 1.015, 1.015)),
      new THREE.LineBasicMaterial({ color: 0xe6ff4a, depthTest: false }),
    );
    highlight.renderOrder = 10;
    highlight.visible = false;
    scene.add(highlight);
    let currentHit: Hit | null = null;

    const updateTarget = () => {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      currentHit = voxelRaycast(camera.position, direction, getBlock);
      const npcHit = worldNpcs.raycast(camera.position, direction, REACH);
      // 若准心更近处是 NPC，优先显示角色名且不把高亮绑到可编辑方块上
      const blockDistance = currentHit
        ? Math.hypot(
            currentHit.x + 0.5 - camera.position.x,
            currentHit.y + 0.5 - camera.position.y,
            currentHit.z + 0.5 - camera.position.z,
          )
        : Infinity;
      if (npcHit && npcHit.distance <= blockDistance) {
        highlight.visible = false;
        if (npcHit.label !== targetNameRef.current) {
          targetNameRef.current = npcHit.label;
          setTargetName(npcHit.label);
        }
        currentHit = null;
        return;
      }
      highlight.visible = Boolean(currentHit);
      if (currentHit) {
        highlight.position.set(currentHit.x + 0.5, currentHit.y + 0.5, currentHit.z + 0.5);
        const nextTargetName =
          BLOCKS.find((block) => block.type === getBlock(currentHit!.x, currentHit!.y, currentHit!.z))?.label ?? "";
        if (nextTargetName !== targetNameRef.current) {
          targetNameRef.current = nextTargetName;
          setTargetName(nextTargetName);
        }
      } else if (targetNameRef.current) {
        targetNameRef.current = "";
        setTargetName("");
      }
    };

    const interact = (place: boolean) => {
      updateTarget();
      // 准心落在 NPC 上时禁止交互
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const npcHit = worldNpcs.raycast(camera.position, direction, REACH);
      if (npcHit && !currentHit) {
        showInteractionNotice("访客与学徒不可破坏或覆盖");
        return;
      }
      if (!currentHit) return;
      const target = place
        ? {
            x: currentHit.x + currentHit.normal.x,
            y: currentHit.y + currentHit.normal.y,
            z: currentHit.z + currentHit.normal.z,
          }
        : currentHit;
      const key = keyOf(target.x, target.y, target.z);
      // NPC 占用格不可破坏，也不可在其格子上放置
      if (worldNpcs.occupiesCell(target.x, target.y, target.z)) {
        showInteractionNotice("访客与学徒不可破坏或覆盖");
        return;
      }
      if (place) {
        if (getBlock(target.x, target.y, target.z)) return;
        modifications.set(key, BLOCKS[selectedRef.current].type);
        if (collidesAt(camera.position)) modifications.delete(key);
      } else if (target.y > 0) modifications.set(key, null);
      markDirtyAt(target.x, target.z);
      gameAudio.play(place ? "place" : "break");
      hand.rotation.x = -0.72;
      window.setTimeout(() => (hand.rotation.x = -0.35), 90);
    };

    const keys = new Set<string>();
    const velocity = new THREE.Vector3();
    let grounded = false;
    let noticeTimer = 0;
    const showInteractionNotice = (message: string) => {
      window.clearTimeout(noticeTimer);
      setInteractionNotice(message);
      noticeTimer = window.setTimeout(() => setInteractionNotice(""), 2800);
    };
    const findNearestWorkshop = () => {
      let nearest: HeritageTrack = "joinery";
      let nearestDistance = Infinity;
      for (const [track, workshop] of Object.entries(WORKSHOPS) as Array<
        [HeritageTrack, (typeof WORKSHOPS)[HeritageTrack]]
      >) {
        const distance = Math.hypot(camera.position.x - workshop.x, camera.position.z - workshop.z);
        if (distance < nearestDistance) {
          nearest = track;
          nearestDistance = distance;
        }
      }
      return { track: nearest, distance: nearestDistance };
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "KeyH") {
        event.preventDefault();
        openHeritagePanel(nearbyWorkshopRef.current ?? "joinery");
        return;
      }
      if (event.code === "KeyE") {
        event.preventDefault();
        const nearest = findNearestWorkshop();
        const insideMuseum =
          camera.position.x >= 18 &&
          camera.position.x <= 52 &&
          camera.position.z >= -16 &&
          camera.position.z <= 12;
        if (nearbyWorkshopRef.current || insideMuseum || nearest.distance <= 8) {
          openHeritagePanel(nearbyWorkshopRef.current ?? nearest.track);
        } else {
          showInteractionNotice(`请前往${WORKSHOPS[nearest.track].guide}，靠近后按 E 使用`);
        }
        return;
      }
      keys.add(event.code);
      if (event.code === "Space" && grounded) {
        velocity.y = 7.2;
        gameAudio.play("jump");
      }
      if (/^Digit[1-6]$/.test(event.code)) chooseBlock(Number(event.code.at(-1)) - 1);
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onMouseDown = (event: MouseEvent) => {
      if (!controls.isLocked) return;
      event.preventDefault();
      interact(event.button === 0);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      chooseBlock(selectedRef.current + (event.deltaY > 0 ? 1 : -1));
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    renderer.domElement.addEventListener("contextmenu", onContextMenu);

    const touchMove = new THREE.Vector2();
    const moveOrigin = new THREE.Vector2();
    const lookPrevious = new THREE.Vector2();
    let moveTouch: number | null = null;
    let lookTouch: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.clientX < innerWidth * 0.5 && moveTouch === null) {
          moveTouch = touch.identifier;
          moveOrigin.set(touch.clientX, touch.clientY);
        } else if (lookTouch === null) {
          lookTouch = touch.identifier;
          lookPrevious.set(touch.clientX, touch.clientY);
        }
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier === moveTouch) {
          touchMove.set(
            THREE.MathUtils.clamp((touch.clientX - moveOrigin.x) / 48, -1, 1),
            THREE.MathUtils.clamp((touch.clientY - moveOrigin.y) / 48, -1, 1),
          );
        } else if (touch.identifier === lookTouch) {
          camera.rotation.order = "YXZ";
          camera.rotation.y -= (touch.clientX - lookPrevious.x) * 0.004;
          camera.rotation.x = THREE.MathUtils.clamp(
            camera.rotation.x - (touch.clientY - lookPrevious.y) * 0.004,
            -1.48,
            1.48,
          );
          lookPrevious.set(touch.clientX, touch.clientY);
        }
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      for (const touch of Array.from(event.changedTouches)) {
        if (touch.identifier === moveTouch) {
          moveTouch = null;
          touchMove.set(0, 0);
        }
        if (touch.identifier === lookTouch) lookTouch = null;
      }
    };
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd);

    const handleAction = (event: Event) => {
      const action = (event as CustomEvent<"place" | "break" | "jump">).detail;
      if (action === "jump" && grounded) {
        velocity.y = 7.2;
        gameAudio.play("jump");
      }
      else interact(action === "place");
    };
    window.addEventListener("voxel-action", handleAction);

    const clock = new THREE.Clock();
    const viewForward = new THREE.Vector3();
    const viewRight = new THREE.Vector3();
    const moveDirection = new THREE.Vector3();
    let animationFrame = 0;
    let frameCount = 0;
    let statsTime = performance.now();
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);

      updateDesiredChunks();
      let generatedThisFrame = 0;
      const dirty = [...dirtyChunks].filter((key) => desiredChunks.has(key)).slice(0, 2);
      for (const key of dirty) {
        const [x, z] = key.split(",").map(Number);
        buildChunk(x, z);
        generatedThisFrame += 1;
      }
      while (generationQueue.length && generatedThisFrame < 2) {
        const item = generationQueue.shift()!;
        if (desiredChunks.has(item.key) && !chunks.has(item.key)) {
          buildChunk(item.x, item.z);
          generatedThisFrame += 1;
        }
      }
      const total = desiredChunks.size || 1;
      const nextLoadProgress = Math.round((chunks.size / total) * 100);
      if (nextLoadProgress !== loadProgressRef.current) {
        loadProgressRef.current = nextLoadProgress;
        setLoadProgress(nextLoadProgress);
      }

      if (active || controls.isLocked) {
        const forwardInput = Number(keys.has("KeyW")) - Number(keys.has("KeyS")) - touchMove.y;
        const strafeInput = Number(keys.has("KeyD")) - Number(keys.has("KeyA")) + touchMove.x;

        // 直接从相机四元数读取水平朝向，避免旋转 180° 后使用固定世界坐标移动。
        controls.getDirection(viewForward);
        viewForward.y = 0;
        viewForward.normalize();
        viewRight.crossVectors(viewForward, camera.up).normalize();
        moveDirection
          .copy(viewForward)
          .multiplyScalar(forwardInput)
          .addScaledVector(viewRight, strafeInput);
        if (moveDirection.lengthSq() > 1) moveDirection.normalize();

        const previousX = camera.position.x;
        camera.position.x += moveDirection.x * 5.4 * delta;
        if (collidesAt(camera.position)) camera.position.x = previousX;
        const previousZ = camera.position.z;
        camera.position.z += moveDirection.z * 5.4 * delta;
        if (collidesAt(camera.position)) camera.position.z = previousZ;
        velocity.y -= 19 * delta;
        camera.position.y += velocity.y * delta;
        if (collidesAt(camera.position)) {
          camera.position.y -= velocity.y * delta;
          grounded = velocity.y < 0;
          velocity.y = 0;
        } else grounded = false;
        if (camera.position.y < -8) {
          camera.position.set(0, 5 + EYE_HEIGHT, 12);
          velocity.set(0, 0, 0);
        }
      }
      updateTarget();

      frameCount += 1;
      const now = performance.now();
      if (now - statsTime > 350) {
        let nextWorkshop: HeritageTrack | null = null;
        for (const [track, workshop] of Object.entries(WORKSHOPS) as Array<
          [HeritageTrack, (typeof WORKSHOPS)[HeritageTrack]]
        >) {
          if (Math.hypot(camera.position.x - workshop.x, camera.position.z - workshop.z) < 7) {
            nextWorkshop = track;
            break;
          }
        }
        if (nextWorkshop !== nearbyWorkshopRef.current) {
          nearbyWorkshopRef.current = nextWorkshop;
          setNearbyWorkshop(nextWorkshop);
        }
        // 低频检测氛围区，切换分区 BGM（不触发 React 重渲染）
        gameAudio.setAmbientZone(resolveAmbientZone(camera.position.x, camera.position.z));
        setDebug({
          fps: Math.round((frameCount * 1000) / (now - statsTime)),
          x: Math.floor(camera.position.x),
          y: Math.floor(camera.position.y),
          z: Math.floor(camera.position.z),
          chunks: chunks.size,
        });
        frameCount = 0;
        statsTime = now;
      }

      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (
        renderer.domElement.width !== Math.floor(width * renderer.getPixelRatio()) ||
        renderer.domElement.height !== Math.floor(height * renderer.getPixelRatio())
      ) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      // 云层漂移与穹顶跟随，须在 render 前更新
      voxelSky.update(camera, delta);
      // NPC 随机巡逻：传入世界固体查询，避免穿墙穿物
      worldNpcs.update(delta, (x, y, z) => Boolean(getBlock(x, y, z)));
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(noticeTimer);
      gameAudio.stop();
      controls.disconnect();
      voxelSky.dispose();
      worldNpcs.dispose();
      renderer.dispose();
      atlas.dispose();
      worldMaterial.dispose();
      chunks.forEach((chunk) => chunk.mesh.geometry.dispose());
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("voxel-action", handleAction);
      window.removeEventListener("heritage-open", handleHeritageOpen);
      window.removeEventListener("heritage-complete", handleHeritageComplete);
      window.removeEventListener("festival-complete", handleFestivalComplete);
      window.removeEventListener("game-sound", handleGameSound);
      window.removeEventListener("game-audio-toggle", handleAudioToggle);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const action = (type: "place" | "break" | "jump") =>
    window.dispatchEvent(new CustomEvent("voxel-action", { detail: type }));
  const audioLabel = audioState.status === "idle"
    ? "声音 待启用"
    : audioState.status === "starting"
      ? "声音 启动中"
      : audioState.status === "running"
        ? "声音 ON"
        : audioState.status === "muted"
          ? "声音 OFF"
          : "声音不可用";
  const audioActionLabel = audioState.status === "running"
    ? "关闭背景音乐和音效"
    : audioState.status === "muted"
      ? "开启背景音乐和音效"
      : "启动并测试背景音乐和音效";

  return (
    <main className="game-shell">
      <div ref={mountRef} className="game-canvas" aria-label="DTCoder 3D 方块世界" />
      <header className="hud-top">
        <div className="brand"><span className="brand-mark">D</span><span>DTCODER BLOCKLANDS</span></div>
        <div className="status"><span className="status-dot" />{started ? "探索中" : hasPlayed ? "游戏已暂停" : "世界初始化"}</div>
      </header>
      <button
        className="heritage-launcher"
        onClick={() => window.dispatchEvent(new CustomEvent("heritage-open"))}
      >
        <span>H</span> 非遗图鉴
        <b>{countCompleted(heritageCompleted)}/{HERITAGE_TRACKS.length}</b>
      </button>
      <button
        className="audio-toggle"
        onClick={() => window.dispatchEvent(new CustomEvent("game-audio-toggle"))}
        aria-pressed={audioState.status === "running"}
        aria-label={audioActionLabel}
        title={audioState.status === "idle" ? "点击后会播放两声测试提示音" : audioActionLabel}
      >
        {audioLabel}
      </button>

      <aside className="debug-panel" aria-label="调试信息">
        <span>FPS <b>{debug.fps}</b></span>
        <span>XYZ <b>{debug.x} / {debug.y} / {debug.z}</b></span>
        <span>CHUNKS <b>{debug.chunks}</b></span>
      </aside>

      <div className="crosshair" aria-hidden="true"><i /><i /></div>
      {targetName && started && <div className="target-name">{targetName}</div>}
      {interactionNotice && <div className="interaction-notice" role="status">{interactionNotice}</div>}
      {nearbyWorkshop && started && (
        <div className="workshop-hint">
          <kbd>E</kbd> 使用{WORKSHOPS[nearbyWorkshop].label}
        </div>
      )}

      {!started && !heritageOpen && (
        <section className="start-card">
          <span className="eyebrow">{hasPlayed ? "游戏已暂停" : "Simplex · FBM 体素世界"}</span>
          <strong>{hasPlayed ? "暂停探索" : "进入方块世界"}</strong>
          <small>{hasPlayed ? "进度已自动保存在本机；点击继续返回世界" : "探索博物馆、窑场、茶园、剪纸案与织机廊"}</small>
          {!hasPlayed && (
            <div className="loading-track" aria-label={`世界加载 ${loadProgress}%`}>
              <i style={{ width: `${loadProgress}%` }} /><span>{loadProgress}%</span>
            </div>
          )}
          <button className="start-cta" onClick={() => startRef.current()} disabled={!hasPlayed && loadProgress < 15}>
            {hasPlayed ? "继续游戏" : loadProgress < 15 ? "正在生成出生区块" : "开始探索"} <b>→</b>
          </button>
        </section>
      )}

      <div className="control-hint">
        <span><kbd>WASD</kbd> 移动</span><span><kbd>SPACE</kbd> 跳跃</span>
        <span><kbd>左键</kbd> 放置</span><span><kbd>右键</kbd> 破坏</span>
        <span><kbd>1—6 / 滚轮</kbd> 切换方块</span>
        <span><kbd>E / H</kbd> 工坊 / 非遗图鉴</span>
        <span>新工坊：窑场 · 剪纸案 · 织机廊</span>
      </div>

      <nav className="hotbar" aria-label="选择方块">
        {BLOCKS.map((block, index) => (
          <button
            key={block.type}
            className={selected === index ? "active" : ""}
            onClick={() => chooseBlock(index)}
            aria-label={`选择${block.label}方块`}
            title={`${index + 1} · ${block.label}`}
          >
            <span className={`block-swatch ${block.type}`} /><small>{index + 1}</small>
            <em>{block.label}</em>
          </button>
        ))}
      </nav>

      <div className="mobile-actions">
        <button onPointerDown={() => window.dispatchEvent(new CustomEvent("heritage-open"))}>非遗</button>
        <button onPointerDown={() => action("jump")}>跳</button>
        <button onPointerDown={() => action("break")}>破坏</button>
        <button className="place" onPointerDown={() => action("place")}>放置</button>
      </div>
      <div className="touch-zone left">移动</div><div className="touch-zone right">观察</div>

      <HeritageWorkshop
        open={heritageOpen}
        activeTrack={heritageTrack}
        completed={heritageCompleted}
        onClose={closeHeritage}
        onSelectTrack={setHeritageTrack}
        onComplete={completeHeritage}
        onClearProgress={resetHeritageProgress}
      />
    </main>
  );
}
