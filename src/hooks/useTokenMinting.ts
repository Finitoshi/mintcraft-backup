import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PublicKey, Transaction } from '@solana/web3.js';
import { SolanaTokenService, TokenConfig } from '@/lib/solana';
import { TokenFormData } from '@/components/TokenForm';
import { Token22Extension } from '@/components/Token22Extensions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
      let metadataUri = '';

      // Upload to IPFS via edge function if image provided
      if (formData.imageFile) {
        setStatus({ step: 'uploading-image', message: 'Uploading image to IPFS...' });

        // Convert file to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
          };
        });
        reader.readAsDataURL(formData.imageFile);
        const imageData = await base64Promise;

        const { data: ipfsResult, error: ipfsError } = await supabase.functions.invoke('upload-to-ipfs', {
          body: {
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description,
            imageFile: {
              name: formData.imageFile.name,
              type: formData.imageFile.type,
              data: imageData,
            },
            maxWalletPercentage: formData.maxWalletPercentage ? parseFloat(formData.maxWalletPercentage) : undefined,
          },
        });

        if (ipfsError || !ipfsResult?.success) {
          throw new Error(ipfsError?.message || ipfsResult?.error || 'IPFS upload failed');
        }

        metadataUri = ipfsResult.metadataUri;
        setStatus({ step: 'uploading-metadata', message: 'Metadata uploaded to IPFS' });
      }

      // Build token configuration
      const enabledExtensions = extensions.filter(ext => ext.enabled);
      
      const tokenConfig = {
        name: formData.name,
        symbol: formData.symbol,
        decimals: parseInt(formData.decimals),
        supply: parseInt(formData.supply),
        metadataUri,
        extensions: {} as any,
      };

      // Configure extensions
      enabledExtensions.forEach(ext => {
        switch (ext.id) {
          case 'transfer-fee':
            tokenConfig.extensions.transferFee = {
              feeBasisPoints: 250, // 2.5%
              maxFee: BigInt(1000 * Math.pow(10, tokenConfig.decimals)), // Max 1000 tokens
              transferFeeConfigAuthority: publicKey.toBase58(),
              withdrawWithheldAuthority: publicKey.toBase58(),
            };
            break;
          
          case 'interest-bearing':
            tokenConfig.extensions.interestBearing = {
              rateAuthority: publicKey.toBase58(),
              rate: 500, // 5% APR in basis points
            };
            break;
          
          case 'permanent-delegate':
            tokenConfig.extensions.permanentDelegate = {
              delegate: publicKey.toBase58(),
            };
            break;
          
          case 'non-transferable':
            tokenConfig.extensions.nonTransferrable = true;
            break;
          
          case 'mint-close-authority':
            tokenConfig.extensions.mintCloseAuthority = {
              closeAuthority: publicKey.toBase58(),
            };
            break;
        }
      });

      setStatus({ step: 'creating-token', message: 'Creating token on Solana...' });

      // For now, create a placeholder transaction that the edge function can process
      // In a full implementation, you'd build the actual transaction here
      const placeholderTransaction = new Transaction();
      const serializedTransaction = placeholderTransaction.serialize({ requireAllSignatures: false });

      const { data: mintResult, error: mintError } = await supabase.functions.invoke('mint-token', {
        body: {
          tokenConfig,
          userPublicKey: publicKey.toBase58(),
          signedTransaction: Buffer.from(serializedTransaction).toString('base64'),
          network,
          customRpcUrl,
        },
      });

      if (mintError || !mintResult?.success) {
        throw new Error(mintError?.message || mintResult?.error || 'Token minting failed');
      }

      setStatus({
        step: 'success',
        message: 'Token created successfully!',
        txSignature: mintResult.signature,
        mintAddress: mintResult.mintAddress,
      });

      toast({
        title: "🎉 Token Created Successfully!",
        description: `Mint: ${mintResult.mintAddress.slice(0, 8)}... | View on Explorer: https://explorer.solana.com/address/${mintResult.mintAddress}?cluster=${network}`,
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