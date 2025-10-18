#!/usr/bin/env node
/**
 * Create a fresh Token-2022 for testing Meteora pool creation
 */
import { Connection, Keypair } from '@solana/web3.js';
import { createMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Load wallet
const keypairPath = process.env.HOME + '/.config/solana/id.json';
const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

console.log('🔨 Creating fresh Token-2022 for Meteora pool test...\n');

try {
  const mint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    wallet.publicKey,
    9,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log('✅ Token-2022 created!');
  console.log(`   Mint: ${mint.toBase58()}\n`);
  
  // Write to file for API test
  fs.writeFileSync('/tmp/meteora-test-mint.txt', mint.toBase58());
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
