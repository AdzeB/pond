export type Save = {
  id: number;
  title: string;
  creator: string;
  domain: string;
  url: string;
  image?: string;
  note: string;
  tags: string[];
};

export const saves: Save[] = [
  {
    id: 1,
    title: "The Cloister House",
    creator: "MORQ",
    domain: "thelocalproject.com.au",
    url: "https://thelocalproject.com.au/articles/the-cloister-house-by-morq-local-australian-architecture-bespoke-design-perth-wa-australia/",
    image: "/media/cloister.jpg",
    note: "Heavy walls, low seating, and a little daylight. The texture does most of the work.",
    tags: ["Architecture", "Interiors"],
  },
  {
    id: 2,
    title: "M_001 Chair",
    creator: "Monolith",
    domain: "leibal.com",
    url: "https://store.leibal.com/products/m_001",
    image: "/media/monolith.jpg",
    note: "A single sculptural object can anchor the whole room. Keep everything around it quiet.",
    tags: ["Objects", "Furniture"],
  },
  {
    id: 3,
    title: "Mokko at Thomaskerk",
    creator: "Thomas van Schaik",
    domain: "thomasvanschaik.com",
    url: "https://www.thomasvanschaik.com/still-life-interior-food-photography-commissioned-amsterdam/mokko-thomaskerk",
    image: "/media/mokko.jpg",
    note: "Dark furniture against concrete. Useful for the relationship between an object and the space around it.",
    tags: ["Photography", "Furniture"],
  },
  {
    id: 4,
    title: "Bank Street House",
    creator: "Technē · Photo by Tom Blachford",
    domain: "techne.com.au",
    url: "https://techne.com.au/projects/bank-street-house/",
    image: "/media/bank-street.jpg",
    note: "Concrete structure, black frames, and softer furniture. Contrast without adding more objects.",
    tags: ["Architecture"],
  },
  {
    id: 5,
    title: "Casa Floresta",
    creator: "Estúdio Zargos",
    domain: "wallpaper.com",
    url: "https://www.wallpaper.com/architecture/casa-floresta-estudio-zargos-belo-horizonte-brazil",
    image: "/media/floresta.jpg",
    note: "A light chair against raw concrete. Softness can come from one small contrast.",
    tags: ["Interiors"],
  },
  {
    id: 6,
    title: "Notes on quiet spaces",
    creator: "Sample note",
    domain: "Note",
    url: "",
    note: "Fewer objects, more room around them. Let a change in texture do what another color would usually do. Warmth can come from light rather than decoration.",
    tags: ["Notes"],
  },
];

export const variants = [
  {
    key: "inline",
    name: "Inline",
    description: "Conversation first. Small objects live inside the answer.",
  },
  {
    key: "editorial",
    name: "Editorial",
    description: "An annotated brief. Each observation has a visual reference.",
  },
  {
    key: "canvas",
    name: "Reference Board",
    description: "A persistent collection beside a shorter conversation.",
  },
] as const;

export type Variant = (typeof variants)[number]["key"];
export const scenes = [
  "search",
  "compare",
  "organize",
  "question",
  "empty",
] as const;
export type Scene = (typeof scenes)[number];
export const prompts = {
  search: "Find references for a quiet, tactile interior",
  compare: "Compare these references. What should I take from each?",
  organize: "Bring these references together in a folder",
  question: "Help me narrow this down into a direction",
  empty: "",
} satisfies Record<Scene, string>;

export const comparison = `These point to two directions: **warm and tactile**, or **dark and architectural**. The materials overlap; the light and the furniture change the feeling.

| Reference | What to borrow | Direction |
| :--- | :--- | :--- |
| [Cloister House](#save-1) | Low seating and textured walls | Warm, enclosed |
| [M_001 Chair](#save-2) | One strong sculptural form | Tactile, restrained |
| [Mokko at Thomaskerk](#save-3) | Dark objects and negative space | Architectural |
| [Bank Street House](#save-4) | Contrast between structure and furniture | Balanced |

> Keep the materials quiet. Use light and one distinctive object to give the space its character.

Start with the first two if you want the room to feel more intimate.`;

export const palette = `:root {
  --stone: #b5afa3;
  --plaster: #e9e5dc;
  --timber: #78634e;
  --ink: #31332e;
}`;
