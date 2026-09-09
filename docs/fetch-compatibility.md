# Fetch compatibility findings

Investigated 2026-09-09. Removed `src/compat/fetch-body.ts`; no replacement installed.
No suitable drop-in found among the candidates below.

React Native 0.87.1 uses `whatwg-fetch` 3.6.20. Adding `ReadableStream` alone does
not give its Request/Response constructors stream support. Reproduced in Hermes:

```ts
new Response('hello').body // undefined
new Request('https://msw.test', { method: 'POST', body: 'hello' }).body // undefined
await new Response(stream).text() // "[object ReadableStream]", not the stream contents
```

The last expression requires suppressing RN's TypeScript error: its declarations
also exclude stream input. Ordinary string-body readers and clones still work.
Stream consumption tracking and independent stream clones cannot work without a
body stream. [Fetch implementation](https://github.com/JakeChampion/fetch/blob/v3.6.20/fetch.js).

```text
HttpResponse.json(data) → RN Response → .body is undefined
                      → interceptor reconstructs response → empty payload
```

Interceptors reads `rawResponse.body` when constructing mocked Fetch responses.
This breaks ordinary JSON mocks, not just applications requesting streaming.
The existing iOS suite after removal: **9 failed, 10 passed** (4 suites).

| Candidate | Finding |
| --- | --- |
| `react-native-fetch-api` 3.0.0 | Published constructor probes: Request has no `.body`; string Response streams immediately end; byte streams yield numbers, not Uint8Array chunks; stream clones share the same stream. Not suitable. [Body](https://github.com/react-native-community/fetch/blob/master/src/Body.js), [Response](https://github.com/react-native-community/fetch/blob/master/src/Response.js). |
| `expo/fetch` (Expo 57.0.21) | Maintained native streaming transport, but runtime installs `fetch`, retaining RN Request/Response constructors. Its implementation explicitly notes the missing Request implementation. Requires Expo native infrastructure; not a constructor replacement. [Runtime](https://github.com/expo/expo/blob/main/packages/expo/src/winter/runtime.native.ts), [Fetch](https://github.com/expo/expo/blob/main/packages/expo/src/winter/fetch/fetch.ts). |
| `@whatwg-node/fetch` 0.10.13 | Browser entry re-exports existing globals; alternate implementation targets Node. Does not supply RN body support. [Package](https://github.com/ardatan/whatwg-node/tree/master/packages/fetch). |

Candidate probes ran against published JavaScript in Node; Expo was source-reviewed,
not installed or tested in the native app. RN failures were verified on iOS.

A durable fix belongs in a maintained Fetch implementation with complete body
semantics, or a separately scoped change to Interceptors' transport requirements.
The removed module effectively reimplemented that body model inside MSW.
