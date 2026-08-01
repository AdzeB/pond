import type { Context } from "hono";
import { getPendingSessionSource } from "../pending-session";

export async function sessionPendingHandler(c: Context): Promise<Response> {
  const source = getPendingSessionSource();
  return c.json({
    status: "success",
    data: source ? { source } : null,
  });
}
