import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeBatch: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("../db", () => ({ getDb: mocks.getDb }));
vi.mock("./executor", () => ({ executeBatch: mocks.executeBatch }));
vi.mock("electron-log/main.js", () => ({
  default: { info: vi.fn(), warn: vi.fn() },
}));

import { runLibraryScopeMigration } from "./library-scope-migration";

function migrationDb(queryResults: unknown[][]) {
  let queryIndex = 0;
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          all: vi.fn(() => queryResults[queryIndex++] ?? []),
        })),
      })),
    })),
    update: vi.fn(),
  };
}

describe("runLibraryScopeMigration", () => {
  beforeEach(() => {
    mocks.executeBatch.mockReset();
    mocks.getDb.mockReset();
  });

  it("does not purge valid saves whose media type is file", async () => {
    mocks.getDb.mockResolvedValue(
      migrationDb([
        [
          {
            id: "local-archive",
            source: "local",
            mediaType: "file",
            files: [
              {
                kind: "file",
                path: "archive.zip",
                sha256: "hash",
                size: 128,
              },
            ],
          },
        ],
        [],
        [],
      ]),
    );

    await runLibraryScopeMigration();

    expect(mocks.executeBatch).not.toHaveBeenCalled();
  });
});
