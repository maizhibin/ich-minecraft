import type { Metadata } from "next";
import { VoxelGame } from "./voxel-game";

export const metadata: Metadata = {
  title: "Intangible Cultural Heritage Blocklands",
  description: "一座可以探索、建造与体验的 3D 像素方块世界。",
};

export default function Home() {
  return <VoxelGame />;
}
