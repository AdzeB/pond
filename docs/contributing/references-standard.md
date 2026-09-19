# References standard

[references.md](../../references.md) is Pond's alphabetized APA 7 bibliography.
The [research record](../references/README.md) connects those sources to product
decisions. Together these documents establish provenance; they do not certify a
source's claims. Markdown is authoritative.

## Task workflow

When a change uses an external source, cite it.

1. Add bibliography entries for sources you used or that influenced the outcome.
   Connect lasting influences in the [influence index](../references/influences.md).
   Update the [inventory](../references/inventory.md) when dependencies, models,
   services, or assets change, checking versions against manifests and configuration.
2. Cite sources used or influential to an outcome in author–date form. Run
   `pnpm references:check` with the other contributor checks. Offline validation
   checks structure and links; human or agent review establishes relevance and
   factual accuracy.

## Bibliography and citations

Use APA 7 author–date citations in research notes, decision documents, and the
influence index, linked to an explicit stable bibliography anchor, for example
`[OpenAI (n.d.-b)](../../references.md#openai-codex-hooks)`. Adjust relative paths
for the citing file. Preserve an entry's anchor when changing its wording or
alphabetic position. Each bibliography entry needs a corresponding citation or
influence entry explaining its connection to Pond.

Format entries according to source type: author, date, italicized title where
appropriate, version or medium when relevant, and a direct source URL or DOI.
Include articles, documentation pages, repositories, software, designs, media,
datasets, and relevant AI tools. Prefer original sources and stable revisions.
Use verified author or organization names and publication dates; use `n.d.` for
an unavailable date. When the author is unknown, put the title in the author
position. Sort by author (or title without an author), then date and title;
disambiguate the same author and year with `a`, `b`, and so on in both entries
and citations. Deduplicate the same source while retaining distinct versions
when the version difference matters.

Include an APA retrieval date for unarchived content designed to change over
time; an ordinary webpage does not need one merely because it was accessed
online. Never turn a later metadata check into an original access date or
evidence of past use.

Personal communications, private uploads, and non-retrievable instructions do
not belong in an APA reference list
([Soto, 2018](../../references.md#soto-2018-personal-communication)).
Do not copy credentials, signed URL tokens, unnecessary personal data, or entire
chats into committed files. Cite a retrievable AI tool or shared output only when
that tool is itself a product source. Cite original verification sources for
factual claims.

For copied or adapted code, designs, media, and datasets, record creator, known
license or usage terms, and whether the contribution was copying, adaptation,
or inspiration. Preserve required attribution with the shipped artifact as well
as in the research record. Mark unknown terms honestly; a citation does not grant
reuse rights.

Preserve unrelated records and historical attribution. Keep original claims and
mark missing fields as unknown instead of inventing history.

## Local capture and disclosure

Follow the [capture setup and review workflow](../references/README.md#local-capture)
for Codex and Cursor. Hooks collect observable prompt, tool, model, session, and
file events as exposed by each client. Raw payloads stay under gitignored
`.tmp/references/`, separated by tool and hashed session. They may include private
inputs and tool responses. Do not copy raw capture into Git.

Default summary output contains event counts, identifiers, and local evidence
paths. Explicit `--evidence` inspection exposes raw local material for review;
its output is not a publishable draft. Summarize private material and explain
redactions without copying credentials, signed URL tokens, unnecessary personal
data, confidential content, or entire chats into committed files.

Hooks cannot establish completeness. Codex hosted web search is outside tool-hook
coverage ([OpenAI, n.d.-b](../../references.md#openai-codex-hooks)); wrapper tools
may hide nested calls. Independently used browsers and Figma are not monitored.
Cite consulted pages and Figma files in the influence index when they inform a
product decision. An event without a model identifier leaves that identifier
unknown.

Capture failures must leave development usable while reporting degraded coverage.
Review setup health and record missing sessions, events, or evidence. Follow each
client's trust prompts when enabling repository hooks; never silently bypass
that review. Capture does not upload, commit, or publish records automatically.
