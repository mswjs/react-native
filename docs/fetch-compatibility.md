# Fetch compatibility

Last updated 2026-11-18. Verified against React Native 0.87.1 on iOS (Hermes).

React Native 0.87.1 uses `whatwg-fetch` 3.6.20, built on top of XMLHttpRequest.
Its Request/Response have no body streams, and adding `ReadableStream` alone
does not change that:

```ts
new Response('hello').body // undefined
new Request('https://msw.test', { method: 'POST', body: 'hello' }).body // undefined
await new Response(stream).text() // "[object ReadableStream]", not the stream contents
```

[Fetch implementation](https://github.com/JakeChampion/fetch/blob/v3.6.20/fetch.js),
[upstream issue](https://github.com/facebook/react-native/issues/27741).

## Why MSW needs body streams

| Scenario | Without body streams (`@mswjs/interceptors` 0.45.12) |
| --- | --- |
| Mocked `fetch` responses | Work. The mocked response is forwarded as-is. |
| Mocked `XMLHttpRequest` responses | Empty body. The interceptor reads `response.body.getReader()` and treats a missing body as empty. |
| Mocked stream responses (`new Response(stream)`, SSE) | Broken. The stream is coerced to a string. |

## Solution

`src/polyfills/fetch-body.js` adds the body stream semantics to React Native's
Request/Response in place, by patching their prototypes. The classes are not
replaced, so every instance keeps its identity, including the responses created
by the native `fetch`.

- `body` returns a lazy `ReadableStream` (`null` if there is no body).
  Nothing is read from the body until the stream is read.
- A `ReadableStream` is accepted as the body, and `text()`, `arrayBuffer()`,
  and `json()` read it.
- `bodyUsed` is set once the stream is read.
- `clone()` tees stream bodies.
- `fetch` buffers the stream body of an outgoing request before passing it
  to React Native.

The polyfill relies on the private fields of `whatwg-fetch` (`_initBody`,
`_bodyInit`, `_noBody`, etc.). It does nothing if the global classes do not look
like `whatwg-fetch` or already implement `body`.

This replaces the removed `src/compat/fetch-body.ts`, which reimplemented
the body model instead of augmenting the existing one.

## Limitations

- **No true network streaming.** React Native buffers the bodies of the actual
  responses, so they are exposed as a single chunk. Incremental delivery requires
  native code. Mocked responses are produced in JavaScript and stream as written.
- `blob()` rejects for stream bodies. React Native cannot create a Blob from
  binary data.
- `FormData` bodies cannot be read as a stream.
- Outgoing stream bodies are buffered in full before the request is sent.

## Alternatives considered

| Candidate | Finding |
| --- | --- |
| `react-native-fetch-api` 3.0.0 | Published constructor probes: Request has no `.body`; string Response streams immediately end; byte streams yield numbers, not Uint8Array chunks; stream clones share the same stream. Text-only network streaming. Not suitable. [Body](https://github.com/react-native-community/fetch/blob/master/src/Body.js), [Response](https://github.com/react-native-community/fetch/blob/master/src/Response.js). |
| `expo/fetch` (Expo 57.0.21) | Maintained native streaming transport, but runtime installs `fetch`, retaining RN Request/Response constructors. Its implementation explicitly notes the missing Request implementation. Requires Expo native infrastructure; not a constructor replacement. [Runtime](https://github.com/expo/expo/blob/main/packages/expo/src/winter/runtime.native.ts), [Fetch](https://github.com/expo/expo/blob/main/packages/expo/src/winter/fetch/fetch.ts). |
| `@whatwg-node/fetch` 0.10.13 | Browser entry re-exports existing globals; alternate implementation targets Node. Does not supply RN body support. [Package](https://github.com/ardatan/whatwg-node/tree/master/packages/fetch). |
| `react-native-nitro-fetch` | Native streaming transport. Requires native modules; not evaluated further. [Repository](https://github.com/margelo/react-native-nitro-fetch). |
| Reading `response.arrayBuffer()` in the XMLHttpRequest interceptor when `body` is missing | Fixes mocked XMLHttpRequest responses only. Mocked stream responses stay broken. |

Candidate probes ran against published JavaScript in Node; Expo was source-reviewed,
not installed or tested in the native app.
