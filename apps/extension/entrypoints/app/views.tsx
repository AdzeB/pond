import {
  IconBrandArena,
  IconBrandCosmos,
  IconInstagram,
  IconPinterest,
  IconTikTok,
  IconXTwitter,
  IconYoutube,
} from "@pond/icons/social-media";
import type { Source } from "@pond/schema/db";
import { Button, Input } from "@pond/ui";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { sourceLabel } from "@/utils/url";
import styles from "./page.module.css";

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;

const SOURCE_ICONS: Partial<Record<Source, BrandIcon>> = {
  twitter: IconXTwitter,
  instagram: IconInstagram,
  pinterest: IconPinterest,
  tiktok: IconTikTok,
  youtube: IconYoutube,
  arena: IconBrandArena,
  cosmos: IconBrandCosmos,
};

function connectLabel(source: Source): string {
  if (source === "twitter") return "X";
  return sourceLabel(source);
}

function connectBenefit(source: Source): string {
  switch (source) {
    case "twitter":
      return "Sync likes and bookmarks into your Pond library.";
    case "instagram":
      return "Sync saved posts into your Pond library.";
    case "youtube":
      return "Sync liked videos into your Pond library.";
    case "reddit":
      return "Sync upvotes and saves into your Pond library.";
    case "tiktok":
      return "Sync favorites into your Pond library.";
    case "pinterest":
      return "Sync saved pins into your Pond library.";
    case "threads":
      return "Sync liked posts into your Pond library.";
    default:
      return "Sync saves from this site into your Pond library.";
  }
}

function Shell({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img src="/icons/48.png" alt="" width={22} height={22} />
          <span>Pond</span>
        </div>
        {meta ? <div>{meta}</div> : <span />}
      </header>
      <main className={styles.main}>
        <div className={styles.panel}>{children}</div>
      </main>
    </div>
  );
}

export function LoadingScreen() {
  return <div className={styles.loading}>Connecting…</div>;
}

interface TokenScreenProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void | Promise<void>;
  busy: boolean;
  error: string | null;
  inputId?: string;
}

export function TokenScreen({
  value,
  onChange,
  onContinue,
  busy,
  error,
  inputId = "pairing-token",
}: TokenScreenProps) {
  return (
    <Shell>
      <div className={styles.heading}>
        <h1 className={styles.title}>Link your desktop app</h1>
        <p className={styles.subtitle}>
          Paste a pairing token from Pond to start capturing saves from the
          browser.
        </p>
      </div>

      <div className={styles.form}>
        <Input.Root size="xl" className={styles.input}>
          <Input.Field
            id={inputId}
            type="text"
            placeholder="Pairing token"
            value={value}
            disabled={busy}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => onChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy && value.trim()) void onContinue();
            }}
          />
        </Input.Root>

        <Button
          variant="primary"
          size="xl"
          width="full"
          disabled={busy || !value.trim()}
          onClick={() => void onContinue()}
        >
          {busy ? "Linking…" : "Continue"}
        </Button>

        {error ? <p className={styles.error}>{error}</p> : null}

        <p className={styles.helper}>
          In Pond, open the menu bar and choose{" "}
          <strong>Copy Pairing Token</strong>.
        </p>
      </div>
    </Shell>
  );
}

interface ConnectScreenProps {
  source: Source;
  busy: boolean;
  error: string | null;
  onConnect: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConnectScreen({
  source,
  busy,
  error,
  onConnect,
  onCancel,
}: ConnectScreenProps) {
  const label = connectLabel(source);
  const SourceIcon = SOURCE_ICONS[source];

  return (
    <Shell>
      <div className={styles.brands}>
        <img
          className={styles.mark}
          src="/icons/48.png"
          alt=""
          width={40}
          height={40}
        />
        <span className={styles.link} aria-hidden>
          ↔
        </span>
        {SourceIcon ? (
          <span className={styles["source-icon"]}>
            <SourceIcon aria-hidden />
          </span>
        ) : (
          <span className={styles["source-fallback"]}>{label[0]}</span>
        )}
      </div>

      <div className={styles.heading}>
        <h1 className={styles.title}>Connect {label}</h1>
        <p className={styles.subtitle}>{connectBenefit(source)}</p>
      </div>

      <div className={styles.actions}>
        {error ? <p className={styles.error}>{error}</p> : null}

        <Button
          variant="primary"
          size="xl"
          width="full"
          disabled={busy}
          onClick={() => void onConnect()}
        >
          {busy ? "Connecting…" : `Continue with ${label}`}
        </Button>

        <Button variant="ghost" size="md" width="full" onClick={onCancel}>
          Skip for now
        </Button>
      </div>
    </Shell>
  );
}

interface IdleScreenProps {
  libraryName: string;
  offline?: boolean;
  onRetry?: () => void | Promise<void>;
}

export function IdleScreen({ libraryName, offline, onRetry }: IdleScreenProps) {
  return (
    <Shell
      meta={
        <span
          className={`${styles.status} ${offline ? styles["tone-warn"] : styles["tone-ok"]}`}
        >
          <span className={styles.dot} />
          {offline ? "Offline" : "Capturing"}
        </span>
      }
    >
      <div className={styles.heading}>
        <h1 className={styles.title}>{libraryName}</h1>
        <p className={styles.subtitle}>
          {offline
            ? "Pond isn’t running on this Mac. Open the app and try again."
            : "The extension is linked. Open a source site to connect your session and sync saves."}
        </p>
      </div>

      <div className={styles.actions}>
        {offline && onRetry ? (
          <Button
            variant="primary"
            size="xl"
            width="full"
            onClick={() => void onRetry()}
          >
            Try again
          </Button>
        ) : (
          <p className={styles.helper}>
            Capture runs in the background while you browse.
          </p>
        )}
      </div>
    </Shell>
  );
}
