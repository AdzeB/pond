/** Offline wall catalog: real saves from the developer's library, used as decorative preview media. */

/** Media copied from the developer's own library, so the wall previews real saves offline. */
export const WALL_MEDIA = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../assets/onboarding/*.{jpg,png,mp4}", {
      eager: true,
      query: "?url",
      import: "default",
    }),
  ).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1).replace(/\.(jpg|png|mp4)$/, ""),
    url as string,
  ]),
);

export interface WallItem {
  img: string;
  title: string;
  stat: string;
  source?: string;
  video?: boolean;
}

export const WALL_COLUMNS: ReadonlyArray<ReadonlyArray<WallItem>> = [
  [
    {
      img: "yt-mclaren",
      title: "The Best Car I've Ever Driven: McLaren W1",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "cs-ona",
      title: "Ona interface exploration",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "ig-copenhagen",
      title: "Spring day in Copenhagen",
      stat: "Kim Andersen",
      source: "instagram",
    },
    {
      img: "ar-lemaire",
      title: "Lemaire AW25 Runway",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "pi-photo",
      title: "Portrait study",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "cs-kitchen",
      title: "Kitchen in an Altbau apartment",
      stat: "Cosmos",
      source: "cosmos",
    },
  ],
  [
    {
      img: "tw-emptystate",
      video: true,
      title: "Obsessing over this empty state",
      stat: "Jamie Barton",
      source: "twitter",
    },
    {
      img: "ig-postcards",
      title: "digital postcards <33",
      stat: "Tim Doleschall",
      source: "instagram",
    },
    {
      img: "cs-callalily",
      title: "Calla Lily (1986)",
      stat: "Robert Mapplethorpe",
      source: "cosmos",
    },
    {
      img: "yt-foldable",
      title: "So This is Peak Foldable",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "ar-taste",
      title: "Taste Genealogy",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "ig-greener",
      title: "greener and greener",
      stat: "Heo Kang",
      source: "instagram",
    },
  ],
  [
    {
      img: "pi-vogue",
      title: "Vogue",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "tw-hovermaxxing",
      video: true,
      title: "hovermaxxing",
      stat: "chance",
      source: "twitter",
    },
    {
      img: "cs-lamp",
      title: "w202 Halo lamp by Wästberg",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "web-amie",
      title: "Amie, AI Note Taker",
      stat: "amie.so",
    },
    {
      img: "pi-akikuma",
      title: "Akikuma mini album",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "ig-blessings",
      title: "more blessings more life",
      stat: "BIN",
      source: "instagram",
    },
  ],
  [
    {
      img: "tw-popover",
      video: true,
      title: "Base UI Popover with detached triggers",
      stat: "Colm Tuite",
      source: "twitter",
    },
    {
      img: "yt-becoming",
      title: "The Pain of Becoming",
      stat: "Josephine",
      source: "youtube",
    },
    {
      img: "ar-pacome",
      title: "Pacôme Pertant, Portfolio",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "cs-dunes",
      title: "Singing Sand Mountain, Dunhuang",
      stat: "Lynn Davis",
      source: "cosmos",
    },
    {
      img: "pi-kleerkasten",
      title: "Kleerkasten",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "ig-copenhagen",
      title: "Spring day in Copenhagen",
      stat: "Kim Andersen",
      source: "instagram",
    },
  ],
  [
    {
      img: "cs-kitchen",
      title: "Kitchen in an Altbau apartment",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "tw-tooltip",
      video: true,
      title: "Farewell to the ugly native tooltip",
      stat: "zanwei.guo",
      source: "twitter",
    },
    {
      img: "ar-lemaire",
      title: "Lemaire AW25 Runway",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "ig-postcards",
      title: "digital postcards <33",
      stat: "Tim Doleschall",
      source: "instagram",
    },
    {
      img: "yt-mclaren",
      title: "The Best Car I've Ever Driven: McLaren W1",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "pi-vogue",
      title: "Vogue",
      stat: "Pinterest",
      source: "pinterest",
    },
  ],
  [
    {
      img: "ig-greener",
      title: "greener and greener",
      stat: "Heo Kang",
      source: "instagram",
    },
    {
      img: "cs-callalily",
      title: "Calla Lily (1986)",
      stat: "Robert Mapplethorpe",
      source: "cosmos",
    },
    {
      img: "tw-emptystate",
      video: true,
      title: "Obsessing over this empty state",
      stat: "Jamie Barton",
      source: "twitter",
    },
    {
      img: "pi-akikuma",
      title: "Akikuma mini album",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "web-amie",
      title: "Amie, AI Note Taker",
      stat: "amie.so",
    },
    {
      img: "cs-ona",
      title: "Ona interface exploration",
      stat: "Cosmos",
      source: "cosmos",
    },
  ],
  [
    {
      img: "ar-taste",
      title: "Taste Genealogy",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "yt-foldable",
      title: "So This is Peak Foldable",
      stat: "Marques Brownlee",
      source: "youtube",
    },
    {
      img: "pi-photo",
      title: "Portrait study",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "tw-hovermaxxing",
      video: true,
      title: "hovermaxxing",
      stat: "chance",
      source: "twitter",
    },
    {
      img: "cs-dunes",
      title: "Singing Sand Mountain, Dunhuang",
      stat: "Lynn Davis",
      source: "cosmos",
    },
    {
      img: "ig-blessings",
      title: "more blessings more life",
      stat: "BIN",
      source: "instagram",
    },
  ],
  [
    {
      img: "cs-lamp",
      title: "w202 Halo lamp by Wästberg",
      stat: "Cosmos",
      source: "cosmos",
    },
    {
      img: "ar-pacome",
      title: "Pacôme Pertant, Portfolio",
      stat: "Are.na",
      source: "arena",
    },
    {
      img: "tw-tooltip",
      video: true,
      title: "Farewell to the ugly native tooltip",
      stat: "zanwei.guo",
      source: "twitter",
    },
    {
      img: "yt-becoming",
      title: "The Pain of Becoming",
      stat: "Josephine",
      source: "youtube",
    },
    {
      img: "pi-kleerkasten",
      title: "Kleerkasten",
      stat: "Pinterest",
      source: "pinterest",
    },
    {
      img: "cs-kitchen",
      title: "Kitchen in an Altbau apartment",
      stat: "Cosmos",
      source: "cosmos",
    },
  ],
];
