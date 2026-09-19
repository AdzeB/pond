import { assistant } from "@/features/agent/state/assistant";
import { libraryChrome } from "@/features/library/state/library-chrome";

export function addSavesToChat(ids: readonly string[]): void {
  if (!ids.length) return;
  libraryChrome.setAgentOpen(true);
  void assistant.attachIds([...ids]);
}
