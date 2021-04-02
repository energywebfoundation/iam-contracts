import { Wallet, errors } from "ethers";
import { keccak256, namehash, toUtf8Bytes } from "ethers/utils";
import { deployContracts, GANACHE_PORT, ensRegistry, ensRoleDefResolver, provider, ensPublicResolver } from "./setup_contracts";
import { DomainDefinitionReader } from "../src/DomainReader";
import { DomainTransactionFactory } from "../src/DomainTransactionFactory"
import { IRoleDefinition, PreconditionType } from "../src/types/DomainDefinitions";
import { LegacyDomainDefTransactionFactory } from "./LegacyDomainDefTransactionFactory";
import { addKnownResolver, setRegistryAddress, VOLTA_CHAIN_ID } from "../src/resolverConfig";
import { ResolverContractType } from "../src/types/ResolverContractType";
import { ERROR_MESSAGES } from "../src/types/ErrorMessages";

// To disable "WARNING: Multiple definitions for addr" that is triggered by ENS Registry
errors.setLogLevel("error");

let wallet = Wallet.createRandom()
wallet = wallet.connect(provider)

export const rpcUrl = `http://localhost:${GANACHE_PORT}`;

const hashLabel = (label: string): string => keccak256(toUtf8Bytes(label));
const roleDomain = "role1";
const roleNode = namehash(roleDomain);

const data: IRoleDefinition = {
  fields: [{
    fieldType: "myFieldType",
    label: "myLabel",
    required: true,
    minLength: 5,
    // minDate: new Date() TODO: Implement reviver to convert date back
    // maxDate: new Date()
  }],
  issuer: {
    issuerType: "DID",
    did: [`did:ethr:0x7aA65E31d404A8857BA083f6195757a730b51CFe`]
  },
  metadata: [{
    "myProperty": 42
  }],
  roleName: roleDomain,
  roleType: "test",
  version: "1.0.0",
  enrolmentPreconditions: [{
    type: PreconditionType.Role,
    conditions: [roleDomain] // Circular condition but sufficient for test
  }]
};

describe("RoleDefinitionReader tests", () => {
  beforeEach(async () => {
    await deployContracts(wallet.privateKey);
    setRegistryAddress(VOLTA_CHAIN_ID, ensRegistry.address);
    addKnownResolver(VOLTA_CHAIN_ID, ensRoleDefResolver.address, ResolverContractType.RoleDefinitionResolver_v1);
    addKnownResolver(VOLTA_CHAIN_ID, ensPublicResolver.address, ResolverContractType.PublicResolver);

    const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    await ensRegistry.setSubnodeOwner(rootNameHash, hashLabel(roleDomain), wallet.address);
    expect(await ensRegistry.owner(roleNode)).toEqual(wallet.address);
  });

  test("role can be created and read", async () => {
    await ensRegistry.setResolver(roleNode, ensRoleDefResolver.address);
    const domainDefTxFactory = new DomainTransactionFactory(ensRoleDefResolver);
    const call = domainDefTxFactory.newRole({ domain: roleDomain, roleDefinition: data });
    await (await wallet.sendTransaction(call)).wait()

    const roleDefinitionReader = new DomainDefinitionReader(VOLTA_CHAIN_ID, wallet.provider)
    const roleDef = await roleDefinitionReader.read(roleNode);

    expect(roleDef).toMatchObject<IRoleDefinition>(data);

    const reverseName = await ensRoleDefResolver.name(roleNode);
    expect(reverseName).toEqual(roleDomain);
  });

  test("text only role can be created and read", async () => {
    await ensRegistry.setResolver(roleNode, ensPublicResolver.address);
    const domainDefTxFactory = new LegacyDomainDefTransactionFactory(ensPublicResolver);
    const call = domainDefTxFactory.newRole({ domain: roleDomain, roleDefinition: data });
    await (await wallet.sendTransaction(call)).wait()

    const roleDefinitionReader = new DomainDefinitionReader(VOLTA_CHAIN_ID, wallet.provider)
    const roleDef = await roleDefinitionReader.read(roleNode);

    expect(roleDef).toMatchObject<IRoleDefinition>(data);

    const reverseName = await ensPublicResolver.name(roleNode);
    expect(reverseName).toEqual(roleDomain);
  });

  test("domain with unknown resolver throws error", async () => {
    await ensRegistry.setResolver(roleNode, '0x0000000000000000000000000000000000000123');
    const roleDefinitionReader = new DomainDefinitionReader(VOLTA_CHAIN_ID, wallet.provider)
    await expect(roleDefinitionReader.read(roleNode)).rejects.toThrow(ERROR_MESSAGES.RESOLVER_NOT_KNOWN);
  });

  test("domain which has not been registered throws error", async () => {
    const unregisteredRole = namehash("notregistered.iam");
    const roleDefinitionReader = new DomainDefinitionReader(VOLTA_CHAIN_ID, wallet.provider)
    await expect(roleDefinitionReader.read(unregisteredRole)).rejects.toThrow(ERROR_MESSAGES.DOMAIN_NOT_REGISTERED);
  });

  //TODO: Test for appName, orgName, roleName that is different from what is configured in name resolver

  // TODO: Test role definition without some properties set

  // TODO: Test org and app creation and reading

});
