import { ContractFactory, EventFilter, providers, Signer, utils } from 'ethers';
import { StakingPool } from '../ethers-v4/StakingPool';
import { RewardPool } from '../ethers-v4/RewardPool';
import { ClaimManager__factory } from '../ethers-v4/factories/ClaimManager__factory';
import { RewardPool__factory } from '../ethers-v4/factories/RewardPool__factory';
import { StakingPool__factory } from '../ethers-v4/factories/StakingPool__factory';
import { ENSRegistry__factory } from '../ethers-v4/factories/ENSRegistry__factory';
import { DomainNotifier__factory } from '../ethers-v4/factories/DomainNotifier__factory';
import { RoleDefinitionResolver__factory } from '../ethers-v4/factories/RoleDefinitionResolver__factory';
import { DomainTransactionFactory } from '../src';
import { abi as erc1056Abi, bytecode as erc1056Bytecode } from './test_utils/ERC1056.json';
import { ClaimManager } from '../ethers-v4/ClaimManager';
import { ENSRegistry } from '../ethers-v4/ENSRegistry';
import { hashLabel } from './iam-contracts.test';
import { parseEther } from 'ethers/utils';
import { expect } from 'chai';
import { requestRole } from './test_utils/role_utils';

const { JsonRpcProvider } = providers;
const { namehash } = utils;

const defaultMinStakingPeriod = 60 * 60 * 24;
const defaultWithdrawDelay = 60 * 60;

