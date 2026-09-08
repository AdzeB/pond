import { expect, it } from "vitest";
import { CosmosTileExtractor } from "./cosmos";
import { PinterestPinExtractor } from "./pinterest";
import { TikTokVideoExtractor } from "./tiktok";

const cosmos = new CosmosTileExtractor();
const pinterest = new PinterestPinExtractor();
const tiktok = new TikTokVideoExtractor();

it("reads a cosmos profile slug and ignores nav paths", () => {
  expect(cosmos.handleFromPath?.(["jane"])).toBe("jane");
  expect(cosmos.handleFromPath?.(["following"])).toBeNull();
  expect(cosmos.handleFromPath?.(["library"])).toBeNull();
});

it("reads a pinterest username and ignores pin and me paths", () => {
  expect(pinterest.handleFromPath?.(["someuser"])).toBe("someuser");
  expect(pinterest.handleFromPath?.(["pin"])).toBeNull();
  expect(pinterest.handleFromPath?.(["me"])).toBeNull();
});

it("reads a tiktok uniqueId and ignores nav paths", () => {
  expect(tiktok.handleFromPath?.(["@scout2015"])).toBe("scout2015");
  expect(tiktok.handleFromPath?.(["foryou"])).toBeNull();
  expect(tiktok.handleFromPath?.(["video"])).toBeNull();
});
