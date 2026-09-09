import { simulator } from './scripts/ios-simulator.mjs'
import {
  applePlatform,
  appleSimulator,
} from '@react-native-harness/platform-apple'

export default {
  entryPoint: './index.js',
  appRegistryComponentName: 'MswNativeTest',
  runners: [
    applePlatform({
      name: 'ios',
      device: appleSimulator(simulator.name, simulator.systemVersion),
      bundleId: 'org.reactjs.native.example.MswNativeTest',
    }),
  ],
  defaultRunner: 'ios',
  testTimeout: 10000,
  forwardClientLogs: true,
}
