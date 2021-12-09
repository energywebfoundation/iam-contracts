const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const VOLTA_ERC1056 = "0xc15d5a57a8eb0e1dcbe5d88b8f9a82017e5cc4af";
const VOLTA_ENS_REGISTRY = "0xd7CeF70Ba7efc2035256d828d5287e2D285CD1ac";
const ClaimManager = artifacts.require('ClaimManager');

module.exports = async (deployer) => {
    await deployProxy(ClaimManager, [VOLTA_ERC1056, VOLTA_ENS_REGISTRY], { deployer, kind : 'uups' });
};
