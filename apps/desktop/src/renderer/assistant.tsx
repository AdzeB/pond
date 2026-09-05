import { MotionConfig } from "motion/react";
import { createRoot } from "react-dom/client";
import { AssistantLab } from "./src/dev/assistant/assistant";
import "./src/styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing Assistant Lab root.");

createRoot(container).render(
  <MotionConfig reducedMotion="user">
    <AssistantLab onExit={() => window.history.back()} />
  </MotionConfig>,
);
