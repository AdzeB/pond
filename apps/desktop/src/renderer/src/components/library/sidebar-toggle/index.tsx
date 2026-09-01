import { Button, Tooltip } from "@pond/ui";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { ShortcutKeys } from "@/components/shared/shortcut-keys";
import { libraryChrome } from "@/stores/library-chrome";
import styles from "./styles.module.css";

const EASE = [0.25, 0.1, 0.25, 1] as const;

function Glyph({ open }: { open: boolean }) {
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
      <title>{open ? "Close sidebar" : "Open sidebar"}</title>
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
        animate={{ x1: open ? 6.25 : 3, x2: open ? 6.25 : 3 }}
        transition={{ duration: 0.18, ease: EASE }}
      />
    </svg>
  );
}

export function SidebarToggle({ open }: { open: boolean }) {
  const [visual, setVisual] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisual(open));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Tooltip
      label="Toggle Sidebar"
      shortcut={<ShortcutKeys id="view.sidebar" />}
    >
      <Button
        icon
        size="sm"
        variant="ghost"
        aria-label="Toggle Sidebar"
        aria-pressed={open}
        onClick={() => libraryChrome.toggleSidebar()}
      >
        <Glyph open={visual} />
      </Button>
    </Tooltip>
  );
}
