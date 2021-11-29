import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractFactory, utils, providers } from "ethers";
import {
  DomainReader,
  DomainTransactionFactoryV2,
  IAppDefinition,
  IOrganizationDefinition,
  IRoleDefinitionV2,
  ResolverContractType,
} from "../src/index";
import { PreconditionType } from "../src/types/DomainDefinitions";
import { ERROR_MESSAGES } from "../src/types/ErrorMessages";
import { ENSRegistry } from "../ethers/ENSRegistry";
import { DomainNotifier } from "../ethers/DomainNotifier";
import { PublicResolver } from "../ethers/PublicResolver";
import { hashLabel } from "./iam-contracts.test";
import { RoleDefinitionResolverV2__factory } from "../ethers/factories/RoleDefinitionResolverV2__factory";
import { DomainNotifier__factory } from "../ethers/factories/DomainNotifier__factory";
import { RoleDefinitionResolverV2 } from "../ethers/RoleDefinitionResolverV2";
import { ENSRegistry__factory } from "../ethers/factories/ENSRegistry__factory";

chai.use(chaiAsPromised);
const expect = chai.expect;

export const rpcUrl = `http://localhost:8544`;

const domain2 = "mydomain2";
const node2 = utils.namehash(domain2);

const role2: IRoleDefinitionV2 = {
  fields: [
    {
      fieldType: "myFieldType",
      label: "myLabel",
      required: true,
      minLength: 5,
      minDate: new Date(),
      maxDate: new Date(),
    },
  ],
  issuer: {
    issuerType: "DID",
    did: [`did:ethr:1337:0x7aA65E31d404A8857BA083f6195757a730b51CFe`],
  },
  revoker: {
    revokerType: "DID",
    did: [`did:ethr:1337:0x7aA65E31d404A8857BA083f6195757a730b51CFe`],
  },
  metadata: [
    {
      myProperty: 42,
    },
  ],
  roleName: "myRole1",
  roleType: "test1",
  version: 10,
  enrolmentPreconditions: [
    {
      type: PreconditionType.Role,
      conditions: [domain2], // Circular condition but sufficient for test
    },
  ],
};

const getDomainUpdatedLogs = async () => {
  const eventFilter = domainNotifier.filters.DomainUpdated(node2);
  const filter = {
    fromBlock: 0,
    toBlock: "latest",
    address: domainNotifier.address,
    topics: eventFilter.topics,
  };
  return await provider.getLogs(filter);
};

let publicResolverFactory: ContractFactory;
let ensRegistry: ENSRegistry;
let ensRoleDefResolverV2: RoleDefinitionResolverV2;
let domainNotifier: DomainNotifier;
let ensPublicResolver: PublicResolver;
let owner: providers.JsonRpcSigner;
let provider: providers.JsonRpcProvider;
let chainId: number;

let domainReader: DomainReader;

