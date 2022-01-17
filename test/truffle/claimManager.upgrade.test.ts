/* eslint-disable @typescript-eslint/no-var-requires */
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const { assert } = require('chai');

const ClaimManager = artifacts.require('ClaimManager');
const ClaimManagerUpgradeTest = artifacts.require('ClaimManagerUpgradeTest');

contract('ClaimManager Upgrade Test', async () => {
  it('should upgrade contract', async () => {
    //using random addresses for testing
    const claimManager = await deployProxy(ClaimManager, [
      '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
      '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
    ]);
    const firstVersion = await claimManager.version();

    assert.equal(firstVersion, 'v0.1');

    const upgradedClaimManager = await upgradeProxy(
      claimManager.address,
      ClaimManagerUpgradeTest
    );
    const secondVersion = await upgradedClaimManager.version();

    assert.equal(secondVersion, 'v0.2');
  });
});
