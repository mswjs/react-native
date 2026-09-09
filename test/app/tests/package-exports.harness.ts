import { expect, test } from 'react-native-harness'
import { network } from '@msw/react-native'

test('loads the same ESM export through import and require', () => {
  const requiredModule: typeof import('@msw/react-native') = require('@msw/react-native')

  expect(requiredModule.network).toBe(network)
})

test('provides Web APIs without application polyfill setup', async () => {
  expect(new URL('/user', 'https://msw.test').href).toBe(
    'https://msw.test/user',
  )
  expect(new TextDecoder().decode(new TextEncoder().encode('hello'))).toBe(
    'hello',
  )
  expect(new MessageEvent('message', { data: 'hello' }).data).toBe('hello')

  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue('hello')
      controller.close()
    },
  })

  await expect(stream.getReader().read()).resolves.toEqual({
    done: false,
    value: 'hello',
  })
})
