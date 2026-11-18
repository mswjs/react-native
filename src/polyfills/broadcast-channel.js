import EventTarget from 'react-native/src/private/webapis/dom/events/EventTarget'
import MessageEvent from 'react-native/src/private/webapis/html/events/MessageEvent'

/**
 * Open channels grouped by the channel name.
 * @type {Map<string, Set<BroadcastChannel>>}
 */
const openChannels = new Map()

/**
 * A minimal `BroadcastChannel` implementation for React Native.
 * Delivers messages between the channels of the same JavaScript runtime.
 * Messages are passed by reference since React Native has no structured clone.
 * @see https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts
 */
class BroadcastChannel extends EventTarget {
  #name
  #isClosed = false

  /** @type {((event: MessageEvent) => void) | null} */
  onmessage = null

  /** @type {((event: MessageEvent) => void) | null} */
  onmessageerror = null

  /**
   * @param {string} name
   */
  constructor(name) {
    super()

    this.#name = String(name)

    const channels = openChannels.get(this.#name) ?? new Set()
    channels.add(this)
    openChannels.set(this.#name, channels)

    this.addEventListener('message', (event) => {
      this.onmessage?.(event)
    })
  }

  get name() {
    return this.#name
  }

  /**
   * @param {unknown} message
   */
  postMessage(message) {
    if (this.#isClosed) {
      throw new Error(
        `Failed to execute 'postMessage' on 'BroadcastChannel': Channel is closed`,
      )
    }

    const recipients = Array.from(openChannels.get(this.#name) ?? []).filter(
      (channel) => {
        return channel !== this
      },
    )

    for (const recipient of recipients) {
      setTimeout(() => {
        recipient.#receive(message)
      }, 0)
    }
  }

  close() {
    this.#isClosed = true

    const channels = openChannels.get(this.#name)
    channels?.delete(this)

    if (channels?.size === 0) {
      openChannels.delete(this.#name)
    }
  }

  /**
   * @param {unknown} message
   */
  #receive(message) {
    if (this.#isClosed) {
      return
    }

    this.dispatchEvent(new MessageEvent('message', { data: message }))
  }
}

globalThis.BroadcastChannel ??= BroadcastChannel
