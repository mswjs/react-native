import { afterAll, expect, test } from 'react-native-harness'

const apiNames = [
  'URL',
  'URLSearchParams',
  'TextEncoder',
  'TextDecoder',
  'MessageEvent',
  'ProgressEvent',
  'BroadcastChannel',
  'XMLHttpRequestUpload',
  'ReadableStream',
  'ReadableStreamDefaultController',
  'ReadableByteStreamController',
  'ReadableStreamBYOBRequest',
  'ReadableStreamDefaultReader',
  'ReadableStreamBYOBReader',
  'WritableStream',
  'WritableStreamDefaultController',
  'WritableStreamDefaultWriter',
  'ByteLengthQueuingStrategy',
  'CountQueuingStrategy',
  'TransformStream',
  'TransformStreamDefaultController',
]

const existingApis = Object.fromEntries(
  apiNames
    .filter((name) => Reflect.get(globalThis, name) != null)
    .map((name) => [name, Reflect.get(globalThis, name)]),
)

require('@msw/react-native')

const sender = new BroadcastChannel('polyfills-test')
const receiver = new BroadcastChannel('polyfills-test')

afterAll(() => {
  sender.close()
  receiver.close()
})

test('preserves existing runtime APIs', () => {
  expect(Object.keys(existingApis).length).toBeGreaterThan(0)
  expect(
    Object.fromEntries(
      Object.keys(existingApis).map((name) => [
        name,
        Reflect.get(globalThis, name),
      ]),
    ),
  ).toEqual(existingApis)
})

test('provides all required runtime APIs', () => {
  expect(
    apiNames.filter(
      (name) => typeof Reflect.get(globalThis, name) !== 'function',
    ),
  ).toEqual([])
})

test('provides Promise.withResolvers', async () => {
  const { promise, resolve } = Promise.withResolvers<string>()
  resolve('hello')

  await expect(promise).resolves.toBe('hello')
})

test('checks whether a URL can be parsed', () => {
  const canParse: (url: string, base?: string) => boolean = Reflect.get(URL, 'canParse')
  expect(canParse('https://msw.test/user')).toBe(true)
  expect(canParse('/user', 'https://msw.test')).toBe(true)
  expect(canParse('http://[')).toBe(false)
})

test('delivers a message to another channel with the same name', async () => {
  const message = new Promise<unknown>((resolve) => {
    receiver.onmessage = (event) => {
      resolve(event.data)
    }
  })

  sender.postMessage('hello')

  await expect(message).resolves.toBe('hello')
})

test('returns individual Set-Cookie header values', () => {
  const headers = new Headers()
  headers.append('Set-Cookie', 'a=1; Expires=Wed, 21 Oct 2015 07:28:00 GMT')
  headers.append('Set-Cookie', 'b=2; Path=/')

  expect(headers.getSetCookie()).toEqual([
    'a=1; Expires=Wed, 21 Oct 2015 07:28:00 GMT',
    'b=2; Path=/',
  ])
})

test('returns no Set-Cookie header values if none are set', () => {
  const headers = new Headers({ 'Content-Type': 'text/plain' })

  expect(headers.getSetCookie()).toEqual([])
})
