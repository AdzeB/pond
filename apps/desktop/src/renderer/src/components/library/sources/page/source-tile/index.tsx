import type { Source } from "@pond/schema/db";
import type { MenuItemSpec } from "@pond/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useState } from "react";
import type { CardModel } from "@/components/library/sources/sync-monitor/lib/helpers";
import { SpecContextMenu } from "@/components/shared/spec-context-menu";
import { getSourceDef } from "@/lib/save/sources-registry";
import { gentleSpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

interface WipeStyle extends CSSProperties {
  "--sources-wipe-p": number;
}

export function SourceTile({
  source,
  avatarUrl,
  name,
  value,
  tone,
  progress = null,
  onOpen,
  menu,
}: {
  source: Source;
  avatarUrl: string | null | undefined;
  name: string;
  value: string;
  tone: CardModel["tone"];
  progress?: number | null;
  onOpen: () => void;
  menu?: () => MenuItemSpec[];
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const pfp = avatarUrl && avatarUrl !== failedUrl ? avatarUrl : null;
  const { logo } = getSourceDef(source);
  const blur = reduceMotion ? "blur(0px)" : "blur(3px)";

  const running = tone === "run";
  const drained = tone === "run" || tone === "err" || tone === "paused";
  const artSrc = pfp ?? logo ?? undefined;
  const artVariant = pfp ? "account" : "source";

  const wipeStyle: WipeStyle | undefined =
    progress == null ? undefined : { "--sources-wipe-p": progress };
  const wipe =
    running && artSrc && wipeStyle ? (
      <img
        src={artSrc}
        alt=""
        className={styles.wipe}
        referrerPolicy="no-referrer"
        data-variant={artVariant}
        style={wipeStyle}
      />
    ) : null;

  const tile = (
    <button type="button" className={styles.tile} onClick={onOpen}>
      <span className={styles.cover}>
        <span className={styles.art} data-pulse={running ? "" : undefined}>
          {artSrc ? (
            <>
              <img
                src={artSrc}
                alt=""
                className={styles.image}
                referrerPolicy="no-referrer"
                onError={() => {
                  if (pfp) setFailedUrl(pfp);
                }}
                data-variant={artVariant}
                data-drained={drained || undefined}
              />
              {wipe}
            </>
          ) : null}
        </span>
        {pfp ? (
          <img
            width={16}
            height={16}
            src={logo ?? undefined}
            alt=""
            className={styles.badge}
          />
        ) : null}
      </span>
      <span className={styles.name}>{name}</span>
      <span className={styles.sub}>
        <AnimatePresence initial={false}>
          <motion.span
            key={value}
            className={styles["sub-text"]}
            initial={{ opacity: 0, filter: blur }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: blur }}
            transition={gentleSpring}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );

  if (!menu) return tile;
  return <SpecContextMenu buildItems={menu}>{tile}</SpecContextMenu>;
}
