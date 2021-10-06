import { Wallet, providers } from "ethers";
import {
  VOLTA_IDENTITY_MANAGER_ADDRESS,
  VOLTA_ENS_REGISTRY_ADDRESS,
  VOLTA_CLAIM_MANAGER_ADDRESS,
} from "../src";
import { RevocationRegistryOnChain__factory } from "../ethers/factories/RevocationRegistryOnChain__factory"

const provider = new providers.JsonRpcProvider(
  "https://volta-rpc.energyweb.org"
);

const deployer = new Wallet("71172a0f035e45343f7c6e8ba491d2810fd9f6e68867ebe13eaa1f9337eeba90").connect(provider);

async function deployRevocationRegistry() {
  const revocationRegistryOnChain = await (await new RevocationRegistryOnChain__factory(deployer).deploy(
    VOLTA_IDENTITY_MANAGER_ADDRESS,
    VOLTA_CLAIM_MANAGER_ADDRESS,
    VOLTA_ENS_REGISTRY_ADDRESS,
  )).deployed();

  console.log("revocation registry : ", revocationRegistryOnChain.address);
}

deployRevocationRegistry();