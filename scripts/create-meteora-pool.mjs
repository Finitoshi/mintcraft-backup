#!/usr/bin/env node
/**
 * Create Meteora DLMM Pool on Devnet
 *
 * Meteora's Dynamic Liquidity Market Maker (DLMM) supports Token-2022
 * and has excellent devnet support at https://devnet.meteora.ag/
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import pkg from '@meteora-ag/dlmm';
const { default: DLMM } = pkg;
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import BN from 'bn.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';

// Our test tokens (standard SPL tokens for initial testing)
const TOKEN_A = '3UwpPzNCyDiEDMhudDoukxVGbt62bjHNic9ccS3zHwkA';
const TOKEN_B = 'Ggw9iSGFX9vLCXJ1xgQe1on4wvXedj28QDkGCKNNArZ6';

// Pool parameters
const BIN_STEP = 25; // 0.25% bin step (common for stable pairs)
const INITIAL_PRICE = 1.0; // 1:1 price
const LIQUIDITY_AMOUNT = 50_000; // 50k tokens per side

console.log('🌊 Creating Meteora DLMM Pool on Devnet\n');
console.log('═'.repeat(60));

function loadKeypair(path) {
  const secretKey = JSON.parse(readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function main() {
  try {
    // Load wallet
    console.log('Loading wallet...');
    const walletPath = process.env.TREASURY_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
    const wallet = loadKeypair(walletPath);
    console.log(`✅ Wallet: ${wallet.publicKey.toBase58()}\n`);

    // Setup connection
    const connection = new Connection(DEVNET_RPC, 'confirmed');

    // Check SOL balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 SOL Balance: ${balance / 10 ** 9} SOL`);

    if (balance < 0.5 * 10 ** 9) {
      console.log('\n⚠️  Low SOL balance. Run: solana airdrop 2 --url devnet\n');
    }

    const tokenMintA = new PublicKey(TOKEN_A);
    const tokenMintB = new PublicKey(TOKEN_B);

    console.log('\n📊 Pool Configuration:');
    console.log(`   Token A: ${TOKEN_A}`);
    console.log(`   Token B: ${TOKEN_B}`);
    console.log(`   Bin Step: ${BIN_STEP} (0.${BIN_STEP}% per bin)`);
    console.log(`   Initial Price: ${INITIAL_PRICE}`);
    console.log(`   Liquidity: ${LIQUIDITY_AMOUNT.toLocaleString()} tokens each\n`);

    // Get preset parameters for the bin step
    console.log('🏗️  Fetching preset parameters...');
    const presetParams = await DLMM.getAllPresetParameters(connection, { cluster: 'devnet' });

    // Find the preset for our bin step
    const binStepBN = new BN(BIN_STEP);
    let presetParam = null;
    let presetParamType = null;

    // Try presetParameter first (original format - createLbPair2 may need this)
    if (presetParams.presetParameter) {
      presetParam = presetParams.presetParameter.find(
        p => p.account.binStep === BIN_STEP
      );
      if (presetParam) presetParamType = 'presetParameter';
    }

    // Fallback to presetParameter2 (newer format)
    if (!presetParam && presetParams.presetParameter2) {
      presetParam = presetParams.presetParameter2.find(
        p => p.account.binStep === BIN_STEP
      );
      if (presetParam) presetParamType = 'presetParameter2';
    }

    if (!presetParam) {
      console.log('⚠️  No preset found for bin step', BIN_STEP);
      console.log('Available presets:', presetParams);
      throw new Error(`No preset parameter found for bin step ${BIN_STEP}`);
    }

    const baseFactor = new BN(presetParam.account.baseFactor);
    // baseFeePowerFactor is a small number (u8), not the same as baseFactor!
    const baseFeePowerFactor = new BN(presetParam.account.baseFeePowerFactor);
    const presetParamPubkey = presetParam.publicKey; // The account address we'll pass to SDK

    console.log(`✅ Found preset:`);
    console.log(`   Preset Account: ${presetParamPubkey.toBase58()}`);
    console.log(`   baseFactor: ${baseFactor.toString()}`);
    console.log(`   baseFeePowerFactor: ${baseFeePowerFactor.toString()}\n`);

    // Check if pool already exists
    console.log('Checking if pool exists...');
    const existingPoolPubkey = await DLMM.getPairPubkeyIfExists(
      connection,
      tokenMintA,
      tokenMintB,
      binStepBN,
      baseFactor,
      baseFeePowerFactor,
      { cluster: 'devnet' }
    );

    if (existingPoolPubkey) {
      console.log(`✅ Pool already exists: ${existingPoolPubkey.toBase58()}\n`);
      console.log('Loading existing pool...');

      const dlmmPool = await DLMM.create(connection, existingPoolPubkey);

      console.log('═'.repeat(60));
      console.log('🎉 POOL FOUND!');
      console.log('═'.repeat(60));
      console.log(`\n📍 Pool Address: ${existingPoolPubkey.toBase58()}`);
      console.log(`\n🌐 View on Meteora Devnet: https://devnet.meteora.ag/pools/${existingPoolPubkey.toBase58()}`);
      console.log(`\n✅ Jupiter can now route swaps through this pool!`);

      console.log('\n📝 Configure reflections:');
      console.log(`   MINT_ADDRESS=${TOKEN_A}`);
      console.log(`   REWARD_TOKEN_MINT=${TOKEN_B}`);
      console.log('   SWAP_SLIPPAGE_BPS=500\n');
      console.log('═'.repeat(60));

      return existingPoolPubkey;
    }

    // Create new pool
    console.log('📝 Pool does not exist, creating new pool...\n');

    const activeBinIdRaw = DLMM.getBinIdFromPrice(INITIAL_PRICE, BIN_STEP, false); // Returns number
    const activeBinId = new BN(activeBinIdRaw); // Convert to BN for SDK
    console.log(`   Active Bin ID: ${activeBinId.toString()}`);
    console.log(`   Bin Step: ${BIN_STEP}`);
    console.log(`   Initial Price: ${INITIAL_PRICE}\n`);

    // Pre-create token accounts to avoid SDK internal issues
    console.log('Pre-creating token accounts...');
    try {
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        tokenMintA,
        wallet.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log('  ✅ Token A account ready');

      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        tokenMintB,
        wallet.publicKey,
        false,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
      );
      console.log('  ✅ Token B account ready\n');
    } catch (e) {
      console.log('  ℹ️  Token accounts may already exist\n');
    }

    // Create LB pair using preset parameter (use createLbPair, not createLbPair2)
    console.log('Creating LB pair with preset parameters...');
    console.log(`   Using baseFactor: ${baseFactor.toString()}`);
    console.log(`   Using preset parameter: ${presetParamPubkey.toBase58()}\n`);

    const createPoolTx = await DLMM.createLbPair(
      connection,
      wallet.publicKey, // funder
      tokenMintA,
      tokenMintB,
      binStepBN, // bin step as BN
      baseFactor, // base factor as BN (not fetched from account)
      presetParamPubkey, // preset parameter account address
      activeBinId,
      { cluster: 'devnet' }
    );

    console.log('Checking transaction object...');
    console.log('Transaction type:', typeof createPoolTx);
    console.log('Has recentBlockhash:', !!createPoolTx.recentBlockhash);
    console.log('Number of instructions:', createPoolTx.instructions?.length || 0);

    // Check each instruction
    if (createPoolTx.instructions) {
      createPoolTx.instructions.forEach((ix, i) => {
        console.log(`Instruction ${i}:`, {
          programId: ix.programId?.toBase58(),
          keysCount: ix.keys?.length || 0,
          hasData: !!ix.data
        });
        // Check for undefined keys
        if (ix.keys) {
          console.log('   Keys:');
          ix.keys.forEach((key, j) => {
            if (!key.pubkey) {
              console.error(`   ❌ Key ${j}: UNDEFINED`);
            } else {
              console.log(`   ${j}: ${key.pubkey.toBase58()} (${key.isSigner ? 'signer' : 'non-signer'})`);
            }
          });
        }
      });
    }

    // Get recent blockhash if not set
    if (!createPoolTx.recentBlockhash) {
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      createPoolTx.recentBlockhash = blockhash;
      createPoolTx.feePayer = wallet.publicKey;
      console.log('   Set blockhash and fee payer');
    }

    console.log('Checking signer...');
    console.log('Wallet type:', typeof wallet);
    console.log('Is Keypair:', wallet instanceof Keypair);
    console.log('Has publicKey:', !!wallet.publicKey);
    console.log('Has secretKey:', !!wallet.secretKey);
    console.log('PublicKey:', wallet.publicKey?.toBase58());
    console.log('FeePayer:', createPoolTx.feePayer?.toBase58());

    // Check for required signers
    console.log('Signatures needed:', createPoolTx.signatures.length);
    createPoolTx.signatures.forEach((sig, i) => {
      console.log(`   Signature ${i}:`, sig.publicKey?.toBase58() || 'UNDEFINED');
    });

    console.log('Signing and sending transaction...');
    try {
      createPoolTx.partialSign(wallet);
    } catch (e) {
      console.error('Partial sign failed:', e.message);
      throw e;
    }

    const createSignature = await connection.sendRawTransaction(createPoolTx.serialize());
    console.log(`   Create Pool Tx: ${createSignature}`);

    console.log('Waiting for confirmation...');
    await connection.confirmTransaction(createSignature, 'confirmed');
    console.log(`✅ Pool created!\n`);

    // Get the pool address
    const poolPubkey = await DLMM.getPairPubkeyIfExists(
      connection,
      tokenMintA,
      tokenMintB,
      binStepBN,
      baseFactor,
      baseFeePowerFactor,
      { cluster: 'devnet' }
    );

    if (!poolPubkey) {
      throw new Error('Pool was created but could not be found');
    }

    console.log(`📍 Pool Address: ${poolPubkey.toBase58()}\n`);

    // Load the pool for adding liquidity
    const dlmmPool = await DLMM.create(connection, poolPubkey);

    // Add initial liquidity
    console.log('💰 Adding Initial Liquidity...\n');

    const activeBin = await dlmmPool.getActiveBin();
    const TOTAL_RANGE_INTERVAL = 10; // 10 bins on each side

    const minBinId = activeBin.binId - TOTAL_RANGE_INTERVAL;
    const maxBinId = activeBin.binId + TOTAL_RANGE_INTERVAL;

    console.log(`   Min Bin: ${minBinId}`);
    console.log(`   Active Bin: ${activeBin.binId}`);
    console.log(`   Max Bin: ${maxBinId}`);

    const newBalancePosition = new BN(LIQUIDITY_AMOUNT * 10 ** 9);

    const addLiquidityTx = await dlmmPool.addLiquidityByStrategy({
      positionPubKey: wallet.publicKey,
      user: wallet.publicKey,
      totalXAmount: newBalancePosition,
      totalYAmount: newBalancePosition,
      strategy: {
        maxBinId,
        minBinId,
        strategyType: 0, // Spot
      },
    });

    console.log('\nSigning and sending liquidity transaction...');
    for (const tx of addLiquidityTx) {
      tx.sign([wallet]);
      const sig = await connection.sendRawTransaction(tx.serialize());
      console.log(`   Add Liquidity Tx: ${sig}`);
      await connection.confirmTransaction(sig, 'confirmed');
    }

    console.log(`\n✅ Liquidity added successfully!\n`);

    // Summary
    console.log('═'.repeat(60));
    console.log('🎉 METEORA DLMM POOL CREATED!');
    console.log('═'.repeat(60));
    console.log(`\n📍 Pool Address: ${poolPubkey.toBase58()}`);
    console.log(`💧 Liquidity: ${LIQUIDITY_AMOUNT.toLocaleString()} of each token`);
    console.log(`\n🌐 View on Meteora Devnet: https://devnet.meteora.ag/pools/${poolPubkey.toBase58()}`);
    console.log(`\n✅ Jupiter can now route swaps through this pool!`);

    console.log('\n📝 Configure reflections:');
    console.log(`   MINT_ADDRESS=${TOKEN_A}`);
    console.log(`   REWARD_TOKEN_MINT=${TOKEN_B}`);
    console.log('   SWAP_SLIPPAGE_BPS=500\n');

    console.log('🚀 Run distribution:');
    console.log('   npm run distribute:reflections\n');
    console.log('═'.repeat(60));

    return poolPubkey;

  } catch (error) {
    console.error('\n❌ Pool creation failed:', error);
    console.error(error.stack);

    console.log('\n💡 Troubleshooting:');
    console.log('   - Check SOL balance: solana balance --url devnet');
    console.log('   - Airdrop SOL: solana airdrop 2 --url devnet');
    console.log('   - Check Meteora docs: https://docs.meteora.ag/\n');

    process.exit(1);
  }
}

main();
