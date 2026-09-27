import { basename } from "node:path";
import { Hono } from "hono";
import {
  ConversionApiRequestSchema,
  ConversionPresetSchema,
  ImageCompressionRequestSchema,
} from "../../shared/conversion-contracts";
import { LibraryQueryRequestSchema } from "../../shared/library-query";
import { conversionCapabilities } from "../core/conversion-capabilities";
import {
  conversionJobs,
  conversionPresets,
  saveConversionPreset,
} from "../core/conversion-jobs";
import { queryLibraryPage } from "../core/library-query";
import { getDb } from "../db";
import { resolvePaths } from "../paths";

export function libraryRoutes() {
  const routes = new Hono();
  routes.get("/conversion/capabilities", async (c) =>
    c.json({ status: "success", data: await conversionCapabilities() }),
  );
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
  routes.post("/conversion/compress", async (c) => {
    const parsed = ImageCompressionRequestSchema.safeParse(await c.req.json());
    if (!parsed.success)
      return c.json({ status: "error", error: parsed.error.message }, 400);
    return c.json({
      status: "success",
      data: conversionJobs.startCompression(parsed.data),
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
  routes.onError((error, c) => {
    if (error instanceof SyntaxError)
      return c.json({ status: "error", error: "Invalid JSON." }, 400);
    return c.json({ status: "error", error: error.message }, 500);
  });
  return routes;
}
