import { describe, expect, it } from "vitest";
import { cookieAttempts } from "./yt-dlp-format";

describe("cookieAttempts", () => {
  it("tries YouTube signed out before falling back to cookies", () => {
    expect(cookieAttempts("youtube", 22)).toEqual([false, true]);
  });

  it("sends cookies on the first try for other sources", () => {
    expect(cookieAttempts("twitter", 12)).toEqual([true]);
    expect(cookieAttempts(null, 3)).toEqual([true]);
  });

  it("runs once without cookies when the jar is empty", () => {
    expect(cookieAttempts("youtube", 0)).toEqual([false]);
    expect(cookieAttempts("twitter", 0)).toEqual([false]);
  });
});
