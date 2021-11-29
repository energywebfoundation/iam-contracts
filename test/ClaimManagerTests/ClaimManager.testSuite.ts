import {
  utils,
  ContractFactory,
  Signer,
  Contract,
  Wallet,
  providers,
} from "ethers";
import { expect } from "chai";
import {
  abi as erc1056Abi,
  bytecode as erc1056Bytecode,
} from "../test_utils/ERC1056.json";
import { ClaimManager__factory as ClaimManagerFactory } from "../../ethers/factories/ClaimManager__factory";
import { ClaimManager } from "../../ethers/ClaimManager";
import { IdentityManager__factory as IdentityManagerFactory } from "../../ethers/factories/IdentityManager__factory";
import { IdentityManager } from "../../ethers/IdentityManager";
import { OfferableIdentity__factory as OfferableIdentityFactory } from "../../ethers/factories/OfferableIdentity__factory";
import { RoleDefinitionResolverV2__factory } from "../../ethers/factories/RoleDefinitionResolverV2__factory";
import { DomainTransactionFactoryV2 } from "../../src";
import { ENSRegistry } from "../../ethers/ENSRegistry";
import { RoleDefinitionResolverV2 } from "../../ethers/RoleDefinitionResolverV2";
import { PreconditionType } from "../../src/types/DomainDefinitions";
import { defaultVersion, requestRole } from "../test_utils/role_utils";

const root = `0x${"0".repeat(64)}`;
const authorityRole = "authority";
const deviceRole = "device";
const activeDeviceRole = "active-device";
const installerRole = "installer";

const hashLabel = (label: string): string =>
  utils.keccak256(utils.toUtf8Bytes(label));

let claimManager: ClaimManager;
let proxyIdentityManager: IdentityManager;
let roleFactory: DomainTransactionFactoryV2;
let roleResolver: RoleDefinitionResolverV2;
let erc1056: Contract;
let provider: providers.JsonRpcProvider;

let deployer: Signer;
let deployerAddr: string;
let device: Signer;
let deviceAddr: string;
let installer: Signer;
let installerAddr: string;
let authority: Signer;
let authorityAddr: string;

