import {
  IconArrowUpRight,
  IconComputer,
  IconFolder,
  IconGlobe,
  IconImage,
  IconMagnifier,
  IconScanImage,
} from "@pond/icons";
import { Logo } from "@pond/ui/logo";
import Image from "next/image";
import type { ReactNode } from "react";
import { dmgUrl, extensionZipUrl } from "@/lib/release";
import styles from "./styles.module.css";

const SOURCES = [
  { label: "X", logo: "/demo/logos/twitter.png" },
  { label: "Instagram", logo: "/demo/logos/instagram.png" },
  { label: "Pinterest", logo: "/demo/logos/pinterest.png" },
  { label: "YouTube", logo: "/demo/logos/youtube.png" },
  { label: "TikTok", logo: "/demo/logos/tiktok.png" },
  { label: "Reddit", logo: "/demo/logos/reddit.png" },
] as const;

const GITHUB = "https://github.com/raphaelsalaja/pond";

function Chip({
  href,
  children,
  external,
  label,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  label?: string;
}) {
  return (
    <a
      className={styles.chip}
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function Feature({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <article className={styles.feature}>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.name}>{title}</h3>
      <p className={styles.body}>{description}</p>
      {action}
    </article>
  );
}

export function Features() {
  return (
    <section id="product" className={styles.section}>
      <div className={styles.inner}>
        <header className={styles.intro}>
          <h2 className={styles.title}>
            Save from anywhere. Keep it on your Mac.
          </h2>
          <p className={styles.lead}>
            Automatically sync X, Instagram, Pinterest, Are.na, Cosmos, TikTok,
            YouTube, Reddit, and Threads.
          </p>
        </header>
        <div className={styles.grid}>
          <Feature
            icon={<Logo size={32} />}
            title="Desktop app"
            description="Browse and search saves on your Mac."
            action={
              <div className={styles.actions}>
                <Chip href={dmgUrl("arm64")}>Download</Chip>
                <Chip href={GITHUB} external label="GitHub">
                  <IconArrowUpRight />
                </Chip>
              </div>
            }
          />
          <Feature
            icon={
              <span className={styles.logos}>
                {SOURCES.map(({ label, logo }) => (
                  <span key={label} className={styles.logo} title={label}>
                    <Image src={logo} alt="" width={28} height={28} />
                  </span>
                ))}
              </span>
            }
            title="Save from anywhere"
            description="One keystroke in the browser sends the page to your library."
            action={
              <div className={styles.actions}>
                <Chip href={extensionZipUrl()}>Install Extension</Chip>
                <Chip href={GITHUB} external label="View Source">
                  <IconArrowUpRight />
                </Chip>
              </div>
            }
          />
          <Feature
            icon={<IconGlobe />}
            title="Nine platforms, plus the web"
            description="Connect an account and Pond syncs new saves in the background."
          />
          <Feature
            icon={<IconImage />}
            title="Original media"
            description="Original files, not compressed copies."
          />
          <Feature
            icon={<IconFolder />}
            title="A folder you own"
            description="Everything lives in ~/Pond. Back it up, move it, or browse it in Finder."
          />
          <Feature
            icon={<IconScanImage />}
            title="On-device enrichment"
            description="Captions, text in images, and transcripts run on your Mac."
          />
          <Feature
            icon={<IconComputer />}
            title="Local-first"
            description="Nothing leaves your Mac."
          />
          <Feature
            icon={<IconMagnifier />}
            title="Natural language search"
            description="Full-text search and plain-language questions, on-device."
          />
        </div>
      </div>
    </section>
  );
}
