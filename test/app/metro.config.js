const path = require('node:path')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

const packageRoot = path.resolve(__dirname, '../..')
const mswRoot = path.dirname(require.resolve('msw/package.json'))

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [packageRoot, mswRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(packageRoot, 'node_modules'),
    ],
  },
  transformer: {
    /**
     * @note Disable inline requires to match the default of "@expo/metro-config".
     * This is the stricter mode: every import is evaluated eagerly, in order.
     */
    getTransformOptions: async () => {
      return {
        transform: {
          experimentalImportSupport: false,
          inlineRequires: false,
        },
      }
    },
  },
})
