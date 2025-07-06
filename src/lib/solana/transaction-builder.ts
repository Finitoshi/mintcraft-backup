import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { TokenConfig } from './types';
import { TokenExtensionHandler } from './extensions';

export class TransactionBuilder {
  private extensionHandler: TokenExtensionHandler;

  constructor() {
    this.extensionHandler = new TokenExtensionHandler();
  }

  /**
   * Build complete transaction for token creation with extensions
   */
  async buildTokenCreationTransaction(
    connection: Connection,
    config: TokenConfig,
    payerWallet: PublicKey,
    mintKeypair: Keypair
  ): Promise<{ transaction: Transaction; associatedTokenAccount: PublicKey }> {
    const mintSpace = this.extensionHandler.calculateMintSpace(config.extensions);
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintSpace);

    // Generate associated token account for initial minting
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      payerWallet,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log('📊 Mint account details:', {
      address: mintKeypair.publicKey.toBase58(),
      space: mintSpace,
      rent: `${mintLamports / 1e9} SOL`,
      associatedTokenAccount: associatedTokenAccount.toBase58(),
    });

    const transaction = new Transaction();

    // Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payerWallet,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintSpace,
        lamports: mintLamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );

    // Add extension instructions BEFORE InitializeMint
    const extensionInstructions = this.extensionHandler.createExtensionInstructions(
      mintKeypair.publicKey,
      config.extensions
    );
    transaction.add(...extensionInstructions);

    // Initialize the mint (MUST be last)
    console.log('🎯 Adding Initialize Mint instruction...');
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        config.decimals,
        config.authorities.mintAuthority,
        config.authorities.freezeAuthority,
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Create associated token account for initial minting
    console.log('🏦 Adding Associated Token Account instruction...');
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payerWallet,
        associatedTokenAccount,
        payerWallet,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // Mint initial supply to creator
    if (config.supply > 0) {
      console.log('💰 Adding Mint To instruction for initial supply...');
      const mintAmount = BigInt(config.supply) * BigInt(Math.pow(10, config.decimals));
      transaction.add(
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAccount,
          payerWallet,
          mintAmount,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    return { transaction, associatedTokenAccount };
  }
}