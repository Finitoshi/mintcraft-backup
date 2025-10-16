#!/usr/bin/env node

/**
 * Collect withheld transfer fees for a Token-2022 mint.
 *
 * Usage:
 *   node scripts/collect-transfer-fees.mjs \
 *     --mint <mint-address> \
 *     --authority /path/to/withdraw-authority.json \
 *     --treasury <treasury-owner-pubkey> \
 *     [--accounts <comma-separated-token-account-list>] \
 *     [--url <rpc-url> | --cluster devnet] \
 *     [--program TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb]
 *
 * The script will:
 *   1. Discover token accounts for the mint that still hold withheld fees (unless --accounts is passed).
 *   2. Withdraw those withheld fees directly into the treasury ATA.
 *   3. Withdraw any fees already harvested to the mint's withheld pool.
 *   4. (Optional) Split the collected amount across multiple wallets if --split is provided.
 */

import fs from 'fs';
import path from 'path';
import { Connection, Keypair, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  getMint,
  getAccountLenForMint,
  getTransferFeeAmount,
  getTransferFeeConfig,
  getOrCreateAssociatedTokenAccount,
  withdrawWithheldTokensFromAccounts,
  withdrawWithheldTokensFromMint,
  unpackAccount,
  createTransferCheckedInstruction,
} from '@solana/spl-token';

function usage(error) {
  if (error) {
    console.error(`\nError: ${error}\n`);
  }
  console.log(`Usage:
  node scripts/collect-transfer-fees.mjs --mint <mint-address> --authority <keypair.json> --treasury <treasury-owner-pubkey>

Optional flags:
  --accounts <account1,account2,...>  Comma-separated token accounts to harvest (auto-discovery if omitted)
  --url <rpc-url>                     Custom RPC endpoint
  --cluster <devnet|testnet|mainnet-beta|localhost>  Shortcut for RPC URL (defaults to devnet)
  --program <program-id>              Override Token-2022 program id
  --split <wallet:percent,...>        Optional distribution after collection (e.g. wallet1:70,wallet2:30)
  --treasury-authority <keypair.json> Signing key for treasury ATA owner if different from withdraw authority`);
  process.exit(error ? 1 : 0);
}

function getFlagValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    usage(`Flag ${flag} requires a value`);
  }
  return value;
}

function loadKeypair(keypairPath) {
  const resolved = path.resolve(keypairPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  let secret;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      secret = Uint8Array.from(parsed);
    } else if (parsed?.secretKey) {
      secret = Uint8Array.from(parsed.secretKey);
    }
  } catch {
    // Not JSON; fall back to base58 or throw below
  }

  if (!secret) {
    throw new Error(`Unable to parse keypair at ${resolved}. Expected JSON array or { "secretKey": [...] } structure.`);
  }

  return Keypair.fromSecretKey(secret);
}

function parsePublicKey(label, value) {
  try {
    return new PublicKey(value);
  } catch {
    usage(`${label} must be a valid base58 public key`);
    return undefined;
  }
}

function parseSplitConfig(rawConfig) {
  const entries = rawConfig
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!entries.length) {
    usage('Split configuration must include at least one wallet:percent pair');
  }

  const recipients = entries.map((entry) => {
    const [address, percentRaw] = entry.split(':').map((value) => value.trim());
    if (!address || !percentRaw) {
      usage(`Invalid split entry "${entry}". Expected format wallet:percent`);
    }

    const percent = Number.parseFloat(percentRaw);
    if (Number.isNaN(percent) || percent <= 0) {
      usage(`Split percentage must be a positive number (entry: "${entry}")`);
    }

    const bps = Math.round(percent * 100);
    if (bps <= 0) {
      usage(`Split percentage is too small to allocate (entry: "${entry}")`);
    }

    return {
      publicKey: parsePublicKey('split recipient', address),
      bps,
      label: entry,
    };
  });

  const totalBps = recipients.reduce((sum, recipient) => sum + recipient.bps, 0);
  if (totalBps <= 0) {
    usage('Split configuration must sum to more than 0%');
  }

  return { recipients, totalBps };
}

