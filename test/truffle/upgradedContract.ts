import fs from 'fs';

const claimManagerContract = fs.readFileSync('./contracts/roles/ClaimManager.sol', 'utf8');

// Creates a different copy of the ClaimManager contract
const upgradedClaimManagerContract = claimManagerContract
    .replace(`contract ClaimManager is `, `contract ClaimManagerUpgradeTest is `)
    .replace(`return "v0.1";`, `return "v0.2";`);

fs.writeFileSync('./contracts/roles/ClaimManagerUpgradeTest.sol', upgradedClaimManagerContract);
