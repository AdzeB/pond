import Image from "next/image";
import { demoImage, packColumns, SAVES } from "../saves";
import styles from "./styles.module.css";

const WATERFALL_SEEDS = new Set([1, 2, 3, 6, 9, 12]);
const ZOOM_SEEDS = [5, 16];
const FILTER_SEEDS = [1, 9, 15];

const aspectOf = (seed: number) =>
  SAVES.find((save) => save.seed === seed)?.aspect ?? 1;

function Thumb({ seed }: { seed: number }) {
  return (
    <span
      className={styles.thumb}
      style={{ aspectRatio: String(aspectOf(seed)) }}
    >
      <Image src={demoImage(seed)} alt="" width={160} height={200} />
    </span>
  );
}

function LayoutsFragment() {
  const columns = packColumns(
    SAVES.filter((save) => WATERFALL_SEEDS.has(save.seed)),
    3,
  );
  return (
    <div className={styles.fragment}>
      <div className={styles.segmented}>
        {["Waterfall", "Grid", "Justified"].map((label, index) => (
          <span
            key={label}
            className={styles.segment}
            data-active={index === 0 || undefined}
          >
            {label}
          </span>
        ))}
      </div>
      <div className={styles.waterfall}>
        {columns.map((column, columnIndex) => (
          <div key={column[0]?.seed ?? columnIndex} className={styles.column}>
            {column.map((save) => (
              <Thumb key={save.seed} seed={save.seed} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ZoomFragment() {
  return (
    <div className={styles.fragment}>
      <div className={styles.slider}>
        <span className={styles["slider-track"]}>
          <span className={styles["slider-fill"]} />
          <span className={styles["slider-knob"]} />
        </span>
        <span className={styles["slider-value"]}>176 px</span>
      </div>
      <div className={styles["zoom-grid"]}>
        {ZOOM_SEEDS.map((seed) => (
          <Thumb key={seed} seed={seed} />
        ))}
      </div>
    </div>
  );
}

function FiltersFragment() {
  return (
    <div className={styles.fragment}>
      <div className={styles.chips}>
        {["All", "Pinterest", "X", "Cosmos"].map((label, index) => (
          <span
            key={label}
            className={styles.chip}
            data-active={index === 1 || undefined}
          >
            {label}
          </span>
        ))}
      </div>
      <div className={styles["filter-grid"]}>
        {FILTER_SEEDS.map((seed) => (
          <Thumb key={seed} seed={seed} />
        ))}
      </div>
    </div>
  );
}

export type LibraryStaticVariant = "layouts" | "zoom" | "filters";

const FRAGMENTS = {
  layouts: LayoutsFragment,
  zoom: ZoomFragment,
  filters: FiltersFragment,
} satisfies Record<LibraryStaticVariant, () => React.JSX.Element>;

export function LibraryStatic({ variant }: { variant: LibraryStaticVariant }) {
  const Fragment = FRAGMENTS[variant];
  return (
    <div aria-hidden className={styles.root}>
      <Fragment />
    </div>
  );
}
