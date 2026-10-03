import { PerspectiveCamera } from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { expect, it, vi } from "vitest";
import { bindCameraKeys, moveCameraWithKey } from "./camera-keyboard";

it("orbits, pans and zooms the real camera without a pointer", () => {
  const camera = new PerspectiveCamera(38, 1, 0.01, 1000);
  camera.position.set(0, 0, 10);
  const controls = new OrbitControls(camera, document.createElement("canvas"));
  try {
    expect(moveCameraWithKey(camera, controls, "ArrowRight", false)).toBe(true);
    expect(camera.position.x).toBeGreaterThan(0);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(10);
    const beforePan = camera.position.clone();
    moveCameraWithKey(camera, controls, "ArrowUp", true);
    expect(controls.target.y).toBeGreaterThan(0);
    expect(camera.position.y).toBeGreaterThan(beforePan.y);
    moveCameraWithKey(camera, controls, "+", false);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(10 / 1.1);
    moveCameraWithKey(camera, controls, "-", false);
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(10);
    const unchanged = camera.position.clone();
    expect(moveCameraWithKey(camera, controls, "a", false)).toBe(false);
    expect(camera.position.equals(unchanged)).toBe(true);
  } finally {
    controls.dispose();
  }
});

it("owns handled camera keys and removes its listener when disposed", () => {
  const canvas = document.createElement("canvas");
  document.body.append(canvas);
  const camera = new PerspectiveCamera(38, 1, 0.01, 1000);
  camera.position.set(0, 0, 10);
  const controls = new OrbitControls(camera, canvas);
  const globalKey = vi.fn();
  const reset = vi.fn();
  document.addEventListener("keydown", globalKey);
  const unbind = bindCameraKeys(canvas, camera, controls, reset);
  try {
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(globalKey).not.toHaveBeenCalled();
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Home",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(reset).toHaveBeenCalledOnce();
    expect(globalKey).not.toHaveBeenCalled();
    unbind();
    canvas.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(globalKey).toHaveBeenCalledOnce();
  } finally {
    unbind();
    document.removeEventListener("keydown", globalKey);
    controls.dispose();
    canvas.remove();
  }
});
