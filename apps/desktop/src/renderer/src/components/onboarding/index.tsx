import {
  IconChevronRightOutline12 as ChevronRight,
  IconDropletOutline12 as DropletIcon,
  IconLink2Outline12 as LinkSmall,
  IconSparkle2Outline12 as SparkleIcon,
} from "@pond/icons/outline/12";
import {
  IconCheckOutline18 as Check,
  IconLink2Outline18 as Link,
} from "@pond/icons/outline/18";
import { Button, Input } from "@pond/ui";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBootReady, useSaves } from "@/hooks/use-saves";
import { buildPondUrl, withThumbWidth } from "@/lib/media/url";
import { getSourceLogo } from "@/lib/save/sources-registry";
import type { Save, SaveFile } from "@/lib/types";
import {
  completeOnboarding,
  loadOnboarding,
  useOnboardingStatus,
} from "@/stores/onboarding";
import styles from "./styles.module.css";

type Step = "welcome" | "first-save" | "landed";

interface QuickAddResult {
  ok: boolean;
  id?: string;
  created?: boolean;
  error?: string;
}

/** Forgive a missing scheme so "example.com/page" still saves as a link. */
function withScheme(value: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
  return value;
}

function looksLikeUrl(value: string): boolean {
  const v = withScheme(value.trim());
  return v.startsWith("http://") || v.startsWith("https://");
}

/** Classification is cheap pattern matching in the main process, debounced for typing. */
function useUrlSource(candidate: string): string | null {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    const normalized = withScheme(candidate.trim());
    if (!looksLikeUrl(normalized)) {
      setSource(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void window.pond
        .query("saves.classifyUrl", { url: normalized })
        .then((res) => {
          if (cancelled) return;
          setSource((res as { source?: string | null })?.source ?? null);
        })
        .catch(() => {});
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidate]);
  return source;
}

const STEPPER_ITEMS = [
  { step: "welcome" as Step, label: "Welcome", icon: DropletIcon },
  { step: "first-save" as Step, label: "First Save", icon: LinkSmall },
  { step: "landed" as Step, label: "Explore", icon: SparkleIcon },
] as const;

const stepVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", duration: 0.7, bounce: 0 },
  },
};

const stepExit = {
  opacity: 0,
  y: -12,
  filter: "blur(6px)",
  transition: { type: "spring", duration: 0.35, bounce: 0 },
} as const;

/** Media copied from the developer's own library, so the wall previews real saves offline. */
const WALL_MEDIA = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../assets/onboarding/*.{jpg,png,mp4}", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1).replace(/\.(jpg|png|mp4)$/, ""),
    url as string,
  ]),
);

interface WallItem {
  img: string;
  title: string;
  stat: string;
  source?: string;
  video?: boolean;
}

/** Real saves from the developer's library, hand-laid so every viewport slice mixes save types. */
const WALL_COLUMNS: ReadonlyArray<ReadonlyArray<WallItem>> = [
  [
    {
      img: "yt-mclaren",
      title: "The Best Car I've Ever Driven: McLaren W1",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "tw-emptystate",
      video: true,
      title: "Obsessing over this empty state",
      stat: "Jamie Barton",
      source: "twitter",
    },
    {
      img: "cs-ona",
      title: "Ona interface exploration",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "ig-copenhagen",
      title: "Spring day in Copenhagen",
      stat: "Kim Andersen",
      source: "instagram",
    },
    {
      img: "ar-lemaire",
      title: "Lemaire AW25 Runway",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "cs-kitchen",
      title: "Kitchen in an Altbau apartment",
      stat: "Cosmos",
      source: "cosmos",
    },
  ],
  [
    {
      img: "ig-postcards",
      title: "digital postcards <33",
      stat: "Tim Doleschall",
      source: "instagram",
    },
    {
      img: "tw-hovermaxxing",
      video: true,
      title: "hovermaxxing",
      stat: "chance",
      source: "twitter",
    },
    {
      img: "cs-callalily",
      title: "Calla Lily (1986)",
      stat: "Robert Mapplethorpe",
      source: "cosmos",
    },
    {
      img: "yt-foldable",
      title: "So This is Peak Foldable",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "pi-akikuma",
      title: "Akikuma mini album",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "ar-taste",
      title: "Taste Genealogy",
      stat: "Are.na",
      source: "arena",
    },
  ],
  [
    {
      img: "tw-popover",
      video: true,
      title: "Base UI Popover with detached triggers",
      stat: "Colm Tuite",
      source: "twitter",
    },
    {
      img: "cs-lamp",
      title: "w202 Halo lamp by Wästberg",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "pi-vogue",
      title: "Vogue",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "yt-becoming",
      title: "The Pain of Becoming",
      stat: "Josephine",
      source: "youtube",
    },
    {
      img: "ig-greener",
      title: "greener and greener",
      stat: "Heo Kang",
      source: "instagram",
    },
    {
      img: "pi-photo",
      title: "Portrait study",
      stat: "Pinterest",
      source: "pinterest",
    },
  ],
  [
    {
      img: "web-amie",
      title: "Amie, AI Note Taker",
      stat: "amie.so",
    },
    {
      img: "tw-tooltip",
      video: true,
      title: "Farewell to the ugly native tooltip",
      stat: "zanwei.guo",
      source: "twitter",
    },
    {
      img: "ig-blessings",
      title: "more blessings more life",
      stat: "BIN",
      source: "instagram",
    },
    {
      img: "pi-kleerkasten",
      title: "Kleerkasten",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "ar-pacome",
      title: "Pacôme Pertant, Portfolio",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "cs-dunes",
      title: "Singing Sand Mountain, Dunhuang",
      stat: "Lynn Davis",
      source: "cosmos",
    },
  ],
];

