/** Sample media the stage draws outside the app windows. */

export const cover = (id: string) => `pond://${id}/cover.jpg`;

export const LANCIA = "01M1Z5DRYH8SCZC3SEB5KDTVJ5";
export const PORSCHE = "01M1Z5DRY5FRAXPA2HZT6QX6GG";

export const CLOUD = [
  "01M1Z5DRYDGRCEAKW1KJQE0FAX",
  "01M1Z5DRY5FRAXPA2HZT6QX6GG",
  "01M1Z5DRY5S61VEYDAW7E002CG",
  "01M1Z5DRYETKS93P3VYG3XMN0S",
  "01M1Z5EJKKMDFHN32RF0F8SEHN",
  "01M1Z5DRYE6T1NGY9JM58J499X",
  "01M1Z5DRY7F4P95NX6746E78DJ",
  "01M1Z5EJK4P9ZEZGQ1R9Y54V19",
  "01M1Z5DRYF2QRP1XWWFNQW1X8X",
  "01M1Z5EJK972KSWJZB69CV41QW",
  "01M1Z5DRYHZFA4CA4RF6NZQW4D",
  "01M1Z5EJJYM93DCFDMSQKTN8KP",
  "01M1Z5DRXXNQXYN25N0HSAYW9R",
  "01M1Z5EJKAP3VBPSW2HDZBFG6B",
] as const;

const held: HTMLImageElement[] = [];

/** Decodes every stage image up front so no capture frame catches one mid-load. */
export async function preload() {
  const sources = [...new Set([...CLOUD, LANCIA, PORSCHE])].map(cover);
  await Promise.all(
    sources.map((src) => {
      const image = new Image();
      image.src = src;
      held.push(image);
      return image.decode().catch(() => undefined);
    }),
  );
}
