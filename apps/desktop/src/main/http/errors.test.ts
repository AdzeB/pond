import { Hono } from "hono";
import { expect, it } from "vitest";
import { z } from "zod";
import { PondError } from "../lib/pond-error";
import { handleApiError } from "./errors";

function throwing(error: Error) {
  const app = new Hono();
  app.get("/", () => {
    throw error;
  });
  app.onError(handleApiError);
  return app.request("/");
}

it.each([
  [new PondError("stale_cursor", "Run it again."), 409, "stale_cursor"],
  [new SyntaxError("Unexpected end"), 400, "invalid_json"],
  [z.string().safeParse(1).error ?? new Error(), 422, "invalid_request"],
  [new Error("Disk full."), 500, "internal"],
])("maps %s to one error shape", async (error, status, code) => {
  const response = await throwing(error);
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({
    status: "error",
    error: { code, message: expect.any(String) },
  });
});
