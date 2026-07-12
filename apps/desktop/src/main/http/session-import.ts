import type { ConnectedAccount, Source } from "@pond/schema/db";
import {
  type ExtensionCookie,
  type SessionImportResponse,
  sessionImportPayloadSchema,
} from "@pond/schema/session";
import { session } from "electron";
import log from "electron-log/main.js";
import type { Context } from "hono";
import { extractorFor } from "../core/pipeline/extractors";
import {
  isAuthCookieName,
  primaryDomainForSource,
  probeUserHandle,
  writePartitionCookies,
} from "../core/refresh/scrape-window";
import { syncAccount } from "../core/sync";
import {
  createAccount,
  findAccountByHandle,
  findAccountByIdentityKey,
  listAccountsForSource,
  normalizeHandle,
  partitionForAccount,
  patchAccount,
} from "../core/sync/accounts";
import { identityKeyFromCookies } from "./session-identity";

export async function sessionImportHandler(c: Context): Promise<Response> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ status: "error", error: "invalid_json" }, 400);
  }

  const parsed = sessionImportPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    log.warn(
      "[pond http] session/import validation failed",
      parsed.error.flatten(),
    );
    return c.json({ status: "error", error: parsed.error.flatten() }, 400);
  }

  const { source, cookies } = parsed.data;
  const domain = primaryDomainForSource(source);
  if (!domain) {
    return c.json(
      {
        status: "error",
        error: `source ${source} has no cookie domain configured`,
      },
      400,
    );
  }

  const allowedHost = domain.replace(/^\./, "").toLowerCase();
  const filtered = cookies.filter((cookie: ExtensionCookie) => {
    const ck = cookie.domain.replace(/^\./, "").toLowerCase();
    return ck === allowedHost || ck.endsWith(`.${allowedHost}`);
  });

  if (filtered.length === 0) {
    const body: SessionImportResponse = {
      ok: false,
      imported: 0,
      connected: false,
      reason: "no_cookies_for_source_domain",
    };
    return c.json({ status: "success", data: body });
  }

  // Reject unauthenticated sessions before touching any partition; the
  // extension pushes whatever the browser has, signed-in or not.
  if (!filtered.some((cookie) => isAuthCookieName(source, cookie.name))) {
    const body: SessionImportResponse = {
      ok: false,
      imported: 0,
      connected: false,
      reason: "no_auth_cookies_in_payload",
    };
    return c.json({ status: "success", data: body });
  }

  // Work out WHICH account this browser session belongs to, then write the
  // cookies into that account's isolated partition.
  const identityKey = identityKeyFromCookies(source, filtered);
  const resolution = await resolveTargetAccount(source, filtered, identityKey);
  const account = resolution.account;

  const { written, skipped } = await writePartitionCookies({
    cookies: filtered,
    partition: partitionForAccount(account.id),
  });
  log.info(
    `[pond http] session/import ${source} → @${account.handle ?? "?"} (${account.id}, ${resolution.kind}): ` +
      `wrote ${written} (skipped ${skipped}, filtered out ${cookies.length - filtered.length})`,
  );

  // Persist identity learned during this import (cookie key, probed handle).
  const patch: { identityKey?: string; handle?: string } = {};
  if (identityKey && account.identityKey !== identityKey) {
    patch.identityKey = identityKey;
  }
  if (resolution.probedHandle && !account.handle) {
    patch.handle = resolution.probedHandle;
  }
  if (Object.keys(patch).length > 0) {
    await patchAccount(account.id, patch).catch((err) =>
      log.warn("[pond http] session/import identity patch failed", err),
    );
  }

  void syncAccount(account.id, { trigger: "manual" }).catch((err) =>
    log.warn("[pond http] session/import follow-up sync threw", source, err),
  );

  const body: SessionImportResponse = {
    ok: true,
    imported: written,
    connected: true,
  };
  return c.json({ status: "success", data: body });
}

interface AccountResolution {
  account: ConnectedAccount;
  kind: "identity_match" | "handle_match" | "reauth" | "created" | "ambiguous";
  probedHandle: string | null;
}

// Match the pushed session to a ConnectedAccount, creating one for a new
// identity. Matching strength, in order: stable identity cookie → probed
// handle → sole-account re-auth → first account (ambiguous, logged).
async function resolveTargetAccount(
  source: Source,
  cookies: ExtensionCookie[],
  identityKey: string | null,
): Promise<AccountResolution> {
  if (identityKey) {
    const matched = await findAccountByIdentityKey(source, identityKey);
    if (matched) {
      return { account: matched, kind: "identity_match", probedHandle: null };
    }
  }

  const accounts = await listAccountsForSource(source);

  // For sources with an in-page handle probe (and no identity cookie), the
  // probed handle is the only way to tell accounts apart. Costs one hidden-
  // window navigation against a staging partition.
  let probedHandle: string | null = null;
  if (extractorFor(source)?.probeExpression) {
    probedHandle = await probeStagedHandle(source, cookies);
  }
  if (probedHandle) {
    const matched = await findAccountByHandle(source, probedHandle);
    if (matched) {
      return { account: matched, kind: "handle_match", probedHandle };
    }
  }

  // A migrated (pre-multi-account) account carries no identityKey, so a fresh
  // push from its owner matches nothing above. When the source has exactly one
  // such unclaimed account — and the probed handle doesn't contradict it —
  // adopt it instead of minting a duplicate; the caller stamps the identityKey.
  const sole = accounts.length === 1 ? accounts[0] : undefined;
  if (
    sole &&
    sole.identityKey === null &&
    !(probedHandle && sole.handle && sole.handle !== probedHandle)
  ) {
    return { account: sole, kind: "reauth", probedHandle };
  }

  // A distinct identity signal that matched nothing → a genuinely new account.
  if (identityKey || probedHandle) {
    const account = await createAccount({
      source,
      handle: probedHandle,
      identityKey,
    });
    return { account, kind: "created", probedHandle };
  }

  // No identity signal at all (no identity cookie, no probe support).
  if (accounts.length === 0) {
    const account = await createAccount({ source });
    return { account, kind: "created", probedHandle };
  }
  const first = accounts[0];
  if (!first) throw new Error("unreachable: accounts non-empty");
  if (accounts.length > 1) {
    log.warn(
      `[pond http] session/import ${source}: ${accounts.length} accounts but the session carries no identity; assigning to the first`,
    );
    return { account: first, kind: "ambiguous", probedHandle };
  }
  return { account: first, kind: "reauth", probedHandle };
}

// Stage the pushed cookies into a throwaway in-memory partition and run the
// source's handle probe against it, leaving every real account jar untouched.
async function probeStagedHandle(
  source: Source,
  cookies: ExtensionCookie[],
): Promise<string | null> {
  const staging = `pond-staging-${source}`;
  try {
    await session.fromPartition(staging).clearStorageData();
    await writePartitionCookies({ cookies, partition: staging });
    const handle = await probeUserHandle(source, staging);
    return normalizeHandle(handle);
  } catch (err) {
    log.warn("[pond http] session/import staged probe failed", source, err);
    return null;
  } finally {
    void session
      .fromPartition(staging)
      .clearStorageData()
      .catch(() => {});
  }
}
