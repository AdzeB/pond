import { LocalApiSwitchLibraryRequestSchema } from "@pond/schema/local-api";
import { Hono } from "hono";
import type { QueryResult } from "../../shared/query-contracts";
import { libraryLocationQueries } from "../ipc/queries/library-locations";
import { apiError, handleApiError } from "./errors";

interface LibraryLocationRouteDeps {
  recent: () => Promise<QueryResult<"library.recent">>;
  switchTo: (path: string) => Promise<QueryResult<"library.switchTo">>;
}

const defaultDeps: LibraryLocationRouteDeps = {
  recent: () => libraryLocationQueries["library.recent"](),
  switchTo: (path) => libraryLocationQueries["library.switchTo"]({ path }),
};

export function libraryLocationRoutes(
  deps: LibraryLocationRouteDeps = defaultDeps,
): Hono {
  const routes = new Hono();

  routes.get("/recent", async (c) =>
    c.json({ status: "success", data: await deps.recent() }),
  );

  routes.post("/switch", async (c) => {
    const parsed = LocalApiSwitchLibraryRequestSchema.safeParse(
      await c.req.json(),
    );
    if (!parsed.success) {
      return apiError(c, "invalid_request", "Choose a recent Library.");
    }
    const result = await deps.switchTo(parsed.data.path);
    if (!result.ok) {
      return apiError(
        c,
        "library_unavailable",
        result.error ?? "Could not switch Libraries.",
      );
    }
    return c.json({ status: "success", data: result });
  });

  routes.onError(handleApiError);

  return routes;
}
