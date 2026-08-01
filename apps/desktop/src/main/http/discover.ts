/** Loopback-only token handoff so the extension can link without a copy/paste ceremony. */
import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { DEFAULT_INGEST_PORT } from "../../shared/constants";
import { getIngestToken } from "../keychain";

let listeningPort = DEFAULT_INGEST_PORT;

export function setDiscoverPort(port: number): void {
  listeningPort = port;
}

function isLoopback(address: string | undefined): boolean {
  if (!address) return false;
  const a = address.replace(/^::ffff:/, "").toLowerCase();
  return a === "127.0.0.1" || a === "::1" || a === "localhost";
}

export async function discoverHandler(c: Context): Promise<Response> {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    getConnInfo(c).remote.address ||
    "";
  if (!isLoopback(ip)) {
    return c.json({ status: "error", error: "forbidden" }, 403);
  }

  const token = await getIngestToken();
  if (!token) {
    return c.json({ status: "error", error: "unavailable" }, 503);
  }

  return c.json({
    status: "success",
    data: {
      port: listeningPort,
      token,
    },
  });
}
