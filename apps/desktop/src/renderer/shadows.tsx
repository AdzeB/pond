import { Tooltip } from "@pond/ui";
import { MotionConfig } from "motion/react";
import { createRoot } from "react-dom/client";
import { ShadowsGallery } from "./src/dev/shadows";
import "./src/styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing shadow gallery root.");
createRoot(container).render(
  <MotionConfig reducedMotion="user">
    <Tooltip.Provider>
      <ShadowsGallery layout="page" />
    </Tooltip.Provider>
  </MotionConfig>,
);
