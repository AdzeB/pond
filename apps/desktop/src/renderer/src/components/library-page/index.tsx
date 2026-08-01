import { Shell } from "@pond/ui";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { routeSwapTransition } from "@/lib/ui/motion";
import styles from "./styles.module.css";

/** Mirrors the dock's nav order so travel direction matches the tab you aimed at. */
const SECTION_ORDER = ["library", "sources", "analytics", "trash"] as const;

type Section = (typeof SECTION_ORDER)[number];

function sectionFor(pathname: string): Section {
  if (pathname.startsWith("/sources")) return "sources";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname === "/trash") return "trash";
  return "library";
}

/** The dock ease front-loads so hard the fade was invisible; opacity gets its own linear ramp to stay perceptible. */
const routeTransition = {
  ...routeSwapTransition,
  opacity: { duration: 0.25, ease: "linear" as const },
};

/** Remounts routed content per section with a short fade-slide toward the direction of travel. */
function RoutedContent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const section = sectionFor(pathname);

  const prev = useRef(section);
  const direction = useRef(0);
  if (prev.current !== section) {
    direction.current = Math.sign(
      SECTION_ORDER.indexOf(section) - SECTION_ORDER.indexOf(prev.current),
    );
    prev.current = section;
  }

  return (
    <motion.div
      key={section}
      className={styles.route}
      initial={{ opacity: 0, x: reduceMotion ? 0 : 16 * direction.current }}
      animate={{ opacity: 1, x: 0 }}
      transition={routeTransition}
    >
      <Outlet />
    </motion.div>
  );
}

export function Library() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSave = pathname.startsWith("/save/");

  if (isSave) return <Outlet />;

  return (
    <AppShell.Content>
      <Shell.Main className={styles.main}>
        <RoutedContent />
      </Shell.Main>
    </AppShell.Content>
  );
}
