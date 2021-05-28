import { utils, ContractFactory, Signer, Contract, Wallet } from 'ethers';
import { JsonRpcProvider } from 'ethers/providers';
import { expect } from 'chai';
import { abi as erc1056Abi, bytecode as erc1056Bytecode } from './ERC1056.json';
import { ClaimManager__factory as ClaimManagerFactory } from '../../ethers-v4/factories/ClaimManager__factory';
import { ClaimManager } from '../../ethers-v4/ClaimManager';
import { DomainTransactionFactory } from '../../src';
import { namehash, keccak256, toUtf8Bytes, id } from 'ethers/utils';
import { ENSRegistry } from '../../ethers-v4/ENSRegistry';
import { RoleDefinitionResolver } from '../../ethers-v4/RoleDefinitionResolver';
import { PreconditionType } from '../../src/types/DomainDefinitions';

const { solidityKeccak256, arrayify, defaultAbiCoder } = utils;

const root = `0x${'0'.repeat(64)}`;
const authorityRole = 'authority';
const deviceRole = 'device';
const activeDeviceRole = 'active-device'
const installerRole = 'installer';

const expiry = Math.floor(new Date().getTime() / 1000) + 60 * 60;
const defaultVersion = 1;

const hashLabel = (label: string): string => keccak256(toUtf8Bytes(label));

let claimManager: ClaimManager;
let roleFactory: DomainTransactionFactory;
let roleResolver: RoleDefinitionResolver;
let erc1056: Contract;
let provider: JsonRpcProvider;

let deployer: Signer;
let deployerAddr: string;
let device: Signer;
let deviceAddr: string;
let installer: Signer;
let installerAddr: string;
let authority: Signer;
let authorityAddr: string;

let chainId: number;

function canonizeSig(sig: string) {
  let suffix = sig.substr(130);
  if (suffix === '00') {
    suffix = '1b';
  } else if (suffix === '01') {
    suffix = '1c';
  }
  return sig.substr(0, 130) + suffix;
}

export function claimManagerTests(): void {
  // takes very long time, but can be useful sometimes
  describe.skip('Tests on Volta', testsOnVolta);
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

    // set it manually because ganache returns chainId same as network id 
    chainId = 1;
  });

  testSuit();
}

function testsOnVolta() {
  before(async function () {
    provider = new JsonRpcProvider('');
    const faucet = new Wallet(
      'df66a89721aab9508a5004192e8f0a7670141bdbcf7bd59cf5a20c4efd0daef3',
      provider
    );
    deployer = faucet;
    deployerAddr = await deployer.getAddress();
    device = new Wallet('7f88210c2baeff4983b08cf31b08ba35f01a99cb442f1db830e91496c0d5a314',
      provider);
    installer = new Wallet('9b67937b814668c30b947f6644fc4d3c64ec59129ba0b090d7f6cdfb82c25f0b',
      provider);
    authority = new Wallet('7925db23d51b76302941c445f7a5470aa6054aaf09bb63eb365dbacc05112264',
      provider);
    deviceAddr = await device.getAddress();
    installerAddr = await installer.getAddress();
    authorityAddr = await authority.getAddress();

    chainId = (await provider.getNetwork()).chainId;
  });

  testSuit();
}

