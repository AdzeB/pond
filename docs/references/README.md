# Research record

Pond records external sources and their relationships under
[`.provenance/sources/`](../../.provenance/sources). Read the generated
[reference catalog](../provenance/generated/REFERENCES.md), [influence index](../provenance/generated/INFLUENCES.md),
or [PROV JSON-LD graph](../provenance/generated/provenance.prov.jsonld) for human- and
machine-readable views.

The documents in this directory are detailed research notes and audits. They
may supply relationship evidence, but they are not a second source registry.
Follow the [Provenance standard](../contributing/references-standard.md) when a
source affects a product or engineering change.

- [Eagle 4 desktop parity audit](eagle-4-desktop-parity-audit.md)
- [Eagle 4 desktop surface inventory](eagle-4-desktop-surface-inventory.md)
- [dnd-kit capabilities and interaction research](dnd-kit-capabilities-and-interaction-research-2026-09-25.md)
- [On-device model defaults](on-device-model-defaults.md)

The former bibliography, influence index, inventory, and workflow notes are
preserved under [`docs/provenance/migration/`](../provenance/migration/) only to
make the migration auditable. Repository hooks still collect private,
gitignored candidate evidence for manual review, but they never create public
records automatically. Add all new public provenance under
`.provenance/sources/`.
