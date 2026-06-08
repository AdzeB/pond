import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInViewRef, useMergeRefs } from "rooks";
import { useIsVideoDownloading } from "@/core/data/downloads";
import { type MediaUnit, pickPrimaryUnit } from "@/core/data/media";
import { useResolvedTheme } from "@/core/data/theme";
import type { Save } from "@/core/data/types";
import { recordAspect } from "@/features/library/stores/aspect";
import styles from "./styles.module.css";

export type CardLayout = "waterfall" | "grid" | "justified";

interface CardState {
  save: Save;
  unit: MediaUnit | null;
  isBroken: boolean;
  isDownloading: boolean;
}

interface CardActions {
  setBroken: (broken: boolean) => void;
}

interface CardContextValue {
  state: CardState;
  actions: CardActions;
}

const CardContext = createContext<CardContextValue | null>(null);

function useCardContext(): CardContextValue {
  const ctx = use(CardContext);
  if (!ctx) {
    throw new Error("Card.* components must be rendered inside <Card.Root>");
  }
  return ctx;
}

interface RootProps {
  save: Save;
  layout?: CardLayout;
  children: ReactNode;
}

function Root({ save, layout, children }: RootProps) {
  const theme = useResolvedTheme();
  const unit = useMemo(() => pickPrimaryUnit(save, { theme }), [save, theme]);
  const isDownloading = useIsVideoDownloading(save);
  const pickedSrc = unit?.url ?? null;

  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const broken = brokenSrc !== null && brokenSrc === pickedSrc;

  const setBroken = useCallback(
    (next: boolean) => {
      setBrokenSrc(next ? pickedSrc : null);
    },
    [pickedSrc],
  );

  const value = useMemo<CardContextValue>(
    () => ({
      state: { save, unit, isBroken: broken, isDownloading },
      actions: { setBroken },
    }),
    [save, unit, broken, isDownloading, setBroken],
  );

  return (
    <CardContext value={value}>
      <div className={styles.thumb} data-layout={layout}>
        {children}
      </div>
    </CardContext>
  );
}

function Image() {
  const { state } = useCardContext();
  if (!state.unit || state.unit.isVideo || state.isBroken) return null;
  return <ImageInner key={state.unit.url} />;
}

function ImageInner() {
  const { state, actions } = useCardContext();
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  const url = state.unit?.url ?? "";
  const file = state.save.files.find((f) => f.path === state.unit?.key);
  const w = file?.width ?? state.save.width ?? undefined;
  const h = file?.height ?? state.save.height ?? undefined;

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      recordAspect(state.save.id, img.naturalWidth, img.naturalHeight);
      setLoaded(true);
    }
  }, [state.save.id]);

  return (
    <img
      ref={ref}
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      // Grid thumbs are background work; never starve the foreground
      // detail image or first-paint hero by competing on the same
      // connection.
      fetchPriority="low"
      width={w}
      height={h}
      className={styles.media}
      data-loaded={loaded ? "true" : "false"}
      onLoad={(e) => {
        const img = e.currentTarget;
        recordAspect(state.save.id, img.naturalWidth, img.naturalHeight);
        setLoaded(true);
      }}
      onError={() => actions.setBroken(true)}
    />
  );
}

function Video() {
  const { state, actions } = useCardContext();
  if (!state.unit?.isVideo || state.isBroken) return null;
  return (
    <HoverVideo
      saveId={state.save.id}
      src={state.unit.url}
      posterUrl={state.unit.posterUrl}
      label={state.save.title ?? "video"}
      onBroken={() => actions.setBroken(true)}
    />
  );
}

function HoverVideo({
  saveId,
  src,
  posterUrl,
  label,
  onBroken,
}: {
  saveId: string;
  src: string;
  posterUrl?: string;
  label: string;
  onBroken: (videoSrc?: string) => void;
}) {
  const internalRef = useRef<HTMLVideoElement | null>(null);

  // `useInViewRef` hands back a callback ref; merge it with the
  // controllable `internalRef` (used for play/pause/seek) so a single
  // `<video>` element feeds both. `rootMargin` primes media slightly
  // before it scrolls into view.
  const [inViewRef, inView] = useInViewRef({ rootMargin: "200px" });
  const setVideoRef = useMergeRefs<HTMLVideoElement>(internalRef, inViewRef);

  const [primed, setPrimed] = useState(false);
  useEffect(() => {
    if (inView && !primed) setPrimed(true);
  }, [inView, primed]);

  const onEnter = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    const promise = el.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(() => {});
    }
  }, []);

  const onLeave = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {
      // Seek can throw if metadata hasn't loaded yet; safe to ignore.
    }
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const el = internalRef.current;
    if (!el) return;
    if (el.readyState < HTMLMediaElement.HAVE_METADATA) return;
    if (el.videoWidth === 0 && el.videoHeight === 0) {
      onBroken(src);
      return;
    }
    recordAspect(saveId, el.videoWidth, el.videoHeight);
  }, [onBroken, saveId, src]);

  return (
    <video
      ref={setVideoRef}
      {...(primed ? { src } : {})}
      poster={posterUrl}
      muted
      loop
      playsInline
      preload={primed ? "metadata" : "none"}
      className={styles.media}
      aria-label={label}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onError={() => onBroken(src)}
      onLoadedMetadata={onLoadedMetadata}
    >
      <track kind="captions" />
    </video>
  );
}

function Placeholder() {
  const { state } = useCardContext();
  if (state.unit && !state.isBroken) return null;
  return <div className={styles.placeholder} aria-hidden />;
}

function DownloadingBadge() {
  const { state } = useCardContext();
  const save = state.save;
  if (save.status === "failed") {
    const lastError =
      save.tasks?.find((t) => t.status === "failed")?.lastError ?? "Failed";
    return (
      <span
        className={styles.failed}
        role="status"
        aria-label="Ingest failed"
        title={lastError}
      >
        Failed
      </span>
    );
  }
  if (!state.isDownloading) return null;
  const fetchVideo = save.tasks?.find((t) => t.op === "fetch_video_ytdlp");
  const label = fetchVideo?.status === "running" ? "Downloading" : "Queued";
  return (
    <span
      className={styles.downloading}
      role="status"
      aria-label={`${label} video`}
      title={`${label} video…`}
    >
      <span className={styles["downloading-dot"]} aria-hidden="true" />
      {label}
    </span>
  );
}

function Media() {
  return (
    <>
      <Image />
      <Video />
      <Placeholder />
    </>
  );
}

export const Card = {
  Root,
  Media,
  Image,
  Video,
  Placeholder,
  DownloadingBadge,
};
