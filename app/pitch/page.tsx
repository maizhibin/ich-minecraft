import type { Metadata } from "next";
import { PitchDeck } from "./pitch-deck";
import "./pitch.css";

export const metadata: Metadata = {
  title: "DTCoder Blocklands｜项目路演",
  description: "让非遗知识、工序与传承进入体素沙盒玩法。",
};

export default function PitchPage() {
  return <PitchDeck />;
}
