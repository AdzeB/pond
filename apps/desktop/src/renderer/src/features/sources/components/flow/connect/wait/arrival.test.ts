import { expect, it } from "vitest";
import { findArrivedAccount } from "./arrival";

const twitter = {
  id: "acc-twitter",
  source: "twitter" as const,
  connected: true,
};

const instagram = {
  id: "acc-instagram",
  source: "instagram" as const,
  connected: true,
};

it("treats a new connected account as arrival", () => {
  expect(findArrivedAccount([twitter], "twitter", new Set())).toEqual(twitter);
});

it("ignores an account that was already connected before this wait", () => {
  expect(
    findArrivedAccount([twitter], "twitter", new Set(["acc-twitter"])),
  ).toBeUndefined();
});

it("completes reconnect when the same account is reimported", () => {
  expect(
    findArrivedAccount(
      [twitter],
      "twitter",
      new Set(["acc-twitter"]),
      "acc-twitter",
    ),
  ).toEqual(twitter);
});

it("does not complete on an import for a different source", () => {
  expect(
    findArrivedAccount(
      [twitter, instagram],
      "instagram",
      new Set(["acc-instagram"]),
      "acc-twitter",
    ),
  ).toBeUndefined();
});
