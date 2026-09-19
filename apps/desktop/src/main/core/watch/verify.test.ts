import type { Source } from "@pond/schema/db";
import { expect, it } from "vitest";
import { resolveWatchTarget } from "./resolve";

const profiles: Array<{ source: Source; html: string }> = [
  {
    source: "youtube",
    html: '<meta property="og:title" content="Alice - YouTube"><script>{"channelMetadataRenderer":{"externalId":"UC12345678901234567890","vanityChannelUrl":"http://www.youtube.com/@alice"}}</script>',
  },
  {
    source: "tiktok",
    html: '<meta property="og:title" content="Alice on TikTok"><meta property="og:url" content="https://www.tiktok.com/@alice"><meta property="og:description" content="@alice 10 Followers, 0 Following">',
  },
  {
    source: "instagram",
    html: '<meta property="og:type" content="profile"><meta property="og:title" content="Alice (&#064;alice) &#x2022; Instagram profile"><meta property="og:url" content="https://www.instagram.com/alice/">',
  },
  {
    source: "twitter",
    html: '<meta property="og:type" content="profile"><meta property="og:title" content="Alice (@alice) on X"><meta property="og:url" content="https://x.com/alice"><meta property="profile:username" content="alice">',
  },
  {
    source: "pinterest",
    html: '<meta content="profile" name="og:type"><meta content="Alice" name="og:title"><meta content="https://www.pinterest.com/alice/" name="og:url">',
  },
  {
    source: "cosmos",
    html: '<meta property="og:title" content="Alice (@alice)">',
  },
];

it.each(profiles)(
  "confirms a real $source profile and uses its name",
  async ({ source, html }) => {
    const result = await resolveWatchTarget(
      source,
      "alice",
      async () => new Response(html),
    );
    expect(result).toMatchObject({ handle: "alice", display: "Alice" });
  },
);

it.each(profiles)("hides a missing $source account", async ({ source }) => {
  expect(
    await resolveWatchTarget(
      source,
      "missing",
      async () => new Response(null, { status: 404 }),
    ),
  ).toBeNull();
});

it.each(profiles)(
  "does not mistake a different $source profile for the requested one",
  async ({ source, html }) => {
    expect(
      await resolveWatchTarget(
        source,
        "someone_else",
        async () => new Response(html),
      ),
    ).toBeNull();
  },
);

it("rejects TikTok's successful generic page for a missing handle", async () => {
  const html =
    '<meta property="og:url" content="https://www.tiktok.com/@missing"><meta property="og:title" content="Visit TikTok to discover profiles!"><meta property="og:description" content="Watch videos on TikTok">';
  expect(
    await resolveWatchTarget(
      "tiktok",
      "missing",
      async () => new Response(html),
    ),
  ).toBeNull();
});

it.each([200, 403, 429, 503])(
  "reports an unverified or blocked response (%s) as incomplete",
  async (status) => {
    await expect(
      resolveWatchTarget(
        "instagram",
        "alice",
        async () => new Response("<html>Sign in</html>", { status }),
      ),
    ).rejects.toThrow();
  },
);

it("does not turn a timeout into an account", async () => {
  await expect(
    resolveWatchTarget("youtube", "alice", async () => {
      throw new Error("Timeout");
    }),
  ).rejects.toThrow("Timeout");
});

it("returns a profile photo with decoded signed URL parameters", async () => {
  const html =
    '<meta property="og:type" content="profile"><meta property="og:title" content="Dr. Umar (@drumarjohnson) on X"><meta property="profile:username" content="drumarjohnson"><meta property="og:url" content="https://x.com/drumarjohnson"><meta property="og:image" content="https://pbs.twimg.com/profile_images/avatar.jpg?a=1&amp;b=2">';
  expect(
    await resolveWatchTarget(
      "twitter",
      "drumarjohnson",
      async () => new Response(html),
    ),
  ).toMatchObject({
    display: "Dr. Umar",
    avatarUrl: "https://pbs.twimg.com/profile_images/avatar.jpg?a=1&b=2",
  });
});

it("uses Pinterest's profile photo instead of its generic share card and removes the repeated handle", async () => {
  const html =
    '<meta property="og:type" content="profile"><meta property="og:title" content="Drumarjohnson (drumarjohnson) - Profile | Pinterest"><meta property="og:url" content="https://www.pinterest.com/drumarjohnson/"><meta property="og:image" content="https://s.pinimg.com/images/default_open_graph_1200.png"><script>{"image_xlarge_url":"https://i.pinimg.com/280x280_RS/avatar.jpg"}</script>';
  expect(
    await resolveWatchTarget(
      "pinterest",
      "drumarjohnson",
      async () => new Response(html),
    ),
  ).toMatchObject({
    display: "Drumarjohnson",
    avatarUrl: "https://i.pinimg.com/280x280_RS/avatar.jpg",
  });
});

it.each(["javascript:alert(1)", "https://example.com/default_open_graph.png"])(
  "ignores unsafe or generic profile images: %s",
  async (avatar) => {
    const html = `<meta property="og:title" content="Alice (@alice)"><meta property="og:image" content="${avatar}">`;
    const result = await resolveWatchTarget(
      "cosmos",
      "alice",
      async () => new Response(html),
    );
    expect(result).not.toHaveProperty("avatarUrl");
  },
);
