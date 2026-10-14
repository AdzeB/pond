import { Button, Tooltip } from "@pond/ui";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  libraryChrome,
  useInspectorSaveId,
  useRightPane,
  useSidebarOpen,
} from "@/features/library/state/library-chrome";
import { ShortcutKeys } from "@/shared/components/shortcut-keys";
import { SpecContextMenu } from "@/shared/components/spec-context-menu";
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
  onToggle,
}: {
  open: boolean;
  side?: "left" | "right";
  onToggle?: () => void;
}) {
  const [visual, setVisual] = useState(false);
  const label = side === "left" ? "Toggle Sidebar" : "Toggle Details";
  const sidebarOpen = useSidebarOpen();
  const rightPane = useRightPane();
  const canInspect = useInspectorSaveId() !== null;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisual(open));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const button = (
    <Button
      icon
      size="sm"
      variant="ghost"
      aria-label={label}
      aria-pressed={open}
      onClick={() => {
        if (onToggle) {
          onToggle();
          return;
        }
        if (side === "left") libraryChrome.toggleSidebar();
        else libraryChrome.toggleRightPane();
      }}
    >
      <Glyph open={visual} side={side} />
    </Button>
  );

  return (
    <Tooltip
      label={label}
      shortcut={
        side === "left" && !onToggle ? (
          <ShortcutKeys id="view.sidebar" />
        ) : undefined
      }
    >
      {onToggle ? (
        button
      ) : (
        <SpecContextMenu
          buildItems={() => [
            {
              type: "checkbox",
              label: "Sidebar",
              checked: sidebarOpen,
              onCheckedChange: (checked) => {
                if (checked !== sidebarOpen) libraryChrome.toggleSidebar();
              },
            },
            {
              type: "checkbox",
              label: "Assistant",
              checked: rightPane === "agent",
              onCheckedChange: (checked) => libraryChrome.setAgentOpen(checked),
            },
            {
              type: "checkbox",
              label: "Details",
              checked: rightPane === "inspector",
              disabled: !canInspect,
              onCheckedChange: (checked) => {
                if (checked && rightPane !== "inspector")
                  libraryChrome.toggleInspector();
                else if (!checked && rightPane === "inspector")
                  libraryChrome.closeRightPane();
              },
            },
          ]}
        >
          {button}
        </SpecContextMenu>
      )}
    </Tooltip>
  );
}
