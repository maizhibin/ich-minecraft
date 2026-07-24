import type { Metadata } from "next";
import { PitchDeck } from "./pitch-deck";
import "./pitch.css";

export const metadata: Metadata = {
  title: "DTCoder Blocklands｜项目路演",
  // 路演摘要：七项工坊 + 孩子视角叙事
  description: "用孩子的视角走进七座非遗工坊：动手学工序，看见世界因学习而长大。",
};

export default function PitchPage() {
  return <PitchDeck />;
}
