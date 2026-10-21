import { z } from "zod";

export const CANVAS_COLORS = [
  "gray",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "blue",
  "green",
] as const;
export const CanvasColorSchema = z.enum(CANVAS_COLORS);
export type CanvasColor = z.infer<typeof CanvasColorSchema>;

export const CANVAS_SIDES = ["top", "right", "bottom", "left"] as const;
const CanvasSideSchema = z.enum(CANVAS_SIDES);
export type CanvasSide = z.infer<typeof CanvasSideSchema>;

const CANVAS_OUTLINES = [
  "rectangle",
  "rounded",
  "ellipse",
  "diamond",
  "triangle",
] as const;
const CanvasOutlineSchema = z.enum(CANVAS_OUTLINES);
export type CanvasOutline = z.infer<typeof CanvasOutlineSchema>;

const CANVAS_LINES = ["curved", "elbow", "straight"] as const;
const CanvasLineSchema = z.enum(CANVAS_LINES);
export type CanvasLine = z.infer<typeof CanvasLineSchema>;

/** Canvas IDs name files inside the Library, so they never contain path separators. */
export const CanvasIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const CoordinateSchema = z.number().min(-1_000_000).max(1_000_000);
const LengthSchema = z.number().min(1).max(20_000);
const TextSchema = z.string().max(20_000);

const frame = {
  id: CanvasIdSchema,
  x: CoordinateSchema,
  y: CoordinateSchema,
  width: LengthSchema,
  height: LengthSchema,
};

export const CanvasItemSchema = z.discriminatedUnion("kind", [
  z.object({
    ...frame,
    kind: z.literal("save"),
    saveId: z.string().min(1).max(200),
  }),
  z.object({
    ...frame,
    kind: z.literal("note"),
    text: TextSchema,
    color: CanvasColorSchema,
  }),
  z.object({ ...frame, kind: z.literal("text"), text: TextSchema }),
  z.object({
    ...frame,
    kind: z.literal("figure"),
    outline: CanvasOutlineSchema,
    text: TextSchema,
    color: CanvasColorSchema,
  }),
  z.object({
    ...frame,
    kind: z.literal("drawing"),
    color: CanvasColorSchema,
    size: z.number().min(1).max(48),
    points: z
      .array(
        z.tuple([CoordinateSchema, CoordinateSchema, z.number().min(0).max(1)]),
      )
      .min(1)
      .max(10_000),
  }),
]);
export type CanvasItem = z.infer<typeof CanvasItemSchema>;

export const CanvasConnectorSchema = z.object({
  id: CanvasIdSchema,
  from: CanvasIdSchema,
  to: CanvasIdSchema,
  fromSide: CanvasSideSchema,
  toSide: CanvasSideSchema,
  /** Style fields default so connectors written before they existed still load. */
  line: CanvasLineSchema.default("curved"),
  startArrow: z.boolean().default(false),
  endArrow: z.boolean().default(true),
  dashed: z.boolean().default(false),
  color: CanvasColorSchema.default("gray"),
  label: TextSchema.default(""),
});
export type CanvasConnector = z.infer<typeof CanvasConnectorSchema>;

export const CanvasViewportSchema = z.object({
  x: z.number().min(-10_000_000).max(10_000_000),
  y: z.number().min(-10_000_000).max(10_000_000),
  zoom: z.number().min(0.05).max(8),
});
export type CanvasViewport = z.infer<typeof CanvasViewportSchema>;

const contentFields = {
  viewport: CanvasViewportSchema,
  items: z.array(CanvasItemSchema).max(5_000),
  connectors: z.array(CanvasConnectorSchema).max(10_000),
};

function checkReferences(
  content: { items: CanvasItem[]; connectors: CanvasConnector[] },
  context: z.RefinementCtx,
): void {
  const ids = new Set<string>();
  for (const item of content.items) {
    if (ids.has(item.id))
      context.addIssue({
        code: "custom",
        message: `Duplicate item ${item.id}`,
      });
    ids.add(item.id);
  }
  for (const connector of content.connectors) {
    if (!ids.has(connector.from) || !ids.has(connector.to))
      context.addIssue({
        code: "custom",
        message: `Connector ${connector.id} points at a missing item`,
      });
  }
}

export const CanvasContentSchema = z
  .object(contentFields)
  .superRefine(checkReferences);
export type CanvasContent = z.infer<typeof CanvasContentSchema>;
export type CanvasContentInput = z.input<typeof CanvasContentSchema>;

export const CanvasSchema = z
  .object({
    id: CanvasIdSchema,
    name: z.string().trim().min(1).max(200),
    createdAt: z.number(),
    updatedAt: z.number(),
    ...contentFields,
  })
  .superRefine(checkReferences);
export type Canvas = z.infer<typeof CanvasSchema>;

export interface CanvasSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  itemCount: number;
  saveIds: string[];
}

export interface CanvasQueryInputs {
  "canvases.list": Record<string, never>;
  "canvases.get": { id: string };
  "canvases.create": { name?: string; saveIds?: string[] };
  "canvases.rename": { id: string; name: string };
  "canvases.update": { id: string; content: CanvasContent };
  "canvases.addSaves": { id: string; saveIds: string[] };
  "canvases.delete": { id: string };
}

export interface CanvasQueryResults {
  "canvases.list": CanvasSummary[];
  "canvases.get": Canvas | null;
  "canvases.create": Canvas;
  "canvases.rename": { ok: true };
  "canvases.update": { ok: true; updatedAt: number };
  "canvases.addSaves": Canvas;
  "canvases.delete": { ok: true };
}
