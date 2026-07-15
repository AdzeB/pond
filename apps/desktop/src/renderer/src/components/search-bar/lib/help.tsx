import { TrayCard } from "@pond/ui";
import { Fragment, useMemo } from "react";
import { ClippedScroll } from "@/components/clipped-scroll";
import { useDock } from "@/components/library-dock/lib/context";
import { FIELD_ICONS } from "@/lib/search/fields";
import { buildGroups, GROUP_LABELS } from "./filters-menu";
import styles from "./help.module.css";

/** The search card's drill-down reference page: every filter key with its accepted values. */
export function SearchHelpSection() {
  const dock = useDock();
  const groups = useMemo(buildGroups, []);

  return (
    <>
      <TrayCard.Back
        aria-label="Back to search"
        onClick={() => dock.openSearch()}
      />
      <TrayCard.Close />
      <TrayCard.Header>
        <TrayCard.Title>Search Help</TrayCard.Title>
        <TrayCard.Separator />
        <TrayCard.Description>
          Plain words match titles, notes, and captions. Add key:value filters
          to narrow things down — combine as many as you need, and press Esc to
          clear.
        </TrayCard.Description>
      </TrayCard.Header>
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
    </>
  );
}
