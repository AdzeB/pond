import { expect, it } from "vitest";
import { libraryActionRoutes } from "./library-actions";

it("rejects action execution without a reviewed token at the HTTP boundary", async () => {
  const response = await libraryActionRoutes().request("/actions/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ids: ["a"],
      definition: {
        id: "action",
        name: "Rate",
        steps: [{ kind: "rating", rating: 5 }],
      },
    }),
  });
  expect(response.status).toBe(400);
  expect(await response.text()).toContain("expectedToken");
});

it("rejects unknown filter fields instead of silently broadening a query", async () => {
  const response = await libraryActionRoutes().request("/query", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: {
        combinator: "and",
        rules: [{ field: "unknown", operator: "contains", value: "cats" }],
      },
    }),
  });
  expect(response.status).toBe(400);
});

it("reports malformed request JSON as a client error", async () => {
  const response = await libraryActionRoutes().request("/actions/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    status: "error",
    error: "Invalid JSON.",
  });
});

it("validates explicit image compression mode and quality inputs", async () => {
  const response = await libraryActionRoutes().request("/conversion/compress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ids: ["save"],
      mode: "quality",
      quality: 101,
    }),
  });
  expect(response.status).toBe(400);
  expect(await response.text()).toContain("quality");
});
