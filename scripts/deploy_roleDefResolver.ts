import { Wallet, providers } from "ethers";
import {
  VOLTA_ENS_REGISTRY_ADDRESS,
  VOLTA_DOMAIN_NOTIFER_ADDRESS,
} from "../src";
import { RoleDefinitionResolverV2__factory } from "../ethers/factories/RoleDefinitionResolverV2__factory";

const provider = new providers.JsonRpcProvider(
  "https://volta-rpc.energyweb.org",
);

const deployer = new Wallet(
  "71172a0f035e45343f7c6e8ba491d2810fd9f6e68867ebe13eaa1f9337eeba90",
).connect(provider);

async function deployRoleDefResolver() {
  const roleDefResolverV2 = await (
    await new RoleDefinitionResolverV2__factory(deployer).deploy(
      VOLTA_ENS_REGISTRY_ADDRESS,
      VOLTA_DOMAIN_NOTIFER_ADDRESS,
    )
  ).deployed();

  console.log("RoleDefinitionResolver address : ", roleDefResolverV2.address);
}

deployRoleDefResolver();
