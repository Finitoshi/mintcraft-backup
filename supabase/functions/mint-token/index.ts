import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, Keypair } from "npm:@solana/web3.js@1.98.2";
import { 
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializeMintCloseAuthorityInstruction,
  getMintLen,
  ExtensionType,
  mintTo,
  createAssociatedTokenAccountIdempotent,
  getAssociatedTokenAddressSync,
} from "npm:@solana/spl-token@0.4.13";
import { createCreateMetadataAccountV3Instruction } from "npm:@metaplex-foundation/mpl-token-metadata@3.2.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenMintRequest {
  tokenConfig: {
    name: string;
    symbol: string;
    decimals: number;
    supply: number;
    metadataUri?: string;
    extensions: {
      transferFee?: {
        feeBasisPoints: number;
        maxFee: bigint;
        transferFeeConfigAuthority: string;
        withdrawWithheldAuthority: string;
      };
      interestBearing?: {
        rateAuthority: string;
        rate: number;
      };
      permanentDelegate?: {
        delegate: string;
      };
      nonTransferrable?: boolean;
      mintCloseAuthority?: {
        closeAuthority: string;
      };
    };
  };
  userPublicKey: string;
  signedTransaction: string; // Base64 encoded signed transaction
  network: string;
  customRpcUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenConfig, userPublicKey, signedTransaction, network, customRpcUrl }: TokenMintRequest = await req.json();

    console.log('🔥 Token minting starting for:', tokenConfig.name);

    // Set up connection
    const rpcUrl = customRpcUrl || (network === 'mainnet-beta' 
      ? 'https://api.mainnet-beta.solana.com' 
      : 'https://api.devnet.solana.com');
    
    const connection = new Connection(rpcUrl, 'confirmed');

    // Deserialize the signed transaction
    const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));
    
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('✅ Token minting completed:', signature);

    // Extract mint address from transaction (assuming it's the first account that's not the user)
    const mintAddress = transaction.instructions[0]?.keys?.[0]?.pubkey?.toBase58() || '';

    return new Response(
      JSON.stringify({
        success: true,
        signature,
        mintAddress,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('❌ Token minting failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});