import { expect, test } from 'react-native-harness'

const apiNames = [
  'URL',
  'URLSearchParams',
  'TextEncoder',
  'TextDecoder',
  'MessageEvent',
  'ProgressEvent',
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
