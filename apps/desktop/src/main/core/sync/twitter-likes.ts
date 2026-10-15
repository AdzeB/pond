export function shouldHarvestTwitterLikes(
  account: { handle: string | null; sync: { syncLikes?: boolean } },
  aborted: boolean,
): boolean {
  const handle = account.handle?.replace(/^@/, "").trim();
  return account.sync.syncLikes !== false && !aborted && Boolean(handle);
}
