# Releasing Pond

Pond ships via **GitHub Releases**: unsigned macOS `.dmg` files (arm64 + x64), `latest-mac.yml` for auto-update, and a browser extension `.zip`.

## Version bump

The desktop app, browser extension, and website release metadata ship in lockstep with the `vX.Y.Z` GitHub tag. The release workflow rejects a tag when any value below differs. `@pond/cli` is published independently to npm from `packages/cli/package.json`; a desktop release does not require a CLI bump, and a CLI release does not change the desktop, extension, or website version. Other private workspace package versions are not Pond release inputs.

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
2. Packages the existing Electron/Vite output as macOS DMGs and publishes them
3. Builds the extension zip and uploads it as `pond-extension-<version>.zip`
4. Updates [`Casks/pond.rb`](Casks/pond.rb) with the release version and DMG checksums

Release tag format must be `vX.Y.Z` (e.g. `v0.0.1`).

Artifact names (used by the website download links):

- `Pond-<version>-arm64.dmg`
- `Pond-<version>-x64.dmg`
- `pond-extension-<version>.zip`

## Homebrew

The repository contains a tap-compatible cask at
[`Casks/pond.rb`](Casks/pond.rb). After the repository becomes public, install
it with:

```bash
brew tap raphaelsalaja/pond https://github.com/raphaelsalaja/pond
brew install --cask raphaelsalaja/pond/pond
```

The release workflow updates the version and checksums on `main` after both
macOS artifacts are available.

## Local packaging (without publish)

```bash
pnpm install
pnpm dist:mac
```

Artifacts land in `apps/desktop/dist/`.

The root command builds the desktop once, then packages `out/**`. Desktop
`dist:*` scripts consume an existing build and do not run Electron/Vite again.

Extension zip:

```bash
pnpm --filter @pond/extension zip
```

## CLI publishing

The `@pond/cli` npm package has an independent release policy from the desktop
app. Before publishing it, run:

```bash
pnpm --filter @pond/cli build
pnpm --filter @pond/cli test
pnpm --filter @pond/cli pack:check
```

Confirm the tarball contains `dist`, `README.md`, and `skill`, and that the
published `pond --version` matches `packages/cli/package.json`.

## Smoke test checklist

Run these before announcing a release:

- [ ] GitHub Release contains versioned arm64 + x64 `.dmg`, `latest-mac.yml`, and `pond-extension-X.Y.Z.zip`
- [ ] `Casks/pond.rb` contains the release version and DMG checksums
- [ ] Fresh Mac: download arm64 DMG → right-click → **Open** → app launches (unsigned build)
- [ ] Website Download buttons hit the new artifacts
- [ ] Open Pond once so it registers the native host
- [ ] Load the extension unpacked → click the Pond icon or right-click a page → save appears in Pond
- [ ] Settings → **Check for Updates** → shows "You're on the latest version"
- [ ] Optional: tag a patch on a fork and confirm auto-update downloads the new build

## Notes

- **Signing**: v0.0.1 ships unsigned. Users may need right-click → Open on first launch.
- **Auto-update**: Requires the published `latest-mac.yml` from the release workflow. Dev builds skip the updater.
- **Windows and Linux**: Builds are disabled. Those platforms are coming soon.
