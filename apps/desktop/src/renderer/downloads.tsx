import { Dialog, Tooltip } from "@pond/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { createRoot } from "react-dom/client";
import { DownloadPreview } from "./src/dev/downloads/preview";
import { installDownloadPreview } from "./src/dev/downloads/preview-fixtures";
import "./src/styles.css";

installDownloadPreview();
const root = document.getElementById("root");
if (!root) throw new Error("Missing downloads preview root.");
createRoot(root).render(
  <QueryClientProvider client={new QueryClient()}>
    <MotionConfig reducedMotion="user">
      <Tooltip.Provider>
        <DownloadPreview />
        <Dialog.Host />
      </Tooltip.Provider>
    </MotionConfig>
  </QueryClientProvider>,
);
