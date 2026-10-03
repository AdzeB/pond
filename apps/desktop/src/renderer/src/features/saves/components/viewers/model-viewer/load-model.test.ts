import { describe, expect, it } from "vitest";
import { modelLoaderKind } from "./load-model";

describe("modelLoaderKind", () => {
  it.each([
    ["glb", "gltf"],
    ["fbx", "fbx"],
    ["obj", "obj"],
    ["stl", "stl"],
    ["ply", "ply"],
    ["3mf", "3mf"],
    ["3ds", "3ds"],
    ["dae", "dae"],
    ["amf", "amf"],
    ["usdc", "usd"],
    ["usdz", "usd"],
    ["vtk", "vtk"],
  ])("maps .%s to the %s loader", (extension, loader) => {
    expect(modelLoaderKind(extension)).toBe(loader);
    expect(modelLoaderKind(`MODEL.${extension.toUpperCase()}`)).toBe(loader);
  });

  it.each(["3dm", "ifc", "dwg", "c4d", "blend", "skp", "spline"])(
    "keeps .%s on the generated-preview fallback",
    (extension) => {
      expect(modelLoaderKind(extension)).toBeNull();
    },
  );
});
