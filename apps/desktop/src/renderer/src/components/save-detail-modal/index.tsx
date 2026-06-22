import {
  IconMediaPlayFill18 as Play,
  IconSparkleFill18 as Sparkle,
} from "@pond/icons/fill/18";
import {
  IconChevronLeftOutline18 as ChevronLeft,
  IconChevronRightOutline18 as ChevronRight,
  IconClipboardDocumentOutline18 as Clipboard,
  IconFolder5OpenOutline18 as Folder,
  IconCircleInfoOutline18 as Info,
  IconOpenInBrowserOutline18 as OpenInBrowser,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { Button, Dialog, Popover, Tooltip } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useSelector } from "@tanstack/react-store";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { KebabMenu } from "@/components/save-inspector-kebab";
import { MediaViewer } from "@/components/save-media-viewer";
import {
  DescriptionBlock,
  NotesEditor,
  TagsEditor,
} from "@/components/save-preview";
import { pickAuthorColor } from "@/components/save-preview/helpers";
import { collectInfoRows } from "@/components/save-preview/rows";
import { useAsk } from "@/hooks/use-ask";
import { useSaveList } from "@/hooks/use-save-list";
import { useSave } from "@/hooks/use-saves";
import { type ChapterCue, chaptersForSave } from "@/lib/chapters-vtt";
import { formatDuration } from "@/lib/format";
import { initials } from "@/lib/initials";
import {
  type Direction,
  directionalVariants,
  gentleSpring,
  snappySpring,
} from "@/lib/motion";
import { mutateSave, setSaveTags } from "@/lib/mutate-save";
import { ensureRawJson } from "@/lib/raw-json";
import { getSourceLabel } from "@/lib/source-labels";
import { getSourceIcon } from "@/lib/sources-registry";
import { ensureTranscript } from "@/lib/transcript";
import type { Save } from "@/lib/types";
import { pickAuthorAvatarUrl } from "@/lib/url";
import {
  seekActiveMedia,
  useActiveMediaSeek,
  useActiveMediaTime,
} from "@/stores/active-media";
import { useTrackVisit } from "@/stores/recents";
import { primarySelection, primarySelectionStore } from "@/stores/selection";
import { mergeUniqueTags } from "@/stores/tag-clipboard";
import { pushToast } from "@/stores/toasts";
import { CopyButton } from "./copy-button";
import { DataInspector } from "./data-inspector";
import styles from "./styles.module.css";

const COUNTER_OFFSET = 10;

const counterVariants = {
  enter: (d: Direction) => ({
    opacity: 0,
    y: d === "forward" ? COUNTER_OFFSET : -COUNTER_OFFSET,
  }),
  center: { opacity: 1, y: 0 },
  exit: (d: Direction) => ({
    opacity: 0,
    y: d === "forward" ? -COUNTER_OFFSET : COUNTER_OFFSET,
  }),
};

export function SaveModal() {
  const id = useSelector(primarySelectionStore, (s) => s.id);
  const lastId = useRef<string | null>(null);
  if (id != null) lastId.current = id;
  const renderId = id ?? lastId.current;
  return (
    <Dialog.Root
      open={id != null}
      onOpenChange={(open) => {
        if (!open) primarySelection.set(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        {renderId != null ? <SaveModalContent id={renderId} /> : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type SideTab = "details" | "data";

function SaveModalContent({ id }: { id: string }) {
  const save = useSave(id);
  const list = useSaveList({ activeId: id });
  const [tab, setTab] = useState<SideTab>("details");

  const prevIndexRef = useRef(list.index);
  const directionRef = useRef<Direction>("forward");
  if (list.index !== prevIndexRef.current) {
    directionRef.current =
      list.index > prevIndexRef.current ? "forward" : "backward";
    prevIndexRef.current = list.index;
  }
  const direction = directionRef.current;

  useTrackVisit(id);

  useEffect(() => {
    void ensureRawJson(id);
    void ensureTranscript(id);
  }, [id]);

  const goNext = () => list.nextId && primarySelection.set(list.nextId);
  const goPrev = () => list.prevId && primarySelection.set(list.prevId);
  useHotkey("J", goNext);
  useHotkey("ArrowDown", goNext);
  useHotkey("K", goPrev);
  useHotkey("ArrowUp", goPrev);

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
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={id}
              className={styles.mediaSlide}
              custom={direction}
              variants={directionalVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={gentleSpring}
            >
              {save ? (
                <MediaViewer save={save} />
              ) : (
                <p className={styles.empty}>Save not found.</p>
              )}
            </motion.div>
          </AnimatePresence>
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
              {list.index >= 0 ? (
                <>
                  <span className={styles.counterRoll}>
                    <AnimatePresence
                      mode="popLayout"
                      custom={direction}
                      initial={false}
                    >
                      <motion.span
                        key={list.index}
                        custom={direction}
                        variants={counterVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={snappySpring}
                      >
                        {list.index + 1}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  {` / ${list.total}`}
                </>
              ) : (
                `- / ${list.total}`
              )}
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
          <SideTabs value={tab} onChange={setTab} />
          {tab === "details" ? (
            <>
              <TitleCard save={save} />
              <MetaCard label="Description" fade>
                <DescriptionBlock save={save} />
              </MetaCard>
              <ChaptersCard save={save} />
              <MetaCard label="Notes" fade>
                <NotesEditor save={save} />
              </MetaCard>
              <MetaCard label="Tags">
                <TagsEditor save={save} />
              </MetaCard>
              <EnrichmentCard save={save} />
            </>
          ) : (
            <MetaCard label="Data">
              <DataInspector save={save} />
            </MetaCard>
          )}
        </aside>
      ) : null}
    </Dialog.Popup>
  );
}

function HeaderActions({ save }: { save: Save }) {
  const hasUrl = !!save.url;
  const hasFile = (save.files ?? []).length > 0;
  const ask = useAsk();

  const copyLink = async () => {
    if (!save.url) return;
    await navigator.clipboard.writeText(save.url);
  };

  // Anchor an "Ask" run on this save and hand control back to the library grid,
  // which renders the ranked similar set.
  const findSimilar = async () => {
    primarySelection.set(null);
    await ask("", [save.id]);
  };

  return (
    <div className={styles.actions}>
      <Tooltip label="Find similar items" side="bottom">
        <Button
          icon
          size="sm"
          variant="ghost"
          aria-label="Find similar items"
          onClick={() => void findSimilar()}
        >
          <Sparkle />
        </Button>
      </Tooltip>
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
      <PropertiesPopover save={save} />
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

function PropertiesPopover({ save }: { save: Save }) {
  const rows = useMemo(() => collectInfoRows(save), [save]);
  return (
    <Popover.Root>
      <Tooltip label="Properties" side="bottom">
        <Popover.Trigger
          render={
            <Button icon size="sm" variant="ghost" aria-label="Properties" />
          }
        >
          <Info />
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner align="end" sideOffset={6}>
          <Popover.Popup className={styles.propsPopup}>
            <h3 className={styles.propsPopupTitle}>Properties</h3>
            {rows.length === 0 ? (
              <p className={styles.propsEmpty}>No properties.</p>
            ) : (
              <dl className={styles.propsGrid}>
                {rows.map((row) => (
                  <div key={row.id} className={styles.propCell}>
                    <dt className={styles.propLabel}>{row.label}</dt>
                    <dd className={styles.propValue} title={row.value}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const SIDE_TABS: ReadonlyArray<{ value: SideTab; label: string }> = [
  { value: "details", label: "Details" },
  { value: "data", label: "Data" },
];

function SideTabs({
  value,
  onChange,
}: {
  value: SideTab;
  onChange: (value: SideTab) => void;
}) {
  const groupId = useId();
  const reduceMotion = useReducedMotion();
  return (
    <div role="tablist" aria-label="Detail view" className={styles.tabList}>
      {SIDE_TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            className={styles.tab}
            onClick={() => onChange(tab.value)}
          >
            {active ? (
              <motion.span
                aria-hidden
                layoutId={`${groupId}-tab`}
                className={styles.tabHighlight}
                transition={reduceMotion ? { duration: 0 } : snappySpring}
              />
            ) : null}
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        );
      })}
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

function TitleCard({ save }: { save: Save }) {
  const [draft, setDraft] = useState(save.title ?? "");

  // Resync when the title changes elsewhere (undo, sync) or the save switches.
  useEffect(() => {
    setDraft(save.title ?? "");
  }, [save.title]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed === (save.title ?? "")) return;
    await mutateSave(save.id, { title: trimmed || null });
  };

  return (
    <section className={`${styles.card} ${styles.titleCard}`}>
      <h3 className={styles.cardTitle}>Title</h3>
      <input
        className={styles.titleInput}
        value={draft}
        placeholder="Untitled"
        spellCheck={false}
        aria-label="Title"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </section>
  );
}

function ChaptersCard({ save }: { save: Save }) {
  const chapters = useMemo<ChapterCue[]>(() => chaptersForSave(save), [save]);
  const playerReady = useActiveMediaSeek();
  const currentTime = useActiveMediaTime();
  if (chapters.length === 0) return null;

  const activeIndex = chapters.reduce(
    (acc, c, i) => (currentTime >= c.startSec ? i : acc),
    -1,
  );

  return (
    <MetaCard label="Chapters" fade>
      <ol className={styles.chapterList}>
        {chapters.map((chapter, i) => (
          <li key={`${chapter.startSec}-${chapter.title}`}>
            <button
              type="button"
              className={styles.chapter}
              data-active={i === activeIndex ? "true" : undefined}
              disabled={!playerReady}
              onClick={() => seekActiveMedia(chapter.startSec)}
            >
              <Play className={styles.chapterIcon} width={11} height={11} />
              <span className={styles.chapterTitle}>{chapter.title}</span>
              <span className={styles.chapterTime}>
                {formatDuration(chapter.startSec)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </MetaCard>
  );
}

function EnrichmentCard({ save }: { save: Save }) {
  const caption = save.caption?.trim();
  const ocr = save.ocrText?.trim();
  const transcript = save.transcript?.trim();
  const style = (save.aesthetic ?? []).filter(Boolean);
  // Only offer suggestions the save doesn't already carry.
  const existing = useMemo(
    () => new Set(save.tags.map((t) => t.toLowerCase())),
    [save.tags],
  );
  const suggested = (save.suggestedTags ?? []).filter(
    (t) => t && !existing.has(t.toLowerCase()),
  );

  const addTag = async (tag: string) => {
    await setSaveTags(save.id, mergeUniqueTags(save.tags, [tag]));
  };
  const addAllTags = async () => {
    await setSaveTags(save.id, mergeUniqueTags(save.tags, suggested));
  };

  const hasAny =
    !!caption ||
    !!ocr ||
    !!transcript ||
    style.length > 0 ||
    suggested.length > 0;
  if (!hasAny) return null;

  return (
    <MetaCard label="Insights" fade>
      <div className={styles.insights}>
        {caption ? (
          <InsightBlock label="Caption" copyText={caption}>
            <p className={styles.insightText}>{caption}</p>
          </InsightBlock>
        ) : null}
        {ocr ? (
          <InsightBlock label="Extracted text" copyText={ocr}>
            <p className={styles.insightText}>{ocr}</p>
          </InsightBlock>
        ) : null}
        {transcript ? (
          <InsightBlock label="Transcript" copyText={transcript}>
            <p className={styles.insightText}>{transcript}</p>
          </InsightBlock>
        ) : null}
        {style.length > 0 ? (
          <InsightBlock label="Style">
            <Chips items={style} />
          </InsightBlock>
        ) : null}
        {suggested.length > 0 ? (
          <InsightBlock
            label="Suggested tags"
            action={
              suggested.length > 1 ? (
                <button
                  type="button"
                  className={styles.insightAction}
                  onClick={() => void addAllTags()}
                >
                  Add all
                </button>
              ) : null
            }
          >
            <div className={styles.chips}>
              {suggested.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.chipAdd}
                  aria-label={`Add tag ${tag}`}
                  onClick={() => void addTag(tag)}
                >
                  {tag}
                  <span className={styles.chipAddPlus} aria-hidden>
                    +
                  </span>
                </button>
              ))}
            </div>
          </InsightBlock>
        ) : null}
      </div>
    </MetaCard>
  );
}

function InsightBlock({
  label,
  copyText,
  action,
  children,
}: {
  label: string;
  copyText?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.insightBlock}>
      <div className={styles.insightHead}>
        <span className={styles.insightLabel}>{label}</span>
        {action}
        {copyText ? <CopyButton text={copyText} /> : null}
      </div>
      {children}
    </div>
  );
}

function Chips({ items }: { items: ReadonlyArray<string> }) {
  return (
    <div className={styles.chips}>
      {items.map((item) => (
        <span key={item} className={styles.chip}>
          {item}
        </span>
      ))}
    </div>
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

  const copy = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      pushToast(`Copied ${color}`, "success");
    } catch {
      // Clipboard can reject without focus; skip the toast.
    }
  };

  return (
    <div className={styles.swatches}>
      {colors.map((color) => (
        <Tooltip key={color} label={`Copy ${color}`} side="top">
          <button
            type="button"
            className={styles.swatch}
            style={{ background: color }}
            aria-label={`Copy color ${color}`}
            onClick={() => void copy(color)}
          />
        </Tooltip>
      ))}
    </div>
  );
}
