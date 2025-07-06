import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PublicKey } from '@solana/web3.js';
import { SolanaTokenService, TokenConfig } from '@/lib/solana';
import { IPFSService } from '@/lib/ipfs';
import { TokenFormData } from '@/components/TokenForm';
import { Token22Extension } from '@/components/Token22Extensions';
import { useToast } from '@/hooks/use-toast';

export interface MintingStatus {
  step: 'idle' | 'uploading-image' | 'uploading-metadata' | 'creating-token' | 'success' | 'error';
  message: string;
  txSignature?: string;
  mintAddress?: string;
}

export function useTokenMinting(network: WalletAdapterNetwork, customRpcUrl?: string) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<MintingStatus>({
    step: 'idle',
    message: 'Ready to mint',
  });

  const mintToken = useCallback(async (
    formData: TokenFormData,
    extensions: Token22Extension[]
  ) => {
    if (!publicKey || !signTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to mint tokens",
        variant: "destructive",
      });
      return;
    }

    try {
      setStatus({ step: 'uploading-image', message: 'Uploading image to IPFS...' });

      const ipfsService = new IPFSService(); // Use your IPFS node URL here
      const tokenService = new SolanaTokenService(network, customRpcUrl);

      let metadataUri = '';

      // Upload to IPFS if image provided
      if (formData.imageFile) {
        metadataUri = await ipfsService.createAndUploadTokenMetadata(
          formData.name,
          formData.symbol,
          formData.description,
          formData.imageFile,
          undefined,
          formData.maxWalletPercentage ? parseFloat(formData.maxWalletPercentage) : undefined
        );
        
        setStatus({ step: 'uploading-metadata', message: 'Metadata uploaded to IPFS' });
      }

      // Build token configuration
      const enabledExtensions = extensions.filter(ext => ext.enabled);
      
      const tokenConfig: TokenConfig = {
        name: formData.name,
        symbol: formData.symbol,
        decimals: parseInt(formData.decimals),
        supply: parseInt(formData.supply),
        maxWalletPercentage: formData.maxWalletPercentage ? parseFloat(formData.maxWalletPercentage) : undefined,
        authorities: {
          mintAuthority: publicKey,
          freezeAuthority: publicKey, // Default to wallet, can be revoked later
          updateAuthority: publicKey,
        },
        extensions: {},
        metadataUri,
      };

      // Configure extensions
      enabledExtensions.forEach(ext => {
        switch (ext.id) {
          case 'transfer-fee':
            tokenConfig.extensions.transferFee = {
              feeBasisPoints: 250, // 2.5%
              maxFee: BigInt(1000 * Math.pow(10, tokenConfig.decimals)), // Max 1000 tokens
              transferFeeConfigAuthority: publicKey,
              withdrawWithheldAuthority: publicKey,
            };
            break;
          
          case 'interest-bearing':
            tokenConfig.extensions.interestBearing = {
              rateAuthority: publicKey,
              rate: 500, // 5% APR in basis points
            };
            break;
          
          case 'permanent-delegate':
            tokenConfig.extensions.permanentDelegate = {
              delegate: publicKey,
            };
            break;
          
          case 'non-transferable':
            tokenConfig.extensions.nonTransferrable = true;
            break;
          
          case 'mint-close-authority':
            tokenConfig.extensions.mintCloseAuthority = {
              closeAuthority: publicKey,
            };
            break;
        }
      });

      setStatus({ step: 'creating-token', message: 'Creating token on Solana...' });

      // Create the token
      const result = await tokenService.createMintWithExtensions(
        tokenConfig,
        publicKey,
        signTransaction
      );

      const explorerUrl = `https://explorer.solana.com/address/${result.mintKeypair.publicKey.toBase58()}?cluster=${network}`;

      setStatus({
        step: 'success',
        message: 'Token created successfully!',
        txSignature: result.signature,
        mintAddress: result.mintKeypair.publicKey.toBase58(),
      });

      toast({
        title: "🎉 Token Created Successfully!",
        description: `Mint: ${result.mintKeypair.publicKey.toBase58().slice(0, 8)}... | View on Explorer: https://explorer.solana.com/address/${result.mintKeypair.publicKey.toBase58()}?cluster=${network}`,
      });

    } catch (error) {
      console.error('❌ Token minting failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setStatus({
        step: 'error',
        message: `Failed to create token: ${errorMessage}`,
      });

      toast({
        title: "Token Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [publicKey, signTransaction, network, customRpcUrl, toast]);

  const resetStatus = useCallback(() => {
    setStatus({ step: 'idle', message: 'Ready to mint' });
  }, []);

  return {
    mintToken,
    status,
    resetStatus,
    isLoading: ['uploading-image', 'uploading-metadata', 'creating-token'].includes(status.step),
  };
}