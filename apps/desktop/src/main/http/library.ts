import { Hono } from "hono";
import {
  ConversionApiRequestSchema,
  ConversionPresetSchema,
  ImageCompressionRequestSchema,
} from "../../shared/conversion-contracts";
import { LibraryQueryRequestSchema } from "../../shared/library-query";
import { queryActiveLibraryPage } from "../core/active-library-query";
import { conversionCapabilities } from "../core/conversion-capabilities";
import {
  conversionJobs,
  conversionPresets,
  saveConversionPreset,
} from "../core/conversion-jobs";
import { handleApiError, invalidRequest } from "./errors";

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
    if (!parsed.success) return invalidRequest(c, parsed.error);
    return c.json({
      status: "success",
      data: saveConversionPreset(parsed.data),
    });
  });
  routes.post("/conversion/start", async (c) => {
    const parsed = ConversionApiRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidRequest(c, parsed.error);
    return c.json({
      status: "success",
      data: conversionJobs.start(parsed.data),
    });
  });
  routes.post("/conversion/compress", async (c) => {
    const parsed = ImageCompressionRequestSchema.safeParse(await c.req.json());
    if (!parsed.success) return invalidRequest(c, parsed.error);
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
    if (!parsed.success) return invalidRequest(c, parsed.error);
    return c.json({
      status: "success",
      data: await queryActiveLibraryPage(parsed.data),
    });
  });
  routes.onError(handleApiError);
  return routes;
}
