const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const ClaimManager = artifacts.require('ClaimManager');

module.exports = async (deployer) => {
    await deployProxy(ClaimManager, ["0x84d0c7284A869213CB047595d34d6044d9a7E14A", "0xd7CeF70Ba7efc2035256d828d5287e2D285CD1ac"], { deployer });
};
