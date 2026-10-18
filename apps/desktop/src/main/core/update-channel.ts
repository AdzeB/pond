import type { Prefs } from "@pond/schema/db";

export type UpdateChannel = NonNullable<Prefs["updates"]["channel"]>;

export function installedChannel(version: string): UpdateChannel {
  return /^\d+\.\d+\.\d+-nightly\./.test(version) ? "nightly" : "stable";
}

/** Until you pick a channel, a nightly install keeps getting nightlies. */
export function withInstalledChannel(prefs: Prefs, version: string): Prefs {
  if (prefs.updates.channel) return prefs;
  return {
    ...prefs,
    updates: { ...prefs.updates, channel: installedChannel(version) },
  };
}
