import type { Metadata } from "next";
import ModelExplorer from "./ModelExplorer";
import "./model.css";

export const metadata: Metadata = {
  title: "Zenith · Meridian",
  description:
    "Zenith is Meridian's probabilistic Texas grid-tightness research model, benchmarked across 1,096 historical forecast origins.",
};

export default function Page() {
  return <ModelExplorer />;
}
