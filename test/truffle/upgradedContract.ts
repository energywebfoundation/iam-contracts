import fs from 'fs';

const claimManagerContract = fs.readFileSync(
  './contracts/roles/ClaimManager.sol',
  'utf8'
);

// Creates a v0.2 of the ClaimManager contract so that it can be used as an input to the upgrade test
// (i.e. the test needs a contract to upgrade to)
const upgradedClaimManagerContract = claimManagerContract
  .replace(`contract ClaimManager is `, `contract ClaimManagerUpgradeTest is `)
  .replace(`return "v0.1";`, `return "v0.2";`);

fs.writeFileSync(
  './contracts/roles/ClaimManagerUpgradeTest.sol',
  upgradedClaimManagerContract
);
