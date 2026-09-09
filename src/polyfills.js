import 'core-js/modules/es.promise.with-resolvers'
import 'fast-text-encoding'
import { URL, URLSearchParams } from 'react-native-url-polyfill'
import * as streams from 'web-streams-polyfill'
// React Native implements MessageEvent but does not expose it globally.
import MessageEvent from 'react-native/src/private/webapis/html/events/MessageEvent'
import ProgressEvent from 'react-native/src/private/webapis/xhr/events/ProgressEvent'

globalThis.URL ??= URL
globalThis.URL.canParse ??= URL.canParse
globalThis.URLSearchParams ??= URLSearchParams
globalThis.MessageEvent ??= MessageEvent
globalThis.ProgressEvent ??= ProgressEvent

if (
  globalThis.XMLHttpRequestUpload == null &&
  typeof XMLHttpRequest !== 'undefined'
) {
  globalThis.XMLHttpRequestUpload = new XMLHttpRequest().upload.constructor
}

for (const [name, implementation] of Object.entries(streams)) {
  if (Reflect.get(globalThis, name) == null) {
    Object.defineProperty(globalThis, name, {
      value: implementation,
      writable: true,
      configurable: true,
    })
  }
}
