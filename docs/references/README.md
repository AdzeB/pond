# Research record

Pond's [APA bibliography](../../references.md) identifies sources. This research
record explains how those sources contributed to the product. Follow the
[references standard](../contributing/references-standard.md) when citing them.

- [Influence index](influences.md): sources connected to decisions and artifacts.
- [Dependency inventory](inventory.md): dependencies, tools, models, and assets.
- [Eagle 4 desktop parity audit](eagle-4-desktop-parity-audit.md): September 2026 runtime, UI, compatibility, and code comparison.
- [Eagle 4 desktop surface inventory](eagle-4-desktop-surface-inventory.md): complete renderer-level screen, menu, option, viewer, and state catalog.
- [On-device model defaults](on-device-model-defaults.md): September 2026 model recommendations and rollout requirements.

## Local capture

Repository hooks invoke the shared Node capture script from Codex and Cursor.
Use Node 24 and pnpm 11.27.0. Inspect the repository hook
configuration and `scripts/reference-capture.mjs` before enabling them in each
client. Accept the client's normal workspace/hook trust flow when offered; local
configuration existing on disk is not proof that a client loaded or trusted it.
In Codex, run `/hooks` and review/enable the repository hooks through that normal
trust interface. The implementation smoke check discovered all 11 hook entries
but reported them untrusted; their presence alone did not activate capture.

Payloads are kept locally in `.tmp/references/<tool>/<hashed-session>/` with
restrictive permissions. Event files retain available identifiers and timestamps;
provider-identified retries deduplicate. Events without a provider identity remain
separate and are marked `delivery-identity-only`. Raw data may contain prompts, responses, and private
material. The directory is gitignored and no capture command commits or uploads it.

```bash
pnpm references:status
pnpm references:summary
pnpm references:status --tool codex --session SESSION_ID
pnpm references:summary --tool cursor --session SESSION_ID
pnpm references:summary --tool codex --session SESSION_ID --evidence
pnpm references:check
```

Status reports local capture health. Summary defaults to event counts,
identifiers, and evidence paths; it does not print prompts, responses, or URLs.
Use `--evidence` only for deliberate local inspection. Summarize private
material without copying credentials, signed URL tokens, unnecessary personal
data, confidential content, or entire chats into committed files. Automatic
evidence collection does not decide whether a source was read, used, or
influential.

Codex hosted searches and tool wrappers can leave gaps. Browser or Figma activity
outside observed AI tool calls requires a citation when that source informs a
product decision. Missing files or no events mean unknown coverage, not that no
research occurred. Capture hooks fail open so development can continue.

## Setup smoke check

Complete this check separately in a genuine Codex session and a genuine Cursor
session after reviewing and enabling their repository hooks. Fixture tests prove
adapter behavior; they do not prove client integration.

1. Open this repository and complete the client's trust/setup flow. Record the
   client version and available model identifier; mark unexposed values unknown.
2. Start a fresh harmless task, supply a non-private test prompt, read a repository
   file, and complete the session. Check status and inspect only that session's
   evidence for the observed prompt, supported tool activity, and lifecycle events.
3. Share a public browser source with a recorded query and page URL. Separately
   share a Figma reference you can access; record its exposed file/frame/version
   identifiers. Mark each as supplied, then consulted or used only after inspection.
4. Compare actual activity with local capture. Note hosted-search, wrapper,
   unavailable-source, model, and lifecycle gaps.
5. Check `git status --short` and `git check-ignore .tmp/references/` to confirm
   evidence remains outside Git. Run `pnpm references:check` before committing
   bibliography or influence changes.

These are setup acceptance steps, not a claim that both clients or live Figma
have already been verified.
