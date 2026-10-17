import { expect, it } from "vitest";
import { pinIdFromBody } from "./save-request";

const repin = {
  options: { board_id: "9", pin_id: "1139621880754595795", title: "A record" },
  context: {},
};

it("reads the pin from Pinterest's form-encoded save request", () => {
  const body = new URLSearchParams({
    source_url: "/pin/1139621880754595795/",
    data: JSON.stringify(repin),
  }).toString();
  expect(pinIdFromBody(body)).toBe("1139621880754595795");
});

it("reads the pin from a percent-encoded save request", () => {
  const body = `source_url=${encodeURIComponent("/")}&data=${encodeURIComponent(JSON.stringify(repin))}`;
  expect(pinIdFromBody(body)).toBe("1139621880754595795");
});

it("reads the pin from a JSON save request", () => {
  const body = JSON.stringify({ source_url: "/", data: repin });
  expect(pinIdFromBody(body)).toBe("1139621880754595795");
});

it("ignores a request without a pin", () => {
  expect(pinIdFromBody(null)).toBeNull();
  expect(pinIdFromBody("source_url=%2F")).toBeNull();
});
