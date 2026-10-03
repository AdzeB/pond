# Provenance standard

[`.provenance/sources/`](../../.provenance/sources) is Pond's authoritative record of
external sources and their relationships to project artifacts and decisions.
Each thing or person has a `source.md`. Pages from that entity are links.
The generated [reference catalog](../provenance/generated/REFERENCES.md),
[influence index](../provenance/generated/INFLUENCES.md), and
[PROV JSON-LD graph](../provenance/generated/provenance.prov.jsonld) are review surfaces. Never
edit generated artifacts directly.

## Contributor workflow

When an external source affects a change:

1. Add or update the entity folder under `.provenance/sources/`. Use
   `companies`, `people`, `products`, or `standards`.
2. Add an `influenced` entry naming the relationship type, affected targets,
   and a one-sentence contribution.
3. Record usage terms honestly. Use `unknown` when they were not verified; a
   citation does not grant reuse rights.
4. Add evidence when a file, issue, pull request, commit, or release supports
   the claim. Never include credentials, private prompts, signed URLs, or
   unnecessary personal data.
5. Run `pnpm provenance:generate`, `pnpm provenance:check`, and `pnpm check`.

Use the narrowest accurate relationship type:

- `consulted` for background material considered during a decision.
- `inspired` when a source affected direction without copying material.
- `adapted` when Pond transforms a source pattern or method.
- `copied` when source material is reproduced substantially or verbatim.
- `bundled` when source material ships with Pond.
- `verified` when a source tests or confirms an implementation assumption.

`copied` and `bundled` relationships require human review of license terms,
attribution, notices, and distribution obligations. The CLI establishes
structural and referential conformance; it does not prove factual accuracy or
legal compliance.

## Generated artifacts

`pnpm provenance:generate` deterministically writes the three public artifacts
under `docs/provenance/generated/`. `pnpm provenance:generated:check` performs the same
generation in a temporary directory and fails when committed output is stale.
CI also validates `.provenance/` through the repository's public Provenance
GitHub Action.

Detailed research notes may remain in `docs/references/`, but source identity,
terms, affected targets, and contribution claims belong in `source.md`.
The pre-migration records are retained under `docs/provenance/migration/` as
historical evidence only.

Repository hooks may collect private, gitignored evidence under
`.tmp/references/`. This capture is an intake aid, not a second provenance
record, and it never updates `.provenance/` automatically. Review it with
`pnpm provenance:capture:status` and `pnpm provenance:capture:summary`; never
commit raw prompts, tool responses, credentials, or private inputs.
