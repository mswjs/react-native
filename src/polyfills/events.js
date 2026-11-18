// React Native implements MessageEvent but does not expose it globally.
import MessageEvent from 'react-native/src/private/webapis/html/events/MessageEvent'
import ProgressEvent from 'react-native/src/private/webapis/xhr/events/ProgressEvent'

globalThis.MessageEvent ??= MessageEvent
globalThis.ProgressEvent ??= ProgressEvent
