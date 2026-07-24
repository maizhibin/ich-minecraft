// 世界 NPC：专用小方块拼装机器人；可自主巡逻走动，不可破坏/覆盖，不进玩家方块图鉴。

import * as THREE from "three";

export type WorldNpc = {
  id: string;
  /** 瞄准时显示的名称 */
  label: string;
  /** 站立格子整数坐标；脚底贴在 feetY 平面上 */
  x: number;
  z: number;
  feetY: number;
  /** 朝向（弧度，绕 Y） */
  yaw?: number;
  /** 眼睛/胸灯强调色，区分不同角色 */
  accent?: number;
  /** 相对出生点的巡逻半径（世界单位） */
  roamRadius?: number;
};

/** 分布在茶馆、博物馆、窑场、剪纸、皮影、织机廊附近 */
export const WORLD_NPCS: WorldNpc[] = [
  { id: "tea-guest", label: "茶客", x: -13, z: 11, feetY: 5, yaw: Math.PI * 0.15, accent: 0x7ad7ff, roamRadius: 1.6 },
  { id: "museum-guide", label: "讲解员", x: 34, z: 11, feetY: 4, yaw: Math.PI, accent: 0x6ec8ff, roamRadius: 2.2 },
  { id: "museum-visitor", label: "访客", x: 38, z: 2, feetY: 5, yaw: -Math.PI * 0.35, accent: 0x8ae0ff, roamRadius: 2.4 },
  { id: "kiln-apprentice", label: "窑工学徒", x: 50, z: 15, feetY: 5, yaw: Math.PI * 0.6, accent: 0xffb86c, roamRadius: 1.8 },
  { id: "papercut-hobbyist", label: "剪纸爱好者", x: -1, z: 9, feetY: 4, yaw: Math.PI * 0.85, accent: 0xff8a9a, roamRadius: 1.5 },
  { id: "shadow-audience", label: "皮影观众", x: -35, z: -1, feetY: 4, yaw: Math.PI * 1.2, accent: 0xd4b4ff, roamRadius: 1.7 },
  { id: "yunjin-apprentice", label: "云锦学徒", x: 49, z: -6, feetY: 4, yaw: -Math.PI * 0.2, accent: 0xffd76a, roamRadius: 1.9 },
];

export type NpcRuntime = {
  id: string;
  label: string;
  /** 世界空间碰撞盒（不可步行穿过、不可放置覆盖） */
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  group: THREE.Group;
};

export type WorldNpcSystem = {
  npcs: NpcRuntime[];
  /**
   * 每帧更新巡逻与肢体动画（不写 React state）。
   * isBlocked：世界固体方块查询，用于随机选路与防穿墙。
   */
  update: (delta: number, isBlocked: (x: number, y: number, z: number) => boolean) => void;
  /** 玩家身体是否与任一 NPC 碰撞盒相交 */
  collides: (position: THREE.Vector3, eyeHeight: number, playerHeight: number, radius: number) => boolean;
  /** 整数格子是否落在 NPC 占用范围内（放置/破坏保护） */
  occupiesCell: (x: number, y: number, z: number) => boolean;
  /** 射线命中最近 NPC，用于准心名称 */
  raycast: (
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    reach: number,
  ) => { label: string; distance: number } | null;
  dispose: () => void;
};

type MiniPart = {
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  color: number;
  emissive?: number;
  /** 动画分组：腿、臂、天线、发光件 */
  role?: "leg" | "arm" | "antenna" | "glow" | "body";
};

type NpcMotion = {
  homeX: number;
  homeZ: number;
  feetY: number;
  roamRadius: number;
  phase: number;
  /** idle 停顿剩余秒数；<=0 时走路 */
  idleLeft: number;
  targetX: number;
  targetZ: number;
  walkSpeed: number;
  facing: number;
  legs: THREE.Mesh[];
  arms: THREE.Mesh[];
  antenna: THREE.Mesh[];
  glows: THREE.Mesh[];
  legBaseY: number[];
  armBaseY: number[];
  antennaBaseY: number[];
};

const COLLIDER_HALF = 0.48;
const COLLIDER_HEIGHT = 1.35;
/** 移动判定半径略小于展示碰撞盒，减少贴墙抖动 */
const MOVE_HALF = 0.36;
const WALK_SPEED = 0.55;

