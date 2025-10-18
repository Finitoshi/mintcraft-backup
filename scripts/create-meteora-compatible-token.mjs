#!/usr/bin/env node
/**
 * Create a Meteora-compatible Token-2022 (no freeze authority)
 */
import { Connection, Keypair } from '@solana/web3.js';
import { createMint, mintTo, getOrCreateAssociatedTokenAccount, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const keypairPath = process.env.HOME + '/.config/solana/id.json';
const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const wallet = Keypair.fromSecretKey(new Uint8Array(secretKey));

console.log('🔨 Creating Meteora-compatible Token-2022 (no freeze authority)...\n');

try {
  // Create mint WITHOUT freeze authority
  const mint = await createMint(
    connection,
    wallet,
    wallet.publicKey,  // mint authority
    null,              // NO freeze authority (this is the key!)
    9,                 // decimals
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  console.log('✅ Token-2022 created!');
  console.log(`   Mint: ${mint.toBase58()}\n`);
  
  // Create token account
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey,
    false,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  
  console.log('✅ Token account created');
  console.log(`   Address: ${tokenAccount.address.toBase58()}\n`);
  
  // Mint tokens
  await mintTo(
    connection,
    wallet,
    mint,
    tokenAccount.address,
    wallet.publicKey,
    100_000_000_000_000, // 100,000 tokens
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  
  console.log('✅ Minted 100,000 tokens');
  console.log('\n✅ Token ready for Meteora pool creation!');
  console.log(`\nTest with API:`);
  console.log(`curl -X POST http://localhost:3001/api/create-meteora-pool -H "Content-Type: application/json" -d '{"tokenMint":"${mint.toBase58()}","network":"devnet"}'`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
