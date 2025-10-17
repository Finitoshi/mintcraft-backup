import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletContextProvider } from '@/contexts/WalletContext';
import { NetworkToggle } from '@/components/NetworkToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PublicKey } from '@solana/web3.js';
import { getAccount, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Coins, TrendingUp, Clock, Wallet, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReflectionStats {
  mintAddress: string;
  tokenSymbol: string;
  tokenName: string;
  userBalance: string;
  userBalanceFormatted: string;
  treasuryBalance: string;
  treasuryBalanceFormatted: string;
  estimatedReflection: string;
  estimatedReflectionFormatted: string;
  lastDistribution: string | null;
  totalDistributed: string;
  totalDistributedFormatted: string;
  userSharePercentage: string;
  decimals: number;
  isEligible: boolean;
  minHolding: string;
  gasRebateBps: number;
}

interface ReflectionDashboardAppProps {
  network: WalletAdapterNetwork;
  onNetworkChange: (network: WalletAdapterNetwork) => void;
}

function ReflectionDashboardApp({ network, onNetworkChange }: ReflectionDashboardAppProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();

  const [mintAddress, setMintAddress] = useState('');
  const [stats, setStats] = useState<ReflectionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const fetchReflectionStats = async () => {
    if (!publicKey || !mintAddress) {
      toast({
        title: "Missing Information",
        description: "Please connect wallet and enter a mint address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const mint = new PublicKey(mintAddress);

      // Get user's token account
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      let userBalance = BigInt(0);
      try {
        const accountInfo = await getAccount(
          connection,
          userTokenAccount,
          'confirmed',
          TOKEN_2022_PROGRAM_ID
        );
        userBalance = accountInfo.amount;
      } catch (error) {
        console.log('User has no token account yet');
      }

      // For demo purposes, we'll use placeholder values
      // In production, these would come from:
      // 1. On-chain reflection config PDA
      // 2. Distribution script state file (via API)
      // 3. Token metadata

      const decimals = 9; // Should fetch from mint account
      const minHolding = BigInt(1000) * BigInt(10 ** decimals);
      const gasRebateBps = 200; // 2%
      const treasuryBalance = BigInt(100000) * BigInt(10 ** decimals); // Placeholder
      const totalSupply = BigInt(1000000) * BigInt(10 ** decimals); // Placeholder
      const eligibleSupply = totalSupply - treasuryBalance; // Simplified

      const isEligible = userBalance >= minHolding;
      const userSharePercentage = eligibleSupply > BigInt(0)
        ? Number((userBalance * BigInt(10000)) / eligibleSupply) / 100
        : 0;

      const estimatedReflection = isEligible && eligibleSupply > BigInt(0)
        ? (userBalance * treasuryBalance) / eligibleSupply
        : BigInt(0);

      const formatTokenAmount = (amount: bigint, decimals: number): string => {
        const divisor = BigInt(10 ** decimals);
        const whole = amount / divisor;
        const fraction = amount % divisor;
        const fractionStr = fraction.toString().padStart(decimals, '0');
        return `${whole}.${fractionStr.slice(0, 4)}`;
      };

      setStats({
        mintAddress,
        tokenSymbol: 'TOKEN', // Should fetch from metadata
        tokenName: 'Token Name', // Should fetch from metadata
        userBalance: userBalance.toString(),
        userBalanceFormatted: formatTokenAmount(userBalance, decimals),
        treasuryBalance: treasuryBalance.toString(),
        treasuryBalanceFormatted: formatTokenAmount(treasuryBalance, decimals),
        estimatedReflection: estimatedReflection.toString(),
        estimatedReflectionFormatted: formatTokenAmount(estimatedReflection, decimals),
        lastDistribution: null, // Should fetch from state file via API
        totalDistributed: '0',
        totalDistributedFormatted: '0',
        userSharePercentage: userSharePercentage.toFixed(4),
        decimals,
        isEligible,
        minHolding: formatTokenAmount(minHolding, decimals),
        gasRebateBps,
      });

      toast({
        title: "Stats Loaded",
        description: `Found ${formatTokenAmount(userBalance, decimals)} tokens in your wallet`,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast({
        title: "Failed to Load Stats",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReflection = async () => {
    if (!stats || !publicKey) return;

    try {
      setClaiming(true);

      // Calculate net amount after gas rebate
      const estimatedAmount = BigInt(stats.estimatedReflection);
      const gasRebate = (estimatedAmount * BigInt(stats.gasRebateBps)) / BigInt(10000);
      const netAmount = estimatedAmount - gasRebate;

      const formatTokenAmount = (amount: bigint, decimals: number): string => {
        const divisor = BigInt(10 ** decimals);
        const whole = amount / divisor;
        const fraction = amount % divisor;
        const fractionStr = fraction.toString().padStart(decimals, '0');
        return `${whole}.${fractionStr.slice(0, 4)}`;
      };

      toast({
        title: "Claim Not Yet Implemented",
        description: `You would receive ${formatTokenAmount(netAmount, stats.decimals)} tokens (${formatTokenAmount(gasRebate, stats.decimals)} gas rebate deducted)`,
      });

      // TODO: Implement actual claim transaction
      // 1. Derive reflection config PDA
      // 2. Derive user claim state PDA
      // 3. Build claim_reflection instruction
      // 4. Send transaction
      // 5. Confirm and update UI

    } catch (error) {
      console.error('Claim failed:', error);
      toast({
        title: "Claim Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Forge
            </Link>
            <h1 className="text-4xl font-bold font-mono">💎 Reflection Dashboard</h1>
            <p className="text-lg text-muted-foreground mt-2 font-mono">
              Track your reflection earnings and claim rewards
            </p>
          </div>
          <img
            src="/lovable-uploads/e7e41419-44a3-4432-9a79-b24a762f7696.png"
            alt="MintCraft Logo"
            className="w-16 h-16 pixelated"
          />
        </div>

        {/* Network & Wallet Section */}
        <div className="minecraft-card p-6 mb-8">
          <h3 className="flex items-center gap-2 font-bold text-lg mb-4 font-mono">
            ⚡ Connection
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <NetworkToggle network={network} onNetworkChange={onNetworkChange} />
            <WalletMultiButton className="minecraft-button !bg-emerald-500 hover:!bg-emerald-400 !text-white !border-emerald-600" />
          </div>
        </div>

        {/* Token Lookup */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Load Token Reflections</CardTitle>
            <CardDescription>
              Enter your token's mint address to view reflection stats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="mintAddress">Token Mint Address</Label>
                <Input
                  id="mintAddress"
                  placeholder="e.g., 2UA36agfD5PizwjWt4Qd41vDuvbNgj3sqaLd4PijJDbY"
                  value={mintAddress}
                  onChange={(e) => setMintAddress(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchReflectionStats}
                  disabled={!publicKey || !mintAddress || loading}
                  className="minecraft-button bg-primary"
                >
                  {loading ? '⏳ Loading...' : '🔍 Load Stats'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Dashboard */}
        {stats && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{stats.userBalanceFormatted}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.tokenSymbol} tokens
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fee Pool</CardTitle>
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{stats.treasuryBalanceFormatted}</div>
                  <p className="text-xs text-muted-foreground">
                    Available for distribution
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Your Share</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{stats.userSharePercentage}%</div>
                  <p className="text-xs text-muted-foreground">
                    Of total eligible supply
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Next Distribution</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">~45m</div>
                  <p className="text-xs text-muted-foreground">
                    Every hour automatically
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Claim Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💰 Claim Reflection
                  {stats.isEligible ? (
                    <Badge variant="default" className="ml-2">Eligible</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">Not Eligible</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {stats.isEligible
                    ? `Claim your estimated share now (${stats.gasRebateBps / 100}% gas rebate applies)`
                    : `You need at least ${stats.minHolding} tokens to receive reflections`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Estimated Reflection:</span>
                    <span className="text-lg font-bold font-mono">{stats.estimatedReflectionFormatted} {stats.tokenSymbol}</span>
                  </div>

                  {stats.isEligible && (
                    <>
                      <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium">Gas Rebate ({stats.gasRebateBps / 100}%):</span>
                        <span className="text-sm font-mono text-muted-foreground">
                          -{(BigInt(stats.estimatedReflection) * BigInt(stats.gasRebateBps) / BigInt(10000) / BigInt(10 ** stats.decimals)).toString()} {stats.tokenSymbol}
                        </span>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                        <span className="text-sm font-medium">You Will Receive:</span>
                        <span className="text-xl font-bold font-mono text-primary">
                          {(BigInt(stats.estimatedReflection) - (BigInt(stats.estimatedReflection) * BigInt(stats.gasRebateBps) / BigInt(10000)) / BigInt(10 ** stats.decimals)).toString()} {stats.tokenSymbol}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleClaimReflection}
                    disabled={!stats.isEligible || claiming || BigInt(stats.estimatedReflection) === BigInt(0)}
                    className="minecraft-button flex-1 bg-emerald-500 hover:bg-emerald-400"
                    size="lg"
                  >
                    {claiming ? '⚙️ Claiming...' : '💎 Claim Now'}
                  </Button>
                  <Button
                    variant="outline"
                    className="minecraft-button"
                    size="lg"
                    disabled
                  >
                    ⏰ Wait for Auto
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  💡 Tip: Waiting for automatic hourly distribution gives you 100% with no gas rebate deducted
                </p>
              </CardContent>
            </Card>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Token Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-mono">{stats.tokenName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Symbol:</span>
                    <span className="text-sm font-mono">{stats.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Decimals:</span>
                    <span className="text-sm font-mono">{stats.decimals}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Mint Address:</span>
                    <a
                      href={`https://explorer.solana.com/address/${stats.mintAddress}?cluster=${network}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-primary hover:underline"
                    >
                      {stats.mintAddress.slice(0, 8)}...
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reflection Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Minimum Holding:</span>
                    <span className="text-sm font-mono">{stats.minHolding} {stats.tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gas Rebate:</span>
                    <span className="text-sm font-mono">{stats.gasRebateBps / 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Distribution:</span>
                    <span className="text-sm font-mono">Every 1 hour</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Distributed:</span>
                    <span className="text-sm font-mono">{stats.totalDistributedFormatted} {stats.tokenSymbol}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty State */}
        {!stats && !loading && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">💎</div>
              <h3 className="text-2xl font-bold mb-2">No Token Loaded</h3>
              <p className="text-muted-foreground">
                Enter a token mint address above to view reflection stats
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ReflectionDashboard() {
  const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet);

  return (
    <WalletContextProvider network={network}>
      <ReflectionDashboardApp network={network} onNetworkChange={setNetwork} />
    </WalletContextProvider>
  );
}
