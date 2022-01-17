import { Wallet, providers } from 'ethers';
import {
  PRINCIPAL_THRESHOLD,
  StakingPoolFactory__factory,
  VOLTA_CLAIM_MANAGER_ADDRESS,
  VOLTA_ENS_REGISTRY_ADDRESS,
  WITHDRAW_DELAY,
} from '../src';

const { JsonRpcProvider } = providers;

const provider = new JsonRpcProvider('');
const deployer = new Wallet(
  '1aec3458500362c0a0f1772ab724a71b0f9d7da418a2d86d5954ab3f4b58ec4e'
).connect(provider);

async function deployStakingFactory() {
  const stakingPoolFactory = await (
    await new StakingPoolFactory__factory(deployer).deploy(
      PRINCIPAL_THRESHOLD,
      WITHDRAW_DELAY,
      VOLTA_CLAIM_MANAGER_ADDRESS,
      VOLTA_ENS_REGISTRY_ADDRESS
    )
  ).deployed();

  console.log('staking pool factory: ', stakingPoolFactory.address);
  console.log('reward pool: ', await stakingPoolFactory.rewardPool());
}

deployStakingFactory();
