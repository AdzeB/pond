import type { Context } from "hono";
import { sessionPending } from "../ops";

export async function sessionPendingHandler(c: Context): Promise<Response> {
  return c.json({
    status: "success",
    data: sessionPending(),
  });
}
