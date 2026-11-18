if (
  globalThis.XMLHttpRequestUpload == null &&
  typeof XMLHttpRequest !== 'undefined'
) {
  globalThis.XMLHttpRequestUpload = new XMLHttpRequest().upload.constructor
}
