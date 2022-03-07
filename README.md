# DEPRECATED

The code has been migrated to [EW-CREDNTIALS](https://github.com/energywebfoundation/ew-credentials) and new changes would be introduced on the same. Kindly use it!

## Overview

This package consists of EVM smart contracts related to EnergyWeb IAM.

## Usage

### DomainReader

The `DomainReader` class can be used as shown to read a domain definition.
```typescript
import {
  DomainReader,
  VOLTA_ENS_REGISTRY_ADDRESS,
} from "@energyweb/iam-contracts";
import { providers, utils } from "ethers";

(async () => {
  const provider = new providers.JsonRpcProvider(
    "https://volta-rpc.energyweb.org"
  );
  const reader = new DomainReader({
    ensRegistryAddress: VOLTA_ENS_REGISTRY_ADDRESS,
    provider,
  });
  const roleDefinition = await reader.read({
    node: utils.namehash("manufacturer.roles.flex.apps.exampleco.iam.ewc"),
  });
})();
```

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

Compile contracts, generate contract types and compile typescript:

```sh
$ npm run build
```

Run tests:

```sh
$ npm test
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
