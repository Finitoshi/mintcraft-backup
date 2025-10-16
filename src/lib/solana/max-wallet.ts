import { sha256 } from '@noble/hashes/sha256';
import { utf8ToBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';

const MAX_WALLET_CONFIG_SEED = 'max-wallet-config';
const EXTRA_ACCOUNT_METAS_SEED = 'extra-account-metas';
export const MAX_WALLET_BPS_CAP = 10_000;

export const MAX_WALLET_HOOK_PROGRAM_ID = new PublicKey(
  'Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4'
);

const INIT_MAX_WALLET_CONFIG_INSTRUCTION = 'initialize_max_wallet_config';
const UPDATE_MAX_WALLET_CONFIG_INSTRUCTION = 'update_max_wallet_config';
const MAX_WALLET_CONFIG_ACCOUNT = 'MaxWalletConfig';

const getInstructionDiscriminator = (name: string): Buffer => {
  const hash = sha256(utf8ToBytes(`global:${name}`));
  return Buffer.from(hash.slice(0, 8));
};

export const getMaxWalletConfigPda = (
  mint: PublicKey
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [Buffer.from(MAX_WALLET_CONFIG_SEED), mint.toBuffer()],
    MAX_WALLET_HOOK_PROGRAM_ID
  );

export const getExtraAccountMetasPda = (
  mint: PublicKey
): [PublicKey, number] =>
  PublicKey.findProgramAddressSync(
    [Buffer.from(EXTRA_ACCOUNT_METAS_SEED), mint.toBuffer()],
    MAX_WALLET_HOOK_PROGRAM_ID
  );

export const createInitializeMaxWalletConfigInstruction = (params: {
  payer: PublicKey;
  authority: PublicKey;
  mint: PublicKey;
  maxWalletBps: number;
}): TransactionInstruction => {
  const { payer, authority, mint, maxWalletBps } = params;
  const [configPda] = getMaxWalletConfigPda(mint);
  const [extraMetaPda] = getExtraAccountMetasPda(mint);

  const discriminator = getInstructionDiscriminator(
    INIT_MAX_WALLET_CONFIG_INSTRUCTION
  );
  const data = Buffer.alloc(discriminator.length + 2);
  discriminator.copy(data, 0);
  data.writeUInt16LE(maxWalletBps, discriminator.length);

  return new TransactionInstruction({
    programId: MAX_WALLET_HOOK_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: extraMetaPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  });
};

export const createUpdateMaxWalletConfigInstruction = (params: {
  authority: PublicKey;
  mint: PublicKey;
  maxWalletBps: number;
}): TransactionInstruction => {
  const { authority, mint, maxWalletBps } = params;
  const [configPda] = getMaxWalletConfigPda(mint);

  const discriminator = getInstructionDiscriminator(
    UPDATE_MAX_WALLET_CONFIG_INSTRUCTION
  );
  const data = Buffer.alloc(discriminator.length + 2);
  discriminator.copy(data, 0);
  data.writeUInt16LE(maxWalletBps, discriminator.length);

  return new TransactionInstruction({
    programId: MAX_WALLET_HOOK_PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: configPda, isSigner: false, isWritable: true },
    ],
    data,
  });
};

const getAccountDiscriminator = (name: string): Buffer => {
  const hash = sha256(utf8ToBytes(`account:${name}`));
  return Buffer.from(hash.slice(0, 8));
};

export const parseMaxWalletConfig = (data: Buffer) => {
  const expectedDiscriminator = getAccountDiscriminator(
    MAX_WALLET_CONFIG_ACCOUNT
  );

  if (data.length < expectedDiscriminator.length + 32 + 2 + 1) {
    throw new Error('Max wallet config account data is too small');
  }

  const disc = data.slice(0, expectedDiscriminator.length);
  if (!disc.equals(expectedDiscriminator)) {
    throw new Error('Max wallet config discriminator mismatch');
  }

  const offset = expectedDiscriminator.length;
  const authority = new PublicKey(data.slice(offset, offset + 32));
  const maxWalletBps = data.readUInt16LE(offset + 32);
  const bump = data.readUInt8(offset + 34);

  return {
    authority,
    maxWalletBps,
    bump,
  };
};
