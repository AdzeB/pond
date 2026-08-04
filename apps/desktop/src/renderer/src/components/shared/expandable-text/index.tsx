import { IconChevronDownOutline18 as ChevronDown } from "@pond/icons/outline/18";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { bouncySpring } from "@/lib/ui/motion";
import styles from "./styles.module.css";

const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function splitUrl(raw: string): { href: string; label: string; trail: string } {
  let url = raw;
  let trail = "";
  while (/[.,;:!?)\]}'"]$/u.test(url)) {
    trail = `${url.slice(-1)}${trail}`;
    url = url.slice(0, -1);
  }
  const href = url.startsWith("www.") ? `https://${url}` : url;
  const label = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return { href, label, trail };
}

export function renderRichText(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(URL_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const { href, label, trail } = splitUrl(match[0]);
    out.push(
      <a
        key={`u${key}`}
        className={styles.link}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {label}
      </a>,
    );
    if (trail) out.push(trail);
    key += 1;
    last = idx + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ExpandableText({
  text,
  compact,
}: {
  text: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const long = text.length > 240;

  return (
    <div className={styles.expandable}>
      <span
        className={styles.text}
        data-compact={compact ? "true" : undefined}
        data-clamped={!expanded && long ? "true" : undefined}
      >
        {renderRichText(text)}
      </span>
      {long ? (
        <button
          type="button"
          className={styles.button}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={expanded ? "show-less" : "read-more"}
              animate={{ opacity: 1, y: 0 }}
              transition={bouncySpring}
            >
              {expanded ? "Show Less" : "Read More"}
            </motion.span>
          </AnimatePresence>

          <ChevronDown
            width={12}
            height={12}
            className={styles.icon}
            data-rotate={expanded ? "true" : undefined}
          />
        </button>
      ) : null}
    </div>
  );
}
