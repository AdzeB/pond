import { readLibraryMedia } from "./security/library-media-storage";

export async function extractFontFamily(path: string): Promise<string | null> {
  try {
    return familyFromOpenType(await readLibraryMedia(path));
  } catch {
    return null;
  }
}

export function renameWithFamily(
  pattern: string,
  parts: {
    n: number;
    title: string;
    id: string;
    family: string | null;
  },
): string {
  return pattern
    .replaceAll("{n}", String(parts.n))
    .replaceAll("{title}", parts.title)
    .replaceAll("{id}", parts.id)
    .replaceAll("{family}", parts.family || parts.title);
}

function familyFromOpenType(bytes: Buffer): string | null {
  if (bytes.length < 12) return null;
  const tag = bytes.toString("ascii", 0, 4);
  if (tag === "wOFF" || tag === "wOF2") return null;
  if (tag === "ttcf") {
    if (bytes.length < 16) return null;
    return familyFromSfnt(bytes, bytes.readUInt32BE(12));
  }
  return familyFromSfnt(bytes, 0);
}

function familyFromSfnt(bytes: Buffer, offset: number): string | null {
  if (offset + 12 > bytes.length) return null;
  const tableCount = bytes.readUInt16BE(offset + 4);
  for (let index = 0; index < tableCount; index += 1) {
    const record = offset + 12 + index * 16;
    if (record + 16 > bytes.length) return null;
    if (bytes.toString("ascii", record, record + 4) !== "name") continue;
    const start = bytes.readUInt32BE(record + 8);
    const length = bytes.readUInt32BE(record + 12);
    if (start + length > bytes.length) return null;
    return parseNameTable(bytes.subarray(start, start + length));
  }
  return null;
}

function parseNameTable(table: Buffer): string | null {
  if (table.length < 6) return null;
  const count = table.readUInt16BE(2);
  const stringOffset = table.readUInt16BE(4);
  let unicode: string | null = null;
  let macintosh: string | null = null;
  for (let index = 0; index < count; index += 1) {
    const record = 6 + index * 12;
    if (record + 12 > table.length) break;
    const platform = table.readUInt16BE(record);
    const encoding = table.readUInt16BE(record + 2);
    const nameId = table.readUInt16BE(record + 6);
    const length = table.readUInt16BE(record + 8);
    const offset = table.readUInt16BE(record + 10);
    if (nameId !== 1) continue;
    const start = stringOffset + offset;
    const end = start + length;
    if (end > table.length) continue;
    const raw = table.subarray(start, end);
    if (platform === 3 && (encoding === 1 || encoding === 10)) {
      unicode = decodeUtf16Be(raw);
      break;
    }
    if (platform === 1 && !macintosh) macintosh = raw.toString("latin1");
  }
  return unicode || macintosh;
}

function decodeUtf16Be(bytes: Buffer): string {
  const units: number[] = [];
  for (let index = 0; index + 1 < bytes.length; index += 2)
    units.push(bytes.readUInt16BE(index));
  return String.fromCharCode(...units);
}
