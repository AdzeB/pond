import { homedir } from "node:os";
import { join } from "node:path";

/** Chrome native-host connect path; keep in lockstep with `pond-native-host.c`. */
export function nativeSocketPath(): string {
  return join(homedir(), "Library/Application Support/Pond", "native.sock");
}
