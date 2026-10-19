import { IconGlobe, IconImage, IconXmark } from "@pond/icons";
import { Button } from "@pond/ui/button";
import { Input } from "@pond/ui/input";
import { Keyboard } from "@pond/ui/keyboard";
import { useEffect, useId, useRef, useState } from "react";
import { Targets } from "@/components/targets";
import type {
  DetailsDraft,
  LibraryTargets,
  OverlayResult,
} from "@/utils/messaging";
import { useEscape } from "../use-escape";
import styles from "./styles.module.css";

const MAC = navigator.userAgent.includes("Mac");

interface DetailsProps {
  draft: DetailsDraft;
  library: LibraryTargets;
  container: HTMLElement;
  onFinish: (result: OverlayResult | null) => void;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The overlay runs inside the page, so a page save can preview its own share image. */
function shareImage(): string | null {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[property="og:image"], meta[name="twitter:image"]',
  );
  const content = meta?.content;
  if (!content) return null;
  try {
    const url = new URL(content, location.href);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function previewSource(draft: DetailsDraft): string | null {
  if (draft.preview) return draft.preview.src;
  if (draft.kind === "page" && draft.url === location.href) return shareImage();
  return null;
}

function Preview({ draft }: { draft: DetailsDraft }) {
  const [src] = useState(() => previewSource(draft));
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState(() =>
    draft.preview?.width && draft.preview.height
      ? { width: draft.preview.width, height: draft.preview.height }
      : null,
  );
  const media = draft.kind === "media" || draft.kind === "screenshot";

  return (
    <div className={styles.preview} data-kind={draft.kind}>
      {src && !failed ? (
        <img
          className={styles.image}
          src={src}
          alt=""
          onError={() => setFailed(true)}
          onLoad={(event) => {
            if (!media || size) return;
            const { naturalWidth: width, naturalHeight: height } =
              event.currentTarget;
            if (width && height) setSize({ width, height });
          }}
        />
      ) : (
        <div className={styles.placeholder}>
          {media ? <IconImage size={24} /> : <IconGlobe size={24} />}
          <span className={styles.host}>
            {hostOf(draft.originUrl ?? draft.url)}
          </span>
        </div>
      )}
      {media && size ? (
        <span className={styles.badge}>
          {size.width} × {size.height}
        </span>
      ) : null}
    </div>
  );
}

export function Details({ draft, library, container, onFinish }: DetailsProps) {
  const id = useId();
  const [title, setTitle] = useState(draft.title);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const name = useRef<HTMLInputElement>(null);
  useEscape(() => onFinish(null));

  useEffect(() => {
    name.current?.focus();
    name.current?.select();
  }, []);

  const save = () =>
    onFinish({
      kind: "details",
      draft,
      metadata: { title, notes, rating, tags, folderIds },
    });

  return (
    <div className={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className={styles.window}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey))
            return;
          event.preventDefault();
          save();
        }}
      >
        <header className={styles.header}>
          <h2 id={`${id}-title`} className={styles.title}>
            {draft.kind === "screenshot" ? "Save Screenshot" : "Save to Pond"}
          </h2>
          <Button
            icon
            size="xs"
            variant="ghost"
            aria-label="Close"
            onClick={() => onFinish(null)}
          >
            <IconXmark size={12} />
          </Button>
        </header>

        <div className={styles.body}>
          <div className={styles.fields}>
            <Preview draft={draft} />
            <Targets.Rating value={rating} onValueChange={setRating} />
            <Input.Root size="sm">
              <Input.Field
                ref={name}
                aria-label="Name"
                placeholder="Name"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Input.Root>
            <Input.Root size="sm">
              <Input.Textarea
                aria-label="Description"
                placeholder="Add a description"
                rows={3}
                value={notes}
                onValueChange={setNotes}
              />
            </Input.Root>
            <Targets.Tags
              tags={library.tags}
              recent={library.recentTags}
              value={tags}
              onValueChange={setTags}
              container={container}
            />
          </div>
          <Targets.Folders
            className={styles.folders}
            folders={library.folders}
            recentIds={library.recentFolderIds}
            value={folderIds}
            onValueChange={setFolderIds}
          />
        </div>

        <footer className={styles.footer}>
          <span className={styles.library}>Saving to {library.name}</span>
          <span className={styles.hint}>
            <Keyboard.Cluster
              keys={[MAC ? "⌘" : "Ctrl", "↵"]}
              density="inline"
            />
            Save
          </span>
          <Button size="sm" variant="secondary" onClick={() => onFinish(null)}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={save}>
            Save
          </Button>
        </footer>
      </div>
    </div>
  );
}
