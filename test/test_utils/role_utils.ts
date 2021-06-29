import { Signer, utils } from "ethers";
import { ClaimManager } from "../../ethers-v4/ClaimManager";

const { solidityKeccak256, defaultAbiCoder, arrayify } = utils;

export const defaultVersion = 1;
const expiry = Math.floor(new Date().getTime() / 1000) + 60 * 60;
// set it manually because ganache returns chainId same as network utils.id 
const chainId = 1;

function canonizeSig(sig: string) {
  let suffix = sig.substr(130);
  if (suffix === '00') {
    suffix = '1b';
  } else if (suffix === '01') {
    suffix = '1c';
  }
  return sig.substr(0, 130) + suffix;
}

export async function requestRole({
  claimManager,
  roleName,
  version = defaultVersion,
  agreementSigner,
  proofSigner,
  subject,
  subjectAddress,
  issuer
}: {
  claimManager: ClaimManager,
  roleName: string,
  version?: number,
  agreementSigner: Signer,
  proofSigner: Signer,
  subject?: Signer,
  subjectAddress?: string,
  issuer?: Signer
}): Promise<void> {
  if (!subject) {
    subject = agreementSigner;
  }
  if (!issuer) {
    issuer = proofSigner;
  }
  const issuerAddr = await issuer.getAddress();
  const subjectAddr = subjectAddress ?? await subject.getAddress();

  const erc712_type_hash = utils.id('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)');
  const agreement_type_hash = utils.id('Agreement(address subject,bytes32 role,uint256 version)');
  const proof_type_hash = utils.id('Proof(address subject,bytes32 role,uint256 version,uint256 expiry,address issuer)');

  const domainSeparator = utils.keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [erc712_type_hash, utils.id('Claim Manager'), utils.id("1.0"), chainId, claimManager.address]
    )
  );

  const messageId = Buffer.from('1901', 'hex');

  const agreementHash = solidityKeccak256(
    ['bytes', 'bytes32', 'bytes32'],
    [
      messageId,
      domainSeparator,
      utils.keccak256(defaultAbiCoder.encode(
        ['bytes32', 'address', 'bytes32', 'uint256'],
        [agreement_type_hash, subjectAddr, utils.namehash(roleName), version]
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
      utils.keccak256(defaultAbiCoder.encode(
        ['bytes32', 'address', 'bytes32', 'uint', 'uint', 'address'],
        [proof_type_hash, subjectAddr, utils.namehash(roleName), version, expiry, issuerAddr]
      ))
    ]
  );

  const proof = await proofSigner.signMessage(arrayify(
    proofHash
  ));

  await (await claimManager.register(
    subjectAddr,
    utils.namehash(roleName),
    version,
    expiry,
    issuerAddr,
    canonizeSig(agreement),
    canonizeSig(proof)
  )).wait(); // testing on Volta needs at least 2 confirmation
}