import { IconXmarkOutline12 } from "@pond/icons/outline/12";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { TabId, VariantProps } from "./lib/parts";
import styles from "./styles.module.css";
import { VariantCollapsed } from "./variant-collapsed";
import { VariantCollapsedHover } from "./variant-collapsed-hover";
import { VariantCorner } from "./variant-corner";
import { VariantDrawer } from "./variant-drawer";
import { VariantFan } from "./variant-fan";
import { VariantLabeled } from "./variant-labeled";
import { VariantRail } from "./variant-rail";
import { VariantSplit } from "./variant-split";
import { VariantSqueeze } from "./variant-squeeze";
import { VariantStacked } from "./variant-stacked";
import { VariantSwap } from "./variant-swap";
import { VariantSwapLabeled } from "./variant-swap-labeled";
import { VariantUnified } from "./variant-unified";

/** Dev-only gallery of ways to merge the navigation rail and the library dock into one surface. */

type VariantId =
  | "unified"
  | "split"
  | "corner"
  | "rail"
  | "collapsed"
  | "collapsed-hover"
  | "swap"
  | "squeeze"
  | "fan"
  | "swap-labeled"
  | "stacked"
  | "drawer"
  | "labeled";

interface Variant {
  label: string;
  blurb: string;
  component: React.ComponentType<VariantProps>;
}

const GROUPS: { label: string; ids: readonly VariantId[] }[] = [
  { label: "Shapes", ids: ["unified", "split", "corner", "rail"] },
  {
    label: "D · Collapsed nav",
    ids: [
      "collapsed",
      "collapsed-hover",
      "swap",
      "squeeze",
      "fan",
      "swap-labeled",
    ],
  },
  { label: "E · Storeys", ids: ["stacked", "drawer", "labeled"] },
];

const VARIANTS: Record<VariantId, Variant> = {
  unified: {
    label: "A · One pill",
    blurb:
      "The rail lies down into the dock: six tabs, then the full action strip. Tests whether fourteen icons still read as one surface or become a runway.",
    component: VariantUnified,
  },
  split: {
    label: "B · Split twins",
    blurb:
      "Two capsules on the same bottom edge: places on the left, verbs on the right. Merged position, preserved grouping.",
    component: VariantSplit,
  },
  corner: {
    label: "C · Corner + center",
    blurb:
      "Nav sinks into the bottom-left corner while actions keep the center. One horizontal baseline, no crowding, but two homes remain.",
    component: VariantCorner,
  },
  rail: {
    label: "F · Tall rail",
    blurb:
      "The merge goes the other way: the rail swallows every dock action and the bottom edge frees up entirely for composer cards.",
    component: VariantRail,
  },
  collapsed: {
    label: "D1 · Tap to unfold",
    blurb:
      "Nav rests as only the active tab and unfolds inline on tap. The most compact single pill; navigation costs one extra click.",
    component: VariantCollapsed,
  },
  "collapsed-hover": {
    label: "D2 · Hover unfold",
    blurb:
      "The same fold with no click: tabs unfold while the pointer rests on the nav end and tuck away when it leaves.",
    component: VariantCollapsedHover,
  },
  swap: {
    label: "D3 · Mode swap",
    blurb:
      "Tapping the active tab morphs the whole pill from verbs to places, riding the same box-and-crossfade the real dock uses for cards. Picking a tab morphs it back.",
    component: VariantSwap,
  },
  squeeze: {
    label: "D4 · Squeeze",
    blurb:
      "Unfolding the tabs folds the actions away in the same breath, so the pill trades content instead of growing. The trigger stays anchored at the left the whole time.",
    component: VariantSqueeze,
  },
  fan: {
    label: "D5 · Fan up",
    blurb:
      "The rail comes back as a transient flyout: tapping the trigger fans a vertical mini-rail above the pill, which never changes shape. Nav becomes a menu, not a mode.",
    component: VariantFan,
  },
  "swap-labeled": {
    label: "D6 · Named swap",
    blurb:
      "D3's morph where nav mode spends its width on labels: every place is named while you choose. Tests whether the swap fixes the six-unlabeled-icons problem for free.",
    component: VariantSwapLabeled,
  },
  stacked: {
    label: "E1 · Two storeys",
    blurb:
      "One capsule, two rows: destinations above, verbs below. Everything stays visible without runway width, at the cost of height.",
    component: VariantStacked,
  },
  drawer: {
    label: "E2 · Hover drawer",
    blurb:
      "At rest only the action row shows; hovering the pill slides the nav storey out of the top edge. Rest height matches today's dock exactly.",
    component: VariantDrawer,
  },
  labeled: {
    label: "E3 · Labeled storey",
    blurb:
      "The two storeys where the active tab wears its name. The label gives orientation the icon rows lack, and the indicator stretches to fit it.",
    component: VariantLabeled,
  },
};

type Backdrop = "soft" | "bold" | "grid";

const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: "soft", label: "Soft" },
  { id: "bold", label: "Bold" },
  { id: "grid", label: "Grid" },
];

export function DockMergePlayground() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<VariantId>("collapsed");
  const [activeTab, setActiveTab] = useState<TabId>("library");
  const [backdrop, setBackdrop] = useState<Backdrop>("soft");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        void navigate({ to: "/" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const active = VARIANTS[variant];
  const Active = active.component;

  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <header className={styles.header}>
          <h1 className={styles.title}>Merged dock prototypes</h1>
          <p className={styles.subtitle}>
            Ways to fold the navigation rail and the library dock into one
            surface. Actions follow the active tab like the real pages: library
            and trash share the grid set, sources, analytics and saves carry
            their own, settings has none. Switch tabs inside a prototype to feel
            the morph.
          </p>
          <button
            type="button"
            aria-label="Exit playground"
            title="Exit playground (Esc)"
            className={styles.exit}
            onClick={() => void navigate({ to: "/" })}
          >
            <IconXmarkOutline12 strokeWidth={2} />
          </button>
        </header>

        <div className={styles.groups}>
          {GROUPS.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>{group.label}</div>
              {group.ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.item}
                  data-active={id === variant || undefined}
                  onClick={() => setVariant(id)}
                >
                  {VARIANTS[id].label}
                </button>
              ))}
              {group.ids.includes(variant) ? (
                <p className={styles.hint}>{active.blurb}</p>
              ) : null}
            </div>
          ))}

          <div className={styles.group}>
            <div className={styles.groupLabel}>Backdrop</div>
            <div className={styles.segmented}>
              {BACKDROPS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.segment}
                  data-active={option.id === backdrop || undefined}
                  onClick={() => setBackdrop(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main
        className={styles.stage}
        data-backdrop={backdrop}
        aria-label="Merged dock prototype"
      >
        <Active activeTab={activeTab} onTabChange={setActiveTab} />
      </main>
    </div>
  );
}
