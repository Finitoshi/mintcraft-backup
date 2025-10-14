import { PublicKey, Keypair } from '@solana/web3.js';
import { AccountState } from '@solana/spl-token';

export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  maxWalletPercentage?: number;
  extensions: {
    transferFee?: {
      feeBasisPoints: number;
      maxFee: bigint;
      transferFeeConfigAuthority: PublicKey;
      withdrawWithheldAuthority: PublicKey;
    };
    interestBearing?: {
      rateAuthority: PublicKey;
      rate: number; // basis points
    };
    permanentDelegate?: {
      delegate: PublicKey;
    };
    nonTransferrable?: boolean;
    defaultAccountState?: {
      accountState: AccountState;
    };
    mintCloseAuthority?: {
      closeAuthority: PublicKey;
    };
    confidentialTransfers?: boolean;
    cpiGuard?: boolean;
    transferHook?: boolean;
  };
  authorities: {
    mintAuthority: PublicKey;
    freezeAuthority?: PublicKey;
    updateAuthority?: PublicKey;
  };
  metadataUri?: string;
}

export interface TokenCreationResult {
  mintKeypair: Keypair;
  signature: string;
  associatedTokenAccount: PublicKey;
}
