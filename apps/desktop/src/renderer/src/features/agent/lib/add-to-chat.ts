import { libraryChrome } from "@/features/library";

/** The Assistant runtime pulls in the AI SDK; menus load at launch, so import it on use. */
export function addSavesToChat(ids: readonly string[]): void {
  if (!ids.length) return;
  libraryChrome.setAgentOpen(true);
  void import("@/features/agent/state/assistant").then(({ assistant }) =>
    assistant.attachIds([...ids]),
  );
}
