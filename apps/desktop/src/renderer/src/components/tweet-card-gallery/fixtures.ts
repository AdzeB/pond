import type { TweetCardData } from "@/components/tweet-card";

// Remote placeholders so the preview reflects real avatar/media loading. The
// running app has network access; these are illustrative, not bundled assets.
const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;
const avatar = (n: number) => `https://i.pravatar.cc/150?img=${n}`;

export interface TweetFixture {
  id: string;
  label: string;
  data: TweetCardData;
}

export const TWEET_FIXTURES: readonly TweetFixture[] = [
  {
    id: "real-naruto-quote",
    label: "Real tweet - quote with video",
    data: {
      author: {
        name: "Buckweet \u{1F985}",
        handle: "UncleBuckbroken",
        avatarUrl:
          "https://pbs.twimg.com/profile_images/1962231127017496576/OKvgTFPj_400x400.jpg",
      },
      text: "Naruto has destroyed a whole generation of potential athletes lol",
      publishedAt: "2026-06-21T05:08:45Z",
      metrics: {
        replies: 695,
        retweets: 3637,
        likes: 244081,
        views: 20850809,
        bookmarks: 17895,
      },
      quoted: {
        author: {
          name: "RingKai",
          handle: "RingPhantomx",
          avatarUrl:
            "https://pbs.twimg.com/profile_images/2054529072852615168/9rU7uDkP_400x400.jpg",
        },
        text: "This is how striking speed changes with and without weight \u{1F632}",
        publishedAt: "2026-06-20T20:13:14Z",
        media: [
          {
            url: "https://pbs.twimg.com/ext_tw_video_thumb/2068426910669877248/pu/img/IqljjU-Kd-v-dnZT.jpg",
            type: "video",
            posterUrl:
              "https://pbs.twimg.com/ext_tw_video_thumb/2068426910669877248/pu/img/IqljjU-Kd-v-dnZT.jpg",
            durationSec: 308,
          },
        ],
      },
    },
  },
  {
    id: "text-short",
    label: "Text only - short",
    data: {
      author: {
        name: "Jack",
        handle: "jack",
        avatarUrl: avatar(12),
        verified: false,
      },
      text: "just setting up my twttr",
      publishedAt: "2006-03-21T20:50:00Z",
      metrics: { replies: 184000, retweets: 92000, likes: 210000 },
    },
  },
  {
    id: "text-long",
    label: "Text only - long",
    data: {
      author: {
        name: "Paul Graham",
        handle: "paulg",
        avatarUrl: avatar(13),
        verified: true,
      },
      text: "The most surprising thing I've learned running a startup is how much of the work is just persistence. The ideas matter less than showing up every single day and refusing to give up when the obvious thing to do would be to quit.\n\nMost people quit right before it would have worked.",
      publishedAt: "2024-11-02T15:12:00Z",
      metrics: {
        replies: 342,
        retweets: 1200,
        likes: 8900,
        views: 540000,
        bookmarks: 2100,
      },
    },
  },
  {
    id: "single-image",
    label: "Single image",
    data: {
      author: {
        name: "NASA",
        handle: "NASA",
        avatarUrl: avatar(15),
        verified: true,
      },
      text: "A new view of the Pillars of Creation, captured in stunning near-infrared light.",
      publishedAt: "2024-10-19T18:00:00Z",
      media: [
        {
          url: img("nasa1", 1200, 800),
          type: "image",
          width: 1200,
          height: 800,
        },
      ],
      metrics: { replies: 980, retweets: 14000, likes: 120000, views: 3400000 },
    },
  },
  {
    id: "two-images",
    label: "Two images",
    data: {
      author: {
        name: "Travel Diaries",
        handle: "travel",
        avatarUrl: avatar(20),
      },
      text: "Kyoto in autumn never disappoints.",
      publishedAt: "2024-11-15T09:30:00Z",
      media: [
        { url: img("kyoto1", 800, 600), type: "image" },
        { url: img("kyoto2", 800, 600), type: "image" },
      ],
      metrics: { replies: 42, retweets: 310, likes: 4200 },
    },
  },
  {
    id: "three-images",
    label: "Three images",
    data: {
      author: {
        name: "Design Studio",
        handle: "studio",
        avatarUrl: avatar(33),
        verified: true,
      },
      text: "Three directions for the new brand identity. Which one?",
      publishedAt: "2024-09-08T11:00:00Z",
      media: [
        { url: img("brand1", 900, 1200), type: "image" },
        { url: img("brand2", 800, 600), type: "image" },
        { url: img("brand3", 800, 600), type: "image" },
      ],
      metrics: { replies: 88, retweets: 120, likes: 1900, bookmarks: 340 },
    },
  },
  {
    id: "four-images",
    label: "Four images",
    data: {
      author: { name: "Foodie", handle: "foodie", avatarUrl: avatar(40) },
      text: "Brunch crawl, all four spots ranked in the thread.",
      publishedAt: "2024-08-25T13:45:00Z",
      media: [
        { url: img("food1", 800, 600), type: "image" },
        { url: img("food2", 800, 600), type: "image" },
        { url: img("food3", 800, 600), type: "image" },
        { url: img("food4", 800, 600), type: "image" },
      ],
      metrics: { replies: 12, retweets: 45, likes: 670 },
    },
  },
  {
    id: "video",
    label: "Video",
    data: {
      author: {
        name: "Rocket Lab",
        handle: "rocketlab",
        avatarUrl: avatar(50),
        verified: true,
      },
      text: "Liftoff! Watch the full launch sequence.",
      publishedAt: "2024-12-01T07:15:00Z",
      media: [
        {
          url: img("rocket", 1280, 720),
          type: "video",
          posterUrl: img("rocket", 1280, 720),
          durationSec: 142,
        },
      ],
      metrics: { replies: 230, retweets: 3400, likes: 41000, views: 1200000 },
    },
  },
  {
    id: "no-avatar",
    label: "Missing avatar (initials)",
    data: {
      author: { name: "Anonymous Builder", handle: "buildinpublic" },
      text: "Day 47 of building in public. Shipped the search feature today.",
      publishedAt: "2024-10-30T22:10:00Z",
      metrics: { replies: 5, retweets: 8, likes: 92 },
    },
  },
  {
    id: "zero-metrics",
    label: "Zero metrics",
    data: {
      author: { name: "Quiet Account", handle: "quiet", avatarUrl: avatar(60) },
      text: "Hello, world.",
      publishedAt: "2025-01-04T16:00:00Z",
      metrics: { replies: 0, retweets: 0, likes: 0 },
    },
  },
  {
    id: "reply",
    label: "Reply",
    data: {
      author: {
        name: "Linus",
        handle: "linus",
        avatarUrl: avatar(65),
        verified: true,
      },
      isReply: true,
      replyingTo: "paulg",
      text: "Completely agree. The compounding only becomes visible in hindsight.",
      publishedAt: "2024-11-02T16:00:00Z",
      metrics: { replies: 12, retweets: 30, likes: 540 },
    },
  },
  {
    id: "rtl",
    label: "Non-latin / RTL",
    data: {
      author: {
        name: "وكالة الأنباء",
        handle: "news_ar",
        avatarUrl: avatar(68),
      },
      text: "مرحبا بالعالم! هذا مثال على تغريدة باللغة العربية لاختبار اتجاه النص.",
      lang: "ar",
      publishedAt: "2024-12-12T10:00:00Z",
      metrics: { replies: 90, retweets: 450, likes: 3200 },
    },
  },
  {
    id: "emoji",
    label: "Emoji + entities",
    data: {
      author: {
        name: "Launch Day",
        handle: "ship",
        avatarUrl: avatar(70),
        verified: true,
      },
      text: "We're live! 🚀🎉 Try it now at https://example.com/launch and tag us with #shipped @teammate 💜",
      publishedAt: "2025-02-18T17:30:00Z",
      metrics: {
        replies: 410,
        retweets: 2300,
        likes: 19000,
        views: 880000,
        bookmarks: 1500,
      },
    },
  },
  {
    id: "quote",
    label: "Quote tweet",
    data: {
      author: {
        name: "Hot Takes",
        handle: "hottakes",
        avatarUrl: avatar(11),
        verified: true,
      },
      text: "This is the most underrated point in the whole thread 👇",
      publishedAt: "2025-03-01T12:00:00Z",
      metrics: { replies: 64, retweets: 220, likes: 3100 },
      quoted: {
        author: {
          name: "Paul Graham",
          handle: "paulg",
          avatarUrl: avatar(13),
          verified: true,
        },
        text: "Most people quit right before it would have worked.",
        publishedAt: "2024-11-02T15:12:00Z",
      },
    },
  },
  {
    id: "link-card-large",
    label: "Link card - large image",
    data: {
      author: {
        name: "John Phamous",
        handle: "JohnPhamous",
        avatarUrl: avatar(8),
        verified: true,
      },
      text: "an improving design loop",
      publishedAt: "2026-06-25T22:41:00Z",
      metrics: { replies: 14, retweets: 24, likes: 415, views: 18000 },
      card: {
        url: "https://example.com/design-loop",
        domain: "example.com",
        title: "An improving design loop",
        description:
          "How a tight feedback loop between code and design compounds into better products over time.",
        imageUrl: img("designloop", 1200, 628),
        large: true,
      },
    },
  },
  {
    id: "link-card-small",
    label: "Link card - small thumbnail",
    data: {
      author: { name: "Reader", handle: "reader", avatarUrl: avatar(24) },
      text: "Great writeup, worth the read.",
      publishedAt: "2026-05-10T09:00:00Z",
      metrics: { replies: 3, retweets: 12, likes: 210 },
      card: {
        url: "https://blog.example.com/post",
        domain: "blog.example.com",
        title: "The case for small, reversible changes",
        description:
          "Why shipping in tiny increments beats big-bang rewrites almost every time.",
        imageUrl: img("smallcard", 400, 400),
      },
    },
  },
  {
    id: "link-card-no-image",
    label: "Link card - no image",
    data: {
      author: { name: "Linkbot", handle: "linkbot", avatarUrl: avatar(31) },
      text: "Reference for later.",
      publishedAt: "2026-04-02T14:20:00Z",
      metrics: { replies: 0, retweets: 1, likes: 9 },
      card: {
        url: "https://docs.example.com/guide",
        domain: "docs.example.com",
        title: "Getting started guide",
        description: "Everything you need to set up your first project.",
      },
    },
  },
  {
    id: "quote-media",
    label: "Quote tweet with media",
    data: {
      author: { name: "Curator", handle: "curator", avatarUrl: avatar(22) },
      text: "Adding this to the moodboard immediately.",
      publishedAt: "2025-03-04T08:20:00Z",
      metrics: { replies: 9, retweets: 40, likes: 880 },
      quoted: {
        author: {
          name: "Design Studio",
          handle: "studio",
          avatarUrl: avatar(33),
          verified: true,
        },
        text: "New poster series, just dropped.",
        media: [{ url: img("poster", 1200, 800), type: "image" }],
      },
    },
  },
];
