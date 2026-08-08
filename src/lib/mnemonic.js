import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from './wordlist.js';

export const STRENGTH_12 = 128;
export const STRENGTH_24 = 256;

export function generateMnemonicFromEntropy(entropyBytes) {
  return entropyToMnemonic(entropyBytes, wordlist);
}

export function isValidMnemonic(mnemonic) {
  return validateMnemonic(mnemonic.trim().toLowerCase(), wordlist);
}

export async function seedFromMnemonic(mnemonic, passphrase) {
  return mnemonicToSeed(mnemonic, passphrase || '');
}

export { wordlist };
