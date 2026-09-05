import assert from "node:assert/strict";
import { test } from "node:test";
import { dependencyCycles, runtimeImports } from "./check-architecture.mjs";

test("runtime graph distinguishes type-only imports and preserves lazy dependencies", () => {
  assert.deepEqual(
    runtimeImports(`
    import type { A } from './types';
    import { type B } from './also-types';
    import { type C, run } from './runtime';
    import './startup';
    export type { D } from './exports';
    export { type E } from './type-exports';
    export { work } from './work';
    const load = () => import('./lazy');
  `),
    ["./runtime", "./startup", "./work", "./lazy"],
  );
});

test("detects cycles while permitting convergent dependencies", () => {
  const graph = new Map([
    ["a", ["b", "leaf"]],
    ["b", ["a", "leaf"]],
    ["leaf", []],
    ["c", ["leaf"]],
    ["self", ["self"]],
  ]);
  assert.deepEqual(dependencyCycles(graph), [["a", "b"], ["self"]]);
});

test("ownership checks can include type-only imports and exports", () => {
  assert.deepEqual(
    runtimeImports(
      "import type { A } from './owner'; export type { B } from './other';",
      "module.ts",
      true,
    ),
    ["./owner", "./other"],
  );
});
