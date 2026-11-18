import * as streams from 'web-streams-polyfill'

for (const [name, implementation] of Object.entries(streams)) {
  if (Reflect.get(globalThis, name) == null) {
    Object.defineProperty(globalThis, name, {
      value: implementation,
      writable: true,
      configurable: true,
    })
  }
}
