## Overview

This repo consists of EVM smart contracts related to EnergyWeb IAM.

This repo is using the hardhat framework: https://hardhat.org/

This repo uses the typescript functionality of hardhat: https://hardhat.org/guides/typescript.html

## Development

### Installing Dependencies

Using `npm` to install dependencies:

```sh
$ npm install
```

### Compile & Build

```sh
$ npm run compile
```

### Run tests

After installing dependencies, run:

```sh
$ npm run test
```

The tests access the [Hardhat Runtime Environment](https://hardhat.org/advanced/hardhat-runtime-environment.html#accessing-the-hre-from-outside-a-task) by importing it.

#### Debugging Tests

In vs code, the tests (which are run using Mocha), can be debugged with the following `launch.json` config:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Mocha All",
      "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
      "args": [
          "-r",
          "ts-node/register",
          "--timeout",
          "999999",
          "--colors",
          "${workspaceFolder}/test/**/*Test.ts",
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "protocol": "inspector"
    }
  ]
}
```
