import './polyfills.js'
import { FetchInterceptor } from '@mswjs/interceptors/fetch/web'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest/web'
import { defineNetwork, InterceptorSource } from 'msw/experimental'

export const network = defineNetwork({
  sources: [
    new InterceptorSource({
      interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
    }),
  ],
  onUnhandledFrame: 'warn',
  context: {
    quiet: true,
  },
})
