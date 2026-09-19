import { describe, expect, it, vi } from "vitest";
import {
  recallScroll,
  recallScrollAnchor,
  rememberScroll,
  rememberScrollAnchor,
} from "./use-scroll-restoration";

describe("scroll restoration", () => {
  it("keeps independent offsets per tab and route", () => {
    rememberScroll("tab-a:/", 820);
    rememberScroll("tab-b:/", 140);
    rememberScroll("tab-a:/trash", 360);

    expect(recallScroll("tab-a:/")).toBe(820);
    expect(recallScroll("tab-b:/")).toBe(140);
    expect(recallScroll("tab-a:/trash")).toBe(360);
  });

  it("clamps invalid negative offsets", () => {
    rememberScroll("tab-a:/sources", -20);
    expect(recallScroll("tab-a:/sources")).toBe(0);
  });

  it("starts a fresh renderer at the top", async () => {
    rememberScroll("tab-reload:/", 4321);
    vi.resetModules();
    const fresh = await import("./use-scroll-restoration");

    expect(fresh.recallScroll("tab-reload:/")).toBe(0);
  });

  it("keeps a card identity anchor with its pixel fallback", () => {
    rememberScrollAnchor("tab-anchor:/", 7000, {
      id: "save-123",
      offset: 42,
    });

    expect(recallScroll("tab-anchor:/")).toBe(7000);
    expect(recallScrollAnchor("tab-anchor:/")).toEqual({
      id: "save-123",
      offset: 42,
    });
    rememberScroll("tab-anchor:/", 7010);
    expect(recallScrollAnchor("tab-anchor:/")).toEqual({
      id: "save-123",
      offset: 42,
    });
  });
});
