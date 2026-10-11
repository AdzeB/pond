import { IconPaperclip } from "@pond/icons";
import { Button, Tooltip } from "@pond/ui";
import type { AssistantFileAttachment } from "@shared/assistant";
import { useState } from "react";
import { errorCopy } from "@/shared/lib/error-copy";
import { notify } from "@/shared/lib/toast";

interface AttachFilesButtonProps {
  disabled?: boolean;
  onAttach: (files: AssistantFileAttachment[]) => void | Promise<void>;
}

export function AttachFilesButton({
  disabled = false,
  onAttach,
}: AttachFilesButtonProps) {
  const [busy, setBusy] = useState(false);

  async function pickFiles() {
    setBusy(true);
    try {
      const picked = await window.pond.query("agent.pickAttachments", {});
      if (!picked.ok) throw new Error(picked.error);
      if (picked.files.length === 0) return;
      await onAttach(picked.files);
    } catch (error) {
      notify({
        id: "agent-attach-files",
        title: "Could not attach files",
        description: errorCopy(error, "Try again."),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tooltip label="Attach Files" side="top">
      <Button
        icon
        size="xs"
        variant="ghost"
        aria-label="Attach Files"
        aria-busy={busy || undefined}
        disabled={disabled || busy}
        onClick={() => void pickFiles()}
      >
        <IconPaperclip />
      </Button>
    </Tooltip>
  );
}