function SourceBadge({ source }: { source: string }) {
  const logo = getSourceLogo(source);
  if (!logo) return null;
  return (
    <span className={styles["ghost-badge"]}>
      <img src={logo} alt="" width={18} height={18} draggable={false} />
    </span>
  );
}

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function WallCard({ item, delay }: { item: WallItem; delay: number }) {
  return (
    <motion.div
      className={styles.ghost}
      initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring", duration: 0.9, bounce: 0, delay },
      }}
    >
      <div className={styles["ghost-frame"]}>
        {item.video ? (
          <video
            className={styles["ghost-art"]}
            src={WALL_MEDIA[item.img]}
            poster={WALL_MEDIA[`${item.img}-poster`]}
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            disablePictureInPicture
          />
        ) : (
          <img
            className={styles["ghost-art"]}
            src={WALL_MEDIA[item.img]}
            alt=""
            draggable={false}
          />
        )}
        {item.source ? <SourceBadge source={item.source} /> : null}
      </div>
      <div className={styles["ghost-meta"]}>
        <span className={styles["ghost-title"]}>{item.title}</span>
        <span className={styles["ghost-stat"]}>{item.stat}</span>
      </div>
    </motion.div>
  );
}

/** The living wall: the user's future library, drifting slowly until it gains its first resident. */
function Wall({ dimmed }: { dimmed: boolean }) {
  return (
    <div className={styles.wall} data-dimmed={dimmed || undefined} aria-hidden>
      {WALL_COLUMNS.map((cards, col) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative list
          key={col}
          className={styles["wall-column"]}
          data-direction={col % 2 === 0 ? "up" : "down"}
        >
          {/* Content is doubled so the drift loop wraps seamlessly. */}
          {[0, 1].map((half) => (
            <div key={half} className={styles["wall-half"]}>
              {cards.map((item, i) => (
                <WallCard
                  // biome-ignore lint/suspicious/noArrayIndexKey: static decorative list
                  key={i}
                  item={item}
                  delay={0.1 + col * 0.07 + i * 0.05}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function domainOf(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  return (
    withScheme(trimmed)
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0] ?? null
  );
}

/** First displayable image from the pipeline, skipping avatars and favicons. */
function pickPreviewImage(save: Save): SaveFile | null {
  const files = save.files ?? [];
  const displayable = (f: SaveFile | undefined): f is SaveFile =>
    !!f &&
    f.kind !== "avatar" &&
    f.kind !== "source_icon" &&
    (f.mimeType?.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|avif)$/i.test(f.path));
  const cover = files[save.coverIndex ?? 0];
  if (displayable(cover)) return cover;
  return files.find(displayable) ?? null;
}

function PreviewCard({
  url,
  dragging,
  save,
  settled,
}: {
  url: string;
  dragging: boolean;
  save: Save | null;
  settled: boolean;
}) {
  const trimmed = url.trim();
  const active = trimmed.length > 0;
  const source = useUrlSource(trimmed);
  const logo = source ? getSourceLogo(source) : null;
  const landed = save != null;

  const image = save ? pickPreviewImage(save) : null;
  const title = save?.title?.trim() || null;
  const byline = save?.author?.trim() || domainOf(save?.url ?? url);

  return (
    <motion.div
      className={styles.preview}
      data-dragging={dragging || undefined}
      data-landed={landed || undefined}
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: dragging ? 1.05 : 1,
        transition: { type: "spring", duration: 0.7, bounce: 0.18 },
      }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25 } }}
    >
      <div
        className={styles["preview-media"]}
        data-active={active || undefined}
      >
        {image && save ? (
          <motion.img
            className={styles["preview-photo"]}
            src={withThumbWidth(buildPondUrl(save.id, image), 376)}
            alt=""
            draggable={false}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { duration: 0.5, ease: "easeOut" },
            }}
          />
        ) : null}
        {landed && settled ? (
          <motion.span
            key="check"
            className={styles["preview-check"]}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { type: "spring", duration: 0.5, bounce: 0.4 },
            }}
          >
            <span className={styles.burst} />
            <span className={styles.burst} data-ring="2" />
            <Check width={16} height={16} strokeWidth={2} />
          </motion.span>
        ) : landed ? (
          <motion.span
            key="working"
            className={styles["preview-working"]}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { duration: 0.25 } }}
          >
            <span className={styles["preview-working-ring"]} />
          </motion.span>
        ) : (
          <span key={source ?? "link"} className={styles["preview-glyph"]}>
            {logo ? (
              <img src={logo} alt="" width={22} height={22} />
            ) : (
              <Link width={20} height={20} />
            )}
          </span>
        )}
      </div>
      <div className={styles["preview-body"]}>
        {landed && title ? (
          <motion.span
            className={styles["preview-domain"]}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
          >
            {title}
          </motion.span>
        ) : !landed && domainOf(url) ? (
          <span className={styles["preview-domain"]}>{domainOf(url)}</span>
        ) : (
          <span className={styles["ghost-line"]} data-shimmer />
        )}
        {byline && landed ? (
          <motion.span
            className={styles["preview-sub"]}
            initial={{ opacity: 0, y: 4 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, delay: 0.08 },
            }}
          >
            {byline}
          </motion.span>
        ) : (
          <span
            className={styles["ghost-line"]}
            data-short
            data-shimmer={!settled || undefined}
          />
        )}
      </div>
    </motion.div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.span className={styles.mark} variants={rise} aria-hidden>
        <span className={styles["mark-ring"]} />
      </motion.span>
      <motion.h1 className={styles.title} variants={rise}>
        Your library awaits.
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Pond is a calm, local home for everything worth keeping. Links, images,
        videos, and files, saved on your Mac.
      </motion.p>
      <motion.div className={styles.actions} variants={rise}>
        <Button variant="accent" size="lg" onClick={onNext}>
          Get Started
        </Button>
      </motion.div>
    </motion.div>
  );
}

