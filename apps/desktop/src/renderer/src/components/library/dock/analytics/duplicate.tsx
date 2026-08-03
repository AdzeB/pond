import { TrayCard } from "@pond/ui";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useDashboards } from "@/components/library/analytics/lib/dashboards";
import { useDock } from "@/components/library/dock/lib/context";
import styles from "./styles.module.css";

export function AnalyticsDuplicateSection() {
  const dock = useDock();
  const navigate = useNavigate();
  const { dashboard, duplicateDashboard } = useDashboards();
  const [name, setName] = useState(`${dashboard.name} copy`);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const canDuplicate = name.trim().length > 0;

  const duplicate = () => {
    if (!canDuplicate) return;
    const id = duplicateDashboard(name.trim());
    dock.closeViewMenu();
    void navigate({
      to: "/analytics/$dashboardId",
      params: { dashboardId: id },
    });
  };

  return (
    <>
      <TrayCard.Header>
        <TrayCard.Title>Duplicate Dashboard</TrayCard.Title>
        <TrayCard.Close />
        <TrayCard.Separator />
        <TrayCard.Description>
          Copies “{dashboard.name}” and all of its insights.
        </TrayCard.Description>
      </TrayCard.Header>
      <div className={styles.field}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Name of the copy…"
          aria-label="Name of the copy"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") duplicate();
          }}
        />
      </div>
      <TrayCard.Footer>
        <TrayCard.Confirm
          disabled={!canDuplicate}
          onClick={(e) => {
            e.preventDefault();
            duplicate();
          }}
        >
          Duplicate Dashboard
        </TrayCard.Confirm>
      </TrayCard.Footer>
    </>
  );
}
