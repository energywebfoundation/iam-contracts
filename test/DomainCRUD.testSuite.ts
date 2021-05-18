import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractFactory } from "ethers";
import { namehash } from "ethers/utils";
import { JsonRpcProvider, JsonRpcSigner } from "ethers/providers";
import {
  DomainReader,
  DomainTransactionFactory,
  IAppDefinition,
  IOrganizationDefinition,
  IRoleDefinition,
  ResolverContractType,
  addKnownResolver,
  setRegistryAddress
} from "../src/index";
import { PreconditionType } from "../src/types/DomainDefinitions";
import { ERROR_MESSAGES } from "../src/types/ErrorMessages";
import { LegacyDomainDefTransactionFactory } from "./LegacyDomainDefTransactionFactory";
import { ENSRegistry } from "../typechain/ENSRegistry";
import { RoleDefinitionResolver } from "../typechain/RoleDefinitionResolver";
import { DomainNotifier } from "../typechain/DomainNotifier";
import { PublicResolver } from "../typechain/PublicResolver";
import { hashLabel } from "./iam-contracts.test";

chai.use(chaiAsPromised);
const expect = chai.expect;

export const rpcUrl = `http://localhost:8544`;

const domain = "mydomain";
const node = namehash(domain);

const role: IRoleDefinition = {
  fields: [{
    fieldType: "myFieldType",
    label: "myLabel",
    required: true,
    minLength: 5,
    minDate: new Date(),
    maxDate: new Date()
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
  version: 10,
  enrolmentPreconditions: [{
    type: PreconditionType.Role,
    conditions: [domain] // Circular condition but sufficient for test
  }]
};

const getDomainUpdatedLogs = async () => {
  const eventFilter = domainNotifier.filters.DomainUpdated(node);
  const filter = {
    fromBlock: 0,
    toBlock: 'latest',
    address: domainNotifier.address,
    topics: eventFilter.topics
  };
  return await provider.getLogs(filter);
}

let ensFactory: ContractFactory;
let publicResolverFactory: ContractFactory;
let roleDefResolverFactory: ContractFactory;
let domainNotifierFactory: ContractFactory;
let ensRegistry: ENSRegistry;
let ensRoleDefResolver: RoleDefinitionResolver;
let domainNotifier: DomainNotifier;
let ensPublicResolver: PublicResolver;
let owner: JsonRpcSigner;
let provider: JsonRpcProvider
let chainId: number;


export function domainCrudTestSuite(): void {
  describe("Domain CRUD tests", () => {
    before(async function () {
      ({
        publicResolverFactory, roleDefResolverFactory, ensFactory, domainNotifierFactory, provider, owner, chainId
      } = this);
    });

    beforeEach(async () => {
      ensRegistry = await ensFactory.deploy() as ENSRegistry;
      await ensRegistry.deployed();
      domainNotifier = await domainNotifierFactory.deploy(ensRegistry.address) as DomainNotifier;
      await domainNotifier.deployed();
      ensRoleDefResolver = await roleDefResolverFactory.deploy(ensRegistry.address, domainNotifier.address) as RoleDefinitionResolver;
      await ensRoleDefResolver.deployed();
      ensPublicResolver = await publicResolverFactory.deploy(ensRegistry.address) as PublicResolver;
      await ensRoleDefResolver.deployed();

      chainId = await (await provider.getNetwork()).chainId;
      setRegistryAddress({ chainId, address: ensRegistry.address });
      addKnownResolver({ chainId, address: ensRoleDefResolver.address, type: ResolverContractType.RoleDefinitionResolver_v1 });
      addKnownResolver({ chainId, address: ensPublicResolver.address, type: ResolverContractType.PublicResolver });

      const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      await ensRegistry.setSubnodeOwner(rootNameHash, hashLabel(domain), await owner.getAddress());
      expect(await ensRegistry.owner(node)).to.equal(await owner.getAddress());
    });

    it("role can be created, read and updated", async () => {
      await ensRegistry.setResolver(node, ensRoleDefResolver.address);
      const domainDefTxFactory = new DomainTransactionFactory({ provider, domainResolverAddress: ensRoleDefResolver.address });
      const call = domainDefTxFactory.newRole({ domain: domain, roleDefinition: role });
      await (await owner.sendTransaction(call)).wait()

      const domainReader = new DomainReader(owner.provider)
      const roleDef = await domainReader.read(node);
      expect(roleDef).to.eql(role);

      const reverseName = await ensRoleDefResolver.name(node);
      expect(reverseName).to.equal(domain);

      role.version = role.version + 1;
      const updateRole = domainDefTxFactory.editDomain({ domain: domain, domainDefinition: role });
      await (await owner.sendTransaction(updateRole)).wait()
      const updatedRoleDef = await domainReader.read(node);
      expect(updatedRoleDef).to.eql(role);

      const logs = await getDomainUpdatedLogs();
      expect(logs.length).to.equal(2); // One log for create, one for update
    });

    it("text only role can be created and read", async () => {
      await ensRegistry.setResolver(node, ensPublicResolver.address);
      const domainDefTxFactory = new LegacyDomainDefTransactionFactory(ensPublicResolver);
      const call = domainDefTxFactory.newRole({ domain: domain, roleDefinition: role });
      await (await owner.sendTransaction(call)).wait()

      const domainReader = new DomainReader(owner.provider)
      const roleDef = await domainReader.read(node);

      expect(roleDef).to.eql(role);

      const reverseName = await ensPublicResolver.name(node);
      expect(reverseName).to.equal(domain);
    });

    it("app can be created and read", async () => {
      const app: IAppDefinition = {
        appName: "myApp"
      }
      await ensRegistry.setResolver(node, ensRoleDefResolver.address);
      const domainDefTxFactory = new DomainTransactionFactory({ provider, domainResolverAddress: ensRoleDefResolver.address });
      const call = domainDefTxFactory.newDomain({ domain: domain, domainDefinition: app });
      await (await owner.sendTransaction(call)).wait()

      const domainReader = new DomainReader(owner.provider)
      const appDef = await domainReader.read(node);

      expect(appDef).to.eql(app);

      const reverseName = await ensRoleDefResolver.name(node);
      expect(reverseName).to.equal(domain);

      const logs = await getDomainUpdatedLogs();
      expect(logs.length).to.equal(1);
    });

    it("org can be created and read", async () => {
      const org: IOrganizationDefinition = {
        orgName: "myOrg"
      }
      await ensRegistry.setResolver(node, ensRoleDefResolver.address);
      const domainDefTxFactory = new DomainTransactionFactory({ provider, domainResolverAddress: ensRoleDefResolver.address });
      const call = domainDefTxFactory.newDomain({ domain: domain, domainDefinition: org });
      await (await owner.sendTransaction(call)).wait()

      const domainReader = new DomainReader(owner.provider)
      const appDef = await domainReader.read(node);

      expect(appDef).to.eql(org);

      const reverseName = await ensRoleDefResolver.name(node);
      expect(reverseName).to.equal(domain);

      const logs = await getDomainUpdatedLogs();
      expect(logs.length).to.equal(1);
    });

    it("domain with unknown resolver type throws error", async () => {
      await ensRegistry.setResolver(node, '0x0000000000000000000000000000000000000123');
      const roleDefinitionReader = new DomainReader(owner.provider)
      await expect(roleDefinitionReader.read(node)).to.eventually.rejectedWith(ERROR_MESSAGES.RESOLVER_NOT_KNOWN);
    });

    it("domain with not supported resolver throws error", async () => {
      const resolverAddress = '0x0000000000000000000000000000000000000123';
      const chainId = await (await provider.getNetwork()).chainId;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      addKnownResolver(chainId, resolverAddress, "999");
      await ensRegistry.setResolver(node, resolverAddress);
      const roleDefinitionReader = new DomainReader(owner.provider)
      await expect(roleDefinitionReader.read(node)).to.eventually.rejectedWith(ERROR_MESSAGES.RESOLVER_NOT_KNOWN);
    });

    it("domain which has not been registered throws error", async () => {
      const unregisteredRole = namehash("notregistered.iam");
      const roleDefinitionReader = new DomainReader(owner.provider)
      await expect(roleDefinitionReader.read(unregisteredRole)).to.eventually.rejectedWith(ERROR_MESSAGES.DOMAIN_NOT_REGISTERED);
    });
  });
}