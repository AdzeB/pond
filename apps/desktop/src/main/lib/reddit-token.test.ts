import { describe, expect, it } from "vitest";
import {
  decodeRedditToken,
  isLoggedInRedditToken,
  redditIdentityFromToken,
} from "./reddit-token";

function jwtWith(payload: RedditTokenClaims): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

interface RedditTokenClaims {
  sub?: string | number;
  lid?: string | number;
  exp?: number;
}

describe("reddit token_v2", () => {
  it("treats sub=loid as signed out", () => {
    const token = jwtWith({ sub: "loid", exp: 1 });
    expect(isLoggedInRedditToken(token)).toBe(false);
    expect(redditIdentityFromToken(token)).toBeNull();
  });

  it("treats sub=user as signed in and reads lid", () => {
    const token = jwtWith({ sub: "user", lid: "t2_abc123", exp: 1 });
    expect(isLoggedInRedditToken(token)).toBe(true);
    expect(redditIdentityFromToken(token)).toBe("t2_abc123");
    expect(decodeRedditToken(token)?.sub).toBe("user");
  });

  it("rejects malformed values", () => {
    expect(isLoggedInRedditToken("not-a-jwt")).toBe(false);
    expect(isLoggedInRedditToken("")).toBe(false);
  });
});
