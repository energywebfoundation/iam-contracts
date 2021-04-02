import { Wallet, errors } from "ethers";
import { keccak256, namehash, toUtf8Bytes } from "ethers/utils";
import { deployContracts, GANACHE_PORT, ensRegistry, ensRoleDefResolver, provider, ensPublicResolver } from "./setup_contracts";
import { DomainReader } from "../src/DomainReader";
import { DomainTransactionFactory } from "../src/DomainTransactionFactory"
import { IAppDefinition, IOrganizationDefinition, IRoleDefinition, PreconditionType } from "../src/types/DomainDefinitions";
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
const domain = "mydomain";
const node = namehash(domain);

const role: IRoleDefinition = {
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
  roleName: "myRole",
  roleType: "test",
  version: "1.0.0",
  enrolmentPreconditions: [{
    type: PreconditionType.Role,
    conditions: [domain] // Circular condition but sufficient for test
  }]
};

describe("Domain CRUD tests", () => {
  beforeEach(async () => {
    await deployContracts(wallet.privateKey);
    setRegistryAddress(VOLTA_CHAIN_ID, ensRegistry.address);
    addKnownResolver(VOLTA_CHAIN_ID, ensRoleDefResolver.address, ResolverContractType.RoleDefinitionResolver_v1);
    addKnownResolver(VOLTA_CHAIN_ID, ensPublicResolver.address, ResolverContractType.PublicResolver);

    const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    await ensRegistry.setSubnodeOwner(rootNameHash, hashLabel(domain), wallet.address);
    expect(await ensRegistry.owner(node)).toEqual(wallet.address);
  });

  test("role can be created and read", async () => {
    await ensRegistry.setResolver(node, ensRoleDefResolver.address);
    const domainDefTxFactory = new DomainTransactionFactory(ensRoleDefResolver);
    const call = domainDefTxFactory.newRole({ domain: domain, roleDefinition: role });
    await (await wallet.sendTransaction(call)).wait()

    const domainReader = new DomainReader(VOLTA_CHAIN_ID, wallet.provider)
    const roleDef = await domainReader.read(node);

    expect(roleDef).toMatchObject<IRoleDefinition>(role);

    const reverseName = await ensRoleDefResolver.name(node);
    expect(reverseName).toEqual(domain);
  });

  test("text only role can be created and read", async () => {
    await ensRegistry.setResolver(node, ensPublicResolver.address);
    const domainDefTxFactory = new LegacyDomainDefTransactionFactory(ensPublicResolver);
    const call = domainDefTxFactory.newRole({ domain: domain, roleDefinition: role });
    await (await wallet.sendTransaction(call)).wait()

    const domainReader = new DomainReader(VOLTA_CHAIN_ID, wallet.provider)
    const roleDef = await domainReader.read(node);

    expect(roleDef).toMatchObject<IRoleDefinition>(role);

    const reverseName = await ensPublicResolver.name(node);
    expect(reverseName).toEqual(domain);
  });

  test("app can be created and read", async () => {
    const app: IAppDefinition = {
      appName: "myApp"
    }
    await ensRegistry.setResolver(node, ensRoleDefResolver.address);
    const domainDefTxFactory = new DomainTransactionFactory(ensRoleDefResolver);
    const call = domainDefTxFactory.newDomain({ domain: domain, domainDefinition: app });
    await (await wallet.sendTransaction(call)).wait()

    const domainReader = new DomainReader(VOLTA_CHAIN_ID, wallet.provider)
    const appDef = await domainReader.read(node);

    expect(appDef).toMatchObject<IAppDefinition>(app);

    const reverseName = await ensRoleDefResolver.name(node);
    expect(reverseName).toEqual(domain);
  });

  test("org can be created and read", async () => {
    const org: IOrganizationDefinition = {
      orgName: "myOrg"
    }
    await ensRegistry.setResolver(node, ensRoleDefResolver.address);
    const domainDefTxFactory = new DomainTransactionFactory(ensRoleDefResolver);
    const call = domainDefTxFactory.newDomain({ domain: domain, domainDefinition: org });
    await (await wallet.sendTransaction(call)).wait()

    const domainReader = new DomainReader(VOLTA_CHAIN_ID, wallet.provider)
    const appDef = await domainReader.read(node);

    expect(appDef).toMatchObject<IOrganizationDefinition>(org);

    const reverseName = await ensRoleDefResolver.name(node);
    expect(reverseName).toEqual(domain);
  });

  test("domain with unknown resolver type throws error", async () => {
    await ensRegistry.setResolver(node, '0x0000000000000000000000000000000000000123');
    const roleDefinitionReader = new DomainReader(VOLTA_CHAIN_ID, wallet.provider)
    await expect(roleDefinitionReader.read(node)).rejects.toThrow(ERROR_MESSAGES.RESOLVER_NOT_KNOWN);
  });

  test("domain with not supported resolver throws error", async () => {
    const resolverAddress = '0x0000000000000000000000000000000000000123';
    // @ts-ignore
    addKnownResolver(VOLTA_CHAIN_ID, resolverAddress, "999");
    await ensRegistry.setResolver(node, resolverAddress);
    const roleDefinitionReader = new DomainReader(VOLTA_CHAIN_ID, wallet.provider)
    await expect(roleDefinitionReader.read(node)).rejects.toThrow(ERROR_MESSAGES.RESOLVER_NOT_SUPPORTED);
  });

  test("domain which has not been registered throws error", async () => {
    const unregisteredRole = namehash("notregistered.iam");
    const roleDefinitionReader = new DomainReader(VOLTA_CHAIN_ID, wallet.provider)
    await expect(roleDefinitionReader.read(unregisteredRole)).rejects.toThrow(ERROR_MESSAGES.DOMAIN_NOT_REGISTERED);
  });

  //TODO: Test for appName, orgName, roleName that is different from what is configured in name resolver

  // TODO: Test role definition without some properties set
});
