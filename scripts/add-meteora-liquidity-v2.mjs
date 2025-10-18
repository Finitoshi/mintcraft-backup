#!/usr/bin/env node
/**
 * Add Liquidity to Meteora Pool - Simplified Version
 * Uses the same pattern as pool creation
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
const LIQUIDITY_AMOUNT = 50_000;

console.log('💧 Adding Liquidity to Meteora Pool\n');
console.log('═'.repeat(60));

function loadKeypair(path) {
  const secretKey = JSON.parse(readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function main() {
  try {
    const walletPath = process.env.TREASURY_KEYPAIR_PATH || join(homedir(), '.config/solana/id.json');
    const wallet = loadKeypair(walletPath);
    console.log(`Wallet: ${wallet.publicKey.toBase58()}\n`);

    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const poolPubkey = new PublicKey(POOL_ADDRESS);

    console.log('Loading pool...');
    const dlmmPool = await DLMM.create(connection, poolPubkey);
    console.log('✅ Pool loaded\n');

    console.log('Getting active bin...');
    const activeBin = await dlmmPool.getActiveBin();
    const TOTAL_RANGE_INTERVAL = 10;

    const minBinId = activeBin.binId - TOTAL_RANGE_INTERVAL;
    const maxBinId = activeBin.binId + TOTAL_RANGE_INTERVAL;

    console.log(`   Min Bin: ${minBinId}`);
    console.log(`   Active Bin: ${activeBin.binId}`);
    console.log(`   Max Bin: ${maxBinId}\n`);

    console.log('Opening position and adding liquidity...');

    // This will create a position NFT and add liquidity
    const { positionMint, tx: openPositionTx } = await dlmmPool.openPosition(
      minBinId,
      maxBinId,
      {
        strategy: {
          maxBinId,
          minBinId,
          strategyType: 0, // Spot distribution
        },
        totalXAmount: new BN(LIQUIDITY_AMOUNT * 10 ** 9),
        totalYAmount: new BN(LIQUIDITY_AMOUNT * 10 ** 9),
      }
    );

    console.log(`Position NFT: ${positionMint.toBase58()}\n`);
    console.log('Signing and sending transaction...');

    openPositionTx.sign([wallet]);
    const sig = await connection.sendRawTransaction(openPositionTx.serialize());
    console.log(`   Tx: ${sig}`);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('   ✅ Confirmed\n');

    console.log('═'.repeat(60));
    console.log('✅ LIQUIDITY ADDED SUCCESSFULLY!');
    console.log('═'.repeat(60));
    console.log(`\n📍 Pool: ${POOL_ADDRESS}`);
    console.log(`\n🌐 View: https://devnet.meteora.ag/pools/${POOL_ADDRESS}\n`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    if (error.logs) console.error('Logs:', error.logs);
    process.exit(1);
  }
}

main();
