import { basename } from "node:path";
import { Hono } from "hono";
import { z } from "zod";
import {
  ActionDefinitionSchema,
  ActionRequestSchema,
  ActionRunSchema,
} from "../../shared/action-contracts";
import {
  ConversionApiRequestSchema,
  ConversionPresetSchema,
} from "../../shared/conversion-contracts";
import { LibraryQueryRequestSchema } from "../../shared/library-query";
import {
  conversionJobs,
  conversionPresets,
  saveConversionPreset,
} from "../core/conversion-jobs";
import {
  deleteAction,
  prepareAction,
  readActions,
  runAction,
  saveAction,
} from "../core/library-actions";
import { queryLibraryPage } from "../core/library-query";
import { getDb } from "../db";
import { resolvePaths } from "../paths";

export function libraryActionRoutes() {
  const routes = new Hono();
  routes.get("/conversion/presets", (c) =>
    c.json({ status: "success", data: conversionPresets() }),
  );
  routes.post("/conversion/presets", async (c) => {
    const parsed = ConversionPresetSchema.safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.message }, 400);
    return c.json({
      status: "success",
      data: saveConversionPreset(parsed.data),
    });
  });
  routes.post("/conversion/start", async (c) => {
    const parsed = ConversionApiRequestSchema.safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.message }, 400);
    return c.json({
      status: "success",
      data: conversionJobs.start(parsed.data),
    });
  });
  routes.get("/conversion/:id", (c) =>
    c.json({
      status: "success",
      data: conversionJobs.status(c.req.param("id")),
    }),
  );
  routes.post("/conversion/:id/cancel", (c) =>
    c.json({
      status: "success",
      data: conversionJobs.cancel(c.req.param("id")),
    }),
  );
  routes.post("/query", async (c) => {
    const parsed = LibraryQueryRequestSchema.safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.message }, 400);
    const data = await queryLibraryPage(
      await getDb(),
      basename(resolvePaths().indexDb, ".db"),
      parsed.data,
    );
    return c.json({ status: "success", data });
  });
  routes.get("/actions", (c) =>
    c.json({ status: "success", data: readActions() }),
  );
  routes.post("/actions/save", async (c) => {
    const parsed = z
      .object({ definition: ActionDefinitionSchema })
      .safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.message }, 400);
    return c.json({
      status: "success",
      data: saveAction(parsed.data.definition),
    });
  });
  routes.post("/actions/delete", async (c) => {
    const parsed = z
      .object({ id: z.string().min(1) })
      .safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.message }, 400);
    deleteAction(parsed.data.id);
    return c.json({ status: "success" });
  });
  routes.post("/actions/preview", async (c) => {
    const parsed = ActionRequestSchema.safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.message }, 400);
    return c.json({
      status: "success",
      data: await prepareAction(parsed.data.definition, parsed.data.ids),
    });
  });
  routes.post("/actions/run", async (c) => {
    const parsed = ActionRunSchema.safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.message }, 400);
    const { definition, ids, expectedToken } = parsed.data;
    return c.json({
      status: "success",
      data: { changed: await runAction(definition, ids, expectedToken) },
    });
  });
  routes.onError((error, c) => {
    if (error instanceof SyntaxError)
      return c.json({ status: "error", error: "Invalid JSON." }, 400);
    return c.json({ status: "error", error: error.message }, 500);
  });
  return routes;
}
