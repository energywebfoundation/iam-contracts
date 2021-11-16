# [3.5.0](https://github.com/energywebfoundation/iam-contracts/compare/v3.4.0...v3.5.0) (2021-11-16)


### Features

* **role:** issuerFields in role definition ([b2564e0](https://github.com/energywebfoundation/iam-contracts/commit/b2564e002d1e212116a0e88e9bba0a61da7ec582))

# [3.4.0](https://github.com/energywebfoundation/iam-contracts/compare/v3.3.1...v3.4.0) (2021-11-11)


### Features

* **ClaimManager:** import V2 of RoleDefResolver ([#65](https://github.com/energywebfoundation/iam-contracts/issues/65)) ([f48fa48](https://github.com/energywebfoundation/iam-contracts/commit/f48fa48ac0f6de61062a5cc5bdf0573072745e34))

## [3.3.1](https://github.com/energywebfoundation/iam-contracts/compare/v3.3.0...v3.3.1) (2021-11-01)


### Bug Fixes

* **core:** roles preconditions can be from different resolver than role itself ([c1e9a18](https://github.com/energywebfoundation/iam-contracts/commit/c1e9a18a87f041608d3af8fb51e0d7994178bbc0))

# [3.3.0](https://github.com/energywebfoundation/iam-contracts/compare/v3.2.0...v3.3.0) (2021-10-18)


### Features

* add revocationref typechain to build ([c86317c](https://github.com/energywebfoundation/iam-contracts/commit/c86317c63a8f1cdc88227e29596bf5f795bba648))

# [3.2.0](https://github.com/energywebfoundation/iam-contracts/compare/v3.1.0...v3.2.0) (2021-10-04)


### Bug Fixes

* **commit-analyzer:** remove empty release rule ([66679d8](https://github.com/energywebfoundation/iam-contracts/commit/66679d8c71cda47f951a6a092194975aa7b952ca))


### Features

* **deps:** update critical vulnerabilities ([f225b4e](https://github.com/energywebfoundation/iam-contracts/commit/f225b4ee575942a4ab6079a6f22bc8a4bc6398db))

# [3.1.0](https://github.com/energywebfoundation/iam-contracts/compare/v3.0.1...v3.1.0) (2021-09-21)


### Features

* **DomainHierarchy:** filter out apps and roles ([34f015a](https://github.com/energywebfoundation/iam-contracts/commit/34f015a7a01f23895d7ccd9723c5989e2d73ee66))

## [3.0.1](https://github.com/energywebfoundation/iam-contracts/compare/v3.0.0...v3.0.1) (2021-09-13)


### Bug Fixes

* increase staking period in test ([afe1822](https://github.com/energywebfoundation/iam-contracts/commit/afe18225f0963796f70c6f3195173700b7ef9201))

# [3.0.0](https://github.com/energywebfoundation/iam-contracts/compare/v2.0.1...v3.0.0) (2021-09-10)


### Bug Fixes

* **DomainHierarchy:** use ENSRegistryAddress ([2808b60](https://github.com/energywebfoundation/iam-contracts/commit/2808b60583215a4c8ace22606a1fcf601837a943))


### BREAKING CHANGES

* **DomainHierarchy:** address is used instead of Contract type

## [2.0.1](https://github.com/energywebfoundation/iam-contracts/compare/v2.0.0...v2.0.1) (2021-09-10)


### Bug Fixes

* add missing files declaration to dist ([491e857](https://github.com/energywebfoundation/iam-contracts/commit/491e857696d1911782641616cd9f3347d8992008))

# [2.0.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.17.2...v2.0.0) (2021-08-17)


### Bug Fixes

* parse event logs ([c95bb49](https://github.com/energywebfoundation/iam-contracts/commit/c95bb49cd8c3b898c7026c9dc8d5f08ec4f67e1b))
* transaction encoding ([44225f2](https://github.com/energywebfoundation/iam-contracts/commit/44225f2b03e3bd1fc462df9cd6e6a76a160b56a0))


### Build System

* dont export contract types ([8ed3084](https://github.com/energywebfoundation/iam-contracts/commit/8ed3084015054a4a4d04386a1e5dbc6214d8b574))


### BREAKING CHANGES

*

## [1.17.2](https://github.com/energywebfoundation/iam-contracts/compare/v1.17.1...v1.17.2) (2021-08-02)


### Bug Fixes

* **staking:** allow full reward to patron ([4c82d75](https://github.com/energywebfoundation/iam-contracts/commit/4c82d7552d4868054506a7079012354a33be5753))
* **staking:** daily interest ([8b1dda5](https://github.com/energywebfoundation/iam-contracts/commit/8b1dda5137fd1f40e59b70bd1b5f91cb996d4b4d))
* **staking:** redeploy staking factory ([6bb2bce](https://github.com/energywebfoundation/iam-contracts/commit/6bb2bce647c8e897623acb62ef5b2fa73fb2940e))

## [1.17.1](https://github.com/energywebfoundation/iam-contracts/compare/v1.17.0...v1.17.1) (2021-07-26)


### Bug Fixes

* deploy staking pool ([f51d580](https://github.com/energywebfoundation/iam-contracts/commit/f51d58018bbeaec8f9103798af62682a4061991b))

# [1.17.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.16.2...v1.17.0) (2021-07-17)


### Features

* **staking:** public withdrawal delay and min staking period ([5a1711a](https://github.com/energywebfoundation/iam-contracts/commit/5a1711a1a63ddcb5c2273c20417cab96bab7310b))

## [1.16.2](https://github.com/energywebfoundation/iam-contracts/compare/v1.16.1...v1.16.2) (2021-07-16)


### Bug Fixes

* redeploy_staking_pool_factory ([3e36aeb](https://github.com/energywebfoundation/iam-contracts/commit/3e36aeba8cf12f37da60bc7b7f7084c4d4f204dd))

## [1.16.1](https://github.com/energywebfoundation/iam-contracts/compare/v1.16.0...v1.16.1) (2021-07-15)


### Bug Fixes

* **staking:** check reward depending on status ([bcdb85f](https://github.com/energywebfoundation/iam-contracts/commit/bcdb85f02fb3d8f5e3304d5a370c19c534c8db0f))
* **staking:** init deposit end with deposit start ([bc60d9f](https://github.com/energywebfoundation/iam-contracts/commit/bc60d9fb6f1014fb0a2439fb06688ed88ec0120d))

# [1.16.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.15.2...v1.16.0) (2021-07-14)


### Features

* **staking:** allow patron without role ([53c8f12](https://github.com/energywebfoundation/iam-contracts/commit/53c8f12a7ae9f7e4c1903c2222c7d8d224ab4cb8))

## [1.15.2](https://github.com/energywebfoundation/iam-contracts/compare/v1.15.1...v1.15.2) (2021-07-07)


### Bug Fixes

* **staking:** redeploy staking factory ([5cb4c73](https://github.com/energywebfoundation/iam-contracts/commit/5cb4c73e3d8e3e46f9d69782ed2cd9bf000b20bd))

## [1.15.1](https://github.com/energywebfoundation/iam-contracts/compare/v1.15.0...v1.15.1) (2021-07-07)


### Bug Fixes

* **staking:** replace deep import from ethers ([2a3e016](https://github.com/energywebfoundation/iam-contracts/commit/2a3e0167b8bc85f60ad601752fccb60bae90078e))

# [1.15.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.14.0...v1.15.0) (2021-07-06)


### Bug Fixes

* **staking:** fractional calculations ([a323147](https://github.com/energywebfoundation/iam-contracts/commit/a323147b91f7dc7aeebdcbac54924da381c9ce52))
* **staking:** staking factory to deploy reward pool ([5d029bc](https://github.com/energywebfoundation/iam-contracts/commit/5d029bcf8de1692b1970a3b7fa81941f342876f4))


### Features

* **staking:** deploy reward pool by pool factory ([a8e9a3b](https://github.com/energywebfoundation/iam-contracts/commit/a8e9a3b4ee2c05831f644439b6522ddd3b9c9d94))

# [1.14.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.13.0...v1.14.0) (2021-07-04)


### Bug Fixes

* **staking:** error msg when pool doubled ([300cb78](https://github.com/energywebfoundation/iam-contracts/commit/300cb78302ced5aa50755ddca27fa0ceb0ef5240))
* path to ens artifacts ([5bb16be](https://github.com/energywebfoundation/iam-contracts/commit/5bb16bef82eac929f5ef710a0869b2794c721f7f))
* **roles:** patch ens-contracts ([aa903d0](https://github.com/energywebfoundation/iam-contracts/commit/aa903d075381abc6f463d35e992f96847d5704e0))
* **roles:** request enrollment by subject owner ([bc9623e](https://github.com/energywebfoundation/iam-contracts/commit/bc9623e7cb9d02a8fa43cb38761c5fafc577b837))
* **StakingPool:** payable patron for 0.8 compiler ([3bc2a9c](https://github.com/energywebfoundation/iam-contracts/commit/3bc2a9ce48c86838adcea47cb5c3e36b6399e989))


### Features

* **staking:** allow owned subject ([8882667](https://github.com/energywebfoundation/iam-contracts/commit/8882667c765febade420319ba9d17ebf48559bd7))
* upgrade contracts to 0.8.6 ([5efabc5](https://github.com/energywebfoundation/iam-contracts/commit/5efabc51efede157cfba6f7002a8b9b1f51848ae))

# [1.13.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.12.0...v1.13.0) (2021-07-01)


### Features

* **staking:** add StakingPoolFactory ([e0f41b0](https://github.com/energywebfoundation/iam-contracts/commit/e0f41b086e5cf1032e9bbb39e22ed961467c99d4))
* **staking:** get staking orgs list ([40196df](https://github.com/energywebfoundation/iam-contracts/commit/40196df78ce26fad1202549b37eb2fb85ad232b5))
* **staking:** pools are public ([7b20066](https://github.com/energywebfoundation/iam-contracts/commit/7b20066a9f9dc1abc1ec88a634b6178466611571))

# [1.12.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.11.2...v1.12.0) (2021-06-24)


### Bug Fixes

* **staking:** prevent repeated stake state change ([46832f8](https://github.com/energywebfoundation/iam-contracts/commit/46832f8832c42ec1e6cbf12a49d69e32b6e9078e))


### Features

* **staking:** add checkReward ([a40be99](https://github.com/energywebfoundation/iam-contracts/commit/a40be996d11209fff5449a1d89ca78bfdc58e64d))
* **staking:** array of patron roles ([01b8d4c](https://github.com/energywebfoundation/iam-contracts/commit/01b8d4c2a623614c0b57ca06edb1bf3e00b3509c))
* **staking:** emit on stake state change ([e48f9ed](https://github.com/energywebfoundation/iam-contracts/commit/e48f9ed72fcc1157dc4d62db92694a12adfdafe1))
* **staking:** get total stake ([a3c800b](https://github.com/energywebfoundation/iam-contracts/commit/a3c800b028e656607ad7f1ffdff6b08d6e20e624))
* **staking:** reward pool only pays reward ([dca563f](https://github.com/energywebfoundation/iam-contracts/commit/dca563f9daaef3d5abffd4dea0ba8155ed3b433c))
* StakingPool contract ([e191971](https://github.com/energywebfoundation/iam-contracts/commit/e19197132777115a9be72d5ead8bbf9de4758081))

## [1.11.2](https://github.com/energywebfoundation/iam-contracts/compare/v1.11.1...v1.11.2) (2021-06-11)


### Bug Fixes

* hash issuer role name ([69e9d9d](https://github.com/energywebfoundation/iam-contracts/commit/69e9d9d6ef618c8df87a3081f34f5ad91692e1dc))

## [1.11.1](https://github.com/energywebfoundation/iam-contracts/compare/v1.11.0...v1.11.1) (2021-06-08)


### Bug Fixes

* **DomainHierarchu:** DomainHierarchy accomodate deleted namespaces ([31aa3df](https://github.com/energywebfoundation/iam-contracts/commit/31aa3dfc8de442e56506300e4d40bf3d7795ad2e))

# [1.11.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.10.1...v1.11.0) (2021-06-04)


### Features

* **claimManager:** export claim manager factory ([6f1dbd2](https://github.com/energywebfoundation/iam-contracts/commit/6f1dbd238d8e33d26cd8a54c2e08a1f74ceb2e68))

## [1.10.1](https://github.com/energywebfoundation/iam-contracts/compare/v1.10.0...v1.10.1) (2021-05-28)


### Bug Fixes

* replace all ethers subpaths ([58ebb9e](https://github.com/energywebfoundation/iam-contracts/commit/58ebb9ebc542b3c4e317470779bcc244272febce))

# [1.10.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.9.0...v1.10.0) (2021-05-28)


### Features

* exporting contracts types in an ethers-v4 dir ([3c37e02](https://github.com/energywebfoundation/iam-contracts/commit/3c37e022be98e7d3755b0a608436d92f816c42cb))

# [1.9.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.8.0...v1.9.0) (2021-05-26)


### Features

* update resolver and domain notifier address ([6c54e4f](https://github.com/energywebfoundation/iam-contracts/commit/6c54e4f23b2efb2fb0a742e84b2435fefd4991ad))

# [1.8.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.7.1...v1.8.0) (2021-05-26)


### Bug Fixes

* pure parse string ([5fded2a](https://github.com/energywebfoundation/iam-contracts/commit/5fded2aff7ca31e746144f8d0a066b52ef3a8613))
* specify fields visibility ([4ab62df](https://github.com/energywebfoundation/iam-contracts/commit/4ab62df076a4040202a57242b831f0d9999400e0))


### Features

* **claimManager:** client to canonize sigs ([00cdd0f](https://github.com/energywebfoundation/iam-contracts/commit/00cdd0f4e8dbaca4d62f68bb191e70cec8c84ee3))
* **claimManager:** include version in proof ([e3c0409](https://github.com/energywebfoundation/iam-contracts/commit/e3c0409d40e2e3b1e49bae2fe6fdaffe731523ac))
* **claimManager:** type signatures ([5cca815](https://github.com/energywebfoundation/iam-contracts/commit/5cca815e2ddc68d383867ac90b3d061cf61057e1))
* **claimManager:** verify role version ([8dcd147](https://github.com/energywebfoundation/iam-contracts/commit/8dcd147187f01a1b77cacbff4eec1f31ae1cdadd))
* check required number of prerequisites ([c0c6a38](https://github.com/energywebfoundation/iam-contracts/commit/c0c6a3853c8ef2052133580e257964c14dfefae9))
* delegate agreement and proving ([827599d](https://github.com/energywebfoundation/iam-contracts/commit/827599d19f86aa3cb439bf331ff0a364fa5c222e))
* emit role assigned ([0924538](https://github.com/energywebfoundation/iam-contracts/commit/09245388a89878cb3e7f9e3a9385440a7732bd1f))
* openzeppelin to verify sig ([997b725](https://github.com/energywebfoundation/iam-contracts/commit/997b725ab02ef8f61de4938bacb13098620139f0))
* register with latest role version ([7e8235a](https://github.com/energywebfoundation/iam-contracts/commit/7e8235aa3d27a8230beece31b63a4ec20da48dfe))
* register with role ([4293806](https://github.com/energywebfoundation/iam-contracts/commit/4293806dfa02cd959d8d957261aac975f88b9be8))
* resolve resolver from role ([66e24e1](https://github.com/energywebfoundation/iam-contracts/commit/66e24e1ae43a9aa3ceb5da94d9651a6d6e35bbba))

## [1.7.1](https://github.com/energywebfoundation/iam-contracts/compare/v1.7.0...v1.7.1) (2021-05-25)


### Bug Fixes

* **DomainHierarchy:** removing empty string from singlelevel ([211dbe2](https://github.com/energywebfoundation/iam-contracts/commit/211dbe29a8a8d8ac1d0f7dfa38f5814d903731a4))

# [1.7.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.6.0...v1.7.0) (2021-05-25)


### Bug Fixes

* **package.json:** correct main path ([2bf2f5e](https://github.com/energywebfoundation/iam-contracts/commit/2bf2f5ea933782540a3d75e1b3bc179050efdfe7))


### Features

* copy typechain files to dist ([9ebcfab](https://github.com/energywebfoundation/iam-contracts/commit/9ebcfab8ca99ed79582cc95b2037f219bee260aa))
* export contract factories ([2f6f49a](https://github.com/energywebfoundation/iam-contracts/commit/2f6f49a7f1dc2ff8b6884751f9dc8fde05c53b74))

# [1.6.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.5.0...v1.6.0) (2021-05-24)


### Bug Fixes

* move patch-package to prebuild ([62501ac](https://github.com/energywebfoundation/iam-contracts/commit/62501ac23fd8038d7151624a40ba688fe924818d))


### Features

* **DomainTransactionFactory:** remove need for provider ([162c698](https://github.com/energywebfoundation/iam-contracts/commit/162c6984fa816bbf95ce6d98d5e94db9fa411d41))
* add PreconditionType to package export ([8123d34](https://github.com/energywebfoundation/iam-contracts/commit/8123d34f5fb465e36699a47e733769fd2a5e5c86))
* change getSubDomains to DomainHierarchy ([f6702cf](https://github.com/energywebfoundation/iam-contracts/commit/f6702cfaf5f03106043220184c9a7dc46f771d40))
* encapsulating contract objects ([06a474c](https://github.com/energywebfoundation/iam-contracts/commit/06a474c72956c19eab43428adce617c931adba1f))

# [1.5.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.4.0...v1.5.0) (2021-05-24)


### Features

* **VersionNumberResolver:** change to uint ([b467135](https://github.com/energywebfoundation/iam-contracts/commit/b467135b0d3430ea7db209aabd594ea4174e2e3b))

# [1.4.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.3.0...v1.4.0) (2021-05-19)


### Features

* **RoleDefResolver:** Consider ens registry delegate for resolver auth ([6fe377f](https://github.com/energywebfoundation/iam-contracts/commit/6fe377f764e15a61987a37de53cef1511af48004))

# [1.3.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.2.0...v1.3.0) (2021-05-13)


### Features

* upgrade contracts to solidity 0.7.6 ([f1fc7b3](https://github.com/energywebfoundation/iam-contracts/commit/f1fc7b3e9ed346034bd5160e87ac32d8c0a23f54))

# [1.2.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.1.0...v1.2.0) (2021-05-12)


### Features

* **EnrolementPrequisiteRolesResolver:** add mustHaveAll ([88323d2](https://github.com/energywebfoundation/iam-contracts/commit/88323d2a371c9a3e24cb86c1b5a2f7a42beecfd9))

# [1.1.0](https://github.com/energywebfoundation/iam-contracts/compare/v1.0.0...v1.1.0) (2021-04-30)


### Bug Fixes

* **getSubDomains:** ENSRegistry reference ([b51bd9e](https://github.com/energywebfoundation/iam-contracts/commit/b51bd9e110883d6b23cedb6af72219cf6ae32a66))
* **publish workflow:** need to compile contracts ([5314542](https://github.com/energywebfoundation/iam-contracts/commit/531454274c50deac0f78a0b2749c6202a41c652c))


### Features

* copy getSubDomains from iam-client-lib ([2617e69](https://github.com/energywebfoundation/iam-contracts/commit/2617e69d4ebde2d320b6c4da90cb2265494d2e15))

# 1.0.0 (2021-04-28)


### Bug Fixes

* check for resolver object for a chain ([5cdd0db](https://github.com/energywebfoundation/iam-contracts/commit/5cdd0db4a961210c8b37bd53588e4c8eb5fe2e3d))
* **iam-domain-client:** fix domainNotifier deploy ([d2a51ff](https://github.com/energywebfoundation/iam-contracts/commit/d2a51ff4ed7e8ba30e9f8e71c809ec06f6e32ab4))
* export of DomainReader and DomainTransactionFactory ([025860b](https://github.com/energywebfoundation/iam-contracts/commit/025860b7e2b94d8b2a9775c60123dc055c4c07bb))
* **contract tests:** add mocha ([9767afd](https://github.com/energywebfoundation/iam-contracts/commit/9767afd984c4a864a30a315d73e444550c693a56))


### Features

* add DomainNotifier and call when domain is updated ([e97cab3](https://github.com/energywebfoundation/iam-contracts/commit/e97cab33091c57bac869add568244f2c2223a844))
* add EnrolmentConditionResolvers ([5e0a09d](https://github.com/energywebfoundation/iam-contracts/commit/5e0a09ddb9917d32badc02592f87c4ed15e89cbd))
* add method to parse DomainType ([f45a22e](https://github.com/energywebfoundation/iam-contracts/commit/f45a22e18ccc5b627cad0e6a327635c58af48287))
* add readName method ([08f1c1e](https://github.com/energywebfoundation/iam-contracts/commit/08f1c1e0d303e29032cedfe70f4f19985f4661e0))
* check that domainUpdated is called by resolver ([7431666](https://github.com/energywebfoundation/iam-contracts/commit/7431666b532ac5fb2a5d8d3ee3eac4d26fec0066))
* error message when ENS registry address not set for a chain ([6e1868d](https://github.com/energywebfoundation/iam-contracts/commit/6e1868d46ce892f6aa5bc351e63223a932197ddc))
* moved editDomain logic to DomainTransactionFactory ([6cb8c76](https://github.com/energywebfoundation/iam-contracts/commit/6cb8c765f56f6c536a3c18d7d9db46afb5414571))
* **domainReader:** add check for node/name match to readName() ([a6cbb28](https://github.com/energywebfoundation/iam-contracts/commit/a6cbb2810f2e045b7cf1b1f0561ecfeea40e0bea))
* reading enrolment preconditions ([b04775a](https://github.com/energywebfoundation/iam-contracts/commit/b04775a5efd2934f5b9344787fe665f9c542b257))
* revive minDate and maxDate in RoleDef field ([9633855](https://github.com/energywebfoundation/iam-contracts/commit/9633855bb14fccff197cc1e0e7b0bb3413e93e18))
* roleDef resolver implementation with initial profiles ([af60a5a](https://github.com/energywebfoundation/iam-contracts/commit/af60a5ad99cc763a3ccf14b668ed675e51d8227f))
* use type guards to determine domain type ([4e514d6](https://github.com/energywebfoundation/iam-contracts/commit/4e514d697748011e08d94421652369074e8e65e7))
* versionNumber type to string ([0a6c88f](https://github.com/energywebfoundation/iam-contracts/commit/0a6c88f32a1681e7358cef31d987b274a8bf0f9e))
