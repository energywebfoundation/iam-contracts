import { ContractFactory, providers, Signer, utils } from 'ethers';
import { StakingPool } from '../ethers-v4/StakingPool';
import { RewardPool } from '../ethers-v4/RewardPool';
import { ClaimManager__factory } from '../ethers-v4/factories/ClaimManager__factory';
import { RewardPool__factory } from '../ethers-v4/factories/RewardPool__factory';
import { StakingPool__factory } from '../ethers-v4/factories/StakingPool__factory';
import { DomainTransactionFactory } from '../src';
import { abi as erc1056Abi, bytecode as erc1056Bytecode } from './test_utils/ERC1056.json';
import { ClaimManager } from '../ethers-v4/ClaimManager';
import { ENSRegistry } from '../ethers-v4/ENSRegistry';
import { RoleDefinitionResolver } from '../ethers-v4/RoleDefinitionResolver';
import { hashLabel } from './iam-contracts.test';
import { parseEther } from 'ethers/utils';
import { expect } from 'chai';
import { requestRole } from './test_utils/role_utils';

const { JsonRpcProvider } = providers;
const { namehash } = utils;

export function stakingPoolTests(): void {
  const provider = new JsonRpcProvider('http://localhost:8544');
  let ewc: Signer;
  let patron: Signer;
  let roleFactory: DomainTransactionFactory;
  let claimManager: ClaimManager;
  let stakingPool: StakingPool;
  let rewardPool: RewardPool;
  const principle = 1000;
  const minStakingPeriod = 60 * 60 * 24 * 365;
  const withdrawDelay = 60 * 60 * 24 * 30;
  const root = `0x${'0'.repeat(64)}`;
  const patronRole = 'patron';
  const version = 1;

  before(async function () {
    const deployer = provider.getSigner(1);
    const deployerAddr = await deployer.getAddress();
    ewc = provider.getSigner(2);
    patron = provider.getSigner(3);
    const erc1056Factory = new ContractFactory(erc1056Abi, erc1056Bytecode, deployer);
    const erc1056 = await (await erc1056Factory.deploy()).deployed();

    const { ensFactory, domainNotifierFactory, roleDefResolverFactory } = this;
    const ensRegistry: ENSRegistry = await (await ensFactory.connect(deployer).deploy()).deployed();

    const notifier = await (await domainNotifierFactory.connect(deployer).deploy(ensRegistry.address)).deployed();
    const roleResolver = await (await (roleDefResolverFactory.connect(deployer).deploy(ensRegistry.address, notifier.address))).deployed();

    claimManager = await (await new ClaimManager__factory(deployer).deploy(erc1056.address, ensRegistry.address)).deployed();
    roleFactory = new DomainTransactionFactory({ domainResolverAddress: roleResolver.address });
    rewardPool = await (await new RewardPool__factory(deployer).deploy()).deployed();
    stakingPool = await (await new StakingPool__factory(deployer).deploy(
      minStakingPeriod,
      withdrawDelay,
      claimManager.address,
      namehash(patronRole),
      rewardPool.address,
      { value: principle }
    )).deployed();

    await (await ensRegistry.setSubnodeOwner(root, hashLabel(patronRole), deployerAddr)).wait();
    await (await ensRegistry.setResolver(namehash(patronRole), roleResolver.address)).wait();

    await (await deployer.sendTransaction({
      ...roleFactory.newRole({
        domain: patronRole,
        roleDefinition: {
          roleName: patronRole,
          enrolmentPreconditions: [],
          fields: [],
          issuer: { issuerType: "DID", did: [`did:ethr:${await ewc.getAddress()}`] },
          metadata: [],
          roleType: '',
          version: 1
        }
      })
    })).wait();
  });


  it('should not be possible to put a stake without having patron role', async () => {
    const amount = parseEther('0.5');
    expect(stakingPool.putStake({ value: amount })).rejected;
  });

  it('having patron role should be able to put a stake', async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    
    expect(await claimManager.hasRole(await patron.getAddress(), namehash(patronRole), version)).true;
    
    const amount = parseEther('0.5');
    expect(stakingPool.putStake({ value: amount })).rejected;
  });
}