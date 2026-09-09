import { network } from '@msw/react-native'
import {
  afterAll,
  afterEach,
  beforeAll,
  expect,
  test,
} from 'react-native-harness'
import { Platform } from 'react-native'
import { http, HttpResponse } from 'msw'
import { HttpNetworkFrame } from 'msw/experimental'

beforeAll(() => {
  network.configure({
    handlers: [
      http.get('https://msw.test/user', () => {
        return HttpResponse.json({ name: 'John' })
      }),
    ],
    onUnhandledFrame({ frame, defaults }) {
      if (
        frame instanceof HttpNetworkFrame &&
        new URL(frame.data.request.url).hostname === 'localhost'
      ) {
        return
      }

      defaults.error()
    },
  })
  network.enable()
})

afterEach(() => {
  network.resetHandlers()
})

afterAll(() => {
  network.disable()
})

test('handles fetch requests in the native runtime', async () => {
  expect(Platform.OS).toBe('ios')
  const response = await fetch('https://msw.test/user')
  expect(response.status).toBe(200)
  await expect(response.text()).resolves.toBe(JSON.stringify({ name: 'John' }))
})

test('overrides an initial handler with network.use', async () => {
  network.use(
    http.get('https://msw.test/user', () => {
      return HttpResponse.json({ name: 'Kate' })
    }),
  )

  const response = await fetch('https://msw.test/user')
  await expect(response.json()).resolves.toEqual({ name: 'Kate' })
})

test('restores the initial handlers after resetHandlers', async () => {
  network.use(
    http.get('https://msw.test/user', () => {
      return HttpResponse.json({ name: 'Kate' })
    }),
  )

  const overriddenResponse = await fetch('https://msw.test/user')
  await expect(overriddenResponse.json()).resolves.toEqual({ name: 'Kate' })

  network.resetHandlers()

  const response = await fetch('https://msw.test/user')
  await expect(response.json()).resolves.toEqual({ name: 'John' })
})

test('handles XMLHttpRequest requests', async () => {
  const response = new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('GET', 'https://msw.test/user')

    request.onload = () => {
      resolve(request.responseText)
    }

    request.onerror = () => {
      reject(new Error('XMLHttpRequest failed'))
    }
    request.send()
  })

  await expect(response).resolves.toBe(JSON.stringify({ name: 'John' }))
})

test('reads a POST body in a request handler', async () => {
  network.use(
    http.post('https://msw.test/user', async ({ request }) => {
      return HttpResponse.json(await request.json())
    }),
  )

  const response = await fetch('https://msw.test/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Kate' }),
  })

  await expect(response.json()).resolves.toEqual({ name: 'Kate' })
})
