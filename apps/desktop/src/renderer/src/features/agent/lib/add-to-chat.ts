import { fishPath } from "@/features/fish";
import { getAppRouter } from "@/shared/lib/app-router";

/** The Assistant runtime pulls in the AI SDK; menus load at launch, so import it on use. */
export function addSavesToChat(ids: readonly string[]): void {
  if (!ids.length) return;
  void import("@/features/agent/state/assistant").then(({ assistant }) => {
    const fishId = assistant.fishId();
    assistant.selectFish(fishId);
    getAppRouter()?.history.push(fishPath(fishId));
    return assistant.attachIds([...ids]);
  });
}
