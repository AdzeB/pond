import type { UpdateNotice } from "@shared/update-notice";
import { updateNoticeCopy } from "@shared/update-notice";
import { useEffect } from "react";
import { notify } from "@/shared/lib/toast";

export function UpdateNoticeBridge() {
  useEffect(() => {
    return window.pond.onUpdateNotice((notice) => {
      presentUpdateNotice(notice);
    });
  }, []);

  return null;
}

export function presentUpdateNotice(notice: UpdateNotice): void {
  const copy = updateNoticeCopy(notice);
  notify({
    id: notice.phase === "downloaded" ? "update-ready" : "update-available",
    title: copy.title,
    description: copy.description,
    timeout: notice.phase === "downloaded" ? 60_000 : 8_000,
    action: copy.action
      ? {
          label: copy.action,
          onClick: () => {
            const name =
              copy.action === "Restart"
                ? "updates.install"
                : "updates.download";
            void window.pond.query(name, {});
          },
        }
      : undefined,
  });
}
