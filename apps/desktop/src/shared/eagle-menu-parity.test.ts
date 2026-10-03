import { describe, expect, it } from "vitest";
import { z } from "zod";
import manifest from "../../test/fixtures/compatibility/eagle-menus/manifest.json";

const SourceSchema = z.object({
  application: z.literal("Eagle"),
  version: z.literal("4.0.0"),
  platform: z.literal("macOS"),
  evidence: z.array(z.string().min(1)).min(1),
});

const ExclusionSchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1),
});

const SurfaceSchema = z.object({
  id: z.string().min(1),
  commands: z.array(z.string().min(1)).min(1),
});

const ManifestSchema = z.object({
  source: SourceSchema,
  excluded: z.array(ExclusionSchema),
  surfaces: z.array(SurfaceSchema).min(1),
});

describe("Eagle menu parity contract", () => {
  const parsed = ManifestSchema.parse(manifest);

  it("tracks every audited first-party menu surface", () => {
    expect(parsed.surfaces).toHaveLength(37);
  });

  it("uses unique surface and exclusion identifiers", () => {
    const ids = [
      ...parsed.surfaces.map((surface) => surface.id),
      ...parsed.excluded.map((excluded) => excluded.id),
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps excluded surfaces explicit", () => {
    expect(parsed.excluded.map((excluded) => excluded.id)).toEqual([
      "collect-window",
      "community",
      "licensing",
      "plugins",
    ]);
  });

  it("does not duplicate commands inside a surface", () => {
    for (const surface of parsed.surfaces) {
      expect(
        new Set(surface.commands).size,
        `${surface.id} contains duplicate commands`,
      ).toBe(surface.commands.length);
    }
  });
});
