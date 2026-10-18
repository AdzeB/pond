import { app } from "electron";
import { DEFAULT_INGEST_PORT } from "../shared/constants";

export type ReleaseChannel = "stable" | "nightly";

export interface ChannelIdentity {
  appName: string;
  /** Folder in the home directory that holds the default Library. */
  libraryFolder: string;
  ingestPort: number;
  /** `pond://` and the browser native host have one owner per Mac, so only stable claims them. */
  ownsSystemHandlers: boolean;
  /** Nightly keeps its bundle icon so it never passes for stable in the Dock. */
  followsAppIconPref: boolean;
  allowPrerelease: boolean;
}

const IDENTITIES = {
  stable: {
    appName: "Pond",
    libraryFolder: "Pond",
    ingestPort: DEFAULT_INGEST_PORT,
    ownsSystemHandlers: true,
    followsAppIconPref: true,
    allowPrerelease: false,
  },
  nightly: {
    appName: "Pond Nightly",
    libraryFolder: "Pond Nightly",
    ingestPort: DEFAULT_INGEST_PORT + 1,
    ownsSystemHandlers: false,
    followsAppIconPref: false,
    allowPrerelease: true,
  },
} satisfies Record<ReleaseChannel, ChannelIdentity>;

export function releaseChannelFor(version: string): ReleaseChannel {
  return /^\d+\.\d+\.\d+-nightly\./.test(version) ? "nightly" : "stable";
}

export function identityFor(channel: ReleaseChannel): ChannelIdentity {
  return IDENTITIES[channel];
}

export const channelIdentity = identityFor(releaseChannelFor(app.getVersion()));
