import { expect, it, vi } from "vitest";
import { z } from "zod";
import { trackTools } from "./tool-steps";

it("records stopped work without claiming completion when cancellation arrives during a tool", async () => {
  const controller = new AbortController();
  const tracked = trackTools(
    [
      {
        name: "readSave",
        description: "Read",
        schema: z.object({}),
        execute: async () => {
          controller.abort();
          return { save: {} };
        },
      },
    ],
    controller.signal,
  );
  await expect(tracked.tools[0]?.execute({})).rejects.toThrow();
  expect(tracked.steps()).toMatchObject([
    { label: "Read Save", status: "stopped" },
  ]);
});

it("records failure without exposing a raw tool error payload", async () => {
  const changed = vi.fn();
  const tracked = trackTools(
    [
      {
        name: "searchLibrary",
        description: "Search",
        schema: z.object({}),
        execute: async () => {
          throw new Error("private tool payload");
        },
      },
    ],
    new AbortController().signal,
    changed,
  );
  await expect(tracked.tools[0]?.execute({ query: "film" })).rejects.toThrow();
  expect(tracked.steps()[0]).toMatchObject({ status: "error", detail: "film" });
  expect(JSON.stringify(changed.mock.calls)).not.toContain(
    "private tool payload",
  );
});
