import { Menu, useToast } from "@pond/ui";
import { useParams, useRouter } from "@tanstack/react-router";
import { Ellipsis, Folder, Globe, RefreshCw, Trash } from "lucide-react";
import { useCallback } from "react";
import { SavePreview } from "@/components/save/preview";
import {
  humaniseRefreshReason,
  REVEAL_LABEL,
} from "@/components/save/preview/helpers";
import { Aside } from "@/components/shell/aside";
import { useTrackVisit } from "@/lib/recents";
import { useInspector } from "@/lib/shell-state";
import { optimistic } from "@/pool/bootstrap";
import { useSave } from "@/pool/hooks";
import { pool } from "@/pool/pool";
import styles from "./styles.module.css";

export function Inspector() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const save = useSave(id);
  const { open } = useInspector();

  useTrackVisit(id);

  return (
    <Aside side="right" open={open}>
      <aside id="inspector-pane" aria-label="Inspector" className={styles.pane}>
        <div className={styles.toolbar}>
          {save ? <KebabMenu save={save} /> : null}
        </div>
        <div className={styles.body}>
          {save ? (
            <SavePreview save={save} />
          ) : id ? (
            <p className={styles.empty}>Save not found.</p>
          ) : (
            <p className={styles.empty}>No save selected.</p>
          )}
        </div>
      </aside>
    </Aside>
  );
}

function KebabMenu({ save }: { save: ReturnType<typeof useSave> | null }) {
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
          title: "Metadata refreshed",
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
    const prev = pool.get(save.id);
    if (!prev) return;
    const now = Date.now();
    await optimistic(
      () => {
        pool.upsert({ ...prev, deletedAt: now } as typeof prev);
      },
      () => {
        pool.upsert(prev);
      },
      async () => window.pond.tx({ kind: "trash", model: "save", id: save.id }),
    );
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