export function domainCrudTestSuiteWithRevocation(): void {
  describe("Domain CRUD tests for RoleDefinitionResolverV2", () => {
    before(async function () {
      ({ publicResolverFactory, provider, owner, chainId } = this);
    });

    beforeEach(async () => {
      ensRegistry = await new ENSRegistry__factory(owner).deploy();
      await ensRegistry.deployed();
      domainNotifier = await new DomainNotifier__factory(owner).deploy(
        ensRegistry.address,
      );
      await domainNotifier.deployed();
      ensRoleDefResolverV2 = await new RoleDefinitionResolverV2__factory(
        owner,
      ).deploy(ensRegistry.address, domainNotifier.address);
      await ensRoleDefResolverV2.deployed();
      ensPublicResolver = (await publicResolverFactory.deploy(
        ensRegistry.address,
      )) as PublicResolver;
      await ensPublicResolver.deployed();
      domainReader = new DomainReader({
        ensRegistryAddress: ensRegistry.address,
        provider: owner.provider,
      });
      domainReader.addKnownResolver({
        chainId,
        address: ensRoleDefResolverV2.address,
        type: ResolverContractType.RoleDefinitionResolver_v2,
      });
      domainReader.addKnownResolver({
        chainId,
        address: ensPublicResolver.address,
        type: ResolverContractType.PublicResolver,
      });

      const rootNameHash =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      await ensRegistry.setSubnodeOwner(
        rootNameHash,
        hashLabel(domain2),
        await owner.getAddress(),
      );
      expect(await ensRegistry.owner(node2)).to.equal(await owner.getAddress());
    });

    describe("Role can be created, read and updated", () => {
      const roleCRUDtests = async (role: IRoleDefinitionV2) => {
        await ensRegistry.setResolver(node2, ensRoleDefResolverV2.address);
        const domainDefTxFactoryV2 = new DomainTransactionFactoryV2({
          domainResolverAddress: ensRoleDefResolverV2.address,
        });
        const call = domainDefTxFactoryV2.newRole({
          domain: domain2,
          roleDefinition: role2,
        });
        await (await owner.sendTransaction(call)).wait();

        const roleDef = await domainReader.read({ node: node2 });
        expect(roleDef).to.eql(role2);

        const reverseName = await ensRoleDefResolverV2.name(node2);
        expect(reverseName).to.equal(domain2);

        role.version = role.version + 1;
        const updateRole = domainDefTxFactoryV2.editDomain({
          domain: domain2,
          domainDefinition: role2,
        });
        await (await owner.sendTransaction(updateRole)).wait();
        const updatedRoleDef = await domainReader.read({ node: node2 });
        expect(updatedRoleDef).to.eql(role2);

        const logs = await getDomainUpdatedLogs();
        expect(logs.length).to.equal(2); // One log for create, one for update
      };

      it('issuer of type "DID"', async () => {
        await roleCRUDtests(role2);
      });

      it('issuer of type "ROLE"', async () => {
        await roleCRUDtests({
          ...role2,
          issuer: { issuerType: "ROLE", roleName: domain2 },
        });
      });
    });

    it("app can be created and read", async () => {
      const app: IAppDefinition = {
        appName: "myApp",
      };
      await ensRegistry.setResolver(node2, ensRoleDefResolverV2.address);
      const domainDefTxFactoryV2 = new DomainTransactionFactoryV2({
        domainResolverAddress: ensRoleDefResolverV2.address,
      });
      const call = domainDefTxFactoryV2.newDomain({
        domain: domain2,
        domainDefinition: app,
      });
      await (await owner.sendTransaction(call)).wait();

      const appDef = await domainReader.read({ node: node2 });

      expect(appDef).to.eql(app);

      const reverseName = await ensRoleDefResolverV2.name(node2);
      expect(reverseName).to.equal(domain2);

      const logs = await getDomainUpdatedLogs();
      expect(logs.length).to.equal(1);
    });

    it("org can be created and read", async () => {
      const org: IOrganizationDefinition = {
        orgName: "myOrg",
      };
      await ensRegistry.setResolver(node2, ensRoleDefResolverV2.address);
      const domainDefTxFactoryV2 = new DomainTransactionFactoryV2({
        domainResolverAddress: ensRoleDefResolverV2.address,
      });
      const call = domainDefTxFactoryV2.newDomain({
        domain: domain2,
        domainDefinition: org,
      });
      await (await owner.sendTransaction(call)).wait();

      const appDef = await domainReader.read({ node: node2 });

      expect(appDef).to.eql(org);

      const reverseName = await ensRoleDefResolverV2.name(node2);
      expect(reverseName).to.equal(domain2);

      const logs = await getDomainUpdatedLogs();
      expect(logs.length).to.equal(1);
    });

    it("domain with unknown resolver type throws error", async () => {
      await ensRegistry.setResolver(
        node2,
        "0x0000000000000000000000000000000000000123",
      );
      await expect(
        domainReader.read({ node: node2 }),
      ).to.eventually.rejectedWith(ERROR_MESSAGES.RESOLVER_NOT_KNOWN);
    });

    it("domain with not supported resolver throws error", async () => {
      const resolverAddress = "0x0000000000000000000000000000000000000123";
      const chainId = await (await provider.getNetwork()).chainId;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      domainReader.addKnownResolver(chainId, resolverAddress, "999");
      await ensRegistry.setResolver(node2, resolverAddress);
      await expect(
        domainReader.read({ node: node2 }),
      ).to.eventually.rejectedWith(ERROR_MESSAGES.RESOLVER_NOT_KNOWN);
    });

    it("domain which has not been registered throws error", async () => {
      const unregisteredRole = utils.namehash("notregistered.iam");
      await expect(
        domainReader.read({ node: unregisteredRole }),
      ).to.eventually.rejectedWith(ERROR_MESSAGES.DOMAIN_NOT_REGISTERED);
    });
  });
}
