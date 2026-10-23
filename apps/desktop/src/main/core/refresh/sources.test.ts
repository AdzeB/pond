import { describe, expect, it } from "vitest";
import { homeUrlForSource } from "./sources";

describe("homeUrlForSource", () => {
  it("opens the Are.na sign-in page, not the log-in channel", () => {
    expect(homeUrlForSource("arena")).toBe("https://www.are.na/login");
  });
});