/**
 * 按参考造型用小长方体拼机器人：躯干、头、面屏、眼睛、胸灯、四足、侧臂、天线。
 * 尺寸远小于 1 世界格，且这些几何仅用于 NPC。
 */
function buildRobotParts(accent: number): MiniPart[] {
  const body = 0x9aa3ad;
  const dark = 0x3a3f46;
  const face = 0x1a1d22;
  const blue = 0x2f5f9a;
  const red = 0xe23b3b;
  return [
    { w: 0.72, h: 0.52, d: 0.58, x: 0, y: 0.42, z: 0, color: body, role: "body" },
    { w: 0.4, h: 0.36, d: 0.4, x: 0, y: 0.86, z: 0.02, color: body, role: "body" },
    { w: 0.3, h: 0.2, d: 0.06, x: 0, y: 0.86, z: 0.22, color: face, role: "body" },
    { w: 0.07, h: 0.07, d: 0.04, x: -0.07, y: 0.88, z: 0.26, color: accent, emissive: accent, role: "glow" },
    { w: 0.07, h: 0.07, d: 0.04, x: 0.07, y: 0.88, z: 0.26, color: accent, emissive: accent, role: "glow" },
    { w: 0.28, h: 0.22, d: 0.05, x: 0, y: 0.4, z: 0.3, color: blue, role: "body" },
    { w: 0.08, h: 0.08, d: 0.04, x: 0, y: 0.4, z: 0.34, color: accent, emissive: accent, role: "glow" },
    { w: 0.14, h: 0.18, d: 0.14, x: -0.22, y: 0.09, z: -0.16, color: dark, role: "leg" },
    { w: 0.14, h: 0.18, d: 0.14, x: 0.22, y: 0.09, z: -0.16, color: dark, role: "leg" },
    { w: 0.14, h: 0.18, d: 0.14, x: -0.22, y: 0.09, z: 0.16, color: dark, role: "leg" },
    { w: 0.14, h: 0.18, d: 0.14, x: 0.22, y: 0.09, z: 0.16, color: dark, role: "leg" },
    { w: 0.16, h: 0.28, d: 0.16, x: -0.44, y: 0.42, z: 0, color: dark, role: "arm" },
    { w: 0.16, h: 0.28, d: 0.16, x: 0.44, y: 0.42, z: 0, color: dark, role: "arm" },
    { w: 0.05, h: 0.22, d: 0.05, x: 0, y: 1.16, z: 0, color: dark, role: "antenna" },
    { w: 0.1, h: 0.1, d: 0.1, x: 0, y: 1.3, z: 0, color: red, role: "antenna" },
  ];
}

function createNpcGroup(npc: WorldNpc): { group: THREE.Group; motion: Omit<NpcMotion, "homeX" | "homeZ" | "feetY" | "roamRadius" | "phase" | "idleLeft" | "targetX" | "targetZ" | "walkSpeed" | "facing"> } {
  const group = new THREE.Group();
  const accent = npc.accent ?? 0x7ad7ff;
  const legs: THREE.Mesh[] = [];
  const arms: THREE.Mesh[] = [];
  const antenna: THREE.Mesh[] = [];
  const glows: THREE.Mesh[] = [];

  for (const part of buildRobotParts(accent)) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(part.w, part.h, part.d),
      new THREE.MeshLambertMaterial({
        color: part.color,
        emissive: part.emissive ? new THREE.Color(part.emissive) : undefined,
        emissiveIntensity: part.emissive ? 0.55 : 0,
      }),
    );
    mesh.position.set(part.x, part.y, part.z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.npcMiniBlock = true;
    mesh.userData.role = part.role;
    group.add(mesh);
    if (part.role === "leg") legs.push(mesh);
    if (part.role === "arm") arms.push(mesh);
    if (part.role === "antenna") antenna.push(mesh);
    if (part.role === "glow") glows.push(mesh);
  }

  group.position.set(npc.x + 0.5, npc.feetY, npc.z + 0.5);
  group.rotation.y = npc.yaw ?? 0;
  group.userData.npcId = npc.id;
  group.userData.npcLabel = npc.label;

  return {
    group,
    motion: {
      legs,
      arms,
      antenna,
      glows,
      legBaseY: legs.map((mesh) => mesh.position.y),
      armBaseY: arms.map((mesh) => mesh.position.y),
      antennaBaseY: antenna.map((mesh) => mesh.position.y),
    },
  };
}

