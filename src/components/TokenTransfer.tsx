import { useCallback, useMemo, useState } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  createTransferCheckedWithTransferHookInstruction,
  getAssociatedTokenAddressSync,
  getExtensionTypes,
  getMint,
  ExtensionType,
} from '@solana/spl-token';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  MAX_WALLET_BPS_CAP,
  createUpdateMaxWalletConfigInstruction,
  getMaxWalletConfigPda,
  parseMaxWalletConfig,
} from '@/lib/solana/max-wallet';
import { cn } from '@/lib/utils';
import {
  convertTokenAmountToBaseUnits,
  formatTokenAmountFromBaseUnits,
} from '@/lib/solana/amount';

interface MintDetails {
  mint: PublicKey;
  decimals: number;
  supply: bigint;
  maxWalletBps?: number;
  configAuthority?: PublicKey;
  hasTransferHook: boolean;
}

export function TokenTransfer() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { toast } = useToast();

  const [mintAddress, setMintAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [newCap, setNewCap] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingCap, setIsUpdatingCap] = useState(false);
  const [mintDetails, setMintDetails] = useState<MintDetails | null>(null);

  const maxWalletDisplay = useMemo(() => {
    if (!mintDetails?.maxWalletBps) return null;
    return mintDetails.maxWalletBps / 100;
  }, [mintDetails]);

  const loadMintDetails = useCallback(async () => {
    if (!mintAddress.trim()) {
      toast({
        title: 'Mint address required',
        description: 'Enter a mint address before loading details',
        variant: 'destructive',
      });
      return;
    }

    try {
      const mint = new PublicKey(mintAddress.trim());
      const mintInfo = await getMint(connection, mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
      const extensionTypes = getExtensionTypes(mintInfo.tlvData);
      const hasTransferHook = extensionTypes.includes(ExtensionType.TransferHook);

      const [configPda] = getMaxWalletConfigPda(mint);
      const configAccount = await connection.getAccountInfo(configPda, 'confirmed');

      let maxWalletBps: number | undefined;
      let configAuthority: PublicKey | undefined;

      if (configAccount) {
        const parsed = parseMaxWalletConfig(Buffer.from(configAccount.data));
        maxWalletBps = parsed.maxWalletBps;
        configAuthority = parsed.authority;
      }

      setMintDetails({
        mint,
        decimals: mintInfo.decimals,
        supply: mintInfo.supply,
        maxWalletBps,
        configAuthority,
        hasTransferHook,
      });

      toast({
        title: 'Mint loaded',
        description: 'Mint information fetched successfully',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Failed to load mint',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      setMintDetails(null);
    }
  }, [connection, mintAddress, toast]);

  const handleTransfer = useCallback(async () => {
    if (!publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Connect your wallet to transfer tokens',
        variant: 'destructive',
      });
      return;
    }

    if (!mintDetails) {
      toast({
        title: 'Mint not loaded',
        description: 'Load mint details before transferring',
        variant: 'destructive',
      });
      return;
    }

    let transaction: Transaction | null = null;
    let signature: string | undefined;

    try {
      setIsLoading(true);
      const mint = mintDetails.mint;
      const destination = new PublicKey(destinationAddress.trim());

      const sourceAta = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const destinationAta = getAssociatedTokenAddressSync(
        mint,
        destination,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      let amountInBaseUnits: bigint;
      try {
        amountInBaseUnits = convertTokenAmountToBaseUnits(amount, mintDetails.decimals);
      } catch (conversionError) {
        const message =
          conversionError instanceof Error
            ? conversionError.message
            : 'Invalid transfer amount';
        toast({
          title: 'Invalid amount',
          description: message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const instructions = [] as Transaction['instructions'];

      const destinationAccountInfo = await connection.getAccountInfo(destinationAta, 'confirmed');
      if (!destinationAccountInfo) {
        instructions.push(
          createAssociatedTokenAccountIdempotentInstruction(
            publicKey,
            destinationAta,
            destination,
            mint,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      const transferInstruction = mintDetails.hasTransferHook
        ? await createTransferCheckedWithTransferHookInstruction(
            connection,
            sourceAta,
            mint,
            destinationAta,
            publicKey,
            amountInBaseUnits,
            mintDetails.decimals,
            [],
            'confirmed',
            TOKEN_2022_PROGRAM_ID
          )
        : createTransferCheckedInstruction(
            sourceAta,
            mint,
            destinationAta,
            publicKey,
            amountInBaseUnits,
            mintDetails.decimals,
            [],
            TOKEN_2022_PROGRAM_ID
          );

      instructions.push(transferInstruction);

      transaction = new Transaction().add(...instructions);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

      signature = await sendTransaction(transaction, connection, { skipPreflight: false });
      await connection.confirmTransaction(signature, 'confirmed');

      toast({
        title: 'Transfer submitted',
        description: `Signature: ${signature}`,
      });

      setAmount('');
      setDestinationAddress('');
    } catch (error) {
      console.error(error);
      try {
        if (transaction) {
          const simulationResult = await connection.simulateTransaction(transaction);
          console.error('🧪 Simulation err', simulationResult.value.err);
          if (simulationResult.value.logs) {
            simulationResult.value.logs.forEach((log) => console.error('🧪 Log:', log));
          }
        }
        if (signature) {
          console.error('🧪 Failed transaction signature (partial)', signature);
        }
      } catch (simulationError) {
        console.error('Failed to simulate transaction', simulationError);
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error ?? 'Unknown error');
      const description = errorMessage.includes('0x65')
        ? 'Transfer would exceed the max wallet cap for the recipient'
        : errorMessage;
      toast({
        title: 'Transfer failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [amount, connection, destinationAddress, mintDetails, publicKey, sendTransaction, toast]);

  const handleUpdateCap = useCallback(async () => {
    if (!publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Connect your wallet to update the cap',
        variant: 'destructive',
      });
      return;
    }

    if (!mintDetails) {
      toast({
        title: 'Mint not loaded',
        description: 'Load mint details before updating the cap',
        variant: 'destructive',
      });
      return;
    }

    if (!newCap.trim()) {
      toast({
        title: 'Enter a cap percentage',
        description: 'Provide a percentage before updating',
        variant: 'destructive',
      });
      return;
    }

    try {
      const parsedCap = parseFloat(newCap);
      if (Number.isNaN(parsedCap) || parsedCap < 0) {
        throw new Error('Cap must be a non-negative number');
      }

      const cappedValue = Math.min(parsedCap, MAX_WALLET_BPS_CAP / 100);
      const maxWalletBps = Math.round(cappedValue * 100);

      setIsUpdatingCap(true);

      const instruction = createUpdateMaxWalletConfigInstruction({
        authority: publicKey,
        mint: mintDetails.mint,
        maxWalletBps,
      });

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

      const signature = await sendTransaction(transaction, connection, { skipPreflight: false });
      await connection.confirmTransaction(signature, 'confirmed');

      toast({
        title: 'Max wallet cap updated',
        description: `Signature: ${signature}`,
      });

      setNewCap('');
      await loadMintDetails();
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : String(error ?? 'Unknown error');
      const description = errorMessage.includes('0x65')
        ? 'The new cap would immediately exceed the current distribution. Adjust the value or balances first.'
        : errorMessage;
      toast({
        title: 'Failed to update cap',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCap(false);
    }
  }, [connection, loadMintDetails, mintDetails, newCap, publicKey, sendTransaction, toast]);

  const maxWalletLimitDisplay = useMemo(() => {
    if (!mintDetails?.maxWalletBps) return null;
    const limit = (mintDetails.supply * BigInt(mintDetails.maxWalletBps)) / BigInt(10_000);
    return formatTokenAmountFromBaseUnits(limit, mintDetails.decimals);
  }, [mintDetails]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Load Mint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mint-address">Mint Address</Label>
            <Input
              id="mint-address"
              placeholder="Enter mint address"
              value={mintAddress}
              onChange={(e) => setMintAddress(e.target.value)}
            />
          </div>
          <Button onClick={loadMintDetails} variant="outline">
            Load Mint
          </Button>

          {mintDetails && (
            <div className="pt-4 space-y-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Decimals:</span>{' '}
                {mintDetails.decimals}
              </div>
              <div>
                <span className="font-medium text-foreground">Total Supply:</span>{' '}
                {formatTokenAmountFromBaseUnits(mintDetails.supply, mintDetails.decimals)}
              </div>
              {maxWalletDisplay !== null && (
                <div>
                  <span className="font-medium text-foreground">Max Wallet %:</span>{' '}
                  {maxWalletDisplay}%
                </div>
              )}
              {maxWalletLimitDisplay && (
                <div>
                  <span className="font-medium text-foreground">Max Wallet Amount:</span>{' '}
                  {maxWalletLimitDisplay}
                </div>
              )}
              {mintDetails.configAuthority && (
                <div>
                  <span className="font-medium text-foreground">Config Authority:</span>{' '}
                  {mintDetails.configAuthority.toBase58()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Destination Address</Label>
            <Input
              id="destination"
              placeholder="Enter recipient address"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              placeholder="Enter amount to transfer"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Amount is in token units (decimals: {mintDetails?.decimals ?? '—'})
            </p>
          </div>
          <Button onClick={handleTransfer} disabled={isLoading || !mintDetails}>
            {isLoading ? 'Sending...' : 'Send Transfer'}
          </Button>
        </CardContent>
      </Card>
      <Card className={cn('lg:col-span-2')}>
        <CardHeader>
          <CardTitle>Update Max Wallet Cap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-cap">New Max Wallet %</Label>
            <Input
              id="new-cap"
              placeholder="Enter new max wallet percentage"
              value={newCap}
              onChange={(e) => setNewCap(e.target.value)}
              disabled={!mintDetails}
            />
          </div>
          <Button onClick={handleUpdateCap} disabled={!mintDetails || isUpdatingCap}>
            {isUpdatingCap ? 'Updating...' : 'Update Cap'}
          </Button>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Caps are stored on-chain in basis points. Any value above {MAX_WALLET_BPS_CAP / 100}%
            will automatically be clamped to the maximum.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
