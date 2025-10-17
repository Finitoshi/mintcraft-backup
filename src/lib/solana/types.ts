import { PublicKey, Keypair } from '@solana/web3.js';
import { AccountState } from '@solana/spl-token';

export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  supplyBaseUnits: bigint;
  humanReadableSupply: string;
  maxWalletPercentage?: number;
  transferFeeTreasury?: PublicKey;
  extensions: {
    transferFee?: {
      feeBasisPoints: number;
      maxFee: bigint;
      transferFeeConfigAuthority: PublicKey;
      withdrawWithheldAuthority: PublicKey;
    };
    reflections?: {
      minHolding: bigint;
      gasRebateBps: number; // basis points (e.g., 200 = 2%)
      excludedWallets: PublicKey[];
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
    transferHook?: {
      programId: PublicKey;
      authority?: PublicKey;
    };
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

export interface ReflectionConfig {
  authority: PublicKey;
  minHolding: bigint;
  gasRebateBps: number;
  totalDistributed: bigint;
  bump: number;
}

export interface UserClaimState {
  user: PublicKey;
  mint: PublicKey;
  totalClaimed: bigint;
  lastClaimTimestamp: bigint;
}

export interface ReflectionClaimResult {
  signature: string;
  amountClaimed: bigint;
  gasRebateDeducted: bigint;
  netReceived: bigint;
}
