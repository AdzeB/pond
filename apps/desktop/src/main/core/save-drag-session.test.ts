import { expect, it } from "vitest";
import { rememberSaveDrag, resolveSaveDrop } from "./save-drag-session";

it("resolves dropped paths from the last Save drag in drop order", () => {
  rememberSaveDrag([
    { id: "a", path: "/tmp/a.png" },
    { id: "b", path: "/tmp/b.png" },
  ]);
  expect(
    resolveSaveDrop(["/tmp/b.png", "/Users/me/outside.png", "/tmp/a.png"]),
  ).toEqual(["b", "a"]);
});

it("forgets an earlier drag once a new one starts", () => {
  rememberSaveDrag([{ id: "a", path: "/tmp/a.png" }]);
  rememberSaveDrag([{ id: "c", path: "/tmp/c.png" }]);
  expect(resolveSaveDrop(["/tmp/a.png", "/tmp/c.png"])).toEqual(["c"]);
});
