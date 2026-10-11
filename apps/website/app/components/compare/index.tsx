import {
  IconCircleCheckFill,
  IconComputer,
  IconFolder,
  IconGlobe,
  IconImage,
  IconMinus,
  IconScanImage,
} from "@pond/icons";
import { Logo } from "@pond/ui/logo";
import type { ComponentType, SVGProps } from "react";
import { Section } from "../_primitives/section";
import styles from "./styles.module.css";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

type Cell = boolean;

const COLUMNS = ["Pond", "Raindrop", "Pocket", "Instapaper"] as const;

const ROWS: {
  icon: Icon;
  label: string;
  values: readonly [Cell, Cell, Cell, Cell];
}[] = [
  {
    icon: IconComputer,
    label: "Local-first. Nothing leaves your Mac",
    values: [true, false, false, false],
  },
  {
    icon: IconFolder,
    label: "A folder you own",
    values: [true, false, false, false],
  },
  {
    icon: IconImage,
    label: "Original media, not compressed copies",
    values: [true, false, false, false],
  },
  {
    icon: IconGlobe,
    label: "Nine platforms, plus the web",
    values: [true, false, false, false],
  },
  {
    icon: IconScanImage,
    label: "On-device captions, text in images, and visual search",
    values: [true, false, false, false],
  },
];

function CellMark({ on }: { on: boolean }) {
  if (on) {
    return (
      <span className={styles.yes}>
        <IconCircleCheckFill />
        <span className={styles.sr}>Yes</span>
      </span>
    );
  }

  return (
    <span className={styles.no}>
      <IconMinus />
      <span className={styles.sr}>No</span>
    </span>
  );
}

export function Compare() {
  return (
    <Section.Root id="compare">
      <Section.Header>
        <Section.Eyebrow>Comparison</Section.Eyebrow>
        <Section.Title>
          How <em>Pond</em> compares
        </Section.Title>
        <Section.Lead>
          Bookmark managers keep a copy in the cloud. Pond keeps the original on
          your Mac.
        </Section.Lead>
      </Section.Header>
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.feature} />
              {COLUMNS.map((name, index) => (
                <th
                  key={name}
                  className={styles.product}
                  data-pond={index === 0 || undefined}
                >
                  {index === 0 ? <Logo size={28} /> : null}
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th className={styles.label} scope="row">
                  <span className={styles["label-inner"]}>
                    <row.icon />
                    {row.label}
                  </span>
                </th>
                {row.values.map((value, index) => (
                  <td
                    key={COLUMNS[index]}
                    className={styles.cell}
                    data-pond={index === 0 || undefined}
                  >
                    <CellMark on={value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section.Root>
  );
}
