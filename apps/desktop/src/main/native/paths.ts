import { homedir } from "node:os";
import { join } from "node:path";

/** Chrome native-host connect path; keep in lockstep with `pond-native-host.c`. */
export function nativeSocketPath(): string {
  if (process.env.POND_SANDBOX)
    return join(process.env.POND_SANDBOX, "native.sock");
  return join(homedir(), "Library/Application Support/Pond", "native.sock");
}