export function claimManagerTests(): void {
  // takes very long time, but can be useful sometimes
  describe.skip("Tests on Volta", testsOnVolta);
  describe("Tests on ganache", testsOnGanache);
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

function testsOnVolta() {
  before(async function () {
    provider = new providers.JsonRpcProvider("");
    const faucet = new Wallet(
      "df66a89721aab9508a5004192e8f0a7670141bdbcf7bd59cf5a20c4efd0daef3",
      provider,
    );
    deployer = faucet;
    deployerAddr = await deployer.getAddress();
    device = new Wallet(
      "7f88210c2baeff4983b08cf31b08ba35f01a99cb442f1db830e91496c0d5a314",
      provider,
    );
    installer = new Wallet(
      "9b67937b814668c30b947f6644fc4d3c64ec59129ba0b090d7f6cdfb82c25f0b",
      provider,
    );
    authority = new Wallet(
      "7925db23d51b76302941c445f7a5470aa6054aaf09bb63eb365dbacc05112264",
      provider,
    );
    deviceAddr = await device.getAddress();
    installerAddr = await installer.getAddress();
    authorityAddr = await authority.getAddress();
  });

  testSuite();
}

function testSuite() {
  beforeEach(async function () {
    const erc1056Factory = new ContractFactory(
      erc1056Abi,
      erc1056Bytecode,
      deployer,
    );
    erc1056 = await (await erc1056Factory.deploy()).deployed();

    const { ensFactory, domainNotifierFactory } = this;
    const ensRegistry: ENSRegistry = await (
      await ensFactory.connect(deployer).deploy()
    ).deployed();

    const notifier = await (
      await domainNotifierFactory.connect(deployer).deploy(ensRegistry.address)
    ).deployed();
    roleResolver = await (
      await new RoleDefinitionResolverV2__factory(deployer).deploy(
        ensRegistry.address,
        notifier.address,
      )
    ).deployed();

    claimManager = await (
      await new ClaimManagerFactory(deployer).deploy()
    ).deployed();
    claimManager.initialize(erc1056.address, ensRegistry.address);
    const offerableIdentity = await (
      await new OfferableIdentityFactory(deployer).deploy()
    ).deployed();
    proxyIdentityManager = await (
      await new IdentityManagerFactory(deployer).deploy(
        offerableIdentity.address,
      )
    ).deployed();
    roleFactory = new DomainTransactionFactoryV2({
      domainResolverAddress: roleResolver.address,
    });

    await (
      await ensRegistry.setSubnodeOwner(
        root,
        hashLabel(authorityRole),
        deployerAddr,
      )
    ).wait();
    await (
      await ensRegistry.setSubnodeOwner(
        root,
        hashLabel(deviceRole),
        deployerAddr,
      )
    ).wait();
    await (
      await ensRegistry.setSubnodeOwner(
        root,
        hashLabel(activeDeviceRole),
        deployerAddr,
      )
    ).wait();
    await (
      await ensRegistry.setSubnodeOwner(
        root,
        hashLabel(installerRole),
        deployerAddr,
      )
    ).wait();

    await (
      await ensRegistry.setResolver(
        utils.namehash(authorityRole),
        roleResolver.address,
      )
    ).wait();
    await (
      await ensRegistry.setResolver(
        utils.namehash(deviceRole),
        roleResolver.address,
      )
    ).wait();
    await (
      await ensRegistry.setResolver(
        utils.namehash(activeDeviceRole),
        roleResolver.address,
      )
    ).wait();
    await (
      await ensRegistry.setResolver(
        utils.namehash(installerRole),
        roleResolver.address,
      )
    ).wait();

    await (
      await deployer.sendTransaction({
        ...roleFactory.newRole({
          domain: authorityRole,
          roleDefinition: {
            roleName: authorityRole,
            enrolmentPreconditions: [],
            fields: [],
            issuer: {
              issuerType: "DID",
              did: [`did:ethr:volta:${await authority.getAddress()}`],
            },
            revoker: {
              revokerType: "DID",
              did: [`did:ethr:volta:${await authority.getAddress()}`],
            },
            metadata: [],
            roleType: "",
            version: defaultVersion,
          },
        }),
      })
    ).wait();

    await (
      await deployer.sendTransaction({
        ...roleFactory.newRole({
          domain: deviceRole,
          roleDefinition: {
            roleName: deviceRole,
            enrolmentPreconditions: [],
            fields: [],
            issuer: { issuerType: "ROLE", roleName: installerRole },
            revoker: { revokerType: "ROLE", roleName: installerRole },
            metadata: [],
            roleType: "",
            version: defaultVersion,
          },
        }),
      })
    ).wait();

    await (
      await deployer.sendTransaction({
        ...roleFactory.newRole({
          domain: activeDeviceRole,
          roleDefinition: {
            roleName: activeDeviceRole,
            enrolmentPreconditions: [
              { type: PreconditionType.Role, conditions: [deviceRole] },
            ],
            fields: [],
            issuer: { issuerType: "ROLE", roleName: installerRole },
            revoker: { revokerType: "ROLE", roleName: installerRole },
            metadata: [],
            roleType: "",
            version: defaultVersion,
          },
        }),
      })
    ).wait();

    await (
      await deployer.sendTransaction({
        ...roleFactory.newRole({
          domain: installerRole,
          roleDefinition: {
            roleName: installerRole,
            enrolmentPreconditions: [],
            fields: [],
            issuer: { issuerType: "ROLE", roleName: authorityRole },
            revoker: { revokerType: "ROLE", roleName: authorityRole },
            metadata: [],
            roleType: "",
            version: defaultVersion,
          },
        }),
      })
    ).wait();
  });

  it("Role can be assigned when issuer type is DID", async () => {
    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });

    expect(
      await claimManager.hasRole(
        authorityAddr,
        utils.namehash(authorityRole),
        defaultVersion,
      ),
    ).true;
  });

  it("Role can be assigned when issuer type is ROLE", async () => {
    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: installerRole,
      agreementSigner: installer,
      proofSigner: authority,
    });

    expect(
      await claimManager.hasRole(
        installerAddr,
        utils.namehash(installerRole),
        defaultVersion,
      ),
    ).true;
  });

  it("Role proof signed by not authorized issuer should be rejected", async () => {
    expect(
      requestRole({
        claimManager,
        roleName: authorityRole,
        agreementSigner: authority,
        proofSigner: provider.getSigner(10),
      }),
    ).rejectedWith("ClaimManager: Issuer is not listed in role issuers list");

    expect(
      requestRole({
        claimManager,
        roleName: deviceRole,
        agreementSigner: device,
        proofSigner: provider.getSigner(10),
      }),
    ).rejectedWith("ClaimManager: Issuer does not has required role");
  });

  it("When prerequisites are not met, enrolment request must be rejected", async () => {
    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: installerRole,
      agreementSigner: installer,
      proofSigner: authority,
    });
    return expect(
      requestRole({
        claimManager,
        roleName: activeDeviceRole,
        agreementSigner: device,
        proofSigner: installer,
      }),
    ).rejectedWith("ClaimManager: Enrollment prerequisites are not met");
  });

  it("When prerequisites are met, enrolment request must be approved", async () => {
    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: installerRole,
      agreementSigner: installer,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: deviceRole,
      agreementSigner: device,
      proofSigner: installer,
    });
    await requestRole({
      claimManager,
      roleName: activeDeviceRole,
      agreementSigner: device,
      proofSigner: installer,
    });

    expect(
      await claimManager.hasRole(
        deviceAddr,
        utils.namehash(activeDeviceRole),
        defaultVersion,
      ),
    ).true;
  });

  it("Agreement can be signed by subject delegate", async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const veriKey =
      "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056
      .connect(installer)
      .addDelegate(installerAddr, veriKey, delegateAddr, 60 * 60);

    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: installerRole,
      agreementSigner: delegate,
      proofSigner: authority,
      subject: installer,
    });

    expect(
      await claimManager.hasRole(
        installerAddr,
        utils.namehash(installerRole),
        defaultVersion,
      ),
    ).true;
  });

  it("Agreement can be signed by proxyIdentity owner", async () => {
    const event = (
      await (
        await proxyIdentityManager
          .connect(authority)
          .createIdentity(authorityAddr)
      ).wait()
    ).events?.find(
      (e) =>
        e.event ===
        proxyIdentityManager.interface.events[
          "IdentityCreated(address,address,uint256)"
        ].name,
    );
    const proxyIdentityAddr = (event?.args as string[])[0];
    const proxyIdentity = OfferableIdentityFactory.connect(
      proxyIdentityAddr,
      provider,
    );
    const owner = await proxyIdentity.owner();
    expect(owner).to.eql(authorityAddr);

    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: installerRole,
      agreementSigner: authority,
      proofSigner: authority,
      subjectAddress: proxyIdentityAddr,
    });

    expect(
      await claimManager.hasRole(
        proxyIdentityAddr,
        utils.namehash(installerRole),
        defaultVersion,
      ),
    ).true;
  });

  it("Proof can be signed by issuer delegate", async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const veriKey =
      "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056
      .connect(authority)
      .addDelegate(authorityAddr, veriKey, delegateAddr, 60 * 60);

    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: installerRole,
      agreementSigner: installer,
      proofSigner: delegate,
      subject: installer,
      issuer: authority,
    });

    expect(
      await claimManager.hasRole(
        installerAddr,
        utils.namehash(installerRole),
        defaultVersion,
      ),
    ).true;
  });

  it("Proof can be issued by issuer delegate", async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const veriKey =
      "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056
      .connect(authority)
      .addDelegate(authorityAddr, veriKey, delegateAddr, 60 * 60);

    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: installer,
      proofSigner: delegate,
      subject: installer,
      issuer: delegate,
    });

    expect(
      await claimManager.hasRole(
        installerAddr,
        utils.namehash(authorityRole),
        defaultVersion,
      ),
    ).true;
  });

  it("Proof can be signed by delegate of issuer delegate", async () => {
    const delegate = provider.getSigner(6);
    const delegateAddr = await delegate.getAddress();
    const delegateOfDelegate = provider.getSigner(7);
    const delegateOfDelegateAddr = await delegateOfDelegate.getAddress();
    const veriKey =
      "0x766572694b657900000000000000000000000000000000000000000000000000";

    await erc1056
      .connect(authority)
      .addDelegate(authorityAddr, veriKey, delegateAddr, 60 * 60);
    await erc1056
      .connect(delegate)
      .addDelegate(delegateAddr, veriKey, delegateOfDelegateAddr, 60 * 60);

    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: authority,
      proofSigner: authority,
    });
    await requestRole({
      claimManager,
      roleName: authorityRole,
      agreementSigner: installer,
      proofSigner: delegateOfDelegate,
      subject: installer,
      issuer: delegate,
    });

    expect(
      await claimManager.hasRole(
        installerAddr,
        utils.namehash(authorityRole),
        defaultVersion,
      ),
    ).true;
  });

  describe("Role versions tests", () => {
    it("When version is 0 hasRole() should check any version", async () => {
      await requestRole({
        claimManager,
        roleName: authorityRole,
        agreementSigner: authority,
        proofSigner: authority,
      });

      expect(
        await claimManager.hasRole(
          authorityAddr,
          utils.namehash(authorityRole),
          0,
        ),
      ).true;
    });

    it("hasRole() should return true if identity registered with more recent version", async () => {
      const latest = 2;
      await roleResolver.setVersionNumber(
        utils.namehash(authorityRole),
        latest.toString(),
      );
      await requestRole({
        claimManager,
        roleName: authorityRole,
        version: latest,
        agreementSigner: authority,
        proofSigner: authority,
      });

      expect(
        await claimManager.hasRole(
          authorityAddr,
          utils.namehash(authorityRole),
          latest,
        ),
      ).true;
      expect(
        await claimManager.hasRole(
          authorityAddr,
          utils.namehash(authorityRole),
          defaultVersion,
        ),
      ).true;
    });

    it("hasRole() should return false if tested against not requested verion", async () => {
      await requestRole({
        claimManager,
        roleName: authorityRole,
        agreementSigner: authority,
        proofSigner: authority,
      });

      expect(
        await claimManager.hasRole(
          authorityAddr,
          utils.namehash(authorityRole),
          2,
        ),
      ).false;
    });

    it("request to register with non-existing role should be rejected", async () => {
      expect(
        requestRole({
          claimManager,
          roleName: authorityRole,
          version: 47,
          agreementSigner: authority,
          proofSigner: authority,
        }),
      ).rejectedWith("ClaimManager: Such version of this role doesn't exist");
    });
  });
}