async function discoverWithheldAccounts(connection, mint, programId, expectedAccountSize) {
  let programAccounts;
  const mintBytes = mint.toBase58();
  const makeFilters = (withSize) => [
    ...(withSize && typeof expectedAccountSize === 'number'
      ? [{ dataSize: expectedAccountSize }]
      : []),
    {
      memcmp: {
        offset: 0,
        bytes: mintBytes,
      },
    },
  ];

  try {
    programAccounts = await connection.getProgramAccounts(programId, {
      commitment: 'confirmed',
      filters: makeFilters(true),
      dataSlice: { offset: 0, length: 0 },
    });
    if (!programAccounts.length) {
      programAccounts = await connection.getProgramAccounts(programId, {
        commitment: 'confirmed',
        filters: makeFilters(false),
        dataSlice: { offset: 0, length: 0 },
      });
    }
  } catch (error) {
    throw new Error(
      `Auto-discovery failed: ${error.message ?? error}. Pass token accounts explicitly with --accounts account1,account2 to collect fees.`,
    );
  }

  if (!programAccounts.length) {
    return [];
  }

  const addresses = programAccounts.map(({ pubkey }) => new PublicKey(pubkey));
  const chunkSize = 50;
  const candidates = [];

  for (let i = 0; i < addresses.length; i += chunkSize) {
    const chunk = addresses.slice(i, i + chunkSize);
    const infos = await connection.getMultipleAccountsInfo(chunk, 'confirmed');

    infos.forEach((info, index) => {
      if (!info) return;
      try {
        const account = unpackAccount(chunk[index], info, programId);
        if (!account.isInitialized) return;
        if (!account.mint.equals(mint)) return;

        const feeAmount = getTransferFeeAmount({
          ...account,
          tlvData: account.tlvData,
        });

        if (feeAmount?.withheldAmount && feeAmount.withheldAmount > 0n) {
          candidates.push(chunk[index]);
        }
      } catch {
        // Ignore accounts that fail to decode under Token-2022 layout
      }
    });
  }

  return candidates;
}

