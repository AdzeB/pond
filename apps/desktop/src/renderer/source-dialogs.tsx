import { Dialog, Tooltip } from "@pond/ui";
import { MotionConfig } from "motion/react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
import { previewStep } from "./src/dev/source-dialogs/catalog";
import { installFixtures } from "./src/dev/source-dialogs/fixtures";
import { SourceDialogsPage } from "./src/dev/source-dialogs/page";
import { SchedulePreview } from "./src/dev/source-dialogs/schedule-preview";
import { SourceFlowHost } from "./src/features/sources/components/flow/flow";
import { connectFlow } from "./src/features/sources/state/connect-flow";
import { sourceDetail } from "./src/features/sources/state/source-detail";
import { sourceFlow } from "./src/features/sources/state/source-flow";
import "./src/styles.css";

const params = new URLSearchParams(window.location.search);
const schedulePreview = params.get("preview") === "fetch-schedule";
const preview = !schedulePreview && params.has("preview");
if (preview) {
  const fixtures = installFixtures(params.get("state") === "failed");
  const step = previewStep(params.get("preview"));
  sourceDetail.openAccount("sample-account");
  sourceDetail.openWatch("sample-watch");
  if (step === "connect-wait") {
    const messageSchema = z.object({
      type: z.literal("pond-preview-connection-state"),
      state: z.enum(["waiting", "connected", "failed"]),
    });
    window.addEventListener("message", (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent
      )
        return;
      const message = messageSchema.safeParse(event.data);
      if (!message.success) return;
      fixtures.setConnectionFailed(message.data.state === "failed");
      connectFlow.start("twitter", []);
      if (message.data.state === "connected") connectFlow.complete();
    });
    connectFlow.start("twitter", []);
    if (params.get("state") === "connected") connectFlow.complete();
  }
  if (step.startsWith("account-")) {
    sourceFlow.open("account-detail");
    if (step !== "account-detail") sourceFlow.push(step);
  } else if (
    ["watch-detail", "watch-profile", "watch-options"].includes(step)
  ) {
    sourceFlow.open("watch-detail");
    if (step !== "watch-detail") sourceFlow.push(step);
  } else {
    sourceFlow.open(step);
  }
}
const container = document.getElementById("root");
if (!container) throw new Error("Missing source dialog gallery root.");
createRoot(container).render(
  <MotionConfig reducedMotion="user">
    <Tooltip.Provider>
      {schedulePreview ? (
        <SchedulePreview />
      ) : preview ? (
        <>
          <SourceFlowHost />
          <Dialog.Host />
        </>
      ) : (
        <SourceDialogsPage />
      )}
    </Tooltip.Provider>
  </MotionConfig>,
);
