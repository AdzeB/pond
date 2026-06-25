import {
  IconArrowLeftOutline18 as ArrowLeft,
  IconArrowRightOutline18 as ArrowRight,
  IconChevronDownOutline18 as ChevronDown,
  IconPalette2Outline18 as ColorsIcon,
  IconDropCapOutline18 as ContentIcon,
  IconChartActivity2Outline18 as InsightsIcon,
  IconPlusOutline18 as Plus,
  IconOrderedList2Outline18 as PropertiesIcon,
  IconTagsOutline18 as TagsIcon,
  IconXmarkOutline18 as X,
} from "@pond/icons/outline/18";
import { Button, Dialog, Tooltip } from "@pond/ui";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useSelector } from "@tanstack/react-store";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { KebabMenu } from "@/components/save-inspector-kebab";
import { MediaViewer } from "@/components/save-media-viewer";
import { TagsEditor } from "@/components/save-preview";
import { pickAuthorColor } from "@/components/save-preview/helpers";
import { collectInfoRows } from "@/components/save-preview/rows";
import { useSaveList } from "@/hooks/use-save-list";
import { useSave } from "@/hooks/use-saves";
import { formatCount } from "@/lib/format";
import { initials } from "@/lib/initials";
import {
  type Direction,
  directionalVariants,
  gentleSpring,
  snappySpring,
} from "@/lib/motion";
import { setSaveTags } from "@/lib/mutate-save";
import { ensureRawJson } from "@/lib/raw-json";
import { getSourceLabel } from "@/lib/source-labels";
import { getSourceIcon } from "@/lib/sources-registry";
import { ensureTranscript } from "@/lib/transcript";
import type { Save } from "@/lib/types";
import { pickAuthorAvatarUrl } from "@/lib/url";
import { useTrackVisit } from "@/stores/recents";
import { primarySelection, primarySelectionStore } from "@/stores/selection";
import { mergeUniqueTags } from "@/stores/tag-clipboard";
import { pushToast } from "@/stores/toasts";
import { CopyButton } from "./copy-button";
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

function SaveModalContent({ id }: { id: string }) {
  const save = useSave(id);
  const list = useSaveList({ activeId: id });

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
    <Dialog.Popup className={`${styles.popup} ${styles.viewer}`}>
      <header className={styles.header}>
        <Identity save={save} />
        <span className={styles.headerTitle}>
          {save?.title ?? save?.author ?? "Untitled"}
        </span>
        <div className={styles.headerEnd}>
          <KebabMenu save={save ?? null} />
        </div>
      </header>

      <Dialog.Title className={styles.srOnly}>
        {save?.title ?? "Save details"}
      </Dialog.Title>

      <div className={styles.media}>
        <Tooltip label="Previous (K)" side="top">
          <button
            type="button"
            className={`${styles.navArrow} ${styles.navPrev}`}
            aria-label="Previous save"
            disabled={!list.prevId}
            onClick={goPrev}
          >
            <ArrowLeft width={16} height={16} />
          </button>
        </Tooltip>
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
        <Tooltip label="Next (J)" side="top">
          <button
            type="button"
            className={`${styles.navArrow} ${styles.navNext}`}
            aria-label="Next save"
            disabled={!list.nextId}
            onClick={goNext}
          >
            <ArrowRight width={16} height={16} />
          </button>
        </Tooltip>
      </div>

      <footer className={styles.footer}>
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
              <span className={styles.counterTotal}>{` / ${list.total}`}</span>
            </>
          ) : (
            <span className={styles.counterTotal}>{`- / ${list.total}`}</span>
          )}
        </span>

        {save ? <ViewerSegmented save={save} /> : <span />}

        <button
          type="button"
          className={styles.viewOriginal}
          disabled={!save?.url}
          onClick={() => save?.url && window.pond.openExternal(save.url)}
        >
          View Original
        </button>
      </footer>
    </Dialog.Popup>
  );
}

// Center segment of the viewer footer: opens the nested Save Details dialog,
// plus a quick action to copy the current media to the clipboard.
function ViewerSegmented({ save }: { save: Save }) {
  const copyScreen = async () => {
    try {
      const src = save.mediaUrl;
      if (src) {
        const res = await fetch(src);
        const blob = await res.blob();
        if (blob.type.startsWith("image/")) {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          pushToast("Copied image", "success");
          return;
        }
      }
      if (save.url) {
        await navigator.clipboard.writeText(save.url);
        pushToast("Copied link", "success");
        return;
      }
      pushToast("Nothing to copy", "error");
    } catch {
      pushToast("Could not copy", "error");
    }
  };

  return (
    <Dialog.Root>
      <div className={styles.segmented}>
        <Dialog.Trigger className={styles.segPrimary}>
          View Details
        </Dialog.Trigger>
        <button
          type="button"
          className={styles.segSecondary}
          onClick={() => void copyScreen()}
        >
          Copy Screen
        </button>
      </div>
      <Dialog.Portal>
        <SaveDetails save={save} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const ENGAGEMENT_IDS = new Set([
  "views",
  "likes",
  "comments",
  "retweets",
  "quotes",
  "bookmarks",
  "shares",
]);

interface Metric {
  id: string;
  label: string;
  value: string;
}

function collectEngagement(save: Save): Metric[] {
  const capture = save.rawJson?.capture;
  const ytdlp = save.rawJson?.ytdlp;
  const m = capture?.metrics ?? {};
  const out: Metric[] = [];
  const push = (id: string, label: string, n: number | null | undefined) => {
    if (n !== null && n !== undefined) {
      out.push({ id, label, value: formatCount(n) });
    }
  };
  push("reposts", "Reposts", m.retweets);
  push("quotes", "Quotes", m.quotes);
  push("bookmarks", "Bookmarks", m.bookmarks ?? m.saves);
  push("views", "Views", m.views ?? m.plays ?? ytdlp?.view_count);
  push("likes", "Likes", m.likes ?? ytdlp?.like_count);
  push("comments", "Comments", m.comments ?? m.replies ?? ytdlp?.comment_count);
  push("shares", "Shares", m.shares);
  return out;
}

type RowKind = "mono" | "author" | "platform" | "text";

interface DetailRow {
  id: string;
  label: string;
  value: string;
  kind: RowKind;
}

function collectIdentityRows(save: Save): DetailRow[] {
  const rows: DetailRow[] = [
    { id: "id", label: "ID", value: save.id, kind: "mono" },
  ];
  if (save.author) {
    rows.push({
      id: "author",
      label: "Author",
      value: save.author,
      kind: "author",
    });
  }
  rows.push({
    id: "platform",
    label: "Platform",
    value: getSourceLabel(save.source),
    kind: "platform",
  });
  for (const row of collectInfoRows(save)) {
    if (ENGAGEMENT_IDS.has(row.id)) continue;
    rows.push({ ...row, kind: "text" });
  }
  return rows;
}

function SaveDetails({ save }: { save: Save }) {
  const engagement = useMemo(() => collectEngagement(save), [save]);
  const rows = useMemo(() => collectIdentityRows(save), [save]);
  const colors = save.dominantColors?.slice(0, 8) ?? [];

  const description = save.description?.trim() ?? "";
  const caption = save.caption?.trim() ?? "";
  const ocr = save.ocrText?.trim() ?? "";
  const transcript = save.transcript?.trim() ?? "";
  const style = (save.aesthetic ?? []).filter(Boolean);
  const hasInsights = !!caption || !!ocr || !!transcript || style.length > 0;

  const avatarUrl = useMemo(() => pickAuthorAvatarUrl(save), [save]);
  const SourceIcon = getSourceIcon(save.source);

  const openInFinder = () => {
    if ((save.files ?? []).length === 0) {
      pushToast("No local file", "error");
      return;
    }
    window.pond.revealSave(save.id);
  };

  const copyRawJson = async () => {
    try {
      const json = JSON.stringify(save.rawJson ?? {}, null, 2);
      await navigator.clipboard.writeText(json);
      pushToast("Copied raw JSON", "success");
    } catch {
      pushToast("Could not copy", "error");
    }
  };

  return (
    <Dialog.Popup className={`${styles.popup} ${styles.detail}`}>
      <header className={styles.detailHeader}>
        <div className={styles.detailHeaderSlot}>
          <KebabMenu save={save} />
        </div>
        <Dialog.Title className={styles.detailTitle}>Save Details</Dialog.Title>
        <div className={styles.detailHeaderSlot} data-align="end">
          <Dialog.Close
            render={
              <Button icon size="sm" variant="ghost" aria-label="Close" />
            }
          >
            <X />
          </Dialog.Close>
        </div>
      </header>

      <div className={styles.detailScroll}>
        {description ? (
          <Section
            icon={<ContentIcon width={16} height={16} />}
            title="Content"
          >
            <ExpandableText text={description} />
          </Section>
        ) : null}

        <Section
          icon={<PropertiesIcon width={16} height={16} />}
          title="Properties"
        >
          {engagement.length > 0 ? (
            <div className={styles.metrics}>
              {engagement.map((m) => (
                <div key={m.id} className={styles.metric}>
                  <span className={styles.metricLabel}>{m.label}</span>
                  <span className={styles.metricValue}>{m.value}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className={styles.rows}>
            {rows.map((row, i) => (
              <div
                key={row.id}
                className={styles.row}
                data-alt={i % 2 === 1 ? "true" : undefined}
              >
                <span className={styles.rowLabel}>{row.label}</span>
                {row.kind === "author" ? (
                  <span className={styles.rowInline}>
                    <span
                      className={styles.rowAvatar}
                      style={{ background: pickAuthorColor(row.value) }}
                      aria-hidden
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      ) : (
                        initials(row.value)
                      )}
                    </span>
                    <span className={styles.rowValue}>{row.value}</span>
                  </span>
                ) : row.kind === "platform" ? (
                  <span className={styles.rowInline}>
                    {SourceIcon ? (
                      <span className={styles.rowSourceIcon} aria-hidden>
                        <SourceIcon width={16} height={16} />
                      </span>
                    ) : null}
                    <span className={styles.rowValue}>{row.value}</span>
                  </span>
                ) : (
                  <span
                    className={styles.rowValue}
                    data-mono={row.kind === "mono" ? "true" : undefined}
                    title={row.value}
                  >
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>

        <TagsSection save={save} />

        {colors.length > 0 ? (
          <Section icon={<ColorsIcon width={16} height={16} />} title="Colors">
            <div className={styles.colors}>
              {colors.map((color) => (
                <ColorSwatch key={color} color={color} />
              ))}
            </div>
          </Section>
        ) : null}

        {hasInsights ? (
          <Section
            icon={<InsightsIcon width={18} height={18} />}
            title="Insights"
          >
            <div className={styles.insights}>
              {caption ? (
                <Insight label="Caption" copyText={caption}>
                  <p className={styles.insightText}>{caption}</p>
                </Insight>
              ) : null}
              {ocr ? (
                <Insight label="Extracted Text" copyText={ocr}>
                  <p className={styles.insightText}>{ocr}</p>
                </Insight>
              ) : null}
              {transcript ? (
                <Insight label="Transcript" copyText={transcript}>
                  <ExpandableText text={transcript} />
                </Insight>
              ) : null}
              {style.length > 0 ? (
                <Insight label="Style">
                  <div className={styles.tags}>
                    {style.map((item) => (
                      <span key={item} className={styles.chip}>
                        {item}
                      </span>
                    ))}
                  </div>
                </Insight>
              ) : null}
            </div>
          </Section>
        ) : null}
      </div>

      <footer className={styles.detailFooter}>
        <button
          type="button"
          className={styles.footerPrimary}
          onClick={openInFinder}
        >
          Open In Finder
        </button>
        <button
          type="button"
          className={styles.footerSecondary}
          onClick={() => void copyRawJson()}
        >
          Copy Raw JSON
        </button>
      </footer>
    </Dialog.Popup>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionIcon} aria-hidden>
          {icon}
        </span>
        <h3 className={styles.sectionTitle}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TagsSection({ save }: { save: Save }) {
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

  return (
    <Section icon={<TagsIcon width={16} height={16} />} title="Tags">
      <div className={styles.tags}>
        <TagsEditor save={save} />
      </div>
      {suggested.length > 0 ? (
        <div className={styles.tags}>
          {suggested.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.chipAdd}
              aria-label={`Add tag ${tag}`}
              onClick={() => void addTag(tag)}
            >
              {tag}
              <Plus width={8} height={8} className={styles.chipAddIcon} />
            </button>
          ))}
        </div>
      ) : null}
    </Section>
  );
}

function Insight({
  label,
  copyText,
  children,
}: {
  label: string;
  copyText?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.insight}>
      <div className={styles.insightHead}>
        <span className={styles.insightLabel}>{label}</span>
        {copyText ? <CopyButton text={copyText} /> : null}
      </div>
      {children}
    </div>
  );
}

// Multi-line text that clamps to a few lines with a soft fade and a toggle.
function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 240;
  return (
    <div className={styles.expandable}>
      <div
        className={styles.expandableText}
        data-clamped={!expanded && long ? "true" : undefined}
      >
        {text}
      </div>
      {long ? (
        <button
          type="button"
          className={styles.readMore}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span>{expanded ? "Show Less" : "Read More"}</span>
          <ChevronDown
            width={12}
            height={12}
            className={styles.readMoreIcon}
            data-rotate={expanded ? "true" : undefined}
          />
        </button>
      ) : null}
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
    </div>
  );
}

function ColorSwatch({ color }: { color: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(color);
      pushToast(`Copied ${color}`, "success");
    } catch {
      // Clipboard can reject without focus; skip the toast.
    }
  };
  return (
    <Tooltip label={`Copy ${color}`} side="top">
      <button
        type="button"
        className={styles.colorSwatch}
        style={{ background: `${color}2e`, color }}
        onClick={() => void copy()}
      >
        {color.toUpperCase()}
      </button>
    </Tooltip>
  );
}
