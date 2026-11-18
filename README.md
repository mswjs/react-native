# `@msw/react-native`

Mock Service Worker integration for React Native.

```sh
npm i -D @msw/react-native msw
```

```ts
import { network } from '@msw/react-native'
import { http, HttpResponse } from 'msw'

network.use(
  http.get('https://example.com/user', () => {
    return HttpResponse.json({ name: 'John' })
  }),
)

network.enable()
```

> Make sure to import `@msw/react-native` before `msw` as it installs necessary polyfills, like the one for `URL`, that are required for `msw` to function.

## Documentation

- [React Native guide for MSW](https://mswjs.io/guides/integrations/react-native)
- [MSW documentation](https://mswjs.io/docs/)
