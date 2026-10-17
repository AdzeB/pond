import type { JsonObject } from "@pond/schema/json";
import { expect, it } from "vitest";
import { parsePinPage } from "./api";

function relayPage(payload: JsonObject): string {
  const key = encodeURIComponent(JSON.stringify({ queryID: "q" }));
  return `<script>window.__PWS_RELAY_REGISTER_COMPLETED_REQUEST__("${key}", ${JSON.stringify(payload)});</script>`;
}

it("reads the pin from the relay payload", () => {
  const page = parsePinPage(
    relayPage({
      data: {
        v3GetPinQueryv2: {
          __typename: "PinResponse",
          data: {
            title: "Record player",
            imageLargeUrl: "https://i.pinimg.com/a.jpg",
          },
        },
      },
    }),
  );
  expect(page.kind).toBe("pin");
  expect(page.kind === "pin" && page.pin.title).toBe("Record player");
});

it("reports a pin Pinterest has removed", () => {
  const page = parsePinPage(
    relayPage({ data: { v3GetPinQueryv2: { __typename: "PinNotFound" } } }),
  );
  expect(page).toEqual({ kind: "not_found" });
});

it("reports a page without pin data", () => {
  expect(parsePinPage("<html><title>Pinterest</title></html>")).toEqual({
    kind: "no_pin",
  });
});
