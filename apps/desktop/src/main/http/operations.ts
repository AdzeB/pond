import { randomUUID } from "node:crypto";
import {
  LocalApiOperationRequestSchema,
  LocalApiOperationRunSchema,
} from "@pond/schema/local-api";
import { Hono } from "hono";
import { z } from "zod";
import {
  applyPondOperation,
  pondOperationCatalog,
} from "../core/agent/operations";

interface Preview {
  operation: string;
  arguments: string;
  libraryId: string;
  expiresAt: number;
}

const previews = new Map<string, Preview>();
const PREVIEW_TTL_MS = 5 * 60_000;

function operation(name: string) {
  return pondOperationCatalog().operations.find((entry) => entry.name === name);
}

function prunePreviews(now = Date.now()): void {
  for (const [token, preview] of previews) {
    if (preview.expiresAt <= now) previews.delete(token);
  }
}

export function operationRoutes(): Hono {
  const routes = new Hono();

  routes.get("/", (c) =>
    c.json({
      status: "success",
      data: pondOperationCatalog().operations.map((entry) => ({
        name: entry.name,
        description: entry.description,
        access: entry.access,
        inputSchema: z.toJSONSchema(entry.inputSchema, {
          io: "input",
          unrepresentable: "any",
        }),
      })),
    }),
  );

  routes.post("/preview", async (c) => {
    const parsed = LocalApiOperationRequestSchema.safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.flatten() }, 400);
    const selected = operation(parsed.data.operation);
    if (!selected)
      return c.json({ status: "error", error: "operation_not_found" }, 404);
    selected.inputSchema.parse(parsed.data.arguments);
    const libraryId = pondOperationCatalog().libraryId();
    const token = randomUUID();
    const expiresAt = Date.now() + PREVIEW_TTL_MS;
    prunePreviews();
    previews.set(token, {
      operation: selected.name,
      arguments: JSON.stringify(parsed.data.arguments),
      libraryId,
      expiresAt,
    });
    return c.json({
      status: "success",
      data: { token, operation: selected.name, libraryId, expiresAt },
    });
  });

  routes.post("/run", async (c) => {
    const parsed = LocalApiOperationRunSchema.safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.flatten() }, 400);
    const selected = operation(parsed.data.operation);
    if (!selected)
      return c.json({ status: "error", error: "operation_not_found" }, 404);
    selected.inputSchema.parse(parsed.data.arguments);
    const libraryId = pondOperationCatalog().libraryId();
    if (selected.access === "review") {
      const preview = parsed.data.token
        ? previews.get(parsed.data.token)
        : undefined;
      if (parsed.data.token) previews.delete(parsed.data.token);
      if (
        !preview ||
        preview.expiresAt <= Date.now() ||
        preview.operation !== selected.name ||
        preview.libraryId !== libraryId ||
        preview.arguments !== JSON.stringify(parsed.data.arguments)
      )
        return c.json({ status: "error", error: "stale_preview" }, 409);
    }
    const result = await applyPondOperation({
      operation: selected.name,
      arguments: parsed.data.arguments,
      libraryId,
    });
    return c.json({ status: "success", data: result });
  });

  routes.onError((error, c) => {
    if (error instanceof SyntaxError)
      return c.json({ status: "error", error: "invalid_json" }, 400);
    if (error instanceof z.ZodError)
      return c.json({ status: "error", error: error.flatten() }, 400);
    return c.json({ status: "error", error: error.message }, 500);
  });

  return routes;
}
