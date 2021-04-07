import { namehash } from "ethers/utils";
import { PublicResolver } from "../typechain/PublicResolver";
import { IRoleDefinition, EncodedCall } from "../src/index";

/**
 * Initially, Switchboard role data was only maintained in the text resolver
 */
export class LegacyDomainDefTransactionFactory {
  constructor(protected readonly roleDefinitionResolver: PublicResolver) {
  }

  public newRole({ domain, roleDefinition }: { domain: string, roleDefinition: IRoleDefinition }): EncodedCall {
    const setDomainNameTx = this.setDomainNameTx({ domain });
    const setRoleDefinitionTx = this.setRoleDefinitionTx({ data: roleDefinition, domain });
    return this.createMultiCallTx({ transactionsToCombine: [setDomainNameTx, setRoleDefinitionTx] });
  }

  protected setDomainNameTx({ domain }: { domain: string }): EncodedCall {
    const namespaceHash = namehash(domain) as string;
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.setName.encode([namespaceHash, domain])
    };
  }

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
    return {
      to: this.roleDefinitionResolver.address,
      data: this.roleDefinitionResolver.interface.functions.setText.encode([
        namehash(domain),
        "metadata",
        JSON.stringify(data)
      ])
    };
  }
}