
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTokenMinting } from './useTokenMinting';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, Keypair } from '@solana/web3.js';
import { MAX_WALLET_HOOK_PROGRAM_ID } from '@/lib/solana/max-wallet';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Mock dependencies
vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: vi.fn(),
  useConnection: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

let buildTokenCreationTransactionMock: ReturnType<typeof vi.fn> | undefined;
let walletKeypair: Keypair;

vi.mock('@/lib/solana/transaction-builder', () => ({
  TransactionBuilder: vi.fn().mockImplementation(() => {
    buildTokenCreationTransactionMock = vi.fn(async () => {
      const transaction = new Transaction();

      return {
        transaction,
        associatedTokenAccount: Keypair.generate().publicKey,
      };
    });

    return {
      buildTokenCreationTransaction: buildTokenCreationTransactionMock,
    };
  }),
}));

global.fetch = vi.fn();

describe('useTokenMinting', () => {
  const mockSendTransaction = vi.fn().mockResolvedValue('mytesthash');
  const mockConfirmTransaction = vi.fn().mockResolvedValue(null);
  const mockGetLatestBlockhash = vi.fn().mockResolvedValue({
    blockhash: '4wBqA8sHjZ4aVzaE1ZzSAg4g2XJdJ6FjT3jX8vX8aY8H', // A valid base58 string
    lastValidBlockHeight: 100,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    buildTokenCreationTransactionMock = undefined;
    walletKeypair = Keypair.generate();

    (useWallet as vi.Mock).mockReturnValue({
      publicKey: walletKeypair.publicKey,
      sendTransaction: mockSendTransaction,
    });

    (useConnection as vi.Mock).mockReturnValue({
      connection: {
        confirmTransaction: mockConfirmTransaction,
        getLatestBlockhash: mockGetLatestBlockhash,
        getMinimumBalanceForRentExemption: vi.fn().mockResolvedValue(2039280),
      },
    });

    (fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, metadataUri: 'ipfs://metadata' }),
    });
  });

  it('should handle a successful token minting process', async () => {
    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));

    const formData = {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: '9',
      supply: '1000000',
      description: 'A test token',
      imageFile: new File([new ArrayBuffer(1)], 'test.png', { type: 'image/png' }),
      maxWalletPercentage: '',
      enableMaxWallet: false,
      transferFeePercentage: '2.5',
      transferFeeMaxTokens: '',
      transferFeeTreasuryAddress: '',
      transferFeeSplitRecipients: [],
    };

    const extensions: any[] = [];

    await act(async () => {
      await result.current.mintToken(formData, extensions);
    });

    expect(result.current.status.step).toBe('success');
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/upload-to-ipfs', expect.any(Object));
    expect(mockSendTransaction).toHaveBeenCalledOnce();
    const [txArg, connectionArg, optionsArg] = mockSendTransaction.mock.calls[0];
    expect(txArg).toBeInstanceOf(Transaction);
    expect(connectionArg).toHaveProperty('confirmTransaction');
    expect(optionsArg?.signers?.[0]).toBeInstanceOf(Keypair);
    expect(mockConfirmTransaction).toHaveBeenCalledOnce();
    expect(buildTokenCreationTransactionMock).toBeDefined();
    expect(buildTokenCreationTransactionMock!).toHaveBeenCalledOnce();
    const creationConfig = buildTokenCreationTransactionMock!.mock.calls[0][1];
    expect(creationConfig.supplyBaseUnits).toBe(BigInt('1000000000000000'));
    expect(creationConfig.humanReadableSupply).toBe('1000000');
    expect(result.current.status.message).toBe('Token created successfully!');
    expect(result.current.status.txSignature).toBe('mytesthash');
    expect(result.current.status.mintAddress).toBeDefined();
  });

  it('should handle wallet not connected error', async () => {
    (useWallet as vi.Mock).mockReturnValue({
      publicKey: null,
      sendTransaction: null,
    });

    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));
    
    const formData = {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: '9',
      supply: '100000a',
      description: 'A test token',
      imageFile: null,
      maxWalletPercentage: '',
      enableMaxWallet: false,
      transferFeePercentage: '2.5',
      transferFeeMaxTokens: '',
      transferFeeTreasuryAddress: '',
      transferFeeSplitRecipients: [],
    };
    const extensions: any[] = [];

    await act(async () => {
      await result.current.mintToken(formData, extensions);
    });

    expect(result.current.status.step).toBe('idle');
  });

  it('should enable transfer hook when max wallet percentage provided', async () => {
    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));

    const formData = {
      name: 'Test Token',
      symbol: 'TEST',
      decimals: '9',
      supply: '1000000',
      description: 'A test token',
      imageFile: null,
      maxWalletPercentage: '5',
      enableMaxWallet: true,
      transferFeePercentage: '2.5',
      transferFeeMaxTokens: '',
      transferFeeTreasuryAddress: '',
      transferFeeSplitRecipients: [],
    };

    const extensions: any[] = [];

    await act(async () => {
      await result.current.mintToken(formData, extensions);
    });

    const configArg = buildTokenCreationTransactionMock!.mock.calls[0][1];
    expect(configArg.maxWalletPercentage).toBe(5);
    expect(configArg.extensions.transferHook).toBeDefined();
    expect(configArg.extensions.transferHook.programId).toEqual(
      MAX_WALLET_HOOK_PROGRAM_ID
    );
  });

  it('should configure transfer fee extension using provided values', async () => {
    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));

    const formData = {
      name: 'Tax Token',
      symbol: 'TAX',
      decimals: '9',
      supply: '1000000',
      description: 'A token with transfer tax',
      imageFile: null,
      maxWalletPercentage: '',
      enableMaxWallet: false,
      transferFeePercentage: '1.75',
      transferFeeMaxTokens: '500',
      transferFeeTreasuryAddress: walletKeypair.publicKey.toBase58(),
      transferFeeSplitRecipients: [],
    };

    const extensions = [
      {
        id: 'transfer-fee',
        name: 'Transfer Fee',
        description: '',
        enabled: true,
        category: 'fee',
        riskLevel: 'low',
      },
    ];

    await act(async () => {
      await result.current.mintToken(formData as any, extensions as any);
    });

    const configArg = buildTokenCreationTransactionMock!.mock.calls[0][1];
    expect(configArg.extensions.transferFee).toBeDefined();
    expect(configArg.extensions.transferFee.feeBasisPoints).toBe(175);
    expect(configArg.extensions.transferFee.maxFee).toBe(BigInt('500000000000'));
    expect(configArg.extensions.transferFee.withdrawWithheldAuthority.toBase58()).toBe(
      walletKeypair.publicKey.toBase58()
    );
    expect(configArg.transferFeeTreasury?.toBase58()).toBe(walletKeypair.publicKey.toBase58());
  });

  it('should default transfer fee max to total supply when not provided', async () => {
    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));

    const formData = {
      name: 'Tax Token',
      symbol: 'SUPPLY',
      decimals: '9',
      supply: '1000000',
      description: 'Defaults max fee to supply',
      imageFile: null,
      maxWalletPercentage: '',
      enableMaxWallet: false,
      transferFeePercentage: '0.05',
      transferFeeMaxTokens: '',
      transferFeeTreasuryAddress: walletKeypair.publicKey.toBase58(),
      transferFeeSplitRecipients: [],
    };

    const extensions = [
      {
        id: 'transfer-fee',
        name: 'Transfer Fee',
        description: '',
        enabled: true,
        category: 'fee',
        riskLevel: 'low',
      },
    ];

    await act(async () => {
      await result.current.mintToken(formData as any, extensions as any);
    });

    const configArg = buildTokenCreationTransactionMock!.mock.calls[0][1];
    expect(configArg.extensions.transferFee).toBeDefined();
    expect(configArg.extensions.transferFee.feeBasisPoints).toBe(5);
    expect(configArg.extensions.transferFee.maxFee).toBe(BigInt('1000000000000000'));
    expect(configArg.extensions.transferFee.withdrawWithheldAuthority.toBase58()).toBe(
      walletKeypair.publicKey.toBase58()
    );
    expect(configArg.transferFeeTreasury?.toBase58()).toBe(walletKeypair.publicKey.toBase58());
  });

  it('should error when split recipients include an invalid address', async () => {
    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));

    const formData = {
      name: 'Split Token',
      symbol: 'SPLIT',
      decimals: '9',
      supply: '1000000',
      description: 'Invalid split recipient should fail',
      imageFile: null,
      maxWalletPercentage: '',
      enableMaxWallet: false,
      transferFeePercentage: '2',
      transferFeeMaxTokens: '',
      transferFeeTreasuryAddress: walletKeypair.publicKey.toBase58(),
      transferFeeSplitRecipients: [
        { address: 'not-a-pubkey', percentage: '50' },
      ],
    };

    const extensions = [
      {
        id: 'transfer-fee',
        name: 'Transfer Fee',
        description: '',
        enabled: true,
        category: 'fee',
        riskLevel: 'low',
      },
    ];

    await act(async () => {
      await result.current.mintToken(formData as any, extensions as any);
    });

    expect(result.current.status.step).toBe('error');
    expect(result.current.status.message).toContain('split recipient wallet address');
  });

  it('should error when transfer fee treasury wallet is missing', async () => {
    const { result } = renderHook(() => useTokenMinting(WalletAdapterNetwork.Devnet));

    const formData = {
      name: 'Tax Token',
      symbol: 'ERR',
      decimals: '9',
      supply: '1000000',
      description: 'Missing treasury should fail',
      imageFile: null,
      maxWalletPercentage: '',
      enableMaxWallet: false,
      transferFeePercentage: '1',
      transferFeeMaxTokens: '',
      transferFeeTreasuryAddress: '',
      transferFeeSplitRecipients: [],
    };

    const extensions = [
      {
        id: 'transfer-fee',
        name: 'Transfer Fee',
        description: '',
        enabled: true,
        category: 'fee',
        riskLevel: 'low',
      },
    ];

    await act(async () => {
      await result.current.mintToken(formData as any, extensions as any);
    });

    expect(result.current.status.step).toBe('error');
    expect(result.current.status.message).toContain('treasury wallet');
  });
});
