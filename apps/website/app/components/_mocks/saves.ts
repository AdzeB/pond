/** The 24 real saves backing every website demo; media lives in public/demo/library, provenance in manifest.json. */

export type SaveSource =
  | "x"
  | "instagram"
  | "pinterest"
  | "arena"
  | "cosmos"
  | "tiktok"
  | "youtube";

export type SaveKind = "image" | "video" | "post";

export interface DemoSave {
  seed: number;
  title: string;
  source: SaveSource;
  kind: SaveKind;
  aspect: number;
  time: string;
  count?: number;
  id: string;
}

export const demoImage = (seed: number) => `/demo/library/${seed}.jpg`;

export const SAVES: DemoSave[] = [
  {
    seed: 1,
    aspect: 0.75,
    kind: "image",
    source: "pinterest",
    title: "Chuncky brown shoes",
    time: "2026/06/14 18:22",
    id: "01KV5AS1NVP7NG58ZAJ5ZN0G73",
  },
  {
    seed: 2,
    aspect: 0.82,
    kind: "post",
    source: "x",
    title: "few ways to do the CSS for this",
    time: "2026/06/12 09:41",
    id: "01KTK4NFD1WA58CVSVSXY1X2FE",
  },
  {
    seed: 3,
    aspect: 0.8,
    kind: "image",
    source: "instagram",
    count: 8,
    title: "April shower",
    time: "2026/06/12 08:15",
    id: "01KTK26F2WYAW8DMSMD0KAXNKW",
  },
  {
    seed: 4,
    aspect: 1.78,
    kind: "video",
    source: "youtube",
    title: "The Windows Laptop Problem",
    time: "2026/07/12 21:03",
    id: "01KXA0V980ZAMAZHX5VA8E0RZ8",
  },
  {
    seed: 5,
    aspect: 1.51,
    kind: "image",
    source: "cosmos",
    title: "The Kiladalen cabin in Sweden, designed by Vardehaugen",
    time: "2026/07/16 10:36",
    id: "01KXPDEGV9YA8Q39G77V3HS3AA",
  },
  {
    seed: 6,
    aspect: 0.67,
    kind: "image",
    source: "arena",
    title: "Tagwalk: The Fashion Search Engine",
    time: "2026/06/10 15:48",
    id: "01KV6J5P9WMTK5G6J95BHHR6P6",
  },
  {
    seed: 7,
    aspect: 0.56,
    kind: "video",
    source: "tiktok",
    title: "Quote of the day 🍓",
    time: "2026/06/09 22:17",
    id: "01KV61AC81VWD0014BFT337G4V",
  },
  {
    seed: 8,
    aspect: 0.84,
    kind: "post",
    source: "x",
    title: "We built a tool to turn any company website into a Jingle.",
    time: "2026/06/12 09:44",
    id: "01KTK4NEYN86NZYPCCCNA8V3WQ",
  },
  {
    seed: 9,
    aspect: 0.8,
    kind: "image",
    source: "pinterest",
    title: "Dark academia outfit",
    time: "2026/06/14 18:25",
    id: "01KV5AS1J13MBG4WM03WXVFYP5",
  },
  {
    seed: 10,
    aspect: 0.67,
    kind: "image",
    source: "cosmos",
    title: "Studio organization featured by Minimalissimo.",
    time: "2026/07/16 09:12",
    id: "01KXP2TKF2ZN07QE8NDD0S5V5B",
  },
  {
    seed: 11,
    aspect: 0.8,
    kind: "image",
    source: "instagram",
    count: 4,
    title: "daily essentials.",
    time: "2026/07/03 13:29",
    id: "01KWAYCJR243T1TXWXQ8GCAZQA",
  },
  {
    seed: 12,
    aspect: 0.73,
    kind: "image",
    source: "arena",
    title: "Ikebana",
    time: "2026/07/12 20:55",
    id: "01KXA1D4FYF5GS2YFZT17AAQR3",
  },
  {
    seed: 13,
    aspect: 1.33,
    kind: "video",
    source: "youtube",
    title: "The Tofino Riders: A 1,000 Year-Old-Wave",
    time: "2026/07/13 11:08",
    id: "01KXAY0V7VATNMMA6XFEEQ8YAR",
  },
  {
    seed: 14,
    aspect: 0.87,
    kind: "post",
    source: "x",
    title: "Agents make ugly UIs because they've never seen good design.",
    time: "2026/06/08 16:33",
    id: "01KTJB3E6BAQSWPDF0TA4G0K36",
  },
  {
    seed: 15,
    aspect: 0.72,
    kind: "image",
    source: "pinterest",
    title: "Balloon Washed Denims",
    time: "2026/06/14 18:20",
    id: "01KV5AS1H57K8CEPEE5Y45BTEX",
  },
  {
    seed: 16,
    aspect: 0.75,
    kind: "image",
    source: "cosmos",
    title: "A wicker chair designed by John Dickinson.",
    time: "2026/07/13 10:47",
    id: "01KXAYVKHQ8R54NXFAKFD793TA",
  },
  {
    seed: 17,
    aspect: 0.56,
    kind: "video",
    source: "tiktok",
    title: "Same but diff ! Looks for the week!",
    time: "2026/06/09 22:21",
    id: "01KV6PPCBZVPNCR2E2GCM7BJHM",
  },
  {
    seed: 18,
    aspect: 1,
    kind: "image",
    source: "arena",
    title: "Coot - AI iOS device installs and IPA sharing",
    time: "2026/07/16 14:02",
    id: "01KXKZ5V4YBMMVAE8VMN271J5D",
  },
  {
    seed: 19,
    aspect: 0.75,
    kind: "image",
    source: "instagram",
    count: 8,
    title: "my summer essentials !!",
    time: "2026/06/12 08:18",
    id: "01KTK26F2XJJNW26QWYQJDWR2D",
  },
  {
    seed: 20,
    aspect: 0.74,
    kind: "post",
    source: "x",
    count: 3,
    title: "Complete end-to-end Sign In/Sign Up flows.",
    time: "2026/06/08 16:30",
    id: "01KTJB3E37BV6T68B8353NWDAK",
  },
  {
    seed: 21,
    aspect: 0.72,
    kind: "image",
    source: "pinterest",
    title: "Fall Outfits You'll FALL in Love With",
    time: "2026/06/14 18:19",
    id: "01KV5AS1H1XS2CVGGHCVCDPRSS",
  },
  {
    seed: 22,
    aspect: 1.33,
    kind: "video",
    source: "youtube",
    title: "David Kennedy: Ancient Ruins",
    time: "2026/07/13 11:12",
    id: "01KXAY0V7VKA660RCXT1ENFAS0",
  },
  {
    seed: 23,
    aspect: 1.5,
    kind: "image",
    source: "cosmos",
    title: "The interior of the Zweifel graphic design studio",
    time: "2026/07/16 09:15",
    id: "01KXP2R8T53GXNDE6MF689MAE4",
  },
  {
    seed: 24,
    aspect: 1,
    kind: "image",
    source: "arena",
    title: "Natural Selection",
    time: "2026/07/13 12:40",
    id: "01KXAYBQZS585AQJPP3ZGZAD22",
  },
];

