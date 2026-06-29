import { Button, Settings } from "@pond/ui";
import { useState } from "react";

interface IntegrityReport {
  orphans: string[];
  missing: string[];
  errors: Record<string, string>;
  totalIndexed: number;
  totalOnDisk: number;
}

export function VerifyRow() {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<IntegrityReport | null>(null);

  async function verify() {
    setBusy(true);
    try {
      const res = (await window.pond.query("library.verifyIntegrity", {})) as
        | (IntegrityReport & { ok: true })
        | { ok: false; reason: string };
      if (!res.ok) return;
      setReport({
        orphans: res.orphans,
        missing: res.missing,
        errors: res.errors,
        totalIndexed: res.totalIndexed,
        totalOnDisk: res.totalOnDisk,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Settings.ItemDetails>
        <Settings.ItemTitle>Verify Integrity</Settings.ItemTitle>
        <Settings.ItemDescription>
          {report
            ? `Last run: ${report.totalIndexed} indexed, ${report.totalOnDisk} on disk · ${report.orphans.length} orphan, ${report.missing.length} missing`
            : "Compare on-disk library items against the SQLite index."}
        </Settings.ItemDescription>
      </Settings.ItemDetails>
      <Settings.ItemControl>
        <Button size="sm" disabled={busy} onClick={() => void verify()}>
          {busy ? "Checking…" : "Run Check"}
        </Button>
      </Settings.ItemControl>
    </>
  );
}
