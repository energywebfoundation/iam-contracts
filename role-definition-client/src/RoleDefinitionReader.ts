import { Provider } from "ethers/providers";
import { IIssuerDefinition, IRoleDefinition, IRoleDefinitionText, PreconditionType, DomainType, IAppDefinition, IOrganizationDefinition } from './types/DomainDefinitions'
import { RoleDefinitionResolver__factory } from "../ethers/factories/RoleDefinitionResolver__factory";
import { RoleDefinitionResolver } from "../ethers/RoleDefinitionResolver"

export class RoleDefinitionReader {
  protected readonly _ensResolver: RoleDefinitionResolver;

  constructor(ensResolverAddress: string, provider: Provider) {
    this._ensResolver = RoleDefinitionResolver__factory.connect(ensResolverAddress, provider);
  }

  public static parseDomainType({
    possibleProperties,
  }: {
    possibleProperties: {
      orgName?: string;
      appName?: string;
      roleName?: string;
    };
  }): DomainType {
    if (possibleProperties.orgName) {
      return DomainType.Organization;
    }
    if (possibleProperties.appName) {
      // TODO: Check that this can be done with an appName (maybe appName isn't the full namespace)
      const [, parent] = possibleProperties.appName.split('.')
      if (parent === 'apps') {
        return DomainType.Application;
      }
    }
    if (possibleProperties.roleName) {
      return DomainType.Role
    }
    return DomainType.NotSupported;
  }

  public async read(node: string): Promise<IRoleDefinition | IAppDefinition | IOrganizationDefinition> {
    // TODO: Validate the node is a valid namehash

    const textData = await this._ensResolver.text(node, 'metadata');
    let textProps
    try {
      textProps = JSON.parse(textData) as IRoleDefinitionText;
    } catch (err) {
      throw Error(`unable to parse resolved textData for node: ${node}. ${JSON.stringify(err)}`)
    }
    const domainType = RoleDefinitionReader.parseDomainType({ possibleProperties: textProps })

    if (domainType === DomainType.Application) {
      throw new Error("not implemented")
    }
    if (domainType === DomainType.Organization) {
      throw new Error("not implemented")
    }
    if (domainType === DomainType.Role) {
      return await this.readRoleDefinition(node, textProps)
    }
    throw Error("unable to read domain definition")
  }

  // TODO: Muliticalify (make all the queries in one)
  private async readRoleDefinition(node: string, roleDefinitionText: IRoleDefinitionText) {
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
      ? [{ type: PreconditionType.Role, conditions: prerequisiteRoles }]
      : []

    const version = await this._ensResolver.versionNumber(node);

    return {
      ...roleDefinitionText,
      issuer: issuers,
      version,
      enrolmentPreconditions
    };
  }

}