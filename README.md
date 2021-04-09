## Overview

This package consists of EVM smart contracts related to EnergyWeb IAM.

## Contract Descriptions

### RoleDefinitionResolver.sol

This is an implementation of an ENS resolver that represents a role definition.
It extends the [ENS Public Resolver](https://docs.ens.domains/contract-api-reference/publicresolver) with additional resolver profiles,
specifically for the use case of issuing and verify role claims using a smart contract.
In other words, this custom ENS resolver allows some properties of a role definition to be (usefully) readable by another smart contract.

## Development

Install dependencies:

```sh
$ npm install
```

Generate contract types and compile typescript:

```sh
$ npm run build
```

Run tests:

```sh
$ npm test
```

If making changes to the contracts, they can be compiled with:

```sh
$ npm run compile:contracts
```

#### Debugging Tests

In vs code, the tests (which are run using Mocha), can be debugged with the following `launch.json` config.
Before debugging the tests, start a local chain using `npm run ganache`.

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Mocha All",
      "program": "${workspaceFolder}/contracts/node_modules/mocha/bin/_mocha",
      "args": [
          "-r",
          "ts-node/register",
          "--timeout",
          "999999",
          "--colors",
          "${workspaceFolder}/contracts/test/**/*Test.ts",
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "protocol": "inspector",
      "cwd": "${workspaceFolder}/contracts"
    }
  ]
}
```
