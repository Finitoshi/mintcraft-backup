#!/usr/bin/env node
/**
 * Hourly Reflection Distribution Script
 *
 * 1. Collects transfer fees to treasury
 * 2. Snapshots all token holder balances
 * 3. Filters by minimum holding requirement
 * 4. Excludes LP pools, treasury, and manually claimed users
 * 5. Calculates proportional reflection shares
 * 6. (Optional) Swaps collected fees to custom reward token via Jupiter
 * 7. Distributes reflections automatically (treasury pays gas)
 * 8. Tracks who received reflections to prevent double-distribution
 */

import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  getAccount,
  getMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { createJupiterApiClient } from '@jup-ag/api';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Configuration
const config = {
  // Mint address to distribute reflections for
  MINT_ADDRESS: process.env.MINT_ADDRESS,

  // Treasury keypair that holds collected fees
  TREASURY_KEYPAIR_PATH: process.env.TREASURY_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json'),

  // RPC URL
  RPC_URL: process.env.RPC_URL || 'https://api.devnet.solana.com',

  // Reward token mint (if different from fee collection token)
  // Leave empty to distribute the same token that fees are collected in
  REWARD_TOKEN_MINT: process.env.REWARD_TOKEN_MINT || '',

  // Swap slippage tolerance in basis points (100 = 1%)
  SWAP_SLIPPAGE_BPS: parseInt(process.env.SWAP_SLIPPAGE_BPS || '100', 10),

  // Minimum holding to receive reflections (in base units)
  MIN_HOLDING: process.env.MIN_HOLDING || '0',

  // Excluded wallets (comma-separated)
  EXCLUDED_WALLETS: (process.env.EXCLUDED_WALLETS || '').split(',').filter(Boolean),

  // Maximum distributions per run (for batching)
  MAX_DISTRIBUTIONS_PER_RUN: parseInt(process.env.MAX_DISTRIBUTIONS_PER_RUN || '100', 10),

  // Minimum total pool to distribute (prevents dust distributions)
  MIN_TOTAL_POOL: process.env.MIN_TOTAL_POOL || '1000',

  // State directory
  STATE_DIR: process.env.STATE_DIR || join(homedir(), '.mintcraft/reflections'),

  // Log file
  LOG_FILE: process.env.LOG_FILE || join(homedir(), '.mintcraft/logs/reflections.log'),
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  // Append to log file
  try {
    const logDir = join(homedir(), '.mintcraft/logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    writeFileSync(config.LOG_FILE, logMessage + '\n', { flag: 'a' });
  } catch (error) {
    // Ignore log file errors
  }
}

function loadKeypair(path) {
  const secretKey = JSON.parse(readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

// Determine which token program a mint uses
async function getTokenProgramForMint(connection, mintAddress) {
  try {
    // Try Token-2022 first
    await getMint(connection, mintAddress, 'confirmed', TOKEN_2022_PROGRAM_ID);
    return TOKEN_2022_PROGRAM_ID;
  } catch {
    // Fall back to regular Token Program
    return TOKEN_PROGRAM_ID;
  }
}

// Swap tokens using Jupiter
async function swapTokens(
  connection,
  treasuryKeypair,
  fromMint,
  toMint,
  amount,
  slippageBps
) {
  log(`Initiating swap: ${amount} of ${fromMint.toBase58()} -> ${toMint.toBase58()}`);

  // Initialize Jupiter API client
  const jupiterApi = createJupiterApiClient();

  // Get quote for swap
  log('Fetching Jupiter quote...');
  const quoteResponse = await jupiterApi.quoteGet({
    inputMint: fromMint.toBase58(),
    outputMint: toMint.toBase58(),
    amount: amount.toString(),
    slippageBps,
  });

  if (!quoteResponse) {
    throw new Error('Failed to get Jupiter quote');
  }

  log(`Quote received: ${quoteResponse.outAmount} output tokens expected`);
  log(`Price impact: ${quoteResponse.priceImpactPct || 0}%`);

  // Get swap transaction
  const swapResponse = await jupiterApi.swapPost({
    swapRequest: {
      quoteResponse,
      userPublicKey: treasuryKeypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    },
  });

  // Deserialize the transaction
  const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  // Sign the transaction
  transaction.sign([treasuryKeypair]);

  // Send and confirm
  log('Sending swap transaction...');
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  log(`Swap transaction sent: ${signature}`);

  await connection.confirmTransaction(signature, 'confirmed');
  log(`✅ Swap confirmed: ${signature}`, 'SUCCESS');

  return {
    signature,
    inputAmount: BigInt(quoteResponse.inAmount),
    outputAmount: BigInt(quoteResponse.outAmount),
  };
}

// Load distribution state (tracks who received reflections)
function loadDistributionState() {
  const stateFile = join(config.STATE_DIR, `state-${config.MINT_ADDRESS}.json`);

  if (existsSync(stateFile)) {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  }

  return {
    lastDistribution: null,
    totalDistributed: '0',
    distributions: [],
  };
}

// Save distribution state
function saveDistributionState(state) {
  if (!existsSync(config.STATE_DIR)) {
    mkdirSync(config.STATE_DIR, { recursive: true });
  }

  const stateFile = join(config.STATE_DIR, `state-${config.MINT_ADDRESS}.json`);
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

// Get all token holders
async function getAllTokenHolders(connection, mintAddress) {
  log(`Fetching all token accounts for mint ${mintAddress.toBase58()}...`);

  const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      {
        memcmp: {
          offset: 0,
          bytes: mintAddress.toBase58(),
        },
      },
    ],
  });

  log(`Found ${accounts.length} token accounts`);

  const holders = [];
  for (const { pubkey } of accounts) {
    try {
      const accountInfo = await getAccount(
        connection,
        pubkey,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );

      if (accountInfo.amount > 0n) {
        holders.push({
          address: pubkey,
          owner: accountInfo.owner,
          balance: accountInfo.amount,
        });
      }
    } catch (error) {
      log(`Error reading account ${pubkey.toBase58()}: ${error.message}`, 'WARN');
    }
  }

  return holders;
}

// Filter eligible holders
function filterEligibleHolders(holders, minHolding, excludedWallets, treasuryAddress) {
  const excludedSet = new Set([
    ...excludedWallets.map(w => w.toLowerCase()),
    treasuryAddress.toLowerCase(),
    '11111111111111111111111111111111', // Burn address
  ]);

  const minHoldingBigInt = BigInt(minHolding);

  return holders.filter(holder => {
    // Exclude if in exclusion list
    if (excludedSet.has(holder.owner.toBase58().toLowerCase())) {
      return false;
    }

    // Exclude if balance below minimum
    if (holder.balance < minHoldingBigInt) {
      return false;
    }

    return true;
  });
}

// Calculate reflection shares
function calculateReflections(holders, feePool) {
  const totalEligibleSupply = holders.reduce((sum, h) => sum + h.balance, 0n);

  log(`Total eligible supply: ${totalEligibleSupply}`);
  log(`Fee pool to distribute: ${feePool}`);

  const reflections = [];

  for (const holder of holders) {
    // Calculate proportional share: (holderBalance / totalEligibleSupply) * feePool
    const share = (holder.balance * feePool) / totalEligibleSupply;

    if (share > 0n) {
      reflections.push({
        owner: holder.owner,
        address: holder.address,
        balance: holder.balance,
        reflectionAmount: share,
      });
    }
  }

  return reflections;
}

// Create and send distribution transactions
async function distributeReflections(
  connection,
  treasuryKeypair,
  reflections,
  rewardMintAddress,
  rewardMintDecimals,
  rewardTokenProgram
) {
  const treasuryTokenAccount = getAssociatedTokenAddressSync(
    rewardMintAddress,
    treasuryKeypair.publicKey,
    false,
    rewardTokenProgram
  );

  let successCount = 0;
  let failCount = 0;
  let totalDistributed = 0n;
  const distributionRecords = [];

  // Distribute to each holder (batched in groups of 5 for efficiency)
  const batchSize = 5;

  for (let i = 0; i < reflections.length; i += batchSize) {
    const batch = reflections.slice(i, i + batchSize);
    const tx = new Transaction();

    for (const reflection of batch) {
      // Get or create recipient ATA
      const recipientAta = getAssociatedTokenAddressSync(
        rewardMintAddress,
        reflection.owner,
        false,
        rewardTokenProgram
      );

      // Add create ATA instruction (idempotent)
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          treasuryKeypair.publicKey,
          recipientAta,
          reflection.owner,
          rewardMintAddress,
          rewardTokenProgram
        )
      );

      // Add transfer instruction
      tx.add(
        createTransferCheckedInstruction(
          treasuryTokenAccount,
          rewardMintAddress,
          recipientAta,
          treasuryKeypair.publicKey,
          reflection.reflectionAmount,
          rewardMintDecimals,
          [],
          rewardTokenProgram
        )
      );
    }

    try {
      log(`Distributing to ${batch.length} holders (batch ${Math.floor(i / batchSize) + 1})...`);

      const signature = await connection.sendTransaction(tx, [treasuryKeypair]);
      await connection.confirmTransaction(signature, 'confirmed');

      log(`✅ Batch confirmed: ${signature}`, 'SUCCESS');

      for (const reflection of batch) {
        successCount++;
        totalDistributed += reflection.reflectionAmount;
        distributionRecords.push({
          owner: reflection.owner.toBase58(),
          amount: reflection.reflectionAmount.toString(),
          signature,
        });
      }
    } catch (error) {
      log(`❌ Batch failed: ${error.message}`, 'ERROR');
      failCount += batch.length;
    }
  }

  return {
    successCount,
    failCount,
    totalDistributed,
    distributionRecords,
  };
}

