import { RoleDefinitionResolver } from "../typechain/RoleDefinitionResolver";
import { IAppDefinition, IOrganizationDefinition, IRoleDefinition, IRoleDefinitionText, IIssuerDefinition, PreconditionType } from "./types/DomainDefinitions"
import { DID } from "./types/DID";
import { EncodedCall } from "./types/Transaction";
import { namehash } from "ethers/utils";

export class DomainTransactionFactory {
  constructor(protected readonly roleDefinitionResolver: RoleDefinitionResolver) { }

  /**
   * Creates transaction to set role definition and reverse name in resolver contract 
   */
  public newRole({ domain, roleDefinition }: { domain: string, roleDefinition: IRoleDefinition }): EncodedCall {
    const setDomainNameTx = this.setDomainNameTx({ domain });
    const setRoleDefinitionTx = this.setRoleDefinitionTx({ data: roleDefinition, domain });
    return this.createMultiCallTx({ transactionsToCombine: [setDomainNameTx, setRoleDefinitionTx] });
  }

  /**
   * Creates transaction to update role definition in resolver contract 
   */
  public editRole({ domain, roleDefinition }: { domain: string, roleDefinition: IRoleDefinition }): EncodedCall {
    return this.setRoleDefinitionTx({ data: roleDefinition, domain });
  }

  /**
   * Creates transaction to set app/org definition and reverse name in resolver contract 
   */
  public newDomain({ domain, domainDefinition }: { domain: string, domainDefinition: IAppDefinition | IOrganizationDefinition }) {
    const setDomainNameTx = this.setDomainNameTx({ domain });
    const setDomainDefinitionTx = this.setTextTx({ data: domainDefinition, domain });
    const domainUpdated = this.domainUpdated({ domain });
    return this.createMultiCallTx({ transactionsToCombine: [setDomainNameTx, setDomainDefinitionTx, domainUpdated] });
  }

  /**
   * Creates transaction to update app/org definition in resolver contract 
   */
  public editDomain({ domain, domainDefinition }: { domain: string, domainDefinition: IAppDefinition | IOrganizationDefinition }) {
    const setDomainDefinitionTx = this.setTextTx({ data: domainDefinition, domain });
    const domainUpdated = this.domainUpdated({ domain });
    return this.createMultiCallTx({ transactionsToCombine: [setDomainDefinitionTx, domainUpdated] });
  }

