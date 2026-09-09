# Native integration fixture

A React Native Community CLI app using Metro and Hermes. Tests are in
`tests/network.harness.ts` and run inside the iOS simulator through React
Native Harness. See the repository README for build and test commands.

The fixture consumes the built `@msw/react-native` workspace package and the same
published `msw` dependency as the library. `metro.config.js` watches the workspace; it does
not alias MSW to source files or replace native networking with mocks.
