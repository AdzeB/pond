import { Button, Tooltip } from "@pond/ui";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { libraryChrome } from "@/features/library/state/library-chrome";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import styles from "./styles.module.css";

const EASE = [0.25, 0.1, 0.25, 1] as const;

function Glyph({ open, side }: { open: boolean; side: "left" | "right" }) {
  const closed = side === "left" ? 3 : 15;
  const expanded = side === "left" ? 6.25 : 11.75;
  const x = open ? expanded : closed;
  const label =
    side === "left"
      ? open
        ? "Close sidebar"
        : "Open sidebar"
      : open
        ? "Close details"
        : "Open details";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      width={18}
      height={18}
      fill="none"
      className={styles.glyph}
      aria-hidden
    >
      <title>{label}</title>
      <rect
        x="1.75"
        y="2.75"
        width="14.5"
        height="12.5"
        rx="2"
        ry="2"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.line
        y1="2.75"
        y2="15.25"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ x1: x, x2: x }}
        transition={{ duration: 0.18, ease: EASE }}
      />
    </svg>
  );
}

export function SidebarToggle({
  open,
  side = "left",
}: {
  open: boolean;
  side?: "left" | "right";
}) {
  const [visual, setVisual] = useState(false);
  const label = side === "left" ? "Toggle Sidebar" : "Toggle Details";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisual(open));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Tooltip
      label={label}
      shortcut={
        side === "left" ? <ShortcutKeys id="view.sidebar" /> : undefined
      }
    >
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label={label}
        aria-pressed={open}
        onClick={() =>
          side === "left"
            ? libraryChrome.toggleSidebar()
            : libraryChrome.toggleRightPane()
        }
      >
        <Glyph open={visual} side={side} />
      </Button>
    </Tooltip>
  );
}
