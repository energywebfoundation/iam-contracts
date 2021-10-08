export type EncodedCall = {
  to: string;
  data: string;
  value?: string;
};

export type Transaction = {
  calls: EncodedCall[];
  from: string;
};
