import { IconChatBubble } from "@pond/icons";
import { Button, Tooltip } from "@pond/ui";
import {
  libraryChrome,
  useRightPane,
} from "@/features/library/state/library-chrome";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";

export function AgentToggle() {
  const open = useRightPane() === "agent";

  return (
    <Tooltip label="Assistant" shortcut={<ShortcutKeys id="view.agent" />}>
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Assistant"
        aria-pressed={open}
        onClick={() => libraryChrome.setAgentOpen(true)}
      >
        <IconChatBubble />
      </Button>
    </Tooltip>
  );
}
