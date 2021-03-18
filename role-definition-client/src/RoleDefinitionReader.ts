import { Signer } from "ethers";
import { Provider } from "ethers/providers";
import { IIssuerDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionTypes } from './types/DomainDefinitions'
import { RoleDefinitionResolver__factory } from "../ethers/factories/RoleDefinitionResolver__factory";
import { RoleDefinitionResolver } from "../ethers/RoleDefinitionResolver"

export class RoleDefinitionReader {
  protected readonly _ensResolver: RoleDefinitionResolver;

  constructor(ensResolverAddress: string, signerOrProvider: Signer | Provider) {
    this._ensResolver = RoleDefinitionResolver__factory.connect(ensResolverAddress, signerOrProvider);
  }

  async read(node: string): Promise<IRoleDefinition> {
    // TODO: Validate the node is a valid namehash

    const textData = await this._ensResolver.text(node, 'metadata');
    let textProps: IRoleDefinitionText
    try {
      textProps = JSON.parse(textData) as IRoleDefinitionText;
    } catch (err) {
      throw Error(`unable to parse resolved textData for node: ${node}. ${JSON.stringify(err)}`)
    }

    const issuersData = await this._ensResolver.issuers(node);
    let issuerType: string;
    if (issuersData.dids.length > 0) {
      issuerType = 'DID'
    }
    else if (issuersData.role != "") {
      issuerType = 'Role'
    }
    else {
      issuerType = ''
    }
    const issuers: IIssuerDefinition = {
      issuerType,
      did: issuersData.dids.map(address => `did:ethr:${address}`),
      roleName: issuersData.role
    }

    const prerequisiteRoleNodes = await this._ensResolver.prerequisiteRoles(node)
    const prerequisiteRoles = await Promise.all(prerequisiteRoleNodes.map(node => this._ensResolver.name(node)))
    const enrolmentPreconditions = prerequisiteRoles.length >= 1
      ? [{ type: PreconditionTypes.Role, conditions: prerequisiteRoles }]
      : []

    const version = await this._ensResolver.versionNumber(node);

    return {
      ...textProps,
      issuer: issuers,
      version,
      enrolmentPreconditions
    };
  }
}