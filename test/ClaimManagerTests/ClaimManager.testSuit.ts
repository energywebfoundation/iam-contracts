import { utils, Wallet, ContractFactory, Signer } from 'ethers';
import { JsonRpcProvider } from 'ethers/providers';
import { expect } from 'chai';
import { abi as erc1056Abi, bytecode as erc1056Bytecode } from './ERC1056.json';
import { ClaimManager__factory as ClaimManagerFactory } from '../../typechain/factories/ClaimManager__factory';
import { ClaimManager } from '../../typechain/ClaimManager';
import { DomainTransactionFactory } from '../../src';
import { namehash, keccak256, toUtf8Bytes } from 'ethers/utils';
import { ENSRegistry } from '../../typechain/ENSRegistry';
import { RoleDefinitionResolver } from '../../typechain/RoleDefinitionResolver';
import { PreconditionType } from '../../src/types/DomainDefinitions';

const { solidityKeccak256, arrayify } = utils;

const root = `0x${'0'.repeat(64)}`;
const authorityRole = 'authority';
const deviceRole = 'device';
const activeDeviceRole = 'active-device'
const installerRole = 'installer';

const expiry = 60 * 60; // in secs
const version = '1';

const hashLabel = (label: string): string => keccak256(toUtf8Bytes(label));

let claimManager: ClaimManager;
let roleFactory: DomainTransactionFactory;
let roleResolver: RoleDefinitionResolver;
let provider: JsonRpcProvider;

let deployer: Signer;
let device: Signer;
let deviceAddr: string;
let installer: Signer;
let installerAddr: string;
let authority: Signer;
let authorityAddr: string;

export function claimManagerTests(): void {
  describe.skip('Tests on Volta', testsOnVolta);
  describe('Tests on ganache', testsOnGanache);
}

function canonizeSig(sig: string) {
  return sig.substr(0, 130) + (sig.substr(130) == "00" ? "1b" : "1c");
}

function testsOnVolta() {
  before(async function () {
    provider = new JsonRpcProvider('https://volta-rpc-vkn5r5zx4ke71f9hcu0c.energyweb.org/');
    const faucet = new Wallet(
      'df66a89721aab9508a5004192e8f0a7670141bdbcf7bd59cf5a20c4efd0daef3',
      provider
    );
    deployer = faucet;
    device = faucet;
    installer = faucet;
  });

  testSuit();
}

function testsOnGanache() {
  before(async function () {
    ({ provider } = this);
    deployer = provider.getSigner(1);
    device = provider.getSigner(3);
    installer = provider.getSigner(4);
    authority = provider.getSigner(5);
    deviceAddr = await device.getAddress();
    installerAddr = await installer.getAddress();
    authorityAddr = await authority.getAddress();
  });

  testSuit();
}

