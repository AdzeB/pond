import { TrayCard } from "@pond/ui";
import { useEffect, useRef, useState } from "react";
import { useDashboards } from "@/components/library/analytics/lib/dashboards";
import { useDock } from "@/components/library/dock/lib/context";
import styles from "./styles.module.css";

export function AnalyticsRenameSection() {
  const dock = useDock();
  const { dashboard, patchDashboard } = useDashboards();
  const [name, setName] = useState(dashboard.name);
  const [description, setDescription] = useState(dashboard.description);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.select();
  }, []);

  const canRename = name.trim().length > 0;

  const rename = () => {
    if (!canRename) return;
    patchDashboard({ name: name.trim(), description: description.trim() });
    dock.closeViewMenu();
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>Rename Dashboard</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
      </TrayCard.Header>
      <div className={styles.fields}>
        <div className={styles.field}>
          <input
            ref={nameRef}
            type="text"
            placeholder="Dashboard name…"
            aria-label="Dashboard name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename();
            }}
          />
        </div>
        <div className={styles.field}>
          <input
            type="text"
            placeholder="Add a description…"
            aria-label="Dashboard description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename();
            }}
          />
        </div>
      </div>
      <TrayCard.Footer>
        <TrayCard.Confirm
          disabled={!canRename}
          onClick={(e) => {
            e.preventDefault();
            rename();
          }}
        >
          Rename Dashboard
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
