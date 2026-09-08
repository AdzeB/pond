import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { createRoot } from "react-dom/client";
import { ProviderSettingsPreview } from "./src/dev/provider-settings/preview";
import "./src/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing provider settings preview root.");
createRoot(root).render(
  <QueryClientProvider client={new QueryClient()}>
    <MotionConfig reducedMotion="user">
      <ProviderSettingsPreview />
    </MotionConfig>
  </QueryClientProvider>,
);
