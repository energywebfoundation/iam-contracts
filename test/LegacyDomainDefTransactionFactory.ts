import { utils } from 'ethers';
import { PublicResolver } from '../ethers/PublicResolver';
import { EncodedCall, IRoleDefinition } from '../src/index';

/**
 * Initially, Switchboard role data was only maintained in the text resolver
 */
export class LegacyDomainDefTransactionFactory {
  constructor(protected readonly publicResolver: PublicResolver) {}

  public newRole({
    domain,
    roleDefinition,
  }: {
    domain: string;
    roleDefinition: IRoleDefinition;
  }): EncodedCall {
    const setDomainNameTx = this.setDomainNameTx({ domain });
    const setRoleDefinitionTx = this.setRoleDefinitionTx({
      data: roleDefinition,
      domain,
    });
    return this.createMultiCallTx({
      transactionsToCombine: [setDomainNameTx, setRoleDefinitionTx],
    });
  }

  protected setDomainNameTx({ domain }: { domain: string }): EncodedCall {
    const namespaceHash = utils.namehash(domain) as string;
    return {
      to: this.publicResolver.address,
      data: this.publicResolver.interface.encodeFunctionData('setName', [
        namespaceHash,
        domain,
      ]),
    };
  }

  protected createMultiCallTx({
    transactionsToCombine,
  }: {
    transactionsToCombine: EncodedCall[];
  }): EncodedCall {
    return {
      to: this.publicResolver.address,
      data: this.publicResolver.interface.encodeFunctionData('multicall', [
        transactionsToCombine.map((t) => t.data),
      ]),
    };
  }

  protected setRoleDefinitionTx({
    domain,
    data,
  }: {
    domain: string;
    data: IRoleDefinition;
  }): EncodedCall {
    return {
      to: this.publicResolver.address,
      data: this.publicResolver.interface.encodeFunctionData('setText', [
        utils.namehash(domain),
        'metadata',
        JSON.stringify(data),
      ]),
    };
  }
}
