import { utils, ContractFactory, Signer, Contract, Wallet, providers } from 'ethers';
import { expect } from 'chai';
import { abi as erc1056Abi, bytecode as erc1056Bytecode } from './test_utils/ERC1056.json';
import { ClaimManager__factory as ClaimManagerFactory } from '../ethers/factories/ClaimManager__factory';
import { ClaimManager } from '../ethers/ClaimManager';
import { IdentityManager__factory as IdentityManagerFactory } from '../ethers/factories/IdentityManager__factory';
import { IdentityManager } from '../ethers/IdentityManager';
import { OfferableIdentity__factory as OfferableIdentityFactory } from '../ethers/factories/OfferableIdentity__factory';
import { RevocationRegistryOnChain__factory as RevocationRegistryOnChainFactory } from '../ethers/factories/RevocationRegistryOnChain__factory';
import { RevocationRegistryOnChain } from '../ethers/RevocationRegistryOnChain';
import { DomainTransactionFactory } from '../src';
import { ENSRegistry } from '../ethers/ENSRegistry';
import { RoleDefinitionResolver } from '../ethers/RoleDefinitionResolver';
import { PreconditionType } from '../src/types/DomainDefinitions';
import { defaultVersion, requestRole , revokeRole} from './test_utils/role_utils';

const root = `0x${'0'.repeat(64)}`;
const authorityRole = 'authority';
const deviceRole = 'device';
const activeDeviceRole = 'active-device'
const installerRole = 'installer';

const hashLabel = (label: string): string => utils.keccak256(utils.toUtf8Bytes(label));

let claimManager: ClaimManager;
let proxyIdentityManager: IdentityManager;
let roleFactory: DomainTransactionFactory;
let roleResolver: RoleDefinitionResolver;
let erc1056: Contract;
let provider: providers.JsonRpcProvider;
let revocationRegistry : RevocationRegistryOnChain

let deployer: Signer;
let deployerAddr: string;
let device: Signer;
let deviceAddr: string;
let installer: Signer;
let installerAddr: string;
let authority: Signer;
let authorityAddr: string;

export function revocationRegistryTests(): void {
  describe('Tests on ganache', testsOnGanache);
}

export function testsOnGanache(): void {
  before(async function () {
    ({ provider } = this);
    deployer = provider.getSigner(1);
    deployerAddr = await deployer.getAddress();
    device = provider.getSigner(3);
    installer = provider.getSigner(4);
    authority = provider.getSigner(5);
    deviceAddr = await device.getAddress();
    installerAddr = await installer.getAddress();
    authorityAddr = await authority.getAddress();
  });

  testSuite();
}

function testSuite() {
    beforeEach(async function () {
      const erc1056Factory = new ContractFactory(erc1056Abi, erc1056Bytecode, deployer);
      erc1056 = await (await erc1056Factory.deploy()).deployed();
  
      const { ensFactory, domainNotifierFactory, roleDefResolverFactory } = this;
      const ensRegistry: ENSRegistry = await (await ensFactory.connect(deployer).deploy()).deployed();
  
      const notifier = await (await domainNotifierFactory.connect(deployer).deploy(ensRegistry.address)).deployed();
      roleResolver = await (await (roleDefResolverFactory.connect(deployer).deploy(ensRegistry.address, notifier.address))).deployed();
  
      claimManager = await (await new ClaimManagerFactory(deployer).deploy(erc1056.address, ensRegistry.address)).deployed();
      const offerableIdentity = await (await new OfferableIdentityFactory(deployer).deploy()).deployed();
      proxyIdentityManager = await (await new IdentityManagerFactory(deployer).deploy(offerableIdentity.address)).deployed();
      roleFactory = new DomainTransactionFactory({ domainResolverAddress: roleResolver.address });

      revocationRegistry = await (await new RevocationRegistryOnChainFactory(deployer).deploy(erc1056.address, ensRegistry.address, claimManager.address)).deployed();
  
      await (await ensRegistry.setSubnodeOwner(root, hashLabel(authorityRole), deployerAddr)).wait();
      await (await ensRegistry.setSubnodeOwner(root, hashLabel(deviceRole), deployerAddr)).wait();
      await (await ensRegistry.setSubnodeOwner(root, hashLabel(installerRole), deployerAddr)).wait();
  
      await (await ensRegistry.setResolver(utils.namehash(authorityRole), roleResolver.address)).wait();
      await (await ensRegistry.setResolver(utils.namehash(deviceRole), roleResolver.address)).wait();
      await (await ensRegistry.setResolver(utils.namehash(installerRole), roleResolver.address)).wait();
  
      await (await deployer.sendTransaction({
        ...roleFactory.newRole({
          domain: authorityRole,
          roleDefinition: {
            roleName: authorityRole,
            enrolmentPreconditions: [],
            fields: [],
            issuer: { issuerType: "DID", did: [`did:ethr:${await authority.getAddress()}`] },
            revoker : {revokerType: "DID", did: [`did:ethr:${await authority.getAddress()}`] },
            metadata: [],
            roleType: '',
            version: defaultVersion
          }
        })
      })).wait();
  
      await (await deployer.sendTransaction({
        ...roleFactory.newRole({
          domain: deviceRole,
          roleDefinition: {
            roleName: deviceRole,
            enrolmentPreconditions: [],
            fields: [],
            issuer: { issuerType: "ROLE", roleName: installerRole },
            revoker: { revokerType: "ROLE", roleName: installerRole },
            metadata: [],
            roleType: '',
            version: defaultVersion
          }
        })
      })).wait();

      await (await deployer.sendTransaction({
        ...roleFactory.newRole({
          domain: installerRole,
          roleDefinition: {
            roleName: installerRole,
            enrolmentPreconditions: [],
            fields: [],
            issuer: { issuerType: "ROLE", roleName: authorityRole },
            revoker: { revokerType: "ROLE", roleName: authorityRole },
            metadata: [],
            roleType: '',
            version: defaultVersion
          }
        })
      })).wait();
    });
  
    it('Issuing a Authority role claim where revokerType is DID', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
  
      expect(await claimManager.hasRole(authorityAddr, utils.namehash(authorityRole), defaultVersion)).true;
    });
  
    it('Issuing a DeviceRole claim where revokerType is Role ', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });
  
      expect(await claimManager.hasRole(installerAddr, utils.namehash(installerRole), defaultVersion)).true;
    });
    
    it('Revoke claim where revokerType is DID', async () => {
        await revokeRole({ revocationRegistry, revoker: authority, subject: authority, subjectRole: authorityRole, revokerRole:authorityRole });
    
        expect(await revocationRegistry.isRevoked(utils.namehash(authorityRole+authorityAddr))).true;
    });

    it('Revoke claim where revokerType is Role', async () => {
        await revokeRole({ revocationRegistry, revoker: authority, subject: installer, subjectRole: installerRole, revokerRole:authorityRole });
    
        expect(await revocationRegistry.isRevoked(utils.namehash(installerRole+installerAddr))).true;
    });
  
}
  