  public setDomainNameTx({ domain }: { domain: string }): EncodedCall {
    const namespaceHash = namehash(domain) as string;
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.setName.encode([namespaceHash, domain])
    };
  }

  /**
   * Encodes a call to the ENS Resolver multicall function
   * @param transactionsToCombine 
   * @returns Combined encoded call
   */
  protected createMultiCallTx({
    transactionsToCombine
  }: {
    transactionsToCombine: EncodedCall[]
  }): EncodedCall {
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.multicall.encode([transactionsToCombine.map(t => t.data)])
    };
  }

  protected setRoleDefinitionTx({
    domain,
    data
  }: {
    domain: string;
    data: IRoleDefinition;
  }): EncodedCall {
    const setVersionTx = this.setVersionNumberTx({ domain, versionNumber: data.version });

    const setIssuersTx = this.setIssuersTx({ domain, issuers: data.issuer });
    // IssuerType hardcoded to zero for now which means approval by some identity (i.e. an identity from a list of DIDs, or an identity with a given role
    const setIssuerTypeTx = this.setIssuerTypeTx({ domain, issuerType: 0 });

    let prerequisiteRolesTx;
    const roleConditiions = data?.enrolmentPreconditions?.filter(condition => condition.type === PreconditionType.Role);
    if (!roleConditiions || roleConditiions.length < 1) {
      prerequisiteRolesTx = this.setPrerequisiteRolesTx({ domain, prerequisiteRoles: [] });
    }
    else if (roleConditiions.length == 1) {
      // TODO: check that each condition has a reverse name set
      prerequisiteRolesTx = this.setPrerequisiteRolesTx({ domain, prerequisiteRoles: roleConditiions[0].conditions });
    }
    else if (roleConditiions.length > 1) {
      throw Error("only one set of enrolment role preconditions should be provided");
    }
    else {
      throw Error("error setting role preconditions");
    }

    const textProps = ((roleDef: IRoleDefinition) => {
      return {
        roleName: roleDef.roleName,
        roleType: roleDef.roleType,
        fields: roleDef.fields,
        metadata: roleDef.metadata
      };
    })(data);
    const setTextTx = this.setTextTx({ domain, data: textProps });

    const domainUpdatedTx = this.domainUpdated({ domain })

    return this.createMultiCallTx({ transactionsToCombine: [setVersionTx, setIssuersTx, setIssuerTypeTx, setTextTx, prerequisiteRolesTx, domainUpdatedTx] });
  }

  protected setTextTx({
    domain,
    data
  }: {
    domain: string;
    data: IAppDefinition | IOrganizationDefinition | IRoleDefinitionText;
  }): EncodedCall {
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.setText.encode([
        namehash(domain),
        "metadata",
        JSON.stringify(data)
      ])
    };
  }

  protected domainUpdated({
    domain,
  }: {
    domain: string;
  }): EncodedCall {
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.domainUpdated.encode([
        namehash(domain),
      ])
    };
  }

  protected setVersionNumberTx({
    domain,
    versionNumber
  }: {
    domain: string;
    versionNumber: string;
  }): EncodedCall {
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.setVersionNumber.encode([
        namehash(domain),
        versionNumber
      ])
    };
  }

  protected setIssuersTx({
    domain,
    issuers
  }: {
    domain: string;
    issuers: IIssuerDefinition;
  }): EncodedCall {
    // First, try to determine which to set from issueType possiblities:
    // https://github.com/energywebfoundation/switchboard-dapp/blob/8776624832e68d2965f5a0b27ddb58f1907b0a33/src/app/routes/applications/new-role/new-role.component.ts#L56
    if (issuers.issuerType?.toUpperCase() === "DID") {
      if (!issuers.did) {
        throw Error("IssuerType set to DID but no DIDs provided");
      }
      const addresses = issuers.did.map((didString) => new DID(didString).id);
      return {
        to: this.roleDefinitionResolver.address,
        data: this.roleDefinitionResolver.interface.functions.setIssuerDids.encode([
          namehash(domain),
          addresses
        ])
      };
    }
    else if (issuers.issuerType?.toUpperCase() === "ROLE") {
      if (!issuers.roleName) {
        throw Error("IssuerType set to roleName but no roleName provided");
      }
      return {
        to: this.roleDefinitionResolver.address,
        data: this.roleDefinitionResolver.interface.functions.setIssuerRole.encode([
          namehash(domain),
          issuers.roleName
        ])
      };
    }
    throw new Error(`IssuerType of ${issuers.issuerType} is not supported`);
  }

  protected setIssuerTypeTx({
    domain,
    issuerType
  }: {
    domain: string;
    issuerType: number;
  }): EncodedCall {
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.setIssuerType.encode([
        namehash(domain),
        issuerType
      ])
    };
  }

  protected addEnrolmentConditionTypeTx({
    domain,
    enrolmentConditionType
  }: {
    domain: string;
    enrolmentConditionType: number;
  }): EncodedCall {
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.addConditionType.encode([
        namehash(domain),
        enrolmentConditionType
      ])
    };
  }

  protected setPrerequisiteRolesTx({
    domain,
    prerequisiteRoles
  }: {
    domain: string;
    prerequisiteRoles: string[];
  }): EncodedCall {
    const prequisiteRoleDomains = prerequisiteRoles.map(role => namehash(role));
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.setPrerequisiteRoles.encode([
        namehash(domain),
        prequisiteRoleDomains
      ])
    };
  }


}