function syncCollider(runtime: NpcRuntime, x: number, y: number, z: number) {
  runtime.minX = x - COLLIDER_HALF;
  runtime.maxX = x + COLLIDER_HALF;
  runtime.minY = y;
  runtime.maxY = y + COLLIDER_HEIGHT;
  runtime.minZ = z - COLLIDER_HALF;
  runtime.maxZ = z + COLLIDER_HALF;
}

function aabbOverlapsCell(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
  x: number,
  y: number,
  z: number,
) {
  return maxX > x && minX < x + 1 && maxY > y && minY < y + 1 && maxZ > z && minZ < z + 1;
}

/** 射线与轴对齐盒子求交，返回距离；未命中为 null */
function rayAabbDistance(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): number | null {
  const invX = direction.x === 0 ? Infinity : 1 / direction.x;
  const invY = direction.y === 0 ? Infinity : 1 / direction.y;
  const invZ = direction.z === 0 ? Infinity : 1 / direction.z;
  const tx1 = (minX - origin.x) * invX;
  const tx2 = (maxX - origin.x) * invX;
  const ty1 = (minY - origin.y) * invY;
  const ty2 = (maxY - origin.y) * invY;
  const tz1 = (minZ - origin.z) * invZ;
  const tz2 = (maxZ - origin.z) * invZ;
  const tmin = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2), Math.min(tz1, tz2));
  const tmax = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2), Math.max(tz1, tz2));
  if (tmax < 0 || tmin > tmax) return null;
  const distance = tmin >= 0 ? tmin : tmax;
  return distance >= 0 ? distance : null;
}

/** 身体体积是否与固体方块相交（脚底略抬高，避免踩进地板格） */
function overlapsSolidBlocks(
  wx: number,
  feetY: number,
  wz: number,
  isBlocked: (x: number, y: number, z: number) => boolean,
) {
  const minX = wx - MOVE_HALF;
  const maxX = wx + MOVE_HALF;
  const minY = feetY + 0.08;
  const maxY = feetY + 1.15;
  const minZ = wz - MOVE_HALF;
  const maxZ = wz + MOVE_HALF;
  for (let x = Math.floor(minX); x <= Math.floor(maxX - 1e-4); x += 1) {
    for (let y = Math.floor(minY); y <= Math.floor(maxY - 1e-4); y += 1) {
      for (let z = Math.floor(minZ); z <= Math.floor(maxZ - 1e-4); z += 1) {
        if (isBlocked(x, y, z)) return true;
      }
    }
  }
  return false;
}

/** 脚下是否有承托方块（feetY 为站立平面，对应方块顶面） */
function hasFloorSupport(
  wx: number,
  feetY: number,
  wz: number,
  isBlocked: (x: number, y: number, z: number) => boolean,
) {
  const sample = 0.28;
  const points: Array<[number, number]> = [
    [wx, wz],
    [wx - sample, wz],
    [wx + sample, wz],
    [wx, wz - sample],
    [wx, wz + sample],
  ];
  return points.some(([sx, sz]) => isBlocked(Math.floor(sx), feetY - 1, Math.floor(sz)));
}

function overlapsOtherNpc(
  wx: number,
  feetY: number,
  wz: number,
  selfIndex: number,
  npcs: NpcRuntime[],
) {
  const minX = wx - MOVE_HALF;
  const maxX = wx + MOVE_HALF;
  const minY = feetY;
  const maxY = feetY + COLLIDER_HEIGHT;
  const minZ = wz - MOVE_HALF;
  const maxZ = wz + MOVE_HALF;
  return npcs.some((npc, index) => {
    if (index === selfIndex) return false;
    return (
      maxX > npc.minX &&
      minX < npc.maxX &&
      maxY > npc.minY &&
      minY < npc.maxY &&
      maxZ > npc.minZ &&
      minZ < npc.maxZ
    );
  });
}

