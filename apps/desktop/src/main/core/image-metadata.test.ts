import { describe, expect, it } from "vitest";
import { parseExif } from "./image-metadata";

function writeNumberEntry(
  buffer: Buffer,
  offset: number,
  tag: number,
  type: number,
  count: number,
  value: number,
) {
  buffer.writeUInt16LE(tag, offset);
  buffer.writeUInt16LE(type, offset + 2);
  buffer.writeUInt32LE(count, offset + 4);
  buffer.writeUInt32LE(value, offset + 8);
}

function writeTextEntry(
  buffer: Buffer,
  offset: number,
  tag: number,
  count: number,
  value: string,
) {
  buffer.writeUInt16LE(tag, offset);
  buffer.writeUInt16LE(2, offset + 2);
  buffer.writeUInt32LE(count, offset + 4);
  buffer.write(value, offset + 8, 4, "ascii");
}

function fixture(): Buffer {
  const buffer = Buffer.alloc(189);
  buffer.write("Exif\0\0II", 0, "ascii");
  buffer.writeUInt16LE(42, 8);
  buffer.writeUInt32LE(8, 10);
  buffer.writeUInt16LE(3, 14);
  writeNumberEntry(buffer, 16, 0x010f, 2, 6, 50);
  writeTextEntry(buffer, 28, 0x0110, 3, "R5\0");
  writeNumberEntry(buffer, 40, 0x8769, 4, 1, 56);
  buffer.write("Canon\0", 56, "ascii");
  buffer.writeUInt16LE(6, 62);
  writeNumberEntry(buffer, 64, 0xa434, 2, 5, 134);
  writeNumberEntry(buffer, 76, 0x920a, 5, 1, 159);
  writeNumberEntry(buffer, 88, 0x829d, 5, 1, 167);
  writeNumberEntry(buffer, 100, 0x829a, 5, 1, 175);
  writeNumberEntry(buffer, 112, 0x8827, 3, 1, 200);
  writeNumberEntry(buffer, 124, 0x9003, 2, 20, 139);
  buffer.write("RF24\0", 140, "ascii");
  buffer.write("2026:09:20 12:34:56\0", 145, "ascii");
  buffer.writeUInt32LE(50, 165);
  buffer.writeUInt32LE(1, 169);
  buffer.writeUInt32LE(28, 173);
  buffer.writeUInt32LE(10, 177);
  buffer.writeUInt32LE(1, 181);
  buffer.writeUInt32LE(125, 185);
  return buffer;
}

describe("parseExif", () => {
  it("normalizes camera and exposure fields", () => {
    expect(parseExif(fixture())).toMatchObject({
      cameraMake: "Canon",
      cameraModel: "R5",
      lensModel: "RF24",
      focalLength: 50,
      aperture: 2.8,
      exposureTime: "1/125",
      iso: 200,
    });
  });
});
