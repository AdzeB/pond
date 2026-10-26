import type { Capture, CaptureAuthor } from "@pond/schema/raw";
import { z } from "zod";
import type { ListEntry } from "../list-types";

/** Long enough for search and Fish to read a README, short enough to keep the save row small. */
const TEXT_LIMIT = 12_000;

const OwnerSchema = z
  .object({
    login: z.string().optional().catch(undefined),
    avatar_url: z.string().optional().catch(undefined),
    html_url: z.string().optional().catch(undefined),
  })
  .catch({});

export const RepoSchema = z.object({
  full_name: z.string(),
  description: z.string().nullish().catch(null),
  homepage: z.string().nullish().catch(null),
  topics: z.array(z.string()).optional().catch(undefined),
  owner: OwnerSchema.optional(),
});
export type GithubRepo = z.infer<typeof RepoSchema>;

export const StarPageSchema = z.array(
  z
    .object({
      starred_at: z.string().optional().catch(undefined),
      repo: RepoSchema,
    })
    .nullable()
    .catch(null),
);

/** GitHub treats owner and repo names case-insensitively, so ids and URLs are lowercase. */
function githubRepoId(fullName: string): string {
  return fullName.trim().toLowerCase();
}

function githubRepoUrl(fullName: string): string {
  return `https://github.com/${githubRepoId(fullName)}`;
}

export function starEntry(
  star: NonNullable<z.infer<typeof StarPageSchema>[number]>,
): ListEntry {
  const { repo } = star;
  const entry: ListEntry = {
    sourceId: githubRepoId(repo.full_name),
    url: githubRepoUrl(repo.full_name),
    title: repo.full_name,
    listKinds: ["saved"],
  };
  if (star.starred_at) entry.savedAt = star.starred_at;
  if (repo.description) entry.description = repo.description;
  if (repo.owner?.login) entry.author = repo.owner.login;
  return entry;
}

function repoText(
  about: string | null | undefined,
  readme: string | null | undefined,
  topics: readonly string[] = [],
): string | undefined {
  const tagLine = topics.length > 0 ? `Topics: ${topics.join(", ")}` : "";
  const parts = [about?.trim(), tagLine, readme?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  if (parts.length === 0) return undefined;
  const text = parts.join("\n\n");
  return text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT)}…` : text;
}

export function captureFromRepo(
  repo: GithubRepo,
  readme: string | null,
): Capture {
  const sourceId = githubRepoId(repo.full_name);
  const capture: Capture = {
    id: sourceId,
    source: "github",
    url: githubRepoUrl(repo.full_name),
    title: repo.full_name,
    media: [
      {
        url: `https://opengraph.githubassets.com/1/${repo.full_name}`,
        type: "image",
        width: 1200,
        height: 600,
      },
    ],
  };
  const text = repoText(repo.description, readme, repo.topics);
  if (text) capture.description = text;
  const owner = repo.owner;
  if (owner?.login) {
    const author: CaptureAuthor = { name: owner.login, handle: owner.login };
    if (owner.avatar_url) author.avatarUrl = owner.avatar_url;
    author.profileUrl = owner.html_url ?? `https://github.com/${owner.login}`;
    capture.author = author;
  }
  if (repo.homepage) capture.extras = { externalLink: repo.homepage };
  return capture;
}