/** 随机落点是否可站立：有地面、不穿墙、不叠其它 NPC */
function canStandAt(
  wx: number,
  feetY: number,
  wz: number,
  selfIndex: number,
  npcs: NpcRuntime[],
  isBlocked: (x: number, y: number, z: number) => boolean,
) {
  if (!hasFloorSupport(wx, feetY, wz, isBlocked)) return false;
  if (overlapsSolidBlocks(wx, feetY, wz, isBlocked)) return false;
  if (overlapsOtherNpc(wx, feetY, wz, selfIndex, npcs)) return false;
  return true;
}

/** 在巡逻半径内随机挑可站立目标；失败返回 null */
function pickRandomWalkableTarget(
  motion: NpcMotion,
  selfIndex: number,
  npcs: NpcRuntime[],
  isBlocked: (x: number, y: number, z: number) => boolean,
  attempts = 14,
) {
  for (let tryIndex = 0; tryIndex < attempts; tryIndex += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = motion.roamRadius * (0.2 + Math.random() * 0.8);
    const x = motion.homeX + Math.cos(angle) * dist;
    const z = motion.homeZ + Math.sin(angle) * dist;
    if (canStandAt(x, motion.feetY, z, selfIndex, npcs, isBlocked)) return { x, z };
  }
  return null;
}

/**
 * 在场景中挂载全部 NPC 网格，并提供碰撞 / 占用 / 射线查询与自主运动。
 * 小方块几何只存在于此系统，不进入 BlockType 与热键栏。
 */
export function createWorldNpcSystem(scene: THREE.Scene): WorldNpcSystem {
  const motions: NpcMotion[] = [];
  const npcs: NpcRuntime[] = WORLD_NPCS.map((npc, index) => {
    const { group, motion: partMotion } = createNpcGroup(npc);
    scene.add(group);
    const homeX = npc.x + 0.5;
    const homeZ = npc.z + 0.5;
    const runtime: NpcRuntime = {
      id: npc.id,
      label: npc.label,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
      group,
    };
    syncCollider(runtime, homeX, npc.feetY, homeZ);

    motions.push({
      homeX,
      homeZ,
      feetY: npc.feetY,
      roamRadius: npc.roamRadius ?? 1.8,
      phase: index * 1.7 + 0.4,
      // 错开各 NPC 起步时间；真正目标在首次 update 时随机选取
      idleLeft: 0.4 + index * 0.35,
      targetX: homeX,
      targetZ: homeZ,
      walkSpeed: WALK_SPEED * (0.85 + (index % 3) * 0.08),
      facing: npc.yaw ?? 0,
      ...partMotion,
    });
    return runtime;
  });

  const assignNewTarget = (
    motion: NpcMotion,
    selfIndex: number,
    isBlocked: (x: number, y: number, z: number) => boolean,
  ) => {
    const next = pickRandomWalkableTarget(motion, selfIndex, npcs, isBlocked);
    if (!next) {
      // 暂时找不到路就再待机一会
      motion.idleLeft = 1.2 + Math.random() * 1.2;
      return;
    }
    motion.targetX = next.x;
    motion.targetZ = next.z;
  };

  const update = (delta: number, isBlocked: (x: number, y: number, z: number) => boolean) => {
    for (let index = 0; index < npcs.length; index += 1) {
      const runtime = npcs[index];
      const motion = motions[index];
      motion.phase += delta;
      const group = runtime.group;
      let moving = false;

      if (motion.idleLeft > 0) {
        motion.idleLeft -= delta;
        // 待机时轻微左右张望
        const look = Math.sin(motion.phase * 0.7) * 0.18;
        group.rotation.y = motion.facing + look;
        if (motion.idleLeft <= 0) assignNewTarget(motion, index, isBlocked);
      } else {
        const dx = motion.targetX - group.position.x;
        const dz = motion.targetZ - group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.08) {
          // 到达后停顿，再随机下一段
          motion.idleLeft = 1.2 + Math.random() * 2;
          motion.facing = group.rotation.y;
        } else {
          moving = true;
          const step = Math.min(dist, motion.walkSpeed * delta);
          const dirX = dx / dist;
          const dirZ = dz / dist;
          const nextX = group.position.x + dirX * step;
          const nextZ = group.position.z + dirZ * step;
          // 优先整体步进；受阻则轴向滑步；仍受阻则重选随机目标
          if (canStandAt(nextX, motion.feetY, nextZ, index, npcs, isBlocked)) {
            group.position.x = nextX;
            group.position.z = nextZ;
          } else if (canStandAt(nextX, motion.feetY, group.position.z, index, npcs, isBlocked)) {
            group.position.x = nextX;
          } else if (canStandAt(group.position.x, motion.feetY, nextZ, index, npcs, isBlocked)) {
            group.position.z = nextZ;
          } else {
            moving = false;
            motion.idleLeft = 0.35 + Math.random() * 0.5;
            assignNewTarget(motion, index, isBlocked);
          }
          motion.facing = Math.atan2(dirX, dirZ);
          let yawDelta = motion.facing - group.rotation.y;
          while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
          while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
          group.rotation.y += yawDelta * Math.min(1, delta * 6);
        }
      }

      // 身体轻颤 / 走路颠簸（只改本地 Y，碰撞盒用 feetY）
      const bob = moving
        ? Math.abs(Math.sin(motion.phase * 10)) * 0.035
        : Math.sin(motion.phase * 2.2) * 0.012;
      group.position.y = motion.feetY + bob;

      motion.legs.forEach((leg, legIndex) => {
        const swing = moving ? Math.sin(motion.phase * 10 + legIndex * 1.6) * 0.05 : 0;
        leg.position.y = motion.legBaseY[legIndex] + Math.max(0, swing);
      });
      motion.arms.forEach((arm, armIndex) => {
        const swing = moving
          ? Math.sin(motion.phase * 10 + armIndex * Math.PI) * 0.04
          : Math.sin(motion.phase * 1.4 + armIndex) * 0.012;
        arm.position.y = motion.armBaseY[armIndex] + swing;
      });
      motion.antenna.forEach((piece, pieceIndex) => {
        piece.position.y =
          motion.antennaBaseY[pieceIndex] + Math.sin(motion.phase * 3.5 + pieceIndex) * 0.015;
        piece.position.x = Math.sin(motion.phase * 2.8 + pieceIndex * 0.7) * 0.012;
      });
      motion.glows.forEach((glow, glowIndex) => {
        const material = glow.material as THREE.MeshLambertMaterial;
        material.emissiveIntensity = 0.35 + (Math.sin(motion.phase * 3 + glowIndex) * 0.5 + 0.5) * 0.45;
      });

      // 碰撞盒跟随水平位置（高度用固定 feetY，避免 bob 影响穿模判定抖动）
      syncCollider(runtime, group.position.x, motion.feetY, group.position.z);
    }
  };

  const collides = (
    position: THREE.Vector3,
    eyeHeight: number,
    playerHeight: number,
    radius: number,
  ) => {
    const pMinX = position.x - radius;
    const pMaxX = position.x + radius;
    const pMinY = position.y - eyeHeight;
    const pMaxY = position.y - eyeHeight + playerHeight;
    const pMinZ = position.z - radius;
    const pMaxZ = position.z + radius;
    return npcs.some(
      (npc) =>
        pMaxX > npc.minX &&
        pMinX < npc.maxX &&
        pMaxY > npc.minY &&
        pMinY < npc.maxY &&
        pMaxZ > npc.minZ &&
        pMinZ < npc.maxZ,
    );
  };

  const occupiesCell = (x: number, y: number, z: number) =>
    npcs.some((npc) =>
      aabbOverlapsCell(npc.minX, npc.maxX, npc.minY, npc.maxY, npc.minZ, npc.maxZ, x, y, z),
    );

  const raycast = (origin: THREE.Vector3, direction: THREE.Vector3, reach: number) => {
    let best: { label: string; distance: number } | null = null;
    for (const npc of npcs) {
      const distance = rayAabbDistance(
        origin,
        direction,
        npc.minX,
        npc.maxX,
        npc.minY,
        npc.maxY,
        npc.minZ,
        npc.maxZ,
      );
      if (distance === null || distance > reach) continue;
      if (!best || distance < best.distance) best = { label: npc.label, distance };
    }
    return best;
  };

  const dispose = () => {
    for (const npc of npcs) {
      scene.remove(npc.group);
      npc.group.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose());
        else object.material.dispose();
      });
    }
  };

  return { npcs, update, collides, occupiesCell, raycast, dispose };
}
