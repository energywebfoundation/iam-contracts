## Overview

This repo consists of packages relating to EnergyWeb IAM.

## Package Descriptions

### iam-domain-contracts

Provides the solidity and ABI files for the following contracts:

- `RoleDefinitionResolver.sol`

### iam-domain-client

Provides client classes for reading from and writing to the `RoleDefinitionResolver`

## Development

This repository is a monorepo that uses [Rush](https://rushjs.io/) with the PNPM package manager.

PNPM is used for its speed and solution to NPM doppelgangers (as well as being the default option for rush). See comparison of [NPM vs PNPM vs Yarn for Rush](https://rushjs.io/pages/maintainer/package_managers/).

### Install PNPM and Rush

PNPM is required. See installation instructions here: https://pnpm.js.org/installation/

Rush is required. See installation instructions here: https://rushjs.io/pages/intro/get_started/

### Installing Dependencies

Use rush to install dependencies (not the package manager directly).
In other words, do not run `npm install` or `pnpm install`.
This is because [Rush optimizes](https://rushjs.io/pages/developer/new_developer/) by installing all of the dependency packages in a central folder, and then uses symlinks to create the “node_modules” folder for each of the projects.

```sh
$ rush install
```

### Compile & Build

Use rush to build.

```sh
$ rush build
```

### Run tests

After installing dependencies, run:

```sh
$ rush test
```

This is will run the `test` npm script in each package.

### Adding Dependencies

See `rush add` [instructions](https://rushjs.io/pages/commands/rush_add/).
