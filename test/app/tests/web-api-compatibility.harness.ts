import '@msw/react-native'
import { expect, test } from 'react-native-harness'

test('exposes response bodies as streams', () => {
  const response = new Response('hello')

  expect(response.body).toBeInstanceOf(ReadableStream)
})

test('reads a stream passed to the Response constructor', async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('hello'))
      controller.close()
    },
  })

  // @ts-expect-error React Native also omits standard stream bodies from its Response types.
  const response = new Response(stream)

  await expect(response.text()).resolves.toBe('hello')
})

test('exposes request bodies as streams', () => {
  const request = new Request('https://msw.test/user', {
    method: 'POST',
    body: 'hello',
  })

  expect(request.body).toBeInstanceOf(ReadableStream)
})

test('exposes the upload event target constructor', () => {
  expect(typeof Reflect.get(globalThis, 'XMLHttpRequestUpload')).toBe(
    'function',
  )
})

test('consumes a response body only once', async () => {
  const response = new Response('hello')

  expect(response.bodyUsed).toBe(false)
  await expect(response.text()).resolves.toBe('hello')
  expect(response.bodyUsed).toBe(true)
  await expect(response.text()).rejects.toThrow(TypeError)
})

test('reads cloned response bodies independently', async () => {
  const response = new Response('hello')
  const clone = response.clone()

  await expect(clone.text()).resolves.toBe('hello')
  expect(response.bodyUsed).toBe(false)
  await expect(response.text()).resolves.toBe('hello')
})

test('reads cloned request bodies independently', async () => {
  const request = new Request('https://msw.test/user', {
    method: 'POST',
    body: 'hello',
  })
  const clone = request.clone()

  await expect(clone.text()).resolves.toBe('hello')
  expect(request.bodyUsed).toBe(false)
  await expect(request.text()).resolves.toBe('hello')
})

test('marks a response body used when read through its stream', async () => {
  const response = new Response('hello')
  const reader = response.body!.getReader()

  expect(response.bodyUsed).toBe(false)
  await expect(reader.read()).resolves.toEqual({
    done: false,
    value: new TextEncoder().encode('hello'),
  })
  expect(response.bodyUsed).toBe(true)
  await expect(response.text()).rejects.toThrow(TypeError)
})
