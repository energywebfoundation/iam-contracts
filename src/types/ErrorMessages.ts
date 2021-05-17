export enum ERROR_MESSAGES {
  DOMAIN_NOT_REGISTERED = "Domain not registered",
  RESOLVER_NOT_KNOWN = "Resolver contract is not known. Use addKnownResolver function",
  RESOLVER_NOT_SUPPORTED = "Resolver type is not supported",
  PRIMARY_RESOLVER_NOT_SET = "Primary resolver not set for the given chainID and type",
  DOMAIN_NOTIFIER_NOT_SET = "Domain notifier not set for the given chainID",
  DOMAIN_TYPE_UNKNOWN = "unable to determine domain type",
  NAME_NODE_MISMATCH = "hashed name does not match node",
  REGISTRY_NOT_SET = "Registry address not set for chain id. Use setRegistryAddress function",
}
