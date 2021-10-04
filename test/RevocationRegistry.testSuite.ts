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
import { defaultVersion, requestRole , revokeRole, revokeRoles} from './test_utils/role_utils';

const root = `0x${'0'.repeat(64)}`;
const authorityRole = 'authority';
const deviceRole = 'device';
const adminRole = 'admin-role'
const installerRole = 'installer';

const hashLabel = (label: string): string => utils.keccak256(utils.toUtf8Bytes(label));

let claimManager: ClaimManager;
let ensRegistry : ENSRegistry;
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
let installer1: Signer;
let installer1Addr: string;
let authority: Signer;
let authorityAddr: string;
let admin: Signer;
let adminAddr: string;

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
    admin = provider.getSigner(6);
    installer1 = provider.getSigner(7);
    deviceAddr = await device.getAddress();
    installerAddr = await installer.getAddress();
    installer1Addr = await installer1.getAddress();
    authorityAddr = await authority.getAddress();
    adminAddr = await admin.getAddress();
  });

  testSuite();
}

function testSuite() {
    beforeEach(async function () {
      const erc1056Factory = new ContractFactory(erc1056Abi, erc1056Bytecode, deployer);
      erc1056 = await (await erc1056Factory.deploy()).deployed();
  
      const { ensFactory, domainNotifierFactory, roleDefResolverFactory } = this;
      ensRegistry = await (await ensFactory.connect(deployer).deploy()).deployed();
  
      const notifier = await (await domainNotifierFactory.connect(deployer).deploy(ensRegistry.address)).deployed();
      roleResolver = await (await (roleDefResolverFactory.connect(deployer).deploy(ensRegistry.address, notifier.address))).deployed();
  
      claimManager = await (await new ClaimManagerFactory(deployer).deploy(erc1056.address, ensRegistry.address)).deployed();
      roleFactory = new DomainTransactionFactory({ domainResolverAddress: roleResolver.address });
     
      revocationRegistry = await (await new RevocationRegistryOnChainFactory(authority).deploy(erc1056.address, ensRegistry.address, claimManager.address)).deployed();
  
      await (await ensRegistry.setSubnodeOwner(root, hashLabel(authorityRole), deployerAddr)).wait();
      await (await ensRegistry.setSubnodeOwner(root, hashLabel(deviceRole), deployerAddr)).wait();
      await (await ensRegistry.setSubnodeOwner(root, hashLabel(installerRole), deployerAddr)).wait();
      await (await ensRegistry.setSubnodeOwner(root, hashLabel(adminRole), deployerAddr)).wait();
  
      await (await ensRegistry.setResolver(utils.namehash(authorityRole), roleResolver.address)).wait();
      await (await ensRegistry.setResolver(utils.namehash(deviceRole), roleResolver.address)).wait();
      await (await ensRegistry.setResolver(utils.namehash(installerRole), roleResolver.address)).wait();
      await (await ensRegistry.setResolver(utils.namehash(adminRole), roleResolver.address)).wait();
  
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
            issuer: { issuerType: "DID", did: [`did:ethr:${await authority.getAddress()}`] },
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

    await (await deployer.sendTransaction({
      ...roleFactory.newRole({
        domain: adminRole,
        roleDefinition: {
          roleName: adminRole,
          enrolmentPreconditions: [],
          fields: [],
          issuer: { issuerType: "ROLE", roleName: authorityRole },
          revoker: { revokerType: "DID", did: [] },
          metadata: [],
          roleType: '',
          version: defaultVersion
        }
      })
    })).wait();
  });

    it('Role can be revoked only if the revokers are specified', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: adminRole, agreementSigner: admin, proofSigner: authority });
      
      expect(
        revokeRole({ revocationRegistry, revoker: authority, subject: admin, subjectRole: adminRole })
      ).rejectedWith("Revocation Registry: Role revokers are not specified")
    });

    it('Role can be revoked only by authorised revoker', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });
      
      expect(
        revokeRole({ revocationRegistry, revoker: provider.getSigner(13), subject: authority, subjectRole: authorityRole })
      ).rejectedWith("Revocation Registry: Revoker is not listed in role revokers list")

      expect(
        revokeRole({ revocationRegistry, revoker: provider.getSigner(13), subject: installer, subjectRole: installerRole })
      ).rejectedWith("Revocation Registry: Revoker does not have required role")
    });

    it('Role can be revoked where revokerType is DID', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      expect(await claimManager.hasRole(authorityAddr, utils.namehash(authorityRole), defaultVersion)).true;
      
      await revokeRole({ revocationRegistry, revoker: authority, subject: authority, subjectRole: authorityRole });
      expect(await revocationRegistry.isRevoked(utils.namehash(authorityRole), authorityAddr)).true;
    });
  
    it('Role can be revoked where revokerType is Role ', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });
      expect(await claimManager.hasRole(installerAddr, utils.namehash(installerRole), defaultVersion)).true;

      await revokeRole({ revocationRegistry, revoker: authority, subject: installer, subjectRole: installerRole });    
      expect(await revocationRegistry.isRevoked(utils.namehash(installerRole), installerAddr)).true;
    });

    it('Role can be revoked where issuerType is "DID" and revokerType is "Role" ', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: deviceRole, agreementSigner: device, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });

      await revokeRole({ revocationRegistry, revoker: installer, subject: device, subjectRole: deviceRole });    
      expect(await revocationRegistry.isRevoked(utils.namehash(deviceRole), deviceAddr)).true;
    });

    it('Revoker can revoke his/her own role', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      expect(await claimManager.hasRole(authorityAddr, utils.namehash(authorityRole), defaultVersion)).true;
      
      await revokeRole({ revocationRegistry, revoker: authority, subject: authority, subjectRole: authorityRole });
      expect(await revocationRegistry.isRevoked(utils.namehash(authorityRole), authorityAddr)).true;
    });

    it('Revoker can revoke role issued by other authorities', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: deviceRole, agreementSigner: device, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });

      await revokeRole({ revocationRegistry, revoker: installer, subject: device, subjectRole: deviceRole });    
      expect(await revocationRegistry.isRevoked(utils.namehash(deviceRole), deviceAddr)).true;
    });

    it('Revoker can revoke role issued by him/her', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });
      expect(await claimManager.hasRole(installerAddr, utils.namehash(installerRole), defaultVersion)).true;

      await revokeRole({ revocationRegistry, revoker: authority, subject: installer, subjectRole: installerRole });    
      expect(await revocationRegistry.isRevoked(utils.namehash(installerRole), installerAddr)).true;
    });

    it('Role cannot be revoked if the revokers role has been revoked', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });
      
      await revokeRole({ revocationRegistry, revoker: authority, subject: authority, subjectRole: authorityRole});
      expect(await revocationRegistry.isRevoked(utils.namehash(authorityRole), authorityAddr)).true;

      expect(
        revokeRole({ revocationRegistry, revoker: authority, subject: installer, subjectRole: installerRole })
      ).rejectedWith("Revocation Registry: Revoker's role has been revoked")
    });

    it('A revoked role cannot be revoked again', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      
      await revokeRole({ revocationRegistry, revoker: authority, subject: authority, subjectRole: authorityRole });
      expect(await revocationRegistry.isRevoked(utils.namehash(authorityRole), authorityAddr)).true;

      expect(
        revokeRole({ revocationRegistry, revoker: authority, subject: authority, subjectRole: authorityRole })
      ).rejectedWith("The claim is already revoked")
    });

    it('Role can be revoked by revokers delegate', async () => {
      const delegate = provider.getSigner(6);
      const delegateAddr = await delegate.getAddress();
      const veriKey = "0x766572694b657900000000000000000000000000000000000000000000000000";
  
      await erc1056.connect(authority).addDelegate(authorityAddr, veriKey, delegateAddr, 60 * 60);
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });

      const revocationRegistry = await (await new RevocationRegistryOnChainFactory(delegate).deploy(erc1056.address, ensRegistry.address, claimManager.address)).deployed();
      await revokeRole({ revocationRegistry, revoker: delegate, subject: authority, subjectRole: authorityRole});    
      expect(await revocationRegistry.isRevoked(utils.namehash(authorityRole), authorityAddr)).true;
    });

    it('Role can be revoked for multiple DIDs by authorised revoker, bulk revocation ', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer1, proofSigner: authority });
      expect(await claimManager.hasRole(installerAddr, utils.namehash(installerRole), defaultVersion)).true;
      expect(await claimManager.hasRole(installer1Addr, utils.namehash(installerRole), defaultVersion)).true;

      await revokeRoles({ revocationRegistry, revoker: authority, subjects: [installer, installer1], subjectRole: installerRole});    
      expect(await revocationRegistry.isRevoked(utils.namehash(installerRole), installerAddr)).true;
      expect(await revocationRegistry.isRevoked(utils.namehash(installerRole), installer1Addr)).true;
    });

    it('Role details can be fetched based on role and subject address', async () => {
      await requestRole({ claimManager, roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
      await requestRole({ claimManager, roleName: installerRole, agreementSigner: installer, proofSigner: authority });
      expect(await claimManager.hasRole(installerAddr, utils.namehash(installerRole), defaultVersion)).true;

      await revokeRole({ revocationRegistry, revoker: authority, subject: installer, subjectRole: installerRole});    
      expect(await revocationRegistry.isRevoked(utils.namehash(installerRole), installerAddr)).true;

      const result = await revocationRegistry.getRevocationDetail(utils.namehash(installerRole), installerAddr);
      expect(result.length).to.equal(2);
      expect(result[0]).equal(authorityAddr)
    });
  
}
  