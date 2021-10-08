/**
 * A value object representing a W3C DID
 * https://www.w3.org/TR/did-core/#did-syntax
 */
export class DID {
  /**
   * A DID in the format of "did:" method-name ":" method-specific-id
   */
  readonly did: string;

  readonly method: "ethr" | string;

  readonly id: string;

  constructor(did: string) {
    const idParts = did.split(":");
    if (idParts.length < 3) {
      throw new Error("DID should consists of at least 3 components");
    }
    this.did = did;
    const [, method, id] = idParts;
    this.method = method;
    this.id = id;
  }
}
