import { execFileSync } from 'node:child_process'
import { simulator } from './ios-simulator.mjs'

execFileSync(
  'xcodebuild',
  [
    '-workspace',
    'ios/MswNativeTest.xcworkspace',
    '-scheme',
    'MswNativeTest',
    '-configuration',
    'Debug',
    '-sdk',
    'iphonesimulator',
    '-destination',
    `id=${simulator.udid}`,
    '-derivedDataPath',
    'ios/build',
    '-jobs',
    '4',
    'CODE_SIGNING_ALLOWED=NO',
  ],
  { stdio: 'inherit' },
)

if (simulator.state !== 'Booted') {
  execFileSync('xcrun', ['simctl', 'boot', simulator.udid], {
    stdio: 'inherit',
  })
}

execFileSync('xcrun', ['simctl', 'bootstatus', simulator.udid, '-b'], {
  stdio: 'inherit',
})
execFileSync(
  'xcrun',
  [
    'simctl',
    'install',
    simulator.udid,
    'ios/build/Build/Products/Debug-iphonesimulator/MswNativeTest.app',
  ],
  { stdio: 'inherit' },
)
