/**
 * React Native ships the "whatwg-fetch" polyfill whose `Request` and `Response`
 * do not implement body streams: the `body` property is missing and
 * a `ReadableStream` body is coerced to the "[object ReadableStream]" string.
 *
 * This module adds the missing body stream semantics to those classes in place
 * so their instances, including the ones created by the native `fetch`, keep
 * their identity. The bodies of the actual network responses are still
 * buffered by React Native and exposed as a single chunk.
 * @see https://github.com/facebook/react-native/issues/27741
 */

/**
 * Body streams exposed through the `body` property, by their owner.
 * @type {WeakMap<object, ReadableStream<Uint8Array>>}
 */
const exposedStreams = new WeakMap()

/**
 * @param {unknown} value
 * @returns {value is ReadableStream<Uint8Array>}
 */
function isReadableStream(value) {
  return (
    typeof ReadableStream !== 'undefined' && value instanceof ReadableStream
  )
}

/**
 * @param {Function | undefined} BodyOwner
 */
function canPolyfill(BodyOwner) {
  return (
    typeof BodyOwner === 'function' &&
    typeof BodyOwner.prototype._initBody === 'function' &&
    !('body' in BodyOwner.prototype)
  )
}

function createBodyUsedError() {
  return new TypeError('Already read')
}

/**
 * @param {Blob} blob
 * @returns {Promise<ArrayBuffer>}
 */
function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result)
    }

    reader.onerror = () => {
      reject(reader.error)
    }

    reader.readAsArrayBuffer(blob)
  })
}

/**
 * Reads the buffered (non-stream) body of the given owner.
 * @returns {Promise<Uint8Array>}
 */
async function readBufferedBody(owner) {
  if (owner._bodyArrayBuffer) {
    if (ArrayBuffer.isView(owner._bodyArrayBuffer)) {
      return new Uint8Array(
        owner._bodyArrayBuffer.buffer.slice(
          owner._bodyArrayBuffer.byteOffset,
          owner._bodyArrayBuffer.byteOffset +
            owner._bodyArrayBuffer.byteLength,
        ),
      )
    }

    return new Uint8Array(owner._bodyArrayBuffer.slice(0))
  }

  if (owner._bodyBlob) {
    return new Uint8Array(await readBlob(owner._bodyBlob))
  }

  if (owner._bodyFormData) {
    throw new TypeError('Reading a FormData body as a stream is not supported')
  }

  return new TextEncoder().encode(owner._bodyText)
}

/**
 * Reads the given stream to completion.
 * @param {ReadableStream<Uint8Array>} stream
 * @returns {Promise<Uint8Array>}
 */
async function readStream(stream) {
  const reader = stream.getReader()
  const chunks = []
  let byteLength = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    chunks.push(value)
    byteLength += value.byteLength
  }

  const bytes = new Uint8Array(byteLength)
  let offset = 0

  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return bytes
}

/**
 * Reads the stream body of the given owner to completion.
 * @returns {Promise<Uint8Array>}
 */
function consumeStreamBody(owner) {
  if (owner.bodyUsed) {
    return Promise.reject(createBodyUsedError())
  }

  owner.bodyUsed = true

  return readStream(owner._bodyInit)
}

/**
 * Creates the stream to expose through the `body` property.
 * Nothing is read from the body until the stream is read.
 * @returns {ReadableStream<Uint8Array>}
 */
function createExposedStream(owner) {
  /** @type {ReadableStreamDefaultReader<Uint8Array> | undefined} */
  let reader
  let isStarted = false

  return new ReadableStream(
    {
      async pull(controller) {
        if (!isStarted) {
          if (owner.bodyUsed) {
            controller.error(createBodyUsedError())
            return
          }

          isStarted = true
          owner.bodyUsed = true

          if (isReadableStream(owner._bodyInit)) {
            reader = owner._bodyInit.getReader()
          }
        }

        if (reader == null) {
          controller.enqueue(await readBufferedBody(owner))
          controller.close()
          return
        }

        const { done, value } = await reader.read()

        if (done) {
          controller.close()
          return
        }

        controller.enqueue(value)
      },
      async cancel(reason) {
        owner.bodyUsed = true

        if (reader != null) {
          await reader.cancel(reason)
          return
        }

        if (!isStarted && isReadableStream(owner._bodyInit)) {
          await owner._bodyInit.cancel(reason)
        }
      },
    },
    { highWaterMark: 0 },
  )
}

/**
 * @param {Function} BodyOwner
 */
function polyfillBody(BodyOwner) {
  const { prototype } = BodyOwner
  const { _initBody: initBody, arrayBuffer, text, blob, clone } = prototype

  prototype._initBody = function (body) {
    if (!isReadableStream(body)) {
      return initBody.call(this, body)
    }

    initBody.call(this, undefined)
    this._noBody = false
    this._bodyInit = body
  }

  Object.defineProperty(prototype, 'body', {
    get() {
      if (this._noBody || this._bodyInit == null) {
        return null
      }

      const exposedStream =
        exposedStreams.get(this) ?? createExposedStream(this)
      exposedStreams.set(this, exposedStream)

      return exposedStream
    },
    enumerable: true,
    configurable: true,
  })

  prototype.arrayBuffer = function () {
    if (!isReadableStream(this._bodyInit)) {
      return arrayBuffer.call(this)
    }

    return consumeStreamBody(this).then((bytes) => {
      return bytes.buffer
    })
  }

  prototype.text = function () {
    if (!isReadableStream(this._bodyInit)) {
      return text.call(this)
    }

    return consumeStreamBody(this).then((bytes) => {
      return new TextDecoder().decode(bytes)
    })
  }

  if (typeof blob === 'function') {
    prototype.blob = function () {
      if (!isReadableStream(this._bodyInit)) {
        return blob.call(this)
      }

      // React Native cannot create a Blob from binary data.
      return Promise.reject(
        new TypeError('Reading a stream body as a Blob is not supported'),
      )
    }
  }

  prototype.clone = function () {
    if (!isReadableStream(this._bodyInit)) {
      return clone.call(this)
    }

    if (this.bodyUsed) {
      throw createBodyUsedError()
    }

    const [ownStream, cloneStream] = this._bodyInit.tee()

    // The original "clone" creates the clone from the current body init.
    this._bodyInit = cloneStream
    const clonedOwner = clone.call(this)
    this._bodyInit = ownStream

    return clonedOwner
  }
}

/**
 * React Native cannot send a stream over the network.
 * Buffer the stream bodies of the outgoing requests instead.
 */
function polyfillFetch() {
  const originalFetch = globalThis.fetch

  globalThis.fetch = function fetch(input, init) {
    const hasStreamBody =
      isReadableStream(init?.body) ||
      (input instanceof Request && isReadableStream(input._bodyInit))

    if (!hasStreamBody) {
      return originalFetch(input, init)
    }

    const request = new Request(input, init)

    return request.arrayBuffer().then((body) => {
      return originalFetch(
        new Request(request.url, {
          method: request.method,
          headers: request.headers,
          credentials: request.credentials,
          mode: request.mode,
          signal: request.signal,
          body,
        }),
      )
    })
  }
}

if (canPolyfill(globalThis.Request) && canPolyfill(globalThis.Response)) {
  polyfillBody(Request)
  polyfillBody(Response)

  if (typeof globalThis.fetch === 'function') {
    polyfillFetch()
  }
}
