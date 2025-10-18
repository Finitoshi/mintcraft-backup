#!/usr/bin/env node
/**
 * Add Liquidity to Existing Meteora DLMM Pool
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import pkg from '@meteora-ag/dlmm';
const { default: DLMM } = pkg;
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import BN from 'bn.js';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const POOL_ADDRESS = 'DTja6dMgciDJGoKRAYeHMDh2gxwr7LZsmPYCwnxHrxfa';
const LIQUIDITY_AMOUNT = 50_000; // 50k of each token

console.log('💧 Adding Liquidity to Meteora DLMM Pool\n');
console.log('═'.repeat(60));

function loadKeypair(path) {
  const secretKey = JSON.parse(readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function main() {
  try {
    console.log('Loading wallet...');
    const walletPath = process.env.TREASURY_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
    const wallet = loadKeypair(walletPath);
    console.log(`✅ Wallet: ${wallet.publicKey.toBase58()}\n`);

    const connection = new Connection(DEVNET_RPC, 'confirmed');

    console.log(`Loading pool ${POOL_ADDRESS}...`);
    const poolPubkey = new PublicKey(POOL_ADDRESS);
    const dlmmPool = await DLMM.create(connection, poolPubkey);
    console.log('✅ Pool loaded\n');

    console.log('💰 Adding Liquidity...\n');

    const activeBin = await dlmmPool.getActiveBin();
    const TOTAL_RANGE_INTERVAL = 10; // 10 bins on each side

    const minBinId = activeBin.binId - TOTAL_RANGE_INTERVAL;
    const maxBinId = activeBin.binId + TOTAL_RANGE_INTERVAL;

    console.log(`   Min Bin: ${minBinId}`);
    console.log(`   Active Bin: ${activeBin.binId}`);
    console.log(`   Max Bin: ${maxBinId}`);
    console.log(`   Amount: ${LIQUIDITY_AMOUNT.toLocaleString()} tokens each\n`);

    // Prepare liquidity amounts
    const inputAmount = new BN(LIQUIDITY_AMOUNT * 10 ** 9);

    // Use increaseLiquidityQuoteByInputTokenWithParams from the SDK
    const { default: DLMM: DLMM2 } = pkg;
    const { increaseLiquidityQuoteByInputTokenWithParams } = DLMM2;

    const dlmmData = await dlmmPool.refetchStates();
    const poolData = await dlmmPool.getWhirlpoolData();

    // Calculate the exact amounts needed
    const quote = increaseLiquidityQuoteByInputTokenWithParams({
      tokenMintA: poolData.tokenMintX,
      tokenMintB: poolData.tokenMintY,
      sqrtPrice: poolData.sqrtPrice,
      tickCurrentIndex: poolData.activeId,
      tickLowerIndex: minBinId,
      tickUpperIndex: maxBinId,
      inputTokenMint: poolData.tokenMintX,
      inputTokenAmount: inputAmount,
      slippageTolerance: { numerator: new BN(1), denominator: new BN(100) }, // 1%
    });

    console.log(`Creating new position and adding liquidity...\n`);

    // Open position (creates position NFT and adds liquidity)
    const { positionMint, tx: openPositionTx } = await dlmmPool.openPosition(
      minBinId,
      maxBinId,
      quote
    );

    console.log(`Position NFT will be: ${positionMint.toBase58()}`);
    console.log('Signing and sending transaction...');

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    openPositionTx.recentBlockhash = blockhash;
    openPositionTx.feePayer = wallet.publicKey;

    openPositionTx.partialSign(wallet);
    const sig = await connection.sendRawTransaction(openPositionTx.serialize());
    console.log(`   Tx: ${sig}`);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log(`   ✅ Confirmed`);

    console.log(`\n✅ Liquidity added successfully!\n`);

    console.log('═'.repeat(60));
    console.log('🎉 LIQUIDITY ADDED!');
    console.log('═'.repeat(60));
    console.log(`\n📍 Pool: ${POOL_ADDRESS}`);
    console.log(`\n🌐 View: https://devnet.meteora.ag/pools/${POOL_ADDRESS}`);
    console.log('\n═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
