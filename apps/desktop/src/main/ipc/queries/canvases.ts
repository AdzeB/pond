import { z } from "zod";
import {
  CanvasContentSchema,
  CanvasIdSchema,
} from "../../../shared/canvas-contracts";
import {
  addSavesToCanvas,
  createCanvas,
  deleteCanvas,
  listCanvases,
  readCanvas,
  renameCanvas,
  updateCanvas,
} from "../../core/canvases";
import { query } from "./params";

const Id = z.object({ id: CanvasIdSchema });
const SaveIds = z.array(z.string().min(1).max(200)).max(10_000);

export const canvasesQueries = {
  "canvases.list": query(z.object({}), () => listCanvases()),
  "canvases.get": query(Id, ({ id }) => readCanvas(id)),
  "canvases.create": query(
    z.object({
      name: z.string().max(200).optional(),
      saveIds: SaveIds.optional(),
    }),
    (input) => createCanvas(input),
  ),
  "canvases.rename": query(
    Id.extend({ name: z.string().max(200) }),
    ({ id, name }) => {
      renameCanvas(id, name);
      return { ok: true as const };
    },
  ),
  "canvases.update": query(
    Id.extend({ content: CanvasContentSchema }),
    ({ id, content }) => ({
      ok: true as const,
      updatedAt: updateCanvas(id, content),
    }),
  ),
  "canvases.addSaves": query(
    Id.extend({ saveIds: SaveIds.min(1) }),
    ({ id, saveIds }) => addSavesToCanvas(id, saveIds),
  ),
  "canvases.delete": query(Id, ({ id }) => {
    deleteCanvas(id);
    return { ok: true as const };
  }),
};