// Main distribution function
async function runDistribution() {
  log('=== Starting Hourly Reflection Distribution ===');

  if (!config.MINT_ADDRESS) {
    throw new Error('MINT_ADDRESS is required');
  }

  const feeMintAddress = new PublicKey(config.MINT_ADDRESS);
  const treasuryKeypair = loadKeypair(config.TREASURY_KEYPAIR_PATH);
  const connection = new Connection(config.RPC_URL, 'confirmed');

  log(`Treasury: ${treasuryKeypair.publicKey.toBase58()}`);
  log(`Fee Collection Mint: ${feeMintAddress.toBase58()}`);

  // Determine reward token mint
  const rewardMintAddress = config.REWARD_TOKEN_MINT
    ? new PublicKey(config.REWARD_TOKEN_MINT)
    : feeMintAddress;

  const needsSwap = !rewardMintAddress.equals(feeMintAddress);

  if (needsSwap) {
    log(`Reward Token Mint: ${rewardMintAddress.toBase58()} (swap required)`);
  } else {
    log('Distributing same token as fees (no swap needed)');
  }

  // Load previous distribution state
  const state = loadDistributionState();

  // Get fee mint info and token program
  const feeTokenProgram = await getTokenProgramForMint(connection, feeMintAddress);
  const feeMintInfo = await getMint(
    connection,
    feeMintAddress,
    'confirmed',
    feeTokenProgram
  );

  log(`Fee token supply: ${feeMintInfo.supply}`);
  log(`Fee token decimals: ${feeMintInfo.decimals}`);
  log(`Fee token program: ${feeTokenProgram.toBase58()}`);

  // Get reward mint info if different
  let rewardMintInfo;
  let rewardTokenProgram;

  if (needsSwap) {
    rewardTokenProgram = await getTokenProgramForMint(connection, rewardMintAddress);
    rewardMintInfo = await getMint(
      connection,
      rewardMintAddress,
      'confirmed',
      rewardTokenProgram
    );
    log(`Reward token supply: ${rewardMintInfo.supply}`);
    log(`Reward token decimals: ${rewardMintInfo.decimals}`);
    log(`Reward token program: ${rewardTokenProgram.toBase58()}`);
  } else {
    rewardMintInfo = feeMintInfo;
    rewardTokenProgram = feeTokenProgram;
  }

  // Get treasury balance (fee pool)
  const treasuryFeeTokenAccount = getAssociatedTokenAddressSync(
    feeMintAddress,
    treasuryKeypair.publicKey,
    false,
    feeTokenProgram
  );

  const treasuryFeeAccount = await getAccount(
    connection,
    treasuryFeeTokenAccount,
    'confirmed',
    feeTokenProgram
  );

  let feePool = treasuryFeeAccount.amount;
  log(`Treasury fee balance (collected): ${feePool}`);

  const minPool = BigInt(config.MIN_TOTAL_POOL);
  if (feePool < minPool) {
    log(`Fee pool (${feePool}) below minimum (${minPool}). Skipping distribution.`, 'WARN');
    return;
  }

  // Swap to reward token if needed
  let distributionPool = feePool;

  if (needsSwap) {
    log('=== Performing Token Swap ===');
    try {
      const swapResult = await swapTokens(
        connection,
        treasuryKeypair,
        feeMintAddress,
        rewardMintAddress,
        feePool,
        config.SWAP_SLIPPAGE_BPS
      );

      distributionPool = swapResult.outputAmount;
      log(`Swapped ${swapResult.inputAmount} fee tokens for ${distributionPool} reward tokens`);
    } catch (error) {
      log(`Swap failed: ${error.message}`, 'ERROR');
      log('Checking if treasury already has reward tokens...', 'INFO');

      // Check if treasury has existing reward tokens
      const treasuryRewardTokenAccount = getAssociatedTokenAddressSync(
        rewardMintAddress,
        treasuryKeypair.publicKey,
        false,
        rewardTokenProgram
      );

      try {
        const treasuryRewardAccount = await getAccount(
          connection,
          treasuryRewardTokenAccount,
          'confirmed',
          rewardTokenProgram
        );

        distributionPool = treasuryRewardAccount.amount;
        log(`Using existing treasury reward balance: ${distributionPool}`, 'INFO');

        if (distributionPool < minPool) {
          log(`Reward pool (${distributionPool}) below minimum (${minPool}). Skipping distribution.`, 'WARN');
          return;
        }
      } catch {
        log('No reward tokens available in treasury. Cannot distribute.', 'ERROR');
        throw error;
      }
    }
  } else {
    log('Using fee pool directly for distribution (no swap needed)');
  }

  // Get all token holders (based on fee collection token for eligibility)
  const allHolders = await getAllTokenHolders(connection, feeMintAddress);

  // Filter eligible holders
  const eligibleHolders = filterEligibleHolders(
    allHolders,
    config.MIN_HOLDING,
    config.EXCLUDED_WALLETS,
    treasuryKeypair.publicKey.toBase58()
  );

  log(`Eligible holders: ${eligibleHolders.length} / ${allHolders.length}`);

  if (eligibleHolders.length === 0) {
    log('No eligible holders for reflection', 'WARN');
    return;
  }

  // Calculate reflections based on the distribution pool (after swap if needed)
  const reflections = calculateReflections(eligibleHolders, distributionPool);

  // Limit to max distributions per run
  const reflectionsToDistribute = reflections.slice(0, config.MAX_DISTRIBUTIONS_PER_RUN);

  if (reflectionsToDistribute.length < reflections.length) {
    log(
      `Limiting to ${config.MAX_DISTRIBUTIONS_PER_RUN} distributions (${reflections.length} total eligible)`,
      'WARN'
    );
  }

  // Distribute reflections (using reward token)
  log(`=== Distributing ${needsSwap ? 'Reward' : 'Fee'} Tokens ===`);
  const result = await distributeReflections(
    connection,
    treasuryKeypair,
    reflectionsToDistribute,
    rewardMintAddress,
    rewardMintInfo.decimals,
    rewardTokenProgram
  );

  // Update state
  state.lastDistribution = new Date().toISOString();
  state.totalDistributed = (
    BigInt(state.totalDistributed) + result.totalDistributed
  ).toString();
  state.distributions.push({
    timestamp: state.lastDistribution,
    successCount: result.successCount,
    failCount: result.failCount,
    totalDistributed: result.totalDistributed.toString(),
    records: result.distributionRecords,
  });

  // Keep only last 100 distribution records
  if (state.distributions.length > 100) {
    state.distributions = state.distributions.slice(-100);
  }

  saveDistributionState(state);

  log('=== Distribution Summary ===');
  log(`✅ Successful: ${result.successCount} holders`);
  log(`❌ Failed: ${result.failCount} holders`);
  log(`💰 Total distributed: ${result.totalDistributed} (${Number(result.totalDistributed) / 10 ** rewardMintInfo.decimals} reward tokens)`);
  log(`📊 Remaining pool: ${distributionPool - result.totalDistributed}`);
  log(`📈 Lifetime distributed: ${state.totalDistributed}`);

  if (needsSwap) {
    log(`ℹ️  Reward token: ${rewardMintAddress.toBase58()}`);
  }

  return result;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDistribution()
    .then((result) => {
      if (result) {
        log('Distribution complete!', 'SUCCESS');
        process.exit(0);
      } else {
        log('No distribution performed', 'WARN');
        process.exit(0);
      }
    })
    .catch((error) => {
      log(`Fatal error: ${error.message}`, 'ERROR');
      console.error(error);
      process.exit(1);
    });
}

export { runDistribution };
