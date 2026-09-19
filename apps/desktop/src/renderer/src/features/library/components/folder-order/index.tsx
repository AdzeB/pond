import { EMPTY_QUERY } from "@pond/schema/filters/types";
import { Button, Dialog } from "@pond/ui";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { saveFolderPresentation } from "@/features/library/state/folder-presentation";
import {
  folderPresentationSnapshot,
  setSort,
} from "@/features/library/state/view-store";
import { useSave } from "@/features/saves/hooks/use-saves";
import { ensureSaves } from "@/features/saves/lib/ensure-saves";
import { moveOrderedItem } from "./order";
import styles from "./styles.module.css";

export function FolderOrderDialog({
  folderId,
  folderIds,
  onClose,
}: {
  folderId: string;
  folderIds: string[];
  onClose: () => void;
}) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  useEffect(() => {
    let current = true;
    void window.pond
      .query("saves.queryIds", {
        query: EMPTY_QUERY,
        scope: { folderIds },
        sortKey: "manual",
        sortDir: "asc",
        orderFolderId: folderId,
      })
      .then(({ ids }) => {
        if (current) setOrder(ids);
      })
      .catch((error) => {
        if (current)
          setError(
            error instanceof Error
              ? error.message
              : "Couldn’t load folder order.",
          );
      });
    return () => {
      current = false;
    };
  }, [folderId, folderIds]);
  const virtual = useVirtualizer({
    count: order?.length ?? 0,
    getScrollElement: () => scroll.current,
    estimateSize: () => 44,
    overscan: 4,
  });
  const visible = virtual.getVirtualItems();
  const first = visible[0]?.index ?? 0;
  const last = visible.at(-1)?.index ?? 0;
  useEffect(() => {
    if (order)
      void ensureSaves(order.slice(first, last + 1)).catch(() =>
        setError("Couldn’t load save names. Try reopening this folder."),
      );
  }, [order, first, last]);
  const move = (id: string, destination: number) =>
    setOrder((items) =>
      items ? moveOrderedItem(items, id, destination) : items,
    );
  const save = async () => {
    if (!order || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await saveFolderPresentation(folderId, {
        ...folderPresentationSnapshot(),
        sortKey: "manual",
        sortDir: "asc",
        manualOrder: order,
      });
      setSort({ key: "manual", dir: "asc" });
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn’t save folder order.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pending.current) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup className={styles.popup}>
          <Dialog.Header>
            <Dialog.Title>Arrange Folder</Dialog.Title>
            <Dialog.Close disabled={busy} />
          </Dialog.Header>
          <Dialog.Description className={styles.description}>
            Drag saves into order, or use the move buttons. This order includes
            all saves in the folder.
          </Dialog.Description>
          <div className={styles.list} ref={scroll}>
            {order === null ? (
              <p>Loading saves…</p>
            ) : order.length === 0 ? (
              <p>This folder is empty.</p>
            ) : (
              <ol
                aria-label="Folder Save Order"
                style={{
                  height: virtual.getTotalSize(),
                  position: "relative",
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                }}
              >
                {visible.map((item) => {
                  const id = order[item.index];
                  return id ? (
                    <OrderRow
                      key={id}
                      id={id}
                      index={item.index}
                      count={order.length}
                      top={item.start}
                      disabled={busy}
                      onMove={move}
                    />
                  ) : null;
                })}
              </ol>
            )}
          </div>
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <Dialog.Footer>
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={busy || !order}
              loading={busy}
              onClick={() => void save()}
            >
              Save Order
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function OrderRow({
  id,
  index,
  count,
  top,
  disabled,
  onMove,
}: {
  id: string;
  index: number;
  count: number;
  top: number;
  disabled: boolean;
  onMove: (id: string, destination: number) => void;
}) {
  const save = useSave(id);
  return (
    <li
      aria-posinset={index + 1}
      aria-setsize={count}
      className={styles.row}
      style={{ transform: `translateY(${top}px)` }}
      draggable={!disabled}
      onDragStart={(event) =>
        event.dataTransfer.setData("application/x-pond-folder-order", id)
      }
      onDragOver={(event) => {
        if (
          !disabled &&
          event.dataTransfer.types.includes("application/x-pond-folder-order")
        )
          event.preventDefault();
      }}
      onDrop={(event) => {
        const dragged = event.dataTransfer.getData(
          "application/x-pond-folder-order",
        );
        if (dragged && !disabled) {
          event.preventDefault();
          onMove(dragged, index);
        }
      }}
    >
      <span className={styles.position}>{index + 1}</span>
      <span className={styles.name}>{save?.title || "Untitled"}</span>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Move ${save?.title || "Save"} Up`}
        disabled={disabled || index === 0}
        onClick={() => onMove(id, index - 1)}
      >
        ↑
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Move ${save?.title || "Save"} Down`}
        disabled={disabled || index === count - 1}
        onClick={() => onMove(id, index + 1)}
      >
        ↓
      </Button>
    </li>
  );
}
