import { utils, Wallet, ContractFactory, Signer, Contract } from 'ethers';
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
let erc1056: Contract;
let provider: JsonRpcProvider;

let deployer: Signer;
let device: Signer;
let deviceAddr: string;
let installer: Signer;
let installerAddr: string;
let authority: Signer;
let authorityAddr: string;

function canonizeSig(sig: string) {
  return sig.substr(0, 130) + (sig.substr(130) == "00" ? "1b" : "1c");
}

export function claimManagerTests(): void {
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
  async function requestRole({
    roleName,
    agreementSigner,
    proofSigner,
    subject,
    issuer
  }: {
    roleName: string,
    agreementSigner: Signer,
    proofSigner: Signer,
    subject?: Signer,
    issuer?: Signer
  }

  ) {
    if (!subject) {
      subject = agreementSigner;
    }
    if (!issuer) {
      issuer = proofSigner;
    }
    const issuerAddr = await issuer.getAddress();
    const subjectAddr = await subject.getAddress();

    const agreement_hash = solidityKeccak256(
      ['address', 'bytes32'],
      [subjectAddr, namehash(roleName)]
    );
    const agreement = await agreementSigner.signMessage(arrayify(agreement_hash));

    const proof = await proofSigner.signMessage(arrayify(solidityKeccak256(
      ['address', 'bytes32', 'uint', 'address'],
      [subjectAddr, namehash(roleName), expiry, issuerAddr]
    )));

    await (await claimManager.register(
      subjectAddr,
      namehash(roleName),
      expiry,
      issuerAddr,
      canonizeSig(agreement),
      canonizeSig(proof)
    )).wait();
  }

  beforeEach(async function () {
    const erc1056Factory = new ContractFactory(erc1056Abi, erc1056Bytecode, deployer);
    erc1056 = await (await erc1056Factory.deploy()).deployed();

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
    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });

    expect(await claimManager.hasRole(authorityAddr, namehash(authorityRole), version)).true;
  });

  it('Role can be assigned when issuer type is ROLE', async () => {
    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({ roleName: installerRole, agreementSigner: installer, proofSigner: authority });

    expect(await claimManager.hasRole(installerAddr, namehash(installerRole), version)).true;
  });

  it('Role proof signed by not authorized issuer should be rejected', async () => {
    expect(
      requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: provider.getSigner(10) })
    ).rejectedWith("ClaimManager: Issuer is not listed in role issuers list")

    expect(
      requestRole({ roleName: deviceRole, agreementSigner: device, proofSigner: provider.getSigner(10) })
    ).rejectedWith("ClaimManager: Issuer does not has required role")
  });

  it('When prerequisites are not met, enrolment request must be rejected', async () => {
    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({ roleName: installerRole, agreementSigner: installer, proofSigner: authority });
    return expect(
      requestRole({ roleName: activeDeviceRole, agreementSigner: device, proofSigner: installer })
    )
      .rejectedWith('ClaimManager: Enrollment prerequisites are not met');
  });

  it('When prerequisites are met, enrolment request must be approved', async () => {
    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({ roleName: installerRole, agreementSigner: installer, proofSigner: authority });
    await requestRole({ roleName: deviceRole, agreementSigner: device, proofSigner: installer });
    await requestRole({ roleName: activeDeviceRole, agreementSigner: device, proofSigner: installer });

    expect(await claimManager.hasRole(deviceAddr, namehash(activeDeviceRole), version)).true;
  });

  it('Agreement can be signed by subject delegate', async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const veriKey = "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056.connect(installer).addDelegate(installerAddr, veriKey, delegateAddr, 60 * 60);

    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({ roleName: installerRole, agreementSigner: delegate, proofSigner: authority, subject: installer });

    expect(await claimManager.hasRole(installerAddr, namehash(installerRole), version)).true;
  });

  it('Proof can be signed by issuer delegate', async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const veriKey = "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056.connect(authority).addDelegate(authorityAddr, veriKey, delegateAddr, 60 * 60);

    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({
      roleName: installerRole,
      agreementSigner: installer,
      proofSigner: delegate,
      subject: installer,
      issuer: authority
    });

    expect(await claimManager.hasRole(installerAddr, namehash(installerRole), version)).true;
  });

  it('Proof can be issued by issuer delegate', async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const veriKey = "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056.connect(authority).addDelegate(authorityAddr, veriKey, delegateAddr, 60 * 60);

    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({
      roleName: authorityRole,
      agreementSigner: installer,
      proofSigner: delegate,
      subject: installer,
      issuer: delegate
    });

    expect(await claimManager.hasRole(installerAddr, namehash(authorityRole), version)).true;
  });

  it('Proof can be signed by delegate of issuer delegate', async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const delegateOfDelegate = provider.getSigner(7);
    const delegateOfDelegateAddr = await delegateOfDelegate.getAddress();
    const veriKey = "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056.connect(authority).addDelegate(authorityAddr, veriKey, delegateAddr, 60 * 60);
    await erc1056.connect(delegate).addDelegate(delegateAddr, veriKey, delegateOfDelegateAddr, 60 * 60);

    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({
      roleName: authorityRole,
      agreementSigner: installer,
      proofSigner: delegateOfDelegate,
      subject: installer,
      issuer: delegate
    });

    expect(await claimManager.hasRole(installerAddr, namehash(authorityRole), version)).true;
  });
}