function FirstSaveStep({
  url,
  onUrlChange,
  dragging,
}: {
  url: string;
  onUrlChange: (value: string) => void;
  dragging: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = url.trim();
  const canSubmit = trimmed.length > 0 && looksLikeUrl(trimmed) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await window.pond.query("saves.quickAdd", {
        url: withScheme(trimmed),
      })) as QuickAddResult;
      if (!res?.ok) {
        setError("Couldn't save that link. Check it and try again.");
        inputRef.current?.focus();
      }
      /** Success is observed through the saves pool, which advances the step. */
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      key="first-save"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.h1 className={styles.title} variants={rise}>
        Make your first save
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        {dragging
          ? "Let go to drop it in the pond."
          : "Paste a link, or drop anything onto this window. It fills the first card in your library."}
      </motion.p>
      <motion.div className={styles["field-row"]} variants={rise}>
        <Input.Field
          ref={inputRef}
          className={styles.input}
          value={url}
          placeholder="Paste a link to save"
          spellCheck={false}
          autoComplete="off"
          autoFocus
          onChange={(e) => {
            onUrlChange(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <Button
          variant="accent"
          size="lg"
          disabled={!canSubmit}
          onClick={() => void submit()}
          style={{ width: "100%" }}
        >
          {busy ? "Saving" : "Save"}
        </Button>
      </motion.div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </motion.div>
  );
}

function CreatingStep() {
  return (
    <motion.div
      key="creating"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.h1 className={styles.title} variants={rise}>
        Creating your save
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Pond is pulling in the details: title, cover, and where it came from.
        Watch it fill in on the right.
      </motion.p>
    </motion.div>
  );
}

function LandedStep({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      key="landed"
      className={styles.step}
      variants={stepVariants}
      initial="hidden"
      animate="show"
      exit={stepExit}
    >
      <motion.h1 className={styles.title} variants={rise}>
        That's the idea.
      </motion.h1>
      <motion.p className={styles.body} variants={rise}>
        Your first save is settling into the library. Everything you add from
        now on lands the same way.
      </motion.p>
      <motion.div className={styles.actions} variants={rise}>
        <Button variant="accent" size="lg" onClick={onDone}>
          Dive In
        </Button>
      </motion.div>
    </motion.div>
  );
}

function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const saves = useSaves();
  const savesCount = saves.length;
  const latest = saves[0] ?? null;
  /** "ingesting" means the pipeline is still fetching details; the flow narrates that before celebrating. */
  const settled = latest != null && latest.status !== "ingesting";

  /** A save landing at any step (paste, drop, even the browser extension) is the goal; jump straight to the finale. */
  useEffect(() => {
    if (savesCount > 0 && step !== "landed") setStep("landed");
  }, [savesCount, step]);

  const onDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer?.types ?? []);
    if (
      types.includes("text/uri-list") ||
      types.includes("text/plain") ||
      types.includes("Files")
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const onDragEnter = () => {
    dragDepth.current += 1;
    setDragging(true);
  };

  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const dt = e.dataTransfer;
    if (!dt) return;

    /** Electron 41 removed File.path; resolve absolute paths via the preload bridge. */
    const paths = Array.from(dt.files ?? [])
      .map((f) => {
        try {
          return window.pond.pathForFile(f);
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    if (paths.length > 0) {
      await window.pond.query("saves.importFiles", { paths });
      return;
    }

    const uri = dt.getData("text/uri-list") || dt.getData("text/plain");
    if (uri) {
      const lines = uri
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
      for (const line of lines) {
        await window.pond.query("saves.quickAdd", { url: withScheme(line) });
      }
    }
  };

  const focused = step !== "welcome";

  return (
    <motion.div
      className={styles.overlay}
      role="dialog"
      aria-label="Welcome to Pond"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeOut" } }}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
    >
      <div className={styles.drag} aria-hidden />
      <div className={styles.pane}>
        <AnimatePresence initial={false} mode="popLayout">
          {step === "welcome" ? (
            <WelcomeStep onNext={() => setStep("first-save")} />
          ) : step === "first-save" ? (
            <FirstSaveStep url={url} onUrlChange={setUrl} dragging={dragging} />
          ) : !settled ? (
            <CreatingStep />
          ) : (
            <LandedStep onDone={onDone} />
          )}
        </AnimatePresence>
        <nav className={styles.stepper} aria-label="Onboarding progress">
          {STEPPER_ITEMS.map((item, i) => {
            const idx = STEPPER_ITEMS.indexOf(item);
            const currentIdx = STEPPER_ITEMS.findIndex((s) => s.step === step);
            const active = idx <= currentIdx;
            return (
              <span
                key={item.step}
                className={styles["stepper-item"]}
                data-active={active || undefined}
              >
                {i > 0 ? (
                  <span className={styles["stepper-sep"]} aria-hidden>
                    <ChevronRight width={10} height={10} />
                  </span>
                ) : null}
                <item.icon width={12} height={12} />
                <span>{item.label}</span>
              </span>
            );
          })}
        </nav>
      </div>
      <div
        className={styles.canvas}
        data-quiet={step === "welcome" || undefined}
      >
        {/* The camera pushes in as the flow narrows from the whole library to one card. */}
        <motion.div
          className={styles["canvas-zoom"]}
          animate={{
            scale: focused ? 1.35 : 1,
            transition: { type: "spring", duration: 1.1, bounce: 0 },
          }}
        >
          <Wall dimmed={focused} />
        </motion.div>
        <AnimatePresence>
          {focused ? (
            <PreviewCard
              url={url}
              dragging={dragging}
              save={step === "landed" ? latest : null}
              settled={settled}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Shows onboarding on a fresh library; libraries that already have saves are marked onboarded silently. */
export function OnboardingGate() {
  const status = useOnboardingStatus();
  const bootReady = useBootReady();
  const savesCount = useSaves().length;
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    loadOnboarding();
  }, []);

  useEffect(() => {
    if (show !== null) return;
    if (status === "unknown" || !bootReady) return;
    if (status === "done") {
      setShow(false);
      return;
    }
    if (savesCount > 0) {
      completeOnboarding();
      setShow(false);
      return;
    }
    setShow(true);
  }, [show, status, bootReady, savesCount]);

  const done = () => {
    completeOnboarding();
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show ? <Onboarding onDone={done} /> : null}
    </AnimatePresence>
  );
}
