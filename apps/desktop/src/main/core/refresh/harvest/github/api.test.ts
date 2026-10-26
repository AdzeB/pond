import type { JsonValue } from "@pond/schema/json";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListHarvestArgs } from "../list-types";
import {
  fetchGithubCapture,
  type GithubGet,
  loginFromCookies,
  readGithubStars,
} from "./api";

function star(fullName: string, starredAt: string): JsonValue {
  return {
    starred_at: starredAt,
    repo: {
      full_name: fullName,
      description: `${fullName} description`,
      owner: { login: fullName.split("/")[0] ?? "" },
    },
  };
}

function json(body: JsonValue, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, ...init });
}

const fetchMock = vi.fn<GithubGet>();

function harvestGithubStars(args: ListHarvestArgs) {
  return readGithubStars(args, "octocat", fetchMock);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.useRealTimers();
});

describe("loginFromCookies", () => {
  it("reads the login only while signed in", () => {
    const login = { name: "dotcom_user", value: "octocat" };
    expect(loginFromCookies([{ name: "logged_in", value: "yes" }, login])).toBe(
      "octocat",
    );
    expect(
      loginFromCookies([{ name: "logged_in", value: "no" }, login]),
    ).toBeNull();
  });
});

describe("readGithubStars", () => {
  it("reads every star as a lowercase saved entry and marks the walk complete", async () => {
    fetchMock.mockResolvedValueOnce(
      json([
        star("Vercel/Next.js", "2026-10-20T10:00:00Z"),
        star("octocat/hello", "2026-10-01T10:00:00Z"),
      ]),
    );
    const result = await harvestGithubStars({ knownIds: [] });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.github.com/users/octocat/starred?per_page=100&page=1",
    );
    expect(result).toMatchObject({
      ok: true,
      reachedEnd: true,
      complete: true,
    });
    if (!result.ok) return;
    expect(result.entries[0]).toEqual({
      sourceId: "vercel/next.js",
      url: "https://github.com/vercel/next.js",
      title: "Vercel/Next.js",
      description: "Vercel/Next.js description",
      author: "Vercel",
      savedAt: "2026-10-20T10:00:00Z",
      listKinds: ["saved"],
    });
  });

  it("stops at the first star saved before the since limit", async () => {
    fetchMock.mockResolvedValueOnce(
      json([
        star("a/new", "2026-10-20T10:00:00Z"),
        star("a/old", "2026-09-01T10:00:00Z"),
      ]),
    );
    const result = await harvestGithubStars({
      knownIds: [],
      savedSince: "2026-10-01T00:00:00Z",
    });
    expect(result).toMatchObject({ ok: true, reachedEnd: true });
    if (!result.ok) return;
    expect(result.entries.map((e) => e.sourceId)).toEqual(["a/new"]);
    expect(result.complete).toBeUndefined();
  });

  it("stops early on a page of known stars", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        Array.from({ length: 100 }, (_, i) =>
          star(`a/r${i}`, "2026-10-20T10:00:00Z"),
        ),
      ),
    );
    const known = Array.from({ length: 100 }, (_, i) => `a/r${i}`);
    const result = await harvestGithubStars({ knownIds: known });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, reachedEnd: true });
    if (result.ok) expect(result.complete).toBeUndefined();
  });

  it("reports the rate limit reset", async () => {
    const reset = Math.round(Date.now() / 1000) + 600;
    fetchMock.mockResolvedValueOnce(
      json(
        { message: "rate limited" },
        {
          status: 403,
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(reset),
          },
        },
      ),
    );
    const result = await harvestGithubStars({ knownIds: [] });
    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });
    if (!result.ok) expect(result.retryAfterSec).toBeGreaterThan(500);
  });
});

describe("fetchGithubCapture", () => {
  it("joins the repo description and README", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({
          full_name: "vercel/next.js",
          description: "The React Framework",
          homepage: "https://nextjs.org",
          topics: ["react", "nextjs"],
          owner: {
            login: "vercel",
            avatar_url: "https://avatars.githubusercontent.com/u/14985020",
            html_url: "https://github.com/vercel",
          },
        }),
      )
      .mockResolvedValueOnce(new Response("# Next.js\n\nGet started."));
    const result = await fetchGithubCapture(
      { sourceId: "vercel/next.js" },
      fetchMock,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.capture).toMatchObject({
      id: "vercel/next.js",
      source: "github",
      url: "https://github.com/vercel/next.js",
      title: "vercel/next.js",
      description:
        "The React Framework\n\nTopics: react, nextjs\n\n# Next.js\n\nGet started.",
      author: { name: "vercel", handle: "vercel" },
      extras: { externalLink: "https://nextjs.org" },
    });
    expect(result.capture.media[0]?.url).toBe(
      "https://opengraph.githubassets.com/1/vercel/next.js",
    );
  });

  it("keeps the save when the README is missing", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ full_name: "a/b", description: null }))
      .mockResolvedValueOnce(new Response("", { status: 404 }));
    const result = await fetchGithubCapture({ sourceId: "a/b" }, fetchMock);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.capture.description).toBeUndefined();
  });

  it("reports a missing repo so the signed-in window can try", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));
    await expect(
      fetchGithubCapture({ sourceId: "a/private" }, fetchMock),
    ).resolves.toEqual({ ok: false, reason: "not_found" });
  });
});
