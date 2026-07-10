import { describe, expect, it } from "vitest";
import {
  adoptLegacyPondKeys,
  type PondPrefs,
  type StoredPrefsV2,
  splitPrefsPatch,
} from "./prefs-scope";

const GREEN = { themeMode: "preset", presetId: "mint" };

function storedWith(app: Record<string, unknown>): StoredPrefsV2 {
  return { version: 2, app, ponds: {} } as StoredPrefsV2;
}

describe("splitPrefsPatch", () => {
  it("routes appearance (preferences) to the pond slice", () => {
    const { app, pond } = splitPrefsPatch({
      preferences: { presetId: "mint" },
      window: { restorePosition: false },
    });
    expect(pond).toEqual({ preferences: { presetId: "mint" } });
    expect(app).toEqual({ window: { restorePosition: false } });
  });
});

describe("adoptLegacyPondKeys", () => {
  it("adopts a slice that used to be app-scoped when the bundle lacks it", () => {
    const stored = storedWith({ preferences: GREEN });
    const bundle: Partial<PondPrefs> = { sync: {} as PondPrefs["sync"] };

    const { slice, changed } = adoptLegacyPondKeys(bundle, stored, "pond-a");
    expect(changed).toBe(true);
    expect(slice.preferences).toEqual(GREEN);
    // Existing bundle keys are untouched.
    expect(slice.sync).toBe(bundle.sync);
  });

  it("never overwrites a value already in the bundle", () => {
    const stored = storedWith({ preferences: GREEN });
    const bundle = {
      preferences: { presetId: "ocean" },
    } as unknown as Partial<PondPrefs>;

    const { slice, changed } = adoptLegacyPondKeys(bundle, stored, "pond-a");
    expect(changed).toBe(false);
    expect(
      (slice.preferences as unknown as { presetId: string }).presetId,
    ).toBe("ocean");
  });

  it("prefers the pond's own legacy entry over the stale app value", () => {
    const stored = {
      version: 2,
      app: { preferences: GREEN },
      ponds: { "pond-a": { preferences: { presetId: "ocean" } } },
    } as unknown as StoredPrefsV2;

    const { slice, changed } = adoptLegacyPondKeys({}, stored, "pond-a");
    expect(changed).toBe(true);
    expect(
      (slice.preferences as unknown as { presetId: string }).presetId,
    ).toBe("ocean");
  });

  it("reports no change when there is nothing to adopt", () => {
    const { changed } = adoptLegacyPondKeys({}, storedWith({}), "pond-a");
    expect(changed).toBe(false);
  });
});
