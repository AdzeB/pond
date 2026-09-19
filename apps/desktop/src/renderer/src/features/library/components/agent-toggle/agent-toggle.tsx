import { IconChatBubblePenOutline18 } from "@pond/icons/outline/18";
import { Button, Tooltip } from "@pond/ui";
import {
  libraryChrome,
  useRightPane,
} from "@/features/library/state/library-chrome";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";

export function AgentToggle() {
  const open = useRightPane() === "agent";

  return (
    <Tooltip label="Agent" shortcut={<ShortcutKeys id="view.agent" />}>
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Agent"
        aria-pressed={open}
        onClick={() => libraryChrome.setAgentOpen(true)}
      >
        <IconChatBubblePenOutline18 />
      </Button>
    </Tooltip>
  );
}
