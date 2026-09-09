# @msw/react-native

Mock Service Worker integration for React Native.

```sh
pnpm add -D @msw/react-native msw
```

```ts
import { network } from '@msw/react-native'
import { http, HttpResponse } from 'msw'

network.use(
  http.get('https://example.com/user', () => {
    return HttpResponse.json({ name: 'John' })
  }),
)

network.enable()
```

The exported `network` is the object returned by MSW’s `defineNetwork()`, configured
for React Native. Use `network.enable()` / `network.disable()` for interception,
`network.configure()` before enabling to set initial handlers and options, and
`network.use()`, `network.resetHandlers()`, and `network.restoreHandlers()` to
manage handlers. Handler APIs remain in the `msw` peer dependency.

Import `@msw/react-native` before `msw`. The library installs its URL, text encoding,
and Web Streams dependencies and exposes React Native’s existing `MessageEvent`
globally before initializing its integration. Only missing APIs are installed;
existing runtime implementations are preserved. No application polyfill setup is
required for these APIs. Fetch body compatibility remains unresolved; see below.

## Development

Use Node.js 24 (see `.node-version`). Both workspace packages use TypeScript 7.0.
Declarations are emitted by `tsc` directly because tsup’s declaration bundler
requires the old JavaScript compiler API.

MSW is installed as a development dependency. Run:

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm lint
pnpm publint
```

MSW 2.15.0 has an incompatible `InterceptorSource` constructor type. The correction
in MSW must be released before this package’s type checks can pass against the
registry dependency.

## Native integration tests

`test/app` is a React Native Community CLI app. React Native Harness bundles the
tests with Metro and executes them in Hermes on an iOS simulator:

```text
pnpm test → Harness → Metro → iOS app → fetch / XMLHttpRequest → MSW
```

Requires macOS, Xcode with an installed iPhone simulator, and CocoaPods.
After installing dependencies and building this package:

```sh
(cd test/app/ios && pod install)
pnpm test:build:ios
pnpm test
```

The build command builds and installs the debug app on the first available iPhone
simulator. Set `IOS_SIMULATOR` and/or `IOS_VERSION` for both commands to select a
specific installed simulator. Native rebuilds are only needed when native
sources or dependencies change; Metro picks up JavaScript changes on each run.

The suite covers initial fetch handling, `network.use()`, `network.resetHandlers()`,
and XMLHttpRequest handling. No networking or native modules are mocked by the
runner. The library supplies the Web API polyfills; the fixture has no polyfill setup.

CI runs lint, builds, type checks, publint, and these native tests on macOS.

### Native runtime compatibility

The custom Fetch body adapter has been removed. With React Native 0.87.1 and
linked MSW, the iOS suite currently reports **9 failed, 10 passed**. Request and
Response constructors lack standard body streams, and mocked response payloads
are lost. Existing tests expose these failures without skips.

See [Fetch compatibility findings](docs/fetch-compatibility.md) for the reproduced
gaps and evaluated alternatives. The library does not replace Request/Response.

MSW defers `BroadcastChannel` creation until WebSocket usage. The library exposes
React Native's existing `XMLHttpRequestUpload` and `ProgressEvent` implementations
only when their globals are missing.

Native test results are written to `test/app/.harness/results.json` and uploaded
as a CI artifact.

For local MSW verification, link both workspace consumers to the built MSW
checkout, then run `pnpm test`. Metro automatically watches the resolved MSW
package directory, including local links. CI uses the registry dependency and
needs the MSW fixes released.


## Module format

The package ships ESM only. Both `main` and the `default` export condition point
to `lib/index.js`, allowing Metro to resolve the same file for `import` and
`require` without an import-only exports branch.

```text
import / require → lib/index.js (ESM) → Metro transform → Hermes
```

Modern React Native’s Babel preset supports ESM syntax out of the box. Package
exports are enabled by default in Metro 0.82 / React Native 0.79 and Expo SDK 53.
See [Metro’s module API](https://metrobundler.dev/docs/module-api/),
[Metro’s exports guide](https://metrobundler.dev/docs/package-exports/), and
[Expo’s resolution guide](https://docs.expo.dev/versions/latest/config/metro/#es-module-resolution).

Verified with React Native 0.87.1 / Metro 0.87: static `import` and `require`
resolve to the same export on the iOS simulator; Android bundling also succeeds.
The entry now initializes React Native polyfills and requires Metro’s React Native
transforms; it is not directly executable in plain Node. This does not promise support
for every older Node/Jest setup; those may need ESM-aware configuration or
dependency transforms. Keep `import.meta` and top-level await out of the native
entry, since accepting ESM syntax does not imply support for every ESM feature.

A dynamic-import probe failed for both this package and React itself under
Harness 1.4.1. Dynamic import has not been independently verified in the native
app; that runner limitation is separate from the passing static-import check.