export function stakingPoolTests(): void {
  const provider = new JsonRpcProvider('http://localhost:8544');
  let ewc: Signer;
  let patron: Signer;
  let roleFactory: DomainTransactionFactory;
  let claimManager: ClaimManager;
  let stakingPool: StakingPool;
  let rewardPool: RewardPool;
  const principal = parseEther('0.2');
  const amount = parseEther('0.1');
  let minStakingPeriod = defaultMinStakingPeriod;
  let withdrawDelay = defaultWithdrawDelay;
  const root = `0x${'0'.repeat(64)}`;
  const patronRole = 'patron';
  const version = 1;

  async function setupContracts() {
    const deployer = provider.getSigner(1);
    const deployerAddr = await deployer.getAddress();
    ewc = provider.getSigner(2);
    patron = provider.getSigner(3);

    const erc1056Factory = new ContractFactory(erc1056Abi, erc1056Bytecode, deployer);
    const erc1056 = await (await erc1056Factory.deploy()).deployed();
    const ensRegistry: ENSRegistry = await (await new ENSRegistry__factory(deployer).deploy()).deployed();
    const notifier = await (await new DomainNotifier__factory(deployer).deploy(ensRegistry.address)).deployed();
    const roleResolver = await (await (new RoleDefinitionResolver__factory(deployer).deploy(ensRegistry.address, notifier.address))).deployed();
    claimManager = await (await new ClaimManager__factory(deployer).deploy(erc1056.address, ensRegistry.address)).deployed();
    roleFactory = new DomainTransactionFactory({ domainResolverAddress: roleResolver.address });
    rewardPool = await (await new RewardPool__factory(deployer).deploy()).deployed();
    stakingPool = await (await new StakingPool__factory(deployer).deploy(
      minStakingPeriod,
      withdrawDelay,
      claimManager.address,
      [namehash(patronRole)],
      rewardPool.address,
      { value: principal }
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
  }

  const waitFor = (filter: EventFilter) => new Promise((resolve) => {
    stakingPool.addListener(filter, resolve);
  })
    .then(() => {
      stakingPool.removeAllListeners(filter);
    });

  beforeEach(async function () {
    await setupContracts();
  });

  it('initial stakes consists only from principal', async () => {
    expect((await stakingPool.totalStake()).eq(principal)).true;
  });

  it('should not be possible to put a stake without having patron role', async () => {
    return expect(stakingPool.putStake({ value: amount }))
      .rejectedWith('StakingPool: patron is not registered with patron role');
  });

  it('having patron role should be able to put a stake', async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });

    const stakePut = waitFor(stakingPool.filters.StakePut(
      await patron.getAddress(),
      amount,
      null
    ));

    stakingPool.connect(patron).putStake({ value: amount });

    return expect(stakePut).fulfilled;
  });

  it('putting stake should increase total stake', async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    expect((await stakingPool.totalStake()).eq(principal.add(amount))).true;
  })

  it('should not be possible to replenish stake', async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    return expect(stakingPool.connect(patron).putStake({ value: amount }))
      .rejectedWith('StakingPool: Replenishment of the stake is not allowed');
  });

  it('should not be possible to request withdraw before minimal staking period is expired', async () => {
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    return expect(stakingPool.connect(patron).requestWithdraw())
      .rejectedWith('StakingPool: Minimum staking period is not expired yet');
  });

  it('should be able to request withdraw after minimal staking period is expired', async () => {
    minStakingPeriod = 1;
    await setupContracts();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });

    minStakingPeriod = defaultMinStakingPeriod;

    const withdrawnRequested = waitFor(stakingPool.filters.StakeWithdrawalRequested(await patron.getAddress(), null));
    stakingPool.connect(patron).requestWithdraw();

    return expect(withdrawnRequested).fulfilled;
  });

  it('should not be possible to repeat withdrawal request', async () => {
    minStakingPeriod = 1;
    await setupContracts();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });

    minStakingPeriod = defaultMinStakingPeriod;
    await stakingPool.connect(patron).requestWithdraw();

    return expect(stakingPool.connect(patron).requestWithdraw()).rejectedWith('StakingPool: No stake to withdraw');
  });

  it('should not be possible to withdraw before withdraw delay is expired', async () => {
    minStakingPeriod = 1;
    await setupContracts();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();

    minStakingPeriod = defaultMinStakingPeriod;
    return expect(stakingPool.connect(patron).withdraw())
      .rejectedWith('StakingPool: Withdrawal delay hasn\'t expired yet');
  });

  it('should be able to withdraw after withdraw delay is expired', async () => {
    minStakingPeriod = 1;
    withdrawDelay = 1;
    await setupContracts();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * withdrawDelay) });

    minStakingPeriod = defaultMinStakingPeriod;
    withdrawDelay = defaultWithdrawDelay;

    const withdrawn = waitFor(stakingPool.filters.StakeWithdrawn(await patron.getAddress(), null));
    stakingPool.connect(patron).withdraw()

    return expect(withdrawn).fulfilled;
  });

  it('stake withdrawal should reduce total stake', async () => {
    minStakingPeriod = 1;
    withdrawDelay = 1;
    await setupContracts();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });

    expect((await stakingPool.totalStake()).eq(principal.add(amount))).true;

    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * withdrawDelay) });
    await stakingPool.connect(patron).withdraw();

    minStakingPeriod = defaultMinStakingPeriod;
    withdrawDelay = defaultWithdrawDelay;

    expect((await stakingPool.totalStake()).eq(principal)).true;
  })

  it('should not be possible to repeat withdraw', async () => {
    minStakingPeriod = 1;
    withdrawDelay = 1;
    await setupContracts();
    await requestRole({ claimManager, roleName: patronRole, version, agreementSigner: patron, proofSigner: ewc });
    await stakingPool.connect(patron).putStake({ value: amount });
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * minStakingPeriod) });
    await stakingPool.connect(patron).requestWithdraw();
    await new Promise((resolve) => { setTimeout(resolve, 2 * 1000 * withdrawDelay) });

    minStakingPeriod = defaultMinStakingPeriod;
    withdrawDelay = defaultWithdrawDelay;
    await stakingPool.connect(patron).withdraw();

    return expect(stakingPool.connect(patron).withdraw())
      .rejectedWith('StakingPool: Stake hasn\'t requested to withdraw');
  });
}