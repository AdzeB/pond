import { IPC } from "../../../shared/constants";
import { showNotification } from "../../core/notifications";
import { safeHandle } from "../helpers";

export function registerNotificationHandlers(): void {
  safeHandle(
    IPC.notificationShow,
    async (
      _,
      raw: unknown,
    ): Promise<{ ok: boolean; reason?: "unsupported" | "invalid" }> => {
      if (!raw || typeof raw !== "object") {
        return { ok: false, reason: "invalid" };
      }
      const obj = raw as Record<string, unknown>;
      if (typeof obj.title !== "string" || !obj.title) {
        return { ok: false, reason: "invalid" };
      }
      const ok = showNotification({
        title: obj.title,
        body: typeof obj.body === "string" ? obj.body : undefined,
        silent: typeof obj.silent === "boolean" ? obj.silent : undefined,
      });
      return ok ? { ok: true } : { ok: false, reason: "unsupported" };
    },
  );
}
