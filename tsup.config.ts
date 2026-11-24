import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/**/*.{ts,js}'],
  /**
   * @note Do not bundle the modules. Bundling inlines the polyfills into
   * the entry module, hoisting the "msw" and interceptor imports above them.
   * Metro then evaluates those before the polyfills unless "inlineRequires" is on.
   */
  bundle: false,
  format: ['esm'],
  platform: 'neutral',
  outDir: 'lib',
  clean: true,
  sourcemap: true,
  onSuccess: 'tsc --project tsconfig.build.json',
})