function formatAmount(amount, decimals) {
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = amount % base;
  if (fraction === 0n) return whole.toString();
  return `${whole.toString()}.${fraction.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

async function main() {
  const mintArg = getFlagValue('--mint');
  const authorityPath = getFlagValue('--authority');
  const treasuryOwnerArg = getFlagValue('--treasury');
  const splitArg = getFlagValue('--split');
  const treasuryAuthorityPath = getFlagValue('--treasury-authority');

  if (!mintArg || !authorityPath || !treasuryOwnerArg) {
    usage('Missing required flags (--mint, --authority, --treasury)');
  }

  const rpcUrl =
    getFlagValue('--url') ??
    (getFlagValue('--cluster') ? clusterApiUrl(getFlagValue('--cluster')) : clusterApiUrl('devnet'));
  const programId = parsePublicKey(
    'program id',
    getFlagValue('--program') ?? TOKEN_2022_PROGRAM_ID.toBase58()
  );

  const connection = new Connection(rpcUrl, 'confirmed');
  const mint = parsePublicKey('mint', mintArg);
  const treasuryOwner = parsePublicKey('treasury owner', treasuryOwnerArg);
  const withdrawAuthority = loadKeypair(authorityPath);
  const splitConfig = splitArg ? parseSplitConfig(splitArg) : undefined;
  const suppliedTreasuryAuthority = treasuryAuthorityPath
    ? loadKeypair(treasuryAuthorityPath)
    : undefined;

  const explicitAccountsArg = getFlagValue('--accounts');
  const explicitAccounts = explicitAccountsArg
    ? explicitAccountsArg.split(',').map((value) => parsePublicKey('token account', value.trim()))
    : undefined;

  console.log(`\n📡 Collecting transfer fees for mint ${mint.toBase58()}`);
  console.log(`RPC Endpoint: ${rpcUrl}`);
  console.log(`Token-2022 Program: ${programId.toBase58()}`);

  const mintInfo = await getMint(connection, mint, 'confirmed', programId);
  const decimals = mintInfo.decimals;
  let mintWithheld = getTransferFeeConfig(mintInfo)?.withheldAmount ?? 0n;

  const treasuryAtaAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    withdrawAuthority,
    mint,
    treasuryOwner,
    false,
    'confirmed',
    undefined,
    programId,
  );
  const treasuryAta = treasuryAtaAccount.address;
  let treasuryBefore = treasuryAtaAccount.amount;

  let sourceAccounts = explicitAccounts?.filter(Boolean) ?? [];
  if (!explicitAccountsArg) {
    console.log('🔍 Discovering token accounts with withheld fees...');
    const expectedAccountSize = getAccountLenForMint(mintInfo);
    sourceAccounts = await discoverWithheldAccounts(connection, mint, programId, expectedAccountSize);
  }

  console.log(`• Accounts to harvest: ${sourceAccounts.length}`);

  if (sourceAccounts.length > 0) {
    const signature = await withdrawWithheldTokensFromAccounts(
      connection,
      withdrawAuthority,
      mint,
      treasuryAta,
      withdrawAuthority,
      [],
      sourceAccounts,
      undefined,
      programId,
    );
    console.log(`  ➜ Withheld fees withdrawn from accounts: ${signature}`);
  } else {
    console.log('  ➜ No token accounts contained withheld fees.');
  }

  const mintInfoAfterAccounts = await getMint(connection, mint, 'confirmed', programId);
  mintWithheld = getTransferFeeConfig(mintInfoAfterAccounts)?.withheldAmount ?? 0n;
  if (mintWithheld > 0n) {
    const signature = await withdrawWithheldTokensFromMint(
      connection,
      withdrawAuthority,
      mint,
      treasuryAta,
      withdrawAuthority,
      [],
      undefined,
      programId,
    );
    console.log(`  ➜ Withheld fees withdrawn from mint pool: ${signature}`);
  }

  const treasuryAfterAccount = await getAccount(connection, treasuryAta, 'confirmed', programId);
  const delta = treasuryAfterAccount.amount - treasuryBefore;
  console.log(
    `\n✅ Collected ${formatAmount(delta, decimals)} tokens into treasury ATA ${treasuryAta.toBase58()}`,
  );

  if (splitConfig && delta > 0n) {
    const { recipients, totalBps } = splitConfig;
    const totalBpsBigInt = BigInt(totalBps);

    let treasurySigner = withdrawAuthority;
    if (!treasuryAtaAccount.owner.equals(withdrawAuthority.publicKey)) {
      if (!suppliedTreasuryAuthority) {
        throw new Error(
          'Split distribution requires signing authority for the treasury ATA owner. Provide --treasury-authority <keypair.json> or ensure the withdraw authority owns the treasury ATA.',
        );
      }
      if (!treasuryAtaAccount.owner.equals(suppliedTreasuryAuthority.publicKey)) {
        throw new Error(
          `Provided treasury authority (${suppliedTreasuryAuthority.publicKey.toBase58()}) does not own the treasury ATA (${treasuryAtaAccount.owner.toBase58()})`,
        );
      }
      treasurySigner = suppliedTreasuryAuthority;
    }

    let remaining = delta;
    const transferInstructions = [];
    const distributions = [];

    for (let index = 0; index < recipients.length; index += 1) {
      const recipient = recipients[index];
      let shareAmount = (delta * BigInt(recipient.bps)) / totalBpsBigInt;
      if (index === recipients.length - 1) {
        shareAmount = remaining;
      }

      if (shareAmount <= 0n) {
        continue;
      }

      remaining -= shareAmount;

      const recipientAtaAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        withdrawAuthority,
        mint,
        recipient.publicKey,
        false,
        'confirmed',
        undefined,
        programId,
      );

      transferInstructions.push(
        createTransferCheckedInstruction(
          treasuryAta,
          mint,
          recipientAtaAccount.address,
          treasurySigner.publicKey,
          shareAmount,
          decimals,
          [],
          programId,
        ),
      );

      distributions.push({
        recipient: recipient.publicKey,
        amount: shareAmount,
      });
    }

    if (transferInstructions.length > 0) {
      const distributionTx = new Transaction().add(...transferInstructions);
      distributionTx.feePayer = withdrawAuthority.publicKey;
      distributionTx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

      const signers = [withdrawAuthority];
      if (!withdrawAuthority.publicKey.equals(treasurySigner.publicKey)) {
        signers.push(treasurySigner);
      }

      const signature = await connection.sendTransaction(distributionTx, signers, {
        preflightCommitment: 'confirmed',
      });
      await connection.confirmTransaction(signature, 'confirmed');

      console.log(`\n📤 Distributed collected fees (transaction: ${signature}):`);
      distributions.forEach(({ recipient, amount }) => {
        console.log(`  • ${formatAmount(amount, decimals)} → ${recipient.toBase58()}`);
      });

      if (remaining > 0n) {
        console.log(
          `  • ${formatAmount(remaining, decimals)} retained in treasury (rounding remainder)`,
        );
      }
    }
  }
}

main().catch((error) => {
  console.error('❌ Fee collection failed:', error.message ?? error);
  process.exit(1);
});
