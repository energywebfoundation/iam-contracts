import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractFactory, utils, providers } from "ethers";
import {
  DomainReader,
  DomainTransactionFactory,
  IAppDefinition,
  IOrganizationDefinition,
  IRoleDefinition,
  ResolverContractType
} from "../src/index";
import { PreconditionType } from "../src/types/DomainDefinitions";
import { ERROR_MESSAGES } from "../src/types/ErrorMessages";
import { LegacyDomainDefTransactionFactory } from "./LegacyDomainDefTransactionFactory";
import { ENSRegistry } from "../ethers/ENSRegistry";
import { RoleDefinitionResolver } from "../ethers/RoleDefinitionResolver";
import { DomainNotifier } from "../ethers/DomainNotifier";
import { PublicResolver } from "../ethers/PublicResolver";
import { hashLabel } from "./iam-contracts.test";

chai.use(chaiAsPromised);
const expect = chai.expect;

export const rpcUrl = `http://localhost:8544`;

const domain = "mydomain";
const node = utils.namehash(domain);

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
  revoker: {
    revokerType: "DID",
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
let owner: providers.JsonRpcSigner;
let provider: providers.JsonRpcProvider
let chainId: number;

let domainReader: DomainReader;

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
      domainReader = new DomainReader({ ensRegistryAddress: ensRegistry.address, provider: owner.provider });
      domainReader.addKnownResolver({ chainId, address: ensRoleDefResolver.address, type: ResolverContractType.RoleDefinitionResolver_v1 });
      domainReader.addKnownResolver({ chainId, address: ensPublicResolver.address, type: ResolverContractType.PublicResolver });

      const rootNameHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      await ensRegistry.setSubnodeOwner(rootNameHash, hashLabel(domain), await owner.getAddress());
      expect(await ensRegistry.owner(node)).to.equal(await owner.getAddress());
    });

    describe("Role can be created, read and updated", () => {
      const roleCRUDtests = async (role: IRoleDefinition) => {
        await ensRegistry.setResolver(node, ensRoleDefResolver.address);
        const domainDefTxFactory = new DomainTransactionFactory({ domainResolverAddress: ensRoleDefResolver.address });
        const call = domainDefTxFactory.newRole({ domain: domain, roleDefinition: role });
        await (await owner.sendTransaction(call)).wait()

        const roleDef = await domainReader.read({ node });
        expect(roleDef).to.eql(role);

        const reverseName = await ensRoleDefResolver.name(node);
        expect(reverseName).to.equal(domain);

        role.version = role.version + 1;
        const updateRole = domainDefTxFactory.editDomain({ domain: domain, domainDefinition: role });
        await (await owner.sendTransaction(updateRole)).wait()
        const updatedRoleDef = await domainReader.read({ node });
        expect(updatedRoleDef).to.eql(role);

        const logs = await getDomainUpdatedLogs();
        expect(logs.length).to.equal(2); // One log for create, one for update  
      }

      it('issuer of type "DID"', async () => {
        await roleCRUDtests(role);
      });

      it('issuer of type "ROLE"', async () => {
        await roleCRUDtests({ ...role, issuer: { issuerType: "ROLE", roleName: domain } });
      });
    });

    it("text only role can be created and read", async () => {
      await ensRegistry.setResolver(node, ensPublicResolver.address);
      const domainDefTxFactory = new LegacyDomainDefTransactionFactory(ensPublicResolver);
      const call = domainDefTxFactory.newRole({ domain: domain, roleDefinition: role });
      await (await owner.sendTransaction(call)).wait()

      const roleDef = await domainReader.read({ node });

      expect(roleDef).to.eql(role);

      const reverseName = await ensPublicResolver.name(node);
      expect(reverseName).to.equal(domain);
    });

    it("app can be created and read", async () => {
      const app: IAppDefinition = {
        appName: "myApp"
      }
      await ensRegistry.setResolver(node, ensRoleDefResolver.address);
      const domainDefTxFactory = new DomainTransactionFactory({ domainResolverAddress: ensRoleDefResolver.address });
      const call = domainDefTxFactory.newDomain({ domain: domain, domainDefinition: app });
      await (await owner.sendTransaction(call)).wait()

      const appDef = await domainReader.read({ node });

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
      const domainDefTxFactory = new DomainTransactionFactory({ domainResolverAddress: ensRoleDefResolver.address });
      const call = domainDefTxFactory.newDomain({ domain: domain, domainDefinition: org });
      await (await owner.sendTransaction(call)).wait()

      const appDef = await domainReader.read({ node });

      expect(appDef).to.eql(org);

      const reverseName = await ensRoleDefResolver.name(node);
      expect(reverseName).to.equal(domain);

      const logs = await getDomainUpdatedLogs();
      expect(logs.length).to.equal(1);
    });

    it("domain with unknown resolver type throws error", async () => {
      await ensRegistry.setResolver(node, '0x0000000000000000000000000000000000000123');
      await expect(domainReader.read({ node })).to.eventually.rejectedWith(ERROR_MESSAGES.RESOLVER_NOT_KNOWN);
    });

    it("domain with not supported resolver throws error", async () => {
      const resolverAddress = '0x0000000000000000000000000000000000000123';
      const chainId = await (await provider.getNetwork()).chainId;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      domainReader.addKnownResolver(chainId, resolverAddress, "999");
      await ensRegistry.setResolver(node, resolverAddress);
      await expect(domainReader.read({ node })).to.eventually.rejectedWith(ERROR_MESSAGES.RESOLVER_NOT_KNOWN);
    });

    it("domain which has not been registered throws error", async () => {
      const unregisteredRole = utils.namehash("notregistered.iam");
      await expect(domainReader.read({ node: unregisteredRole })).to.eventually.rejectedWith(ERROR_MESSAGES.DOMAIN_NOT_REGISTERED);
    });
  });
}