"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

type BlockType = "grass" | "dirt" | "stone" | "sand" | "letter";
type Block = { x: number; y: number; z: number; type: BlockType };

const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 2;
const WORLD_RADIUS = 48;
const EYE_HEIGHT = 1.62;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.32;
const REACH = 7;
const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;
const chunkOf = (value: number) => Math.floor(value / CHUNK_SIZE);

const BLOCK_COLORS: Record<BlockType, number> = {
  grass: 0x7fa83b,
  dirt: 0x8a5b36,
  stone: 0x768087,
  sand: 0xd7bc71,
  letter: 0x292932,
};

const LETTERS: Record<string, string[]> = {
  C: ["1111", "1000", "1000", "1000", "1111"],
  O: ["1111", "1001", "1001", "1001", "1111"],
  Z: ["1111", "0010", "0100", "1000", "1111"],
  E: ["1111", "1000", "1110", "1000", "1111"],
};

function terrainHeight(x: number, z: number) {
  if (Math.abs(x) <= 15 && Math.abs(z) <= 15) return 3;
  const wave = Math.sin(x * 0.19) * 1.25 + Math.cos(z * 0.17) * 1.1;
  const detail = Math.sin((x + z) * 0.41) * 0.65;
  return Math.max(2, Math.min(7, Math.round(4 + wave + detail)));
}

function createWorld() {
  const blocks = new Map<string, BlockType>();
  for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x += 1) {
    for (let z = -WORLD_RADIUS; z <= WORLD_RADIUS; z += 1) {
      const height = terrainHeight(x, z);
      for (let y = 0; y <= height; y += 1) {
        const centralSand = Math.abs(x) <= 15 && Math.abs(z) <= 15;
        const type: BlockType =
          y === height ? (centralSand ? "sand" : "grass") : y < height - 2 ? "stone" : "dirt";
        blocks.set(keyOf(x, y, z), type);
      }
    }
  }

  // 在玩家出生点正前方（北侧）竖立 COZE 像素字墙。
  let cursor = -11;
  for (const letter of "COZE") {
    const bitmap = LETTERS[letter];
    bitmap.forEach((row, rowIndex) => {
      [...row].forEach((pixel, columnIndex) => {
        if (pixel === "1") blocks.set(keyOf(cursor + columnIndex, 5 + (4 - rowIndex), -10), "letter");
      });
    });
    cursor += 5;
  }
  return blocks;
}

function hasCollision(blocks: Map<string, BlockType>, position: THREE.Vector3) {
  const minX = Math.floor(position.x - PLAYER_RADIUS);
  const maxX = Math.floor(position.x + PLAYER_RADIUS);
  const minY = Math.floor(position.y - EYE_HEIGHT);
  const maxY = Math.floor(position.y - EYE_HEIGHT + PLAYER_HEIGHT);
  const minZ = Math.floor(position.z - PLAYER_RADIUS);
  const maxZ = Math.floor(position.z + PLAYER_RADIUS);
  for (let x = minX; x <= maxX; x += 1)
    for (let y = minY; y <= maxY; y += 1)
      for (let z = minZ; z <= maxZ; z += 1)
        if (blocks.has(keyOf(x, y, z))) return true;
  return false;
}

export function VoxelGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [selected, setSelected] = useState<BlockType>("grass");
  const [status, setStatus] = useState("点击进入世界");
  const selectedRef = useRef<BlockType>("grass");
  const startRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ed6eb);
    scene.fog = new THREE.Fog(0x9ed6eb, 30, 72);
    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 90);
    camera.position.set(0, 5 + EYE_HEIGHT, 12);
    camera.lookAt(0, 6, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xdff5ff, 0x5f6743, 2.1));
    const sun = new THREE.DirectionalLight(0xfff2cf, 2.2);
    sun.position.set(24, 35, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = 0.75;
    let active = false;
    const blocks = createWorld();
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const materials = Object.fromEntries(
      (Object.keys(BLOCK_COLORS) as BlockType[]).map((type) => [
        type,
        new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[type] }),
      ]),
    ) as Record<BlockType, THREE.MeshLambertMaterial>;
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);
    let interactiveMeshes: THREE.InstancedMesh[] = [];
    const meshBlocks = new Map<THREE.InstancedMesh, Block[]>();
    let lastChunk = "";

    const rebuildVisibleChunks = (force = false) => {
      const centerX = chunkOf(camera.position.x);
      const centerZ = chunkOf(camera.position.z);
      const chunkKey = `${centerX},${centerZ}`;
      if (!force && chunkKey === lastChunk) return;
      lastChunk = chunkKey;
      worldGroup.clear();
      interactiveMeshes = [];
      meshBlocks.clear();
      const visible = new Map<BlockType, Block[]>();
      (Object.keys(BLOCK_COLORS) as BlockType[]).forEach((type) => visible.set(type, []));

      blocks.forEach((type, positionKey) => {
        const [x, y, z] = positionKey.split(",").map(Number);
        if (
          Math.abs(chunkOf(x) - centerX) <= RENDER_DISTANCE &&
          Math.abs(chunkOf(z) - centerZ) <= RENDER_DISTANCE
        ) {
          visible.get(type)?.push({ x, y, z, type });
        }
      });

      const matrix = new THREE.Matrix4();
      visible.forEach((items, type) => {
        if (!items.length) return;
        const mesh = new THREE.InstancedMesh(cubeGeometry, materials[type], items.length);
        items.forEach((block, index) => {
          matrix.makeTranslation(block.x, block.y, block.z);
          mesh.setMatrixAt(index, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.castShadow = type === "letter";
        mesh.receiveShadow = true;
        worldGroup.add(mesh);
        interactiveMeshes.push(mesh);
        meshBlocks.set(mesh, items);
      });
    };
    rebuildVisibleChunks(true);

    // 第一人称可见的像素手臂，让角色的立方体造型仍有明确存在感。
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.72, 0.28),
      new THREE.MeshLambertMaterial({ color: 0xd39b72 }),
    );
    hand.position.set(0.55, -0.52, -0.85);
    hand.rotation.set(-0.35, 0, -0.2);
    camera.add(hand);
    scene.add(camera);

    const raycaster = new THREE.Raycaster();
    raycaster.far = REACH;
    const center = new THREE.Vector2(0, 0);
    const interact = (place: boolean) => {
      raycaster.setFromCamera(center, camera);
      const hit = raycaster.intersectObjects(interactiveMeshes, false)[0];
      if (!hit || hit.instanceId === undefined || !hit.face) return;
      const source = meshBlocks.get(hit.object as THREE.InstancedMesh)?.[hit.instanceId];
      if (!source) return;
      if (place) {
        const normal = hit.face.normal;
        const target = {
          x: source.x + Math.round(normal.x),
          y: source.y + Math.round(normal.y),
          z: source.z + Math.round(normal.z),
        };
        const targetKey = keyOf(target.x, target.y, target.z);
        if (blocks.has(targetKey)) return;
        blocks.set(targetKey, selectedRef.current);
        if (hasCollision(blocks, camera.position)) blocks.delete(targetKey);
      } else if (source.y > 0) {
        blocks.delete(keyOf(source.x, source.y, source.z));
      }
      rebuildVisibleChunks(true);
      hand.rotation.x = -0.7;
      window.setTimeout(() => (hand.rotation.x = -0.35), 90);
    };

    const keys = new Set<string>();
    const velocity = new THREE.Vector3();
    let grounded = false;
    const onKeyDown = (event: KeyboardEvent) => {
      keys.add(event.code);
      if (event.code === "Space" && grounded) velocity.y = 7.2;
      if (event.code.startsWith("Digit")) {
        const types: BlockType[] = ["grass", "dirt", "stone", "sand"];
        const next = types[Number(event.code.at(-1)) - 1];
        if (next) setSelected(next);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onMouseDown = (event: MouseEvent) => {
      if (!controls.isLocked) return;
      event.preventDefault();
      interact(event.button === 0);
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();
    const onLock = () => {
      active = true;
      setStarted(true);
      setStatus("WASD 移动 · 空格跳跃");
    };
    const onUnlock = () => {
      active = false;
      setStarted(false);
      setStatus("已暂停 · 点击继续");
    };
    controls.addEventListener("lock", onLock);
    controls.addEventListener("unlock", onUnlock);
    startRef.current = () => {
      if (matchMedia("(pointer: coarse)").matches) {
        active = true;
        setStarted(true);
        setStatus("左侧移动 · 右侧观察");
      } else controls.lock();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);

    const touchMove = new THREE.Vector2();
    let moveTouch: number | null = null;
    let lookTouch: number | null = null;
    const moveOrigin = new THREE.Vector2();
    const lookPrevious = new THREE.Vector2();
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
          const yaw = (touch.clientX - lookPrevious.x) * 0.004;
          const pitch = (touch.clientY - lookPrevious.y) * 0.004;
          camera.rotation.order = "YXZ";
          camera.rotation.y -= yaw;
          camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - pitch, -1.48, 1.48);
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
      if (action === "jump" && grounded) velocity.y = 7.2;
      else interact(action === "place");
    };
    window.addEventListener("voxel-action", handleAction);

    const clock = new THREE.Clock();
    let animationFrame = 0;
    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      if (active || controls.isLocked) {
        const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS")) - touchMove.y;
        const strafe = Number(keys.has("KeyD")) - Number(keys.has("KeyA")) + touchMove.x;
        const direction = new THREE.Vector3(strafe, 0, -forward);
        if (direction.lengthSq() > 1) direction.normalize();
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);
        const previous = camera.position.clone();
        camera.position.x += direction.x * 5.4 * delta;
        if (hasCollision(blocks, camera.position)) camera.position.x = previous.x;
        camera.position.z += direction.z * 5.4 * delta;
        if (hasCollision(blocks, camera.position)) camera.position.z = previous.z;
        velocity.y -= 19 * delta;
        camera.position.y += velocity.y * delta;
        if (hasCollision(blocks, camera.position)) {
          camera.position.y -= velocity.y * delta;
          grounded = velocity.y < 0;
          velocity.y = 0;
        } else grounded = false;
        if (camera.position.y < -8) {
          camera.position.set(0, 5 + EYE_HEIGHT, 12);
          velocity.set(0, 0, 0);
        }
        rebuildVisibleChunks();
      }
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (renderer.domElement.width !== Math.floor(width * renderer.getPixelRatio()) ||
          renderer.domElement.height !== Math.floor(height * renderer.getPixelRatio())) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      controls.disconnect();
      renderer.dispose();
      cubeGeometry.dispose();
      Object.values(materials).forEach((material) => material.dispose());
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("voxel-action", handleAction);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const action = (type: "place" | "break" | "jump") =>
    window.dispatchEvent(new CustomEvent("voxel-action", { detail: type }));

  const palette: Array<{ type: BlockType; label: string }> = [
    { type: "grass", label: "草" },
    { type: "dirt", label: "土" },
    { type: "stone", label: "石" },
    { type: "sand", label: "沙" },
  ];

  return (
    <main className="game-shell">
      <div ref={mountRef} className="game-canvas" aria-label="COZE 3D 方块世界" />
      <header className="hud-top">
        <div className="brand"><span className="brand-mark">C</span><span>COZE BLOCKLANDS</span></div>
        <div className="status"><span className="status-dot" />{status}</div>
      </header>
      <div className="crosshair" aria-hidden="true"><i /><i /></div>
      {!started && (
        <button className="start-card" onClick={() => startRef.current()}>
          <span className="eyebrow">随机体素世界</span>
          <strong>进入方块世界</strong>
          <small>寻找沙地尽头的 COZE 方块墙</small>
          <span className="start-cta">点击开始探索 <b>→</b></span>
        </button>
      )}
      <div className="control-hint">
        <span><kbd>WASD</kbd> 移动</span><span><kbd>SPACE</kbd> 跳跃</span>
        <span><kbd>左键</kbd> 放置</span><span><kbd>右键</kbd> 破坏</span>
      </div>
      <nav className="hotbar" aria-label="选择方块">
        {palette.map(({ type, label }, index) => (
          <button
            key={type}
            className={selected === type ? "active" : ""}
            onClick={() => setSelected(type)}
            aria-label={`选择${label}方块`}
          >
            <span className={`block-swatch ${type}`} /><small>{index + 1}</small>
          </button>
        ))}
      </nav>
      <div className="mobile-actions">
        <button onPointerDown={() => action("jump")}>跳</button>
        <button onPointerDown={() => action("break")}>破坏</button>
        <button className="place" onPointerDown={() => action("place")}>放置</button>
      </div>
      <div className="touch-zone left">移动</div><div className="touch-zone right">观察</div>
    </main>
  );
}
