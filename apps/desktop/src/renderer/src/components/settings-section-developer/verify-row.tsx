import { Button, Settings, useToast } from "@pond/ui";
import { useState } from "react";

interface IntegrityReport {
  orphans: string[];
  missing: string[];
  errors: Record<string, string>;
  totalIndexed: number;
  totalOnDisk: number;
}

export function VerifyRow() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<IntegrityReport | null>(null);

  async function verify() {
    setBusy(true);
    try {
      const res = (await window.pond.query("library.verifyIntegrity", {})) as
        | (IntegrityReport & { ok: true })
        | { ok: false; reason: string };
      if (!res.ok) {
        toast.add({
          title: "Verification failed",
          description: res.reason,
          type: "error",
        });
        return;
      }
      setReport({
        orphans: res.orphans,
        missing: res.missing,
        errors: res.errors,
        totalIndexed: res.totalIndexed,
        totalOnDisk: res.totalOnDisk,
      });
      const drift = res.orphans.length + res.missing.length;
      toast.add({
        title: drift === 0 ? "Library is clean" : "Drift detected",
        description:
          drift === 0
            ? `${res.totalIndexed}\u00A0items match on disk and in the index.`
            : `${res.orphans.length} on disk only · ${res.missing.length} indexed only.`,
        type: drift === 0 ? "success" : "warning",
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
