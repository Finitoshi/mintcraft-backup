import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export class SolanaConnectionManager {
  private connection: Connection;
  private network: WalletAdapterNetwork;

  constructor(network: WalletAdapterNetwork, customRpcUrl?: string) {
    this.network = network;
    const endpoint = customRpcUrl || clusterApiUrl(network);
    this.connection = new Connection(endpoint, 'confirmed');
  }

  getConnection(): Connection {
    return this.connection;
  }

  getNetwork(): WalletAdapterNetwork {
    return this.network;
  }

  /**
   * Check SOL balance and validate transaction requirements
   */
  async validateTransaction(payerWallet: PublicKey): Promise<void> {
    const balance = await this.connection.getBalance(payerWallet);
    const minRequired = 0.01 * LAMPORTS_PER_SOL; // Minimum 0.01 SOL required
    
    if (balance < minRequired) {
      throw new Error(`Insufficient SOL balance. You have ${balance / LAMPORTS_PER_SOL} SOL, but need at least 0.01 SOL for transaction fees. Please fund your wallet from a Devnet faucet.`);
    }
    
    console.log(`✅ SOL balance check passed: ${balance / LAMPORTS_PER_SOL} SOL`);
  }
}