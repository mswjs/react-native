import { execFileSync } from 'node:child_process'

const { devices } = JSON.parse(
  execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], {
    encoding: 'utf8',
  }),
)

const simulators = Object.entries(devices).flatMap(
  ([runtime, runtimeDevices]) => {
    return runtimeDevices.map((device) => ({
      ...device,
      systemVersion: runtime.split('iOS-')[1]?.replaceAll('-', '.'),
    }))
  },
)

export const simulator = simulators.find((device) => {
  return (
    device.systemVersion &&
    device.name.startsWith('iPhone') &&
    (!process.env.IOS_SIMULATOR || device.name === process.env.IOS_SIMULATOR) &&
    (!process.env.IOS_VERSION ||
      device.systemVersion === process.env.IOS_VERSION)
  )
})

if (!simulator) {
  throw new Error(
    'No matching iOS simulator installed. Check xcrun simctl list devices.',
  )
}
