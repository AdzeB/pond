const SIGN_IN = {
  twitter: { label: "X", url: "https://x.com/login", domain: "x.com" },
  instagram: {
    label: "Instagram",
    url: "https://www.instagram.com/accounts/login/",
    domain: "instagram.com",
  },
  youtube: {
    label: "YouTube",
    url: "https://accounts.google.com/ServiceLogin?service=youtube&continue=https://www.youtube.com/",
    domain: "youtube.com",
  },
  tiktok: {
    label: "TikTok",
    url: "https://www.tiktok.com/login",
    domain: "tiktok.com",
  },
  reddit: {
    label: "Reddit",
    url: "https://www.reddit.com/login/",
    domain: "reddit.com",
  },
};

const scopeOf = (e) => e.account?.scope ?? {};
const sameList = (actual, expected) =>
  JSON.stringify([...(actual ?? [])].sort()) ===
  JSON.stringify([...expected].sort());
const hasSaves = (e) => ({
  label: "Saves arrived from the sync",
  ok: e.saves.total > 0,
});
const connected = (e) => ({
  label: "Account connected in the sandbox",
  ok: e.account !== null,
});
const started = (e) => ({
  label: "Import started (no longer waiting for a choice)",
  ok: e.account !== null && !e.account.importPending,
});

const STEPS = [
  {
    id: "intro",
    title: "Sandbox Library",
    steps: [
      "Pond is running on a throwaway library and browser profile. Your real library and logins are untouched.",
      "If Pond shows onboarding, finish it with the defaults.",
      "Each Source step starts with Sign In. Log in in the window that opens, then press Import Session here.",
      "After Start Import in Pond, wait for the sync to finish, then press Run Checks.",
    ],
  },
  {
    id: "x-folders",
    title: "X: Bookmark Folders and Text Filter",
    source: "twitter",
    steps: [
      "Sign in to X, then press Import Session.",
      "In Pond, open Sources, find the X Account, and choose Start Import from its menu.",
      "Uncheck Likes. Choose Specific Folders and confirm your bookmark folders load.",
      "Pick one folder. Under Kinds of Posts, uncheck Text Posts. Press Start Import.",
      "When the sync finishes, confirm the Library only shows posts from that folder, and none are text-only.",
    ],
    checks: (e) => [
      connected(e),
      started(e),
      {
        label: "Scope is Bookmarks only",
        ok: sameList(scopeOf(e).listKinds, ["saved"]),
      },
      {
        label: "At least one folder chosen",
        ok: (scopeOf(e).collections ?? []).length > 0,
      },
      {
        label: "Text Posts left out",
        ok:
          Array.isArray(scopeOf(e).mediaKinds) &&
          !scopeOf(e).mediaKinds.includes("text"),
      },
      hasSaves(e),
      {
        label: "No saves came from Likes",
        ok: e.saves.listKinds.liked === 0 && e.saves.listKinds.both === 0,
      },
      {
        label: "No text-only saves in the Library",
        ok: e.saves.completeText === 0,
      },
      {
        label: `Saves skipped by the media filter: ${e.saves.filtered.media}`,
        ok: null,
      },
    ],
  },
  {
    id: "instagram-collections",
    title: "Instagram: Saved Collections",
    source: "instagram",
    steps: [
      "Sign in to Instagram, then press Import Session.",
      "In Pond, choose Start Import from the Instagram Account menu.",
      "Choose Specific Collections and confirm your collections load with post counts.",
      "Pick one collection and press Start Import.",
      "When the sync finishes, confirm only that collection's posts arrived.",
    ],
    checks: (e) => [
      connected(e),
      started(e),
      {
        label: "At least one collection chosen",
        ok: (scopeOf(e).collections ?? []).length > 0,
      },
      hasSaves(e),
    ],
  },
  {
    id: "youtube-playlists",
    title: "YouTube: Specific Playlists",
    source: "youtube",
    steps: [
      "Sign in to YouTube, then press Import Session. If Google blocks the sign-in window, mark this step Skip.",
      "In Pond, choose Start Import from the YouTube Account menu.",
      "Choose Specific Playlists and confirm your playlists load, with Watch Later first.",
      "Pick one playlist other than Watch Later and press Start Import.",
      "When the sync finishes, confirm only that playlist's videos arrived.",
    ],
    checks: (e) => [
      connected(e),
      started(e),
      {
        label: "At least one playlist chosen",
        ok: (scopeOf(e).collections ?? []).length > 0,
      },
      hasSaves(e),
    ],
  },
  {
    id: "tiktok-liked",
    title: "TikTok: Liked Videos Only",
    source: "tiktok",
    steps: [
      "Sign in to TikTok, then press Import Session.",
      "In Pond, choose Start Import from the TikTok Account menu.",
      "Uncheck Favorites so only Liked Videos stays checked. Press Start Import.",
      "When the sync finishes, confirm only liked videos arrived.",
    ],
    checks: (e) => [
      connected(e),
      started(e),
      {
        label: "Scope is Liked Videos only",
        ok: sameList(scopeOf(e).listKinds, ["liked"]),
      },
      hasSaves(e),
      {
        label: "No saves came from Favorites",
        ok: e.saves.listKinds.saved === 0 && e.saves.listKinds.both === 0,
      },
    ],
  },
  {
    id: "reddit-since",
    title: "Reddit: Saved Posts Since a Date",
    source: "reddit",
    steps: [
      "Sign in to Reddit, then press Import Session.",
      "In Pond, choose Start Import from the Reddit Account menu.",
      "Uncheck Upvoted Posts. Set Posted Since to a date that cuts off some of your older saved posts. Press Start Import.",
      "When the sync finishes, confirm nothing older than that date is in the Library.",
    ],
    checks: (e) => [
      connected(e),
      started(e),
      {
        label: "Scope is Saved Posts only",
        ok: sameList(scopeOf(e).listKinds, ["saved"]),
      },
      { label: "Posted Since is set", ok: Boolean(scopeOf(e).since) },
      hasSaves(e),
      {
        label: "No Library saves published before that date",
        ok: e.saves.completeBeforeSince === 0,
      },
      {
        label: `Saves skipped by the date filter: ${e.saves.filtered.since}`,
        ok: null,
      },
    ],
  },
  {
    id: "reddit-release",
    title: "Reddit: Clear the Date",
    source: "reddit",
    sync: true,
    steps: [
      "In Pond, choose Choose What to Import from the Reddit Account menu.",
      "Press Any Date to clear Posted Since, then press Save.",
      "Press Sync Now here and wait for the sync to finish.",
      "Confirm the older saved posts now appear in the Library.",
    ],
    checks: (e, previous) => {
      const before = previous["reddit-since"]?.evidence?.saves;
      return [
        { label: "Posted Since is cleared", ok: !scopeOf(e).since },
        {
          label: "No saves still held back by the date filter",
          ok: e.saves.filtered.since === 0,
        },
        before
          ? {
              label: `Library saves grew from ${before.complete} to ${e.saves.complete}`,
              ok: e.saves.complete > before.complete,
            }
          : {
              label: "Run Checks on the previous step first to compare",
              ok: null,
            },
      ];
    },
  },
  {
    id: "done",
    title: "Done",
    steps: [
      "Results are saved in the sandbox folder as import-scope-results.md.",
      "Quit Pond to end the run. Rerun to pick up where you left off, or pass --fresh to start over.",
    ],
  },
];

module.exports = { SIGN_IN, STEPS };