function testSuit() {
  async function requestRole(roleName: string, requester: Signer, issuer: Signer) {
    const issuerAddr = await issuer.getAddress();
    const requesterAddr = await requester.getAddress();

    const agreement_hash = solidityKeccak256(
      ['address', 'bytes32'],
      [requesterAddr, namehash(roleName)]
    );
    const requester_agreement = await requester.signMessage(arrayify(agreement_hash));

    const role_proof = await issuer.signMessage(arrayify(solidityKeccak256(
      ['address', 'bytes32', 'uint', 'address'],
      [requesterAddr, namehash(roleName), expiry, issuerAddr]
    )));

    await (await claimManager.register(
      requesterAddr,
      namehash(roleName),
      expiry,
      issuerAddr,
      canonizeSig(requester_agreement),
      canonizeSig(role_proof)
    )).wait();
  }

  beforeEach(async function () {
    const erc1056Factory = new ContractFactory(erc1056Abi, erc1056Bytecode, deployer);
    const erc1056 = await (await erc1056Factory.deploy()).deployed();

    const { ensFactory, domainNotifierFactory, roleDefResolverFactory } = this;
    const ensRegistry: ENSRegistry = await (await ensFactory.connect(deployer).deploy()).deployed();

    const notifier = await (await domainNotifierFactory.connect(deployer).deploy(ensRegistry.address)).deployed();
    roleResolver = await (await (roleDefResolverFactory.connect(deployer).deploy(ensRegistry.address, notifier.address))).deployed();

    claimManager = await (await new ClaimManagerFactory(deployer).deploy(erc1056.address, ensRegistry.address)).deployed();
    roleFactory = new DomainTransactionFactory(roleResolver);

    await ensRegistry.setSubnodeOwner(root, hashLabel(authorityRole), await deployer.getAddress());
    await ensRegistry.setSubnodeOwner(root, hashLabel(deviceRole), await deployer.getAddress());
    await ensRegistry.setSubnodeOwner(root, hashLabel(activeDeviceRole), await deployer.getAddress());
    await ensRegistry.setSubnodeOwner(root, hashLabel(installerRole), await deployer.getAddress());

    await ensRegistry.setResolver(namehash(authorityRole), roleResolver.address);
    await ensRegistry.setResolver(namehash(deviceRole), roleResolver.address);
    await ensRegistry.setResolver(namehash(activeDeviceRole), roleResolver.address);
    await ensRegistry.setResolver(namehash(installerRole), roleResolver.address);

    await (await deployer.sendTransaction({
      ...roleFactory.newRole({
        domain: authorityRole,
        roleDefinition: {
          roleName: authorityRole,
          enrolmentPreconditions: [],
          fields: [],
          issuer: { issuerType: "DID", did: [`did:ethr:${await authority.getAddress()}`] },
          metadata: [],
          roleType: '',
          version
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
          issuer: { issuerType: "ROLE", roleName: namehash(installerRole) },
          metadata: [],
          roleType: '',
          version
        }
      })
    })).wait();

    await (await deployer.sendTransaction({
      ...roleFactory.newRole({
        domain: activeDeviceRole,
        roleDefinition: {
          roleName: activeDeviceRole,
          enrolmentPreconditions: [{ type: PreconditionType.Role, conditions: [deviceRole] }],
          fields: [],
          issuer: { issuerType: "ROLE", roleName: namehash(installerRole) },
          metadata: [],
          roleType: '',
          version
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
          issuer: { issuerType: "ROLE", roleName: namehash(authorityRole) },
          metadata: [],
          roleType: '',
          version: '1'
        }
      })
    })).wait();
  });

  it('Role can be assigned when issuer type is DID', async () => {
    await requestRole(authorityRole, authority, authority);

    expect(await claimManager.hasRole(authorityAddr, namehash(authorityRole), version)).true;
  });

  it('Role can be assigned when issuer type is ROLE', async () => {
    await requestRole(authorityRole, authority, authority);
    await requestRole(installerRole, installer, authority);

    expect(await claimManager.hasRole(installerAddr, namehash(installerRole), version)).true;
  });

  it('Role proof signed by not authorized issuer should be rejected', async () => {
    expect(
      requestRole(authorityRole, authority, provider.getSigner(10))
    ).rejectedWith("ClaimManager: Issuer does not listed in role issuers list")

    expect(
      requestRole(deviceRole, device, provider.getSigner(10))
    ).rejectedWith("ClaimManager: Issuer does not have required role")
  });

  it('When prerequisites are not met, enrolment request must be rejected', async () => {
    await requestRole(authorityRole, authority, authority);
    await requestRole(installerRole, installer, authority);
    return expect(
      requestRole(activeDeviceRole, device, installer)
    )
      .rejectedWith('ClaimManager: Enrollment prerequisites are not met');
  });

  it('When prerequisites are met, enrolment request must be approved', async () => {
    await requestRole(authorityRole, authority, authority);
    await requestRole(installerRole, installer, authority);
    await requestRole(deviceRole, device, installer);
    await requestRole(activeDeviceRole, device, installer);

    expect(await claimManager.hasRole(deviceAddr, namehash(activeDeviceRole), version)).true;
  });
}