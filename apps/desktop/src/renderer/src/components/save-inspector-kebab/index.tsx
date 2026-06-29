import {
  IconDotsOutline18 as Ellipsis,
  IconFolder5Outline18 as Folder,
  IconGlobe2Outline18 as Globe,
  IconRefreshClockwiseOutline18 as RefreshCw,
  IconTagsOutline18 as Tags,
  IconTrashOutline18 as Trash,
} from "@pond/icons/outline/18";
import { Menu } from "@pond/ui";
import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import type { useSave } from "@/hooks/use-saves";
import {
  autoTag,
  rebuildVisualIndex,
  recaption,
  reembed,
  reocr,
  retranscribe,
  type TaskResult,
} from "@/lib/enrichment/tasks";
import { trashSave } from "@/lib/save/mutate";
import { REVEAL_LABEL } from "@/lib/ui/platform";
import { pushToast } from "@/stores/toasts";

export function KebabMenu({
  save,
}: {
  save: ReturnType<typeof useSave> | null;
}) {
  const router = useRouter();

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
    await window.pond.refreshSave(save.id);
  }, [save?.id, save?.url]);

  const onDelete = useCallback(async () => {
    if (!save) return;
    await trashSave(save.id);
    router.history.back();
  }, [save, router]);

  const reprocess = useCallback(
    (run: (ids?: readonly string[]) => TaskResult) => {
      if (!save) return;
      const res = run([save.id]);
      pushToast(res.message, res.ok ? "info" : "error");
    },
    [save],
  );

  const onAutoTag = useCallback(async () => {
    if (!save) return;
    const res = await autoTag([save.id]);
    pushToast(res.message, res.ok ? "success" : "error");
  }, [save]);

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
            <Menu.Item disabled={!save} onClick={() => void onAutoTag()}>
              <Menu.ItemIcon>
                <Tags width={14} height={14} />
              </Menu.ItemIcon>
              <Menu.ItemLabel>Apply suggested tags</Menu.ItemLabel>
            </Menu.Item>
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger disabled={!save}>
                <Menu.ItemIcon>
                  <RefreshCw width={14} height={14} />
                </Menu.ItemIcon>
                <Menu.ItemLabel>Reprocess</Menu.ItemLabel>
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.Item onClick={() => reprocess(recaption)}>
                      <Menu.ItemLabel>Regenerate caption</Menu.ItemLabel>
                    </Menu.Item>
                    <Menu.Item onClick={() => reprocess(reocr)}>
                      <Menu.ItemLabel>Re-run text recognition</Menu.ItemLabel>
                    </Menu.Item>
                    <Menu.Item onClick={() => reprocess(retranscribe)}>
                      <Menu.ItemLabel>Transcribe again</Menu.ItemLabel>
                    </Menu.Item>
                    <Menu.Separator />
                    <Menu.Item onClick={() => reprocess(reembed)}>
                      <Menu.ItemLabel>Rebuild semantic index</Menu.ItemLabel>
                    </Menu.Item>
                    <Menu.Item onClick={() => reprocess(rebuildVisualIndex)}>
                      <Menu.ItemLabel>Rebuild visual index</Menu.ItemLabel>
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
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
