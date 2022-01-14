import { utils } from 'ethers';

const { parseEther } = utils;

export const emptyAddress = '0x0000000000000000000000000000000000000000';
export const PRINCIPAL_THRESHOLD = parseEther('100');
export const WITHDRAW_DELAY = 5;
