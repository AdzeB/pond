import { IconChevronLeftOutline12 as BackIcon } from "@pond/icons/outline/12";
import { Fragment, useMemo } from "react";
import { ClippedScroll } from "@/components/clipped-scroll";
import { useDock } from "@/components/library-dock/lib/context";
import { Dock } from "@/components/library-view-menu-group";
import { FIELD_ICONS } from "@/lib/search/fields";
import { buildGroups, GROUP_LABELS } from "./filters-menu";
import styles from "./help.module.css";

/** The search card's drill-down reference page: every filter key with its accepted values. */
export function SearchHelpSection() {
  const dock = useDock();
  const groups = useMemo(buildGroups, []);

  return (
    <Dock.Root>
      <button
        type="button"
        aria-label="Back to search"
        className={styles.back}
        onClick={() => dock.openSearch()}
      >
        <BackIcon strokeWidth={2} />
      </button>
      <Dock.Header>
        <Dock.Title>Search Help</Dock.Title>
        <Dock.Separator />
        <Dock.Description>
          Plain words match titles, notes, and captions. Add key:value filters
          to narrow things down — combine as many as you need, and press Esc to
          clear.
        </Dock.Description>
      </Dock.Header>
      <ClippedScroll maxHeight={300} className={styles.list}>
        {groups.map(({ group, fields }) => (
          <Fragment key={group}>
            <div className={styles["group-label"]}>{GROUP_LABELS[group]}</div>
            {fields.map((entry) => {
              const Icon = FIELD_ICONS[entry.field];
              return (
                <div key={entry.field} className={styles.row}>
                  <span className={styles["row-icon"]}>
                    <Icon width={15} height={15} />
                  </span>
                  <span className={styles["row-label"]}>{entry.label}</span>
                  <span className={styles["row-key"]}>{entry.key}:</span>
                  {entry.hint ? (
                    <span className={styles["row-hint"]}>{entry.hint}</span>
                  ) : null}
                </div>
              );
            })}
          </Fragment>
        ))}
      </ClippedScroll>
    </Dock.Root>
  );
}
