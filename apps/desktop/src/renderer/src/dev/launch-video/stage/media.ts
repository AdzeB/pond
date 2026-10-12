/** Sample media the stage draws outside the app window. */
import type { WireSave } from "@shared/wire";

export interface Sample {
  id: string;
  title: string;
  caption: string;
  source: WireSave["source"];
  folder: string;
  aspect: number;
}

interface Entry extends Omit<Sample, "aspect"> {
  file: { width?: number; height?: number };
}

const response = await fetch("/fixtures/library.json");
const data = (await response.json()) as { saves: Entry[] };

export const SAMPLES: readonly Sample[] = data.saves.map((entry) => ({
  id: entry.id,
  title: entry.title,
  caption: entry.caption,
  source: entry.source,
  folder: entry.folder,
  aspect: (entry.file.width ?? 4) / (entry.file.height ?? 5),
}));

export const cover = (id: string) => `pond://${id}/cover.jpg`;

export function sample(title: string): Sample {
  const match = SAMPLES.find((entry) => entry.title === title);
  if (!match) throw new Error(`media: no sample "${title}"`);
  return match;
}

const held: HTMLImageElement[] = [];

/** Decodes every stage image up front so no capture frame catches one mid-load. */
export async function preload() {
  await Promise.all(
    SAMPLES.map((entry) => {
      const image = new Image();
      image.src = cover(entry.id);
      held.push(image);
      return image.decode().catch(() => undefined);
    }),
  );
}
