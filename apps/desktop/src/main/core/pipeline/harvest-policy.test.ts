import { describe, expect, it } from "vitest";
import {
  harvestShouldIgnoreSave,
  harvestShouldReseedFailedSave,
} from "./harvest-policy";

describe("harvestShouldIgnoreSave", () => {
  it("ignores skipped and trashed saves", () => {
    expect(
      harvestShouldIgnoreSave({ status: "skipped", deletedAt: null }),
    ).toBe(true);
    expect(
      harvestShouldIgnoreSave({
        status: "failed",
        deletedAt: new Date(1),
      }),
    ).toBe(true);
    expect(harvestShouldIgnoreSave({ status: "failed", deletedAt: null })).toBe(
      false,
    );
  });
});

describe("harvestShouldReseedFailedSave", () => {
  it("reseeds a live failed save only when a seed is present", () => {
    expect(
      harvestShouldReseedFailedSave(
        { status: "failed", deletedAt: null },
        true,
      ),
    ).toBe(true);
    expect(
      harvestShouldReseedFailedSave(
        { status: "failed", deletedAt: null },
        false,
      ),
    ).toBe(false);
    expect(
      harvestShouldReseedFailedSave(
        { status: "skipped", deletedAt: null },
        true,
      ),
    ).toBe(false);
    expect(
      harvestShouldReseedFailedSave(
        { status: "failed", deletedAt: new Date(1) },
        true,
      ),
    ).toBe(false);
  });
});
