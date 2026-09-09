import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  outDir: 'lib',
  external: ['msw', /^@mswjs\/.+/, /^react-native(?:\/|$)/],
  clean: true,
  sourcemap: true,
  onSuccess: 'tsc --project tsconfig.build.json',
})
