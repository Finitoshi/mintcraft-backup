import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { TokenConfig, TokenCreationResult } from './types';
import { SolanaConnectionManager } from './connection';
import { TransactionBuilder } from './transaction-builder';

export class SolanaTokenService {
  private connectionManager: SolanaConnectionManager;
  private transactionBuilder: TransactionBuilder;

  constructor(network: WalletAdapterNetwork, customRpcUrl?: string) {
    this.connectionManager = new SolanaConnectionManager(network, customRpcUrl);
    this.transactionBuilder = new TransactionBuilder();
  }

  /**
   * Create mint account with Token-2022 extensions and initial supply
   */
  async createMintWithExtensions(
    config: TokenConfig,
    payerWallet: PublicKey,
    signTransaction: (transaction: Transaction) => Promise<Transaction>
  ): Promise<TokenCreationResult> {
    console.log('🔨 Starting token creation process...', config);

    // Validate SOL balance first
    await this.connectionManager.validateTransaction(payerWallet);

    const mintKeypair = Keypair.generate();
    const connection = this.connectionManager.getConnection();

    // Build transaction
    const { transaction, associatedTokenAccount } = await this.transactionBuilder.buildTokenCreationTransaction(
      connection,
      config,
      payerWallet,
      mintKeypair
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerWallet;

    // Sign with mint keypair
    transaction.partialSign(mintKeypair);

    console.log('📝 Transaction ready for wallet signing...');
    console.log('🔢 Instructions:', transaction.instructions.length);

    // Have wallet sign the transaction
    const signedTransaction = await signTransaction(transaction);

    // Send transaction
    console.log('🚀 Sending transaction...');
    const signature = await connection.sendRawTransaction(signedTransaction.serialize());

    // Confirm transaction
    console.log('⏳ Confirming transaction...', signature);
    await connection.confirmTransaction(signature, 'confirmed');

    const network = this.connectionManager.getNetwork();
    console.log('✅ Token created successfully!');
    console.log('🪙 Mint Address:', mintKeypair.publicKey.toBase58());
    console.log('🔍 Explorer:', `https://explorer.solana.com/address/${mintKeypair.publicKey.toBase58()}?cluster=${network}`);

    return {
      mintKeypair,
      signature,
      associatedTokenAccount,
    };
  }
}