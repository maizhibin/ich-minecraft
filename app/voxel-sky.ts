// 体素世界天空：渐变穹顶 + 飘动白云。独立于区块/碰撞逻辑，仅挂到 Three.js 场景。

import * as THREE from "three";

/** 天空顶色（深蓝） */
export const SKY_ZENITH = 0x5eb8e0;
/** 地平线色（浅蓝），与雾色对齐 */
export const SKY_HORIZON = 0xb8e4f5;
/** 雾与 CSS 外壳共用色（地平线浅色） */
export const SKY_FOG = SKY_HORIZON;

const DOME_RADIUS = 90;
const CLOUD_COUNT = 12;
const CLOUD_DRIFT_SPEED = 1.8;

export type VoxelSky = {
  update: (camera: THREE.Camera, delta: number) => void;
  dispose: () => void;
};

/** 用 Canvas 画垂直渐变，作为穹顶贴图（上深蓝 → 下浅蓝） */
function createSkyGradientTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建天空渐变纹理");

  const gradient = context.createLinearGradient(0, 0, 0, size);
  // v=0 在球顶，v=1 在球底；贴图上 y=0 为顶色
  gradient.addColorStop(0, "#5eb8e0");
  gradient.addColorStop(0.45, "#7ec8e8");
  gradient.addColorStop(0.78, "#b8e4f5");
  gradient.addColorStop(1, "#d2eff8");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 2, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** 软边白云团纹理（透明 PNG 风格） */
function createCloudTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建云纹理");

  context.clearRect(0, 0, size, size);
  // 多层径向渐变叠成蓬松云团
  const blobs = [
    { x: 0.42, y: 0.55, r: 0.28, a: 0.85 },
    { x: 0.58, y: 0.52, r: 0.3, a: 0.8 },
    { x: 0.5, y: 0.42, r: 0.26, a: 0.75 },
    { x: 0.32, y: 0.5, r: 0.22, a: 0.7 },
    { x: 0.68, y: 0.5, r: 0.24, a: 0.7 },
  ];
  for (const blob of blobs) {
    const cx = blob.x * size;
    const cy = blob.y * size;
    const radius = blob.r * size;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, `rgba(255,255,255,${blob.a})`);
    gradient.addColorStop(0.55, `rgba(248,252,255,${blob.a * 0.55})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

type CloudState = {
  mesh: THREE.Mesh;
  /** 相对相机中心的本地偏移（XZ） */
  localX: number;
  localZ: number;
  y: number;
  drift: number;
};

/**
 * 在场景中挂载渐变天空穹顶与飘动白云。
 * 调用方负责在每帧 render 前 update，并在卸载时 dispose。
 */
export function createVoxelSky(scene: THREE.Scene): VoxelSky {
  // 背景与雾取地平线色，穹顶负责上方蓝色层次
  scene.background = new THREE.Color(SKY_HORIZON);
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.setHex(SKY_FOG);
  }

  const skyTexture = createSkyGradientTexture();
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 24, 16), skyMaterial);
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = -20;
  scene.add(skyMesh);

  const cloudTexture = createCloudTexture();
  const cloudMaterial = new THREE.MeshBasicMaterial({
    map: cloudTexture,
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    opacity: 0.92,
  });

  const cloudRoot = new THREE.Group();
  cloudRoot.renderOrder = -10;
  scene.add(cloudRoot);

  const clouds: CloudState[] = [];
  for (let index = 0; index < CLOUD_COUNT; index += 1) {
    // 用确定性偏移铺满周围天穹，避免随机导致每次加载布局不同
    const angle = (index / CLOUD_COUNT) * Math.PI * 2 + index * 0.37;
    const radius = 38 + (index % 5) * 7;
    const localX = Math.cos(angle) * radius;
    const localZ = Math.sin(angle) * radius;
    const y = 28 + (index % 4) * 4.5;
    const scale = 10 + (index % 3) * 4;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scale * 1.8, scale * 0.7), cloudMaterial);
    mesh.position.set(localX, y, localZ);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    cloudRoot.add(mesh);
    clouds.push({
      mesh,
      localX,
      localZ,
      y,
      drift: 0.35 + (index % 4) * 0.12,
    });
  }

  let windOffset = 0;

  const update = (camera: THREE.Camera, delta: number) => {
    // 穹顶跟随相机，始终像“无限远”的天空
    skyMesh.position.copy(camera.position);

    windOffset += delta * CLOUD_DRIFT_SPEED;
    for (const cloud of clouds) {
      cloud.localX += cloud.drift * delta * CLOUD_DRIFT_SPEED;
      // 飘出范围后从另一侧循环回来
      if (cloud.localX > 70) cloud.localX -= 140;
      cloud.mesh.position.set(
        camera.position.x + cloud.localX + Math.sin(windOffset * 0.15 + cloud.y) * 1.2,
        camera.position.y * 0.15 + cloud.y,
        camera.position.z + cloud.localZ,
      );
      // 扁平面朝向相机，保持云朵 billboard 观感
      cloud.mesh.lookAt(camera.position.x, cloud.mesh.position.y, camera.position.z);
    }
  };

  const dispose = () => {
    scene.remove(skyMesh);
    scene.remove(cloudRoot);
    skyMesh.geometry.dispose();
    skyMaterial.dispose();
    skyTexture.dispose();
    cloudMaterial.dispose();
    cloudTexture.dispose();
    clouds.forEach((cloud) => cloud.mesh.geometry.dispose());
  };

  return { update, dispose };
}
