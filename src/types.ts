export const CipherType = {
  CAESAR: "Caesar",
  RAIL_FENCE: "Rail Fence",
  TRANSPOSITION: "Transposition",
  PLAYFAIR: "Playfair",
} as const;

export type CipherType = (typeof CipherType)[keyof typeof CipherType];

export const Mode = {
  ENCRYPT: "Encrypt",
  DECRYPT: "Decrypt",
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];

export interface CipherResult {
  original: string;
  result: string;
  key: string;
  cipherType: CipherType;
  mode: Mode;
  timestamp: number;
}