function testSuit() {
  async function requestRole({
    roleName,
    version = defaultVersion,
    agreementSigner,
    proofSigner,
    subject,
    issuer
  }: {
    roleName: string,
    version?: number,
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

    const erc712_type_hash = id('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)');
    const agreement_type_hash = id('Agreement(address subject,bytes32 role,uint256 version)');
    const proof_type_hash = id('Proof(address subject,bytes32 role,uint256 version,uint256 expiry,address issuer)');

    const domainSeparator = keccak256(
      defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [erc712_type_hash, id('Claim Manager'), id("1.0"), chainId, claimManager.address]
      )
    );

    const messageId = Buffer.from('1901', 'hex');

    const agreementHash = solidityKeccak256(
      ['bytes', 'bytes32', 'bytes32'],
      [
        messageId,
        domainSeparator,
        keccak256(defaultAbiCoder.encode(
          ['bytes32', 'address', 'bytes32', 'uint256'],
          [agreement_type_hash, subjectAddr, namehash(roleName), version]
        ))
      ]
    );

    const agreement = await agreementSigner.signMessage(arrayify(
      agreementHash
    ));

    const proofHash = solidityKeccak256(
      ['bytes', 'bytes32', 'bytes32'],
      [
        messageId,
        domainSeparator,
        keccak256(defaultAbiCoder.encode(
          ['bytes32', 'address', 'bytes32', 'uint', 'uint', 'address'],
          [proof_type_hash, subjectAddr, namehash(roleName), version, expiry, issuerAddr]
        ))
      ]
    );

    const proof = await proofSigner.signMessage(arrayify(
      proofHash
    ));

    await (await claimManager.register(
      subjectAddr,
      namehash(roleName),
      version,
      expiry,
      issuerAddr,
      canonizeSig(agreement),
      canonizeSig(proof)
    )).wait(); // testing on Volta needs at least 2 confirmation
  }

  beforeEach(async function () {
    const erc1056Factory = new ContractFactory(erc1056Abi, erc1056Bytecode, deployer);
    erc1056 = await (await erc1056Factory.deploy()).deployed();

    const { ensFactory, domainNotifierFactory, roleDefResolverFactory } = this;
    const ensRegistry: ENSRegistry = await (await ensFactory.connect(deployer).deploy()).deployed();

    const notifier = await (await domainNotifierFactory.connect(deployer).deploy(ensRegistry.address)).deployed();
    roleResolver = await (await (roleDefResolverFactory.connect(deployer).deploy(ensRegistry.address, notifier.address))).deployed();

    claimManager = await (await new ClaimManagerFactory(deployer).deploy(erc1056.address, ensRegistry.address)).deployed();
    roleFactory = new DomainTransactionFactory({ domainResolverAddress: roleResolver.address });

    await (await ensRegistry.setSubnodeOwner(root, hashLabel(authorityRole), deployerAddr)).wait();
    await (await ensRegistry.setSubnodeOwner(root, hashLabel(deviceRole), deployerAddr)).wait();
    await (await ensRegistry.setSubnodeOwner(root, hashLabel(activeDeviceRole), deployerAddr)).wait();
    await (await ensRegistry.setSubnodeOwner(root, hashLabel(installerRole), deployerAddr)).wait();

    await (await ensRegistry.setResolver(namehash(authorityRole), roleResolver.address)).wait();
    await (await ensRegistry.setResolver(namehash(deviceRole), roleResolver.address)).wait();
    await (await ensRegistry.setResolver(namehash(activeDeviceRole), roleResolver.address)).wait();
    await (await ensRegistry.setResolver(namehash(installerRole), roleResolver.address)).wait();

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
          issuer: { issuerType: "ROLE", roleName: namehash(installerRole) },
          metadata: [],
          roleType: '',
          version: defaultVersion
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
          issuer: { issuerType: "ROLE", roleName: namehash(authorityRole) },
          metadata: [],
          roleType: '',
          version: defaultVersion
        }
      })
    })).wait();
  });

  it('Role can be assigned when issuer type is DID', async () => {
    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });

    expect(await claimManager.hasRole(authorityAddr, namehash(authorityRole), defaultVersion)).true;
  });

  it('Role can be assigned when issuer type is ROLE', async () => {
    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({ roleName: installerRole, agreementSigner: installer, proofSigner: authority });

    expect(await claimManager.hasRole(installerAddr, namehash(installerRole), defaultVersion)).true;
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

    expect(await claimManager.hasRole(deviceAddr, namehash(activeDeviceRole), defaultVersion)).true;
  });

  it('Agreement can be signed by subject delegate', async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const veriKey = "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056.connect(installer).addDelegate(installerAddr, veriKey, delegateAddr, 60 * 60);

    await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });
    await requestRole({ roleName: installerRole, agreementSigner: delegate, proofSigner: authority, subject: installer });

    expect(await claimManager.hasRole(installerAddr, namehash(installerRole), defaultVersion)).true;
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

    expect(await claimManager.hasRole(installerAddr, namehash(installerRole), defaultVersion)).true;
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

    expect(await claimManager.hasRole(installerAddr, namehash(authorityRole), defaultVersion)).true;
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

    expect(await claimManager.hasRole(installerAddr, namehash(authorityRole), defaultVersion)).true;
  });

  describe('Role versions tests', () => {
    it('When version is 0 hasRole() should check any version', async () => {
      await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });

      expect(await claimManager.hasRole(authorityAddr, namehash(authorityRole), 0)).true;
    });

    it('hasRole() should return true if identity registered with more recent version', async () => {
      const latest = 2;
      await roleResolver.setVersionNumber(namehash(authorityRole), latest.toString());
      await requestRole({ roleName: authorityRole, version: latest, agreementSigner: authority, proofSigner: authority });

      expect(await claimManager.hasRole(authorityAddr, namehash(authorityRole), latest)).true;
      expect(await claimManager.hasRole(authorityAddr, namehash(authorityRole), defaultVersion)).true;
    });

    it('hasRole() should return false if tested against not requested verion', async () => {
      await requestRole({ roleName: authorityRole, agreementSigner: authority, proofSigner: authority });

      expect(await claimManager.hasRole(authorityAddr, namehash(authorityRole), 2)).false;
    });

    it('request to register with non-existing role should be rejected', async () => {
      expect(requestRole({ roleName: authorityRole, version: 47, agreementSigner: authority, proofSigner: authority }))
        .rejectedWith("ClaimManager: Such version of this role doesn't exist")
    });
  });
}
