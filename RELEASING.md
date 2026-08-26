# Releasing Pond

Pond ships via **GitHub Releases**: unsigned macOS `.dmg` files (arm64 + x64), `latest-mac.yml` for auto-update, and a browser extension `.zip`.

## Version bump

Update the version string in all of these before tagging:

| File | Field |
|------|-------|
| [`apps/desktop/package.json`](apps/desktop/package.json) | `"version"` |
| [`apps/extension/package.json`](apps/extension/package.json) | `"version"` |
| [`apps/extension/wxt.config.ts`](apps/extension/wxt.config.ts) | `manifest.version` |
| [`apps/website/lib/release.ts`](apps/website/lib/release.ts) | `POND_VERSION` |

Hero and footer read the version from `POND_VERSION`, so they update with that file.

Commit the bump on `main`.

## Tag and publish

```bash
git tag v0.0.1
git push origin v0.0.1
```

Pushing a tag matching `v*` triggers [`.github/workflows/release.yml`](.github/workflows/release.yml), which:

1. Runs lint, typecheck, tests, and build
2. Packages macOS DMGs with `electron-builder --publish always`
3. Builds the extension zip and uploads it as `pond-extension-<version>.zip`

Release tag format must be `vX.Y.Z` (e.g. `v0.0.1`).

Artifact names (used by the website download links):

- `Pond-arm64.dmg`
- `Pond-x64.dmg`
- `pond-extension-<version>.zip`

## Local packaging (without publish)

```bash
pnpm install
pnpm --filter @pond/desktop dist:mac
```

Artifacts land in `apps/desktop/dist/`.

Extension zip:

```bash
pnpm --filter @pond/extension zip
```

## Smoke test checklist

Run these before announcing a release:

- [ ] GitHub Release contains arm64 + x64 `.dmg`, `latest-mac.yml`, and `pond-extension-X.Y.Z.zip`
- [ ] Fresh Mac: download arm64 DMG → right-click → **Open** → app launches (unsigned build)
- [ ] Website Download buttons hit the new artifacts
- [ ] Open Pond once so it registers the native host
- [ ] Load the extension unpacked → click the Pond icon or right-click a page → save appears in Pond
- [ ] Settings → **Check for Updates** → shows "You're on the latest version"
- [ ] Optional: tag a patch on a fork and confirm auto-update downloads the new build

## Notes

- **Signing**: v0.0.1 ships unsigned. Users may need right-click → Open on first launch.
- **Auto-update**: Requires the published `latest-mac.yml` from the release workflow. Dev builds skip the updater.
- **Windows**: `pnpm --filter @pond/desktop dist:win` produces an NSIS installer. It is unpublished and untested. Linux packaging exists in the same config and is not supported.