export interface PackedSave<T> {
  save: T;
  top: number;
  left: number;
  width: number;
}

/** Exact port of the app's WaterfallView packMasonry: width-derived columns, shortest column wins. */
export function packMasonry<T extends { aspect?: number }>(
  saves: T[],
  containerWidth: number,
  colMin: number,
  gap: number,
  chromeHeight: number,
): { items: PackedSave<T>[]; totalHeight: number } {
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  const heights = new Array<number>(cols).fill(0);
  const items: PackedSave<T>[] = [];
  for (const save of saves) {
    const mediaH = colW / (save.aspect ?? 1);
    let target = 0;
    for (let i = 1; i < cols; i += 1) {
      if ((heights[i] ?? 0) < (heights[target] ?? 0)) target = i;
    }
    const top = heights[target] ?? 0;
    items.push({ save, top, left: target * (colW + gap), width: colW });
    heights[target] = top + mediaH + chromeHeight + gap;
  }
  let max = 0;
  for (const h of heights) if (h > max) max = h;
  return { items, totalHeight: Math.max(0, max - gap) };
}

/** Exact port of the app's GridView packUniform: square media cells filled row by row. */
export function packUniform<T>(
  saves: T[],
  containerWidth: number,
  colMin: number,
  gap: number,
  chromeHeight: number,
): { items: PackedSave<T>[]; totalHeight: number } {
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (colMin + gap)));
  const colW = (containerWidth - gap * (cols - 1)) / cols;
  const cellH = colW + chromeHeight;
  const items: PackedSave<T>[] = saves.map((save, idx) => ({
    save,
    top: Math.floor(idx / cols) * (cellH + gap),
    left: (idx % cols) * (colW + gap),
    width: colW,
  }));
  const rows = Math.ceil(saves.length / cols);
  return {
    items,
    totalHeight: rows > 0 ? rows * cellH + (rows - 1) * gap : 0,
  };
}

/** Shortest-column packing, same strategy as the app's waterfall layout. */
export function packColumns<T extends { aspect?: number }>(
  saves: T[],
  columnCount: number,
): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array<number>(columnCount).fill(0);
  for (const save of saves) {
    let shortest = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if ((heights[i] ?? 0) < (heights[shortest] ?? 0)) shortest = i;
    }
    columns[shortest]?.push(save);
    /** 1/aspect is the media height in column widths; 0.34 approximates the 44px meta chrome at the default 130px column. */
    heights[shortest] =
      (heights[shortest] ?? 0) + 1 / (save.aspect ?? 1) + 0.34;
  }
  return columns;
}
