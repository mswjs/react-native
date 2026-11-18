import { URL, URLSearchParams } from 'react-native-url-polyfill'

globalThis.URL ??= URL
globalThis.URL.canParse ??= URL.canParse
globalThis.URLSearchParams ??= URLSearchParams
