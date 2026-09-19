import { describe, expect, it } from "vitest";
import { sanitizeOfflineHtml } from "./sanitize";

describe("sanitizeOfflineHtml", () => {
  it("removes scripts, event handlers, and active embeds", () => {
    const result = sanitizeOfflineHtml(
      '<script>alert(1)</script><p onclick="x()">Safe</p><iframe src="bad"></iframe>',
    );
    expect(result).toContain("<p>Safe</p>");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("<iframe");
  });

  it("removes remote resource and navigation URLs", () => {
    const result = sanitizeOfflineHtml(
      '<img src="https://tracker.example/pixel"><a href="//tracker.example">Go</a>',
    );
    expect(result).not.toContain("tracker.example");
  });

  it("adds a restrictive content security policy", () => {
    const result = sanitizeOfflineHtml("<main>Offline</main>");
    expect(result).toContain("default-src 'none'");
    expect(result).toContain("img-src data: pond:");
  });
});
