# Android Native Bootstrap — React Native 0.87.1

The repository intentionally does not hand-author a partial React Native `android/` tree.
The native scaffold must be generated from the official React Native template on a
network-enabled build machine, then reviewed and committed before any release build.

## Preconditions

- Node 24
- pnpm 12.4.1
- Java/Android SDK compatible with the React Native 0.87 toolchain
- clean Git working tree
- network access to the npm registry

## Safe generation workflow

Generate an isolated reference project at the exact React Native version used by this
repository. Do not initialize over `apps/mobile` because that directory already contains
application source.

```sh
rm -rf .native-bootstrap
npx @react-native-community/cli@latest init DirectoryPlatformNative \
  --version 0.87.1 \
  --directory .native-bootstrap
```

Then review the generated native project and copy the required native scaffold into
`apps/mobile/` while preserving this repository's application source and package metadata.
At minimum review/merge:

- `android/`
- `index.js` or the generated application entrypoint
- `app.json`
- `babel.config.js`
- `metro.config.js`
- native permission declarations
- MapLibre native setup
- geolocation permission setup
- image picker setup
- release signing configuration placeholders (no secrets in Git)

Do not copy generated dependency versions blindly. Reconcile them against
`apps/mobile/package.json` and keep React Native pinned to `0.87.1` unless an explicit
upgrade is approved and regression-tested.

## Required verification after merge

```sh
pnpm install --frozen-lockfile
pnpm --filter @health/mobile typecheck
pnpm --filter @health/mobile lint
pnpm --filter @health/mobile test
pnpm --filter @health/mobile android
```

Then run a release build and install it on a physical Android device. The repository
production preflight intentionally fails until `apps/mobile/android/` exists.
