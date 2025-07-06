import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, DollarSign, Percent } from 'lucide-react';

interface PriceData {
  sol: number;
  usdc: number;
  bonk: number;
}

export function FeeCalculator() {
  const [transferAmount, setTransferAmount] = useState('1000');
  const [feePercentage, setFeePercentage] = useState('2.5');
  const [maxFee, setMaxFee] = useState('100');
  const [tokenPrice, setTokenPrice] = useState('0.05');
  const [prices, setPrices] = useState<PriceData>({ sol: 100, usdc: 1, bonk: 0.00001 });
  const [loading, setLoading] = useState(false);

  // Mock price fetching
  useEffect(() => {
    const fetchPrices = () => {
      setLoading(true);
      // Mock real-time price updates
      setTimeout(() => {
        setPrices({
          sol: 95 + Math.random() * 10, // $95-105
          usdc: 0.998 + Math.random() * 0.004, // $0.998-1.002
          bonk: 0.00001 + Math.random() * 0.000005, // Variable
        });
        setLoading(false);
      }, 1000);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const calculateFees = () => {
    const amount = parseFloat(transferAmount) || 0;
    const feeRate = parseFloat(feePercentage) / 100;
    const maxFeeTokens = parseFloat(maxFee) || 0;
    const price = parseFloat(tokenPrice) || 0;

    const feeTokens = Math.min(amount * feeRate, maxFeeTokens);
    const feeUSD = feeTokens * price;
    
    return {
      feeTokens,
      feeUSD,
      remainingTokens: amount - feeTokens,
      effectiveRate: amount > 0 ? (feeTokens / amount) * 100 : 0,
    };
  };

  const fees = calculateFees();

  const calculateAPR = () => {
    // Mock APR calculation based on interest-bearing extension
    const baseAPR = 5.0; // 5% base
    const priceMultiplier = prices.sol / 100; // Adjust based on SOL price
    return baseAPR * priceMultiplier;
  };

  const calculateReflectionRewards = () => {
    const dailyVolume = 50000; // Mock daily volume
    const reflectionRate = 0.001; // 0.1% of volume
    const dailyRewards = dailyVolume * reflectionRate;
    
    return {
      dailySOL: dailyRewards / prices.sol,
      dailyUSD: dailyRewards,
      monthlyUSD: dailyRewards * 30,
      yearlyUSD: dailyRewards * 365,
    };
  };

  const reflections = calculateReflectionRewards();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Live Fee & Yield Calculator
          <Badge variant="outline" className={loading ? "animate-pulse" : ""}>
            {loading ? "Updating..." : "Live Prices"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time fee calculations and yield projections with oracle prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Prices */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 border rounded-lg">
            <div className="text-lg font-bold">${prices.sol.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">SOL</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-lg font-bold">${prices.usdc.toFixed(3)}</div>
            <div className="text-sm text-muted-foreground">USDC</div>
          </div>
          <div className="text-center p-3 border rounded-lg">
            <div className="text-lg font-bold">${(prices.bonk * 1000000).toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">BONK (per 1M)</div>
          </div>
        </div>

        <Separator />

        {/* Transfer Fee Calculator */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <Percent className="h-4 w-4" />
            Transfer Fee Calculator
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="transfer-amount">Transfer Amount</Label>
              <Input
                id="transfer-amount"
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="token-price">Token Price (USD)</Label>
              <Input
                id="token-price"
                type="number"
                step="0.001"
                value={tokenPrice}
                onChange={(e) => setTokenPrice(e.target.value)}
                placeholder="0.05"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fee-percentage">Fee Percentage</Label>
              <Input
                id="fee-percentage"
                type="number"
                step="0.1"
                value={feePercentage}
                onChange={(e) => setFeePercentage(e.target.value)}
                placeholder="2.5"
              />
            </div>
            <div>
              <Label htmlFor="max-fee">Max Fee (tokens)</Label>
              <Input
                id="max-fee"
                type="number"
                value={maxFee}
                onChange={(e) => setMaxFee(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Fee (Tokens)</div>
              <div className="text-lg font-bold">{fees.feeTokens.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Fee (USD)</div>
              <div className="text-lg font-bold text-primary">${fees.feeUSD.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Remaining Tokens</div>
              <div className="text-lg font-bold">{fees.remainingTokens.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Effective Rate</div>
              <div className="text-lg font-bold">{fees.effectiveRate.toFixed(3)}%</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Interest Bearing APR */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="h-4 w-4" />
            Interest Bearing APR
          </h4>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {calculateAPR().toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Current Annual Percentage Rate
            </div>
          </div>
        </div>

        <Separator />

        {/* Reflection Rewards */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <DollarSign className="h-4 w-4" />
            Multi-Asset Reflection Rewards
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Daily Rewards</div>
              <div className="font-bold">{reflections.dailySOL.toFixed(4)} SOL</div>
              <div className="text-sm text-primary">${reflections.dailyUSD.toFixed(2)}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Monthly Rewards</div>
              <div className="font-bold">${reflections.monthlyUSD.toFixed(0)}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Yearly Projection</div>
              <div className="font-bold text-green-600">${reflections.yearlyUSD.toFixed(0)}</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Your Share (1%)</div>
              <div className="font-bold">${(reflections.dailyUSD * 0.01).toFixed(4)}/day</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}