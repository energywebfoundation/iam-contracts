const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const { assert } = require('chai');

const ClaimManager = artifacts.require('ClaimManager');
const ClaimManagerUpgradeTest = artifacts.require('ClaimManagerUpgradeTest');

contract('ClaimManager Upgrade Test', async () => {
    it('should upgrade contract', async () => {
        const claimManager = await deployProxy(ClaimManager, ["0x84d0c7284A869213CB047595d34d6044d9a7E14A", "0xd7CeF70Ba7efc2035256d828d5287e2D285CD1ac"]);
        const firstVersion = await claimManager.version();

        assert.equal(firstVersion, 'v0.1');

        const upgradedClaimManager = await upgradeProxy(claimManager.address, ClaimManagerUpgradeTest);
        const secondVersion = await upgradedClaimManager.version();

        assert.equal(secondVersion, 'v0.2');
    });
});
