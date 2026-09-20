# Desktop compatibility fixtures

These manifests freeze representations that future migrations must continue to
read. They are descriptors, not complete Libraries or executable test payloads.
Tests may materialize the smallest directory tree needed for one descriptor in a
temporary directory, following the existing desktop test convention.

Each `manifest.json` uses this fixture-only shape:

- `schemaVersion`: version of the descriptor shape, currently `1`
- `id`: stable fixture identity
- `kind`: external or Pond representation under test
- `baseline`: minimal facts that identify the representation
- `compatibilityAssertions`: behavior a future reader or migration must preserve

Keep fixtures deterministic, anonymous, and free of credentials or personal
Library data. Add original bytes only when behavior depends on those bytes.
Record their source, checksum, and redistribution terms here before committing
them.

## Baselines

- `plaintext-pond-library`: current unencrypted Library layout and Save
  `info.json` schema
- `pond-package`: current directory-based `.pondpack` version 1 manifest
- `eagle-library`: unpacked Eagle Library structure accepted by the importer
- `locked-eagle-folders`: Eagle password markers and inherited exclusion
- `preferences`: flat, version 2, version 3, and Library-bundle preference forms
- `deep-links`: Library-bound and legacy Pond Save links
- `eaglepack`: characterization requirements for the undocumented transfer
  container

The Eaglepack descriptor is intentionally incomplete. Do not implement a parser
from filenames or assumptions in that file. Capture at least two exports from a
supported Eagle release, compare their container structure, redact private
metadata, and record checksums and observed fields before changing its status.
