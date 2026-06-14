import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconChevronRightOutline18 as ChevronRight,
  IconClipboardDocumentOutline18 as Clipboard,
  IconFolder5OpenOutline18 as Folder,
  IconOpenInBrowserOutline18 as OpenInBrowser,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { Button, Dialog, Tooltip, useToast } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useSelector } from "@tanstack/react-store";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { KebabMenu } from "@/components/save-inspector-kebab";
import { MediaViewer } from "@/components/save-media-viewer";
import {
  DescriptionBlock,
  NotesEditor,
  TagsEditor,
} from "@/components/save-preview";
import { pickAuthorColor } from "@/components/save-preview/helpers";
import { useSaveList } from "@/hooks/use-save-list";
import { useSave } from "@/hooks/use-saves";
import { initials } from "@/lib/initials";
import { ensureRawJson } from "@/lib/raw-json";
import { getSourceLabel } from "@/lib/source-labels";
import { getSourceIcon } from "@/lib/sources-registry";
import type { Save } from "@/lib/types";
import { pickAuthorAvatarUrl } from "@/lib/url";
import { useTrackVisit } from "@/stores/recents";
import { primarySelection, primarySelectionStore } from "@/stores/selection";
import styles from "./styles.module.css";

// Inline detail view: opening a save sets the primary selection; j/k step it. SaveModalContent mounts only while open, so browsing skips the narrowing work.
export function SaveModal() {
  const id = useSelector(primarySelectionStore, (s) => s.id);
  return (
    <Dialog.Root
      open={id != null}
      onOpenChange={(open) => {
        if (!open) primarySelection.set(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        {id != null ? <SaveModalContent id={id} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SaveModalContent({ id }: { id: string }) {
  const save = useSave(id);
  const list = useSaveList({ activeId: id });

  useTrackVisit(id);

  // The list carries only slim `rawJson`; pull the full blob now the detail view is open.
  useEffect(() => {
    void ensureRawJson(id);
  }, [id]);

  const goNext = () => list.nextId && primarySelection.set(list.nextId);
  const goPrev = () => list.prevId && primarySelection.set(list.prevId);
  // Single-key hotkeys default to ignoring inputs and not matching modifier combos.
  useHotkey("J", goNext);
  useHotkey("ArrowDown", goNext);
  useHotkey("K", goPrev);
  useHotkey("ArrowUp", goPrev);

  const counter =
    list.index >= 0 ? `${list.index + 1} / ${list.total}` : `- / ${list.total}`;

  return (
    <Dialog.Popup className={`${styles.popup} ${styles.modal}`}>
      <div className={styles.main}>
        <header className={styles.header}>
          <Identity save={save} />
          {save ? <HeaderActions save={save} /> : <span />}
        </header>

        <Dialog.Title className={styles.srOnly}>
          {save?.title ?? "Save details"}
        </Dialog.Title>

        <div className={styles.media}>
          {save ? (
            <MediaViewer save={save} />
          ) : (
            <p className={styles.empty}>Save not found.</p>
          )}
        </div>

        <footer className={styles.footer}>
          <div className={styles.footerSide}>
            <Swatches save={save} />
          </div>
          <div className={styles.footerEnd}>
            <span
              className={styles.counter}
              role="status"
              aria-label="Position in list"
            >
              {counter}
            </span>
            <span className={styles.headerDivider} aria-hidden />
            <Tooltip label="Previous (K)" side="top">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Previous save"
                disabled={!list.prevId}
                onClick={() => list.prevId && primarySelection.set(list.prevId)}
              >
                <ChevronLeft />
              </Button>
            </Tooltip>
            <Tooltip label="Next (J)" side="top">
              <Button
                icon
                size="sm"
                variant="ghost"
                aria-label="Next save"
                disabled={!list.nextId}
                onClick={() => list.nextId && primarySelection.set(list.nextId)}
              >
                <ChevronRight />
              </Button>
            </Tooltip>
          </div>
        </footer>
      </div>

      {save ? (
        <aside className={styles.side}>
          <MetaCard label="Description" fade>
            <DescriptionBlock save={save} />
          </MetaCard>
          <MetaCard label="Notes">
            <NotesEditor save={save} />
          </MetaCard>
          <MetaCard label="Tags">
            <TagsEditor save={save} />
          </MetaCard>
        </aside>
      ) : null}
    </Dialog.Popup>
  );
}

function HeaderActions({ save }: { save: Save }) {
  const toast = useToast();
  const hasUrl = !!save.url;
  const hasFile = (save.files ?? []).length > 0;

  const copyLink = async () => {
    if (!save.url) return;
    await navigator.clipboard.writeText(save.url);
    toast.add({ title: "Link copied", type: "success" });
  };

  return (
    <div className={styles.actions}>
      <Tooltip label="Open in browser" side="bottom">
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Open in browser"
          disabled={!hasUrl}
          onClick={() => save.url && window.pond.openExternal(save.url)}
        >
          <OpenInBrowser />
        </Button>
      </Tooltip>
      <Tooltip label="Reveal in folder" side="bottom">
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Reveal in folder"
          disabled={!hasFile}
          onClick={() => window.pond.revealSave(save.id)}
        >
          <Folder />
        </Button>
      </Tooltip>
      <Tooltip label="Copy link" side="bottom">
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Copy link"
          disabled={!hasUrl}
          onClick={() => void copyLink()}
        >
          <Clipboard />
        </Button>
      </Tooltip>
      <KebabMenu save={save} />
      <span className={styles.headerDivider} aria-hidden />
      <Dialog.Close
        render={
          <Button icon size="sm" variant="secondary" aria-label="Close" />
        }
      >
        <X />
      </Dialog.Close>
    </div>
  );
}

function MetaCard({
  label,
  fade,
  children,
}: {
  label: string;
  fade?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>{label}</h3>
      <div className={styles.cardBody} data-fade={fade ? "true" : undefined}>
        {children}
      </div>
    </section>
  );
}

function Identity({ save }: { save: Save | null | undefined }) {
  const [broken, setBroken] = useState(false);
  const avatarUrl = useMemo(
    () => (save ? pickAuthorAvatarUrl(save) : null),
    [save],
  );
  const label = save?.author ?? save?.title ?? "Untitled";
  const SourceIcon = save ? getSourceIcon(save.source) : null;
  const sourceLabel = save ? getSourceLabel(save.source) : "";

  return (
    <div className={styles.identity}>
      <div className={styles.avatars}>
        {SourceIcon ? (
          <span
            className={styles.sourceAvatar}
            title={`Saved from ${sourceLabel}`}
            aria-hidden
          >
            <SourceIcon width={16} height={16} />
          </span>
        ) : null}
        <span
          className={styles.avatar}
          style={{ background: pickAuthorColor(label) }}
          aria-hidden
        >
          {avatarUrl && !broken ? (
            <img
              src={avatarUrl}
              alt=""
              className={styles.avatarImg}
              onError={() => setBroken(true)}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          ) : (
            initials(label)
          )}
        </span>
      </div>
      <span className={styles.identityName}>{label}</span>
    </div>
  );
}

function Swatches({ save }: { save: Save | null | undefined }) {
  const colors = save?.dominantColors?.slice(0, 4) ?? [];
  if (colors.length === 0) return null;
  return (
    <div className={styles.swatches} aria-hidden>
      {colors.map((color) => (
        <span
          key={color}
          className={styles.swatch}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}
