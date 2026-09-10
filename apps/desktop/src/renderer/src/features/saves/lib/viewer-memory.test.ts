// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  actualToSlider,
  FIT_POSE,
  sliderToActual,
  viewerMemory,
  zoomImageAt,
} from "./viewer-memory";

describe("viewer continuity", () => {
  const storage = new Map<string, string>();
  beforeAll(() =>
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    }),
  );
  afterAll(() => vi.unstubAllGlobals());
  it("keeps the point under the pointer fixed when zooming", () => {
    const before = { zoom: 2, x: 40, y: -30 };
    const point = { x: 100, y: 80 };
    const after = zoomImageAt(before, 4, point);
    expect((point.x - after.x) / after.zoom).toBe(
      (point.x - before.x) / before.zoom,
    );
    expect((point.y - after.y) / after.zoom).toBe(
      (point.y - before.y) / before.zoom,
    );
    expect(zoomImageAt(FIT_POSE, 100, point).zoom).toBe(32);
  });
  it("retains independent image poses and playback positions", () => {
    viewerMemory.setImage("pond://memory-a/a.jpg", { zoom: 3, x: 10, y: 20 });
    viewerMemory.setPlayback("pond://memory-a/a.jpg", 42);
    viewerMemory.setLoop("pond://memory-a/a.jpg", [10, 20]);
    viewerMemory.setImage("pond://memory-b/b.jpg", { zoom: 2, x: 0, y: 0 });
    expect(viewerMemory.image("pond://memory-a/a.jpg")).toEqual({
      zoom: 3,
      x: 10,
      y: 20,
    });
    expect(viewerMemory.playback("pond://memory-a/a.jpg")).toBe(42);
    expect(viewerMemory.loop("pond://memory-a/a.jpg")).toEqual([10, 20]);
    viewerMemory.setLoop("pond://memory-a/a.jpg", null);
    expect(viewerMemory.loop("pond://memory-a/a.jpg")).toBeNull();
    expect(viewerMemory.image("missing")).toEqual(FIT_POSE);
    expect(window.localStorage.getItem("pond:viewer-memory")).toContain(
      "memory-a",
    );
  });
  it("bounds persistent viewing history", () => {
    for (let index = 0; index < 205; index += 1)
      viewerMemory.setPlayback(`bounded-${index}`, index);
    expect(viewerMemory.playback("bounded-1")).toBe(0);
    expect(viewerMemory.playback("bounded-204")).toBe(204);
    expect(
      JSON.parse(window.localStorage.getItem("pond:viewer-memory") ?? "[]"),
    ).toHaveLength(200);
  });

  it("stores a single-frame GIF loop at frame zero", () => {
    viewerMemory.setLoop("pond://gif/loop.gif", [0, 0]);
    expect(viewerMemory.loop("pond://gif/loop.gif")).toEqual([0, 0]);
  });
});

describe("zoom slider", () => {
  it("places actual size at the midpoint", () => {
    expect(sliderToActual(50)).toBeCloseTo(1);
    expect(actualToSlider(1)).toBeCloseTo(50);
  });

  it("maps the ends to 5% and 800%", () => {
    expect(sliderToActual(0)).toBeCloseTo(0.05);
    expect(sliderToActual(100)).toBeCloseTo(8);
    expect(actualToSlider(0.05)).toBeCloseTo(0);
    expect(actualToSlider(8)).toBeCloseTo(100);
  });
});
