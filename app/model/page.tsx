import type { Metadata } from "next";
import ModelExplorer from "./ModelExplorer";
import snapshot from "./snapshot.json";
import "./model.css";

export const metadata: Metadata = {
  title: "Texas model · Meridian",
  description:
    "Meridian's Texas research model: forecast, model internals, and software architecture.",
};

export default function Page() {
  return <ModelExplorer snapshot={snapshot} />;
}
