import {
  IconDotsOutline18 as Ellipsis,
  IconFolder5Outline18 as Folder,
  IconGlobe2Outline18 as Globe,
  IconRefreshClockwiseOutline18 as RefreshCw,
  IconTrashOutline18 as Trash,
} from "@pond/icons/outline/18";
import { Menu, useToast } from "@pond/ui";
import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { humaniseRefreshReason } from "@/components/save-preview/helpers";
import type { useSave } from "@/hooks/use-saves";
import { trashSave } from "@/lib/mutate-save";
import { REVEAL_LABEL } from "@/lib/platform";

export function KebabMenu({
  save,
}: {
  save: ReturnType<typeof useSave> | null;
}) {
  const router = useRouter();
  const toast = useToast();

  const hasUrl = !!save?.url;
  const hasLocalFile = (save?.files ?? []).length > 0;

  const onOpenOriginal = useCallback(() => {
    if (!save?.url) return;
    void window.pond.openExternal(save.url);
  }, [save?.url]);

  const onReveal = useCallback(() => {
    if (!save || !hasLocalFile) return;
    void window.pond.revealSave(save.id);
  }, [save, hasLocalFile]);

  const onRefresh = useCallback(async () => {
    if (!save?.url) return;
    try {
      const res = await window.pond.refreshSave(save.id);
      if (res.ok) {
        toast.add({
          title: "Details refreshed",
          type: "success",
          description:
            res.method === "og"
              ? "Pulled fresh OpenGraph data from the source."
              : "Re-scraped via signed-in session.",
        });
        return;
      }
      toast.add({
        title: "Refresh failed",
        type: "error",
        description: humaniseRefreshReason(res.reason),
      });
    } catch (err) {
      toast.add({
        title: "Refresh failed",
        type: "error",
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, [save?.id, save?.url, toast]);

  const onDelete = useCallback(async () => {
    if (!save) return;
    await trashSave(save.id);
    toast.add({ title: "Moved to trash", type: "success" });
    router.history.back();
  }, [save, toast, router]);

  return (
    <Menu.Root>
      <Menu.Trigger>
        <Ellipsis width={14} height={14} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={6}>
          <Menu.Popup>
            <Menu.Item disabled={!hasUrl} onClick={onOpenOriginal}>
              <Menu.ItemIcon>
                <Globe width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Open Original</Menu.ItemLabel>
            </Menu.Item>
            <Menu.Item disabled={!hasLocalFile} onClick={onReveal}>
              <Menu.ItemIcon>
                <Folder width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>{REVEAL_LABEL}</Menu.ItemLabel>
            </Menu.Item>
            <Menu.Item disabled={!hasUrl} onClick={onRefresh}>
              <Menu.ItemIcon>
                <RefreshCw width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Refresh</Menu.ItemLabel>
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item disabled={!save} onClick={onDelete}>
              <Menu.ItemIcon>
                <Trash width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Move to Trash</Menu.ItemLabel>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
