import { dialog } from "electron";
import { z } from "zod";
import {
  ConversionPresetSchema,
  ConversionRequestSchema,
} from "../../../shared/conversion-contracts";
import {
  conversionJobs,
  conversionPresets,
  deleteConversionPreset,
  saveConversionPreset,
} from "../../core/conversion-jobs";
import { query } from "./params";

const Id = z.object({ id: z.string().min(1) });
export const conversionQueries = {
  "conversion.presets": query(z.object({}), () => conversionPresets()),
  "conversion.savePreset": query(
    z.object({ preset: ConversionPresetSchema }),
    ({ preset }) => saveConversionPreset(preset),
  ),
  "conversion.deletePreset": query(Id, ({ id }) => {
    deleteConversionPreset(id);
    return { ok: true as const };
  }),
  "conversion.start": query(ConversionRequestSchema, async (request) => {
    const picked = await dialog.showOpenDialog({
      title: "Export Converted Files",
      properties: ["openDirectory", "createDirectory"],
    });
    const directory = picked.filePaths[0];
    return picked.canceled || !directory
      ? null
      : conversionJobs.start({ ...request, directory });
  }),
  "conversion.status": query(Id, ({ id }) => conversionJobs.status(id)),
  "conversion.cancel": query(Id, ({ id }) => conversionJobs.cancel(id)),
};
