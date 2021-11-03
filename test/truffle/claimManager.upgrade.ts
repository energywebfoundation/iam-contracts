// const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// const ClaimManager = artifacts.require('ClaimManager');
// const ClaimManagerUpgradeTest = artifacts.require('ClaimManagerUpgradeTest');

// contract('ClaimManager Upgrade', async () => {
//     it('should upgrade contract', async () => {
//         const registry = await ClaimManager.deployed();

//         const claimManager = await deployProxy(ClaimManager, [erc1056, ensRegistry]);
//         const firstVersion = await claimManager.version();

//         assert.equal(firstVersion, 'v0.1');

//         const upgradedClaimManager = await upgradeProxy(claimManager.address, ClaimManagerUpgradeTest);
//         const secondVersion = await upgradedClaimManager.version();

//         assert.equal(secondVersion, 'v0.2');
//     });
// });
