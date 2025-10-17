import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, Image, Plus, Trash2 } from 'lucide-react';
import { convertTokenAmountToBaseUnits } from '@/lib/solana/amount';
import { Switch } from '@/components/ui/switch';

export interface TransferFeeSplitRecipient {
  address: string;
  percentage: string;
}

export interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  supply: string;
  decimals: string;
  maxWalletPercentage: string;
  enableMaxWallet: boolean;
  transferFeePercentage: string;
  transferFeeMaxTokens: string;
  transferFeeTreasuryAddress: string;
  transferFeeSplitRecipients: TransferFeeSplitRecipient[];
  imageFile: File | null;
  // Reflection configuration
  reflectionMinHolding: string;
  reflectionGasRebatePercentage: string;
  reflectionExcludedWallets: string;
}

interface TokenFormProps {
  formData: TokenFormData;
  onFormChange: Dispatch<SetStateAction<TokenFormData>>;
  onImageUpload: (file: File) => void;
  transferFeeEnabled?: boolean;
  reflectionsEnabled?: boolean;
}

export function TokenForm({
  formData,
  onFormChange,
  onImageUpload,
  transferFeeEnabled = false,
  reflectionsEnabled = false,
}: TokenFormProps) {
  const [imagePreview, setImagePreview] = useState<string>('');

  const decimalsValue = useMemo(() => {
    const parsed = Number.parseInt(formData.decimals || '0', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [formData.decimals]);

  const supplyBaseUnitsPreview = useMemo(() => {
    try {
      if (!formData.supply) return null;
      const baseUnits = convertTokenAmountToBaseUnits(formData.supply, decimalsValue);
      return baseUnits.toString();
    } catch {
      return null;
    }
  }, [formData.supply, decimalsValue]);

  const transferFeeBasisPointsPreview = useMemo(() => {
    try {
      if (!formData.transferFeePercentage) return null;
      const parsed = Number.parseFloat(formData.transferFeePercentage);
      if (Number.isNaN(parsed)) return null;
      return Math.round(parsed * 100);
    } catch {
      return null;
    }
  }, [formData.transferFeePercentage]);

  const maxFeeBaseUnitsPreview = useMemo(() => {
    try {
      if (!formData.transferFeeMaxTokens) return null;
      const baseUnits = convertTokenAmountToBaseUnits(
        formData.transferFeeMaxTokens,
        decimalsValue
      );
      return baseUnits.toString();
    } catch {
      return null;
    }
  }, [formData.transferFeeMaxTokens, decimalsValue]);

  const handleInputChange = (field: keyof TokenFormData, value: string) => {
    onFormChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMaxWalletToggle = (checked: boolean) => {
    onFormChange((prev) => ({
      ...prev,
      enableMaxWallet: checked,
      maxWalletPercentage: checked ? (prev.maxWalletPercentage || '1') : '',
    }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      onFormChange((prev) => ({
        ...prev,
        imageFile: file,
      }));
    }
  };

  const handleAddSplitRecipient = () => {
    onFormChange((prev) => ({
      ...prev,
      transferFeeSplitRecipients: [
        ...prev.transferFeeSplitRecipients,
        { address: '', percentage: '' },
      ],
    }));
  };

  const handleRemoveSplitRecipient = (index: number) => {
    onFormChange((prev) => ({
      ...prev,
      transferFeeSplitRecipients: prev.transferFeeSplitRecipients.filter((_, i) => i !== index),
    }));
  };

  const handleSplitRecipientChange = (
    index: number,
    field: keyof TransferFeeSplitRecipient,
    value: string,
  ) => {
    onFormChange((prev) => ({
      ...prev,
      transferFeeSplitRecipients: prev.transferFeeSplitRecipients.map((recipient, i) =>
        i === index ? { ...recipient, [field]: value } : recipient,
      ),
    }));
  };

  const totalSplitPercentage = useMemo(() => {
    return formData.transferFeeSplitRecipients.reduce((sum, recipient) => {
      const parsed = Number.parseFloat(recipient.percentage || '0');
      if (Number.isNaN(parsed) || parsed <= 0) {
        return sum;
      }
      return sum + parsed;
    }, 0);
  }, [formData.transferFeeSplitRecipients]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Token Details
        </CardTitle>
        <CardDescription>
          Configure the basic properties of your SPL token
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Token Name *</Label>
            <Input
              id="name"
              placeholder="My Awesome Token"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="border-2 focus:border-primary transition-colors"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol *</Label>
            <Input
              id="symbol"
              placeholder="AWESOME"
              value={formData.symbol}
              onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
              className="border-2 focus:border-primary transition-colors"
              maxLength={10}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your token and its utility..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="border-2 focus:border-primary transition-colors min-h-[100px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="supply">Total Supply (Tokens) *</Label>
            <Input
              id="supply"
              placeholder="1,000,000"
              value={formData.supply}
              onChange={(e) => handleInputChange('supply', e.target.value)}
              className="border-2 focus:border-primary transition-colors"
            />
            <p className="text-xs text-muted-foreground">
              {`This is the human-readable token amount. It will be multiplied by 10^{${decimalsValue}} when the token is minted.`}
            </p>
            {supplyBaseUnitsPreview && (
              <p className="text-xs text-muted-foreground">
                Raw supply (base units): <span className="font-mono">{supplyBaseUnitsPreview}</span>
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="decimals">Decimals *</Label>
            <Input
              id="decimals"
              type="number"
              placeholder="9"
              value={formData.decimals}
              onChange={(e) => handleInputChange('decimals', e.target.value)}
              className="border-2 focus:border-primary transition-colors"
              min="0"
              max="255"
            />
            <p className="text-xs text-muted-foreground">
              {`Most SPL tokens use 9 decimals. Supply × 10^{${decimalsValue}} must fit within the 64-bit range.`}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxWalletToggle" className="mr-2">Enable Max Wallet Cap</Label>
              <Switch
                id="maxWalletToggle"
                checked={formData.enableMaxWallet}
                onCheckedChange={handleMaxWalletToggle}
              />
            </div>
            <Input
              id="maxWalletPercentage"
              type="number"
              placeholder="1"
              value={formData.maxWalletPercentage}
              onChange={(e) => handleInputChange('maxWalletPercentage', e.target.value)}
              className="border-2 focus:border-primary transition-colors"
              min="0.01"
              max="100"
              step="0.01"
              disabled={!formData.enableMaxWallet}
            />
            <p className="text-xs text-muted-foreground">
              {formData.enableMaxWallet
                ? 'Max percent of total supply a single wallet can hold.'
                : 'Toggle on to enforce a max wallet cap after launch.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="transferFeePercentage">Transfer Fee (%)</Label>
              {!transferFeeEnabled && (
                <span className="text-xs text-muted-foreground">
                  Enable the Transfer Fee extension to edit
                </span>
              )}
            </div>
            <Input
              id="transferFeePercentage"
              type="number"
              placeholder="2.5"
              value={formData.transferFeePercentage}
              onChange={(e) => handleInputChange('transferFeePercentage', e.target.value)}
              className="border-2 focus:border-primary transition-colors"
              min="0"
              max="100"
              step="0.01"
              disabled={!transferFeeEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Percentage withheld from each transfer. Maximum allowed is 100%.
            </p>
            {transferFeeBasisPointsPreview !== null && (
              <p className="text-xs text-muted-foreground">
                Basis points: <span className="font-mono">{transferFeeBasisPointsPreview}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transferFeeMaxTokens">Max Fee Per Transfer (Tokens)</Label>
            <Input
              id="transferFeeMaxTokens"
              type="number"
              placeholder="Optional (defaults to total supply)"
              value={formData.transferFeeMaxTokens}
              onChange={(e) => handleInputChange('transferFeeMaxTokens', e.target.value)}
              className="border-2 focus:border-primary transition-colors"
              min="0"
              step="0.000001"
              disabled={!transferFeeEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Caps how many tokens can be withheld per transfer. Leave blank to allow up to the total supply.
            </p>
            {maxFeeBaseUnitsPreview && (
              <p className="text-xs text-muted-foreground">
                Raw max fee (base units): <span className="font-mono">{maxFeeBaseUnitsPreview}</span>
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="transferFeeTreasuryAddress">Treasury Wallet (Receives Collected Fees)</Label>
          <Input
            id="transferFeeTreasuryAddress"
            placeholder="Enter Solana wallet address"
            value={formData.transferFeeTreasuryAddress}
            onChange={(e) => handleInputChange('transferFeeTreasuryAddress', e.target.value)}
            className="border-2 focus:border-primary transition-colors"
            disabled={!transferFeeEnabled}
          />
          <p className="text-xs text-muted-foreground">
            Tax proceeds are withdrawn to this wallet after collection. Must be a valid Solana public key.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Optional Split Recipients</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSplitRecipient}
              disabled={!transferFeeEnabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Recipient
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Provide extra wallets and target percentages for post-collection distributions. MintCraft&apos;s fee collector normalizes the split totals.
          </p>
          <div className="space-y-3">
            {formData.transferFeeSplitRecipients.map((recipient, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-3 p-3 border rounded-lg bg-muted/40"
              >
                <Input
                  placeholder="Recipient wallet address"
                  value={recipient.address}
                  onChange={(e) =>
                    handleSplitRecipientChange(index, 'address', e.target.value)
                  }
                  className="border-2 focus:border-primary transition-colors"
                  disabled={!transferFeeEnabled}
                />
                <Input
                  type="number"
                  placeholder="Percent"
                  value={recipient.percentage}
                  onChange={(e) =>
                    handleSplitRecipientChange(index, 'percentage', e.target.value)
                  }
                  className="border-2 focus:border-primary transition-colors md:w-32"
                  min="0.01"
                  step="0.01"
                  disabled={!transferFeeEnabled}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSplitRecipient(index)}
                  className="md:justify-self-end text-muted-foreground hover:text-destructive"
                  disabled={!transferFeeEnabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Total allocated: <span className="font-semibold">{totalSplitPercentage.toFixed(2)}%</span>
            {totalSplitPercentage > 100 && (
              <span className="text-destructive ml-2">
                Split percentages exceed 100%. They&apos;ll be normalized but double-check the values.
              </span>
            )}
          </div>
        </div>

        {reflectionsEnabled && (
          <div className="space-y-4 p-4 border-2 border-primary/50 rounded-lg bg-primary/5">
            <div className="flex items-center gap-2">
              <Label className="text-lg font-semibold">Hourly Reflection Configuration</Label>
              <span className="text-xs text-muted-foreground">(Requires Transfer Fee)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure automatic hourly distribution of collected fees to token holders. Holders can also claim early with a small gas rebate deducted.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="reflectionMinHolding">Minimum Holding (Tokens)</Label>
                <Input
                  id="reflectionMinHolding"
                  type="number"
                  placeholder="1000"
                  value={formData.reflectionMinHolding}
                  onChange={(e) => handleInputChange('reflectionMinHolding', e.target.value)}
                  className="border-2 focus:border-primary transition-colors"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum tokens a wallet must hold to receive reflections. Prevents dust distributions.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reflectionGasRebatePercentage">Gas Rebate (%)</Label>
                <Input
                  id="reflectionGasRebatePercentage"
                  type="number"
                  placeholder="2"
                  value={formData.reflectionGasRebatePercentage}
                  onChange={(e) => handleInputChange('reflectionGasRebatePercentage', e.target.value)}
                  className="border-2 focus:border-primary transition-colors"
                  min="0"
                  max="10"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage deducted when users claim early. Offsets SOL gas costs for auto-distributions.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reflectionExcludedWallets">Excluded Wallets</Label>
              <Textarea
                id="reflectionExcludedWallets"
                placeholder="Wallet1Address,Wallet2Address,LPPoolAddress&#10;Comma-separated list of wallets to exclude from reflections"
                value={formData.reflectionExcludedWallets}
                onChange={(e) => handleInputChange('reflectionExcludedWallets', e.target.value)}
                className="border-2 focus:border-primary transition-colors min-h-[80px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of wallet addresses to exclude (LP pools, CEX wallets, etc.). Treasury wallet is auto-excluded.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Label>Token Logo</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            {imagePreview ? (
              <div className="space-y-4">
                <img 
                  src={imagePreview} 
                  alt="Token preview" 
                  className="w-20 h-20 mx-auto rounded-full object-cover"
                />
                <Button variant="outline" onClick={() => document.getElementById('image-upload')?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Change Image
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Image className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <Button variant="outline" onClick={() => document.getElementById('image-upload')?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    PNG, JPG up to 2MB. Will be uploaded to IPFS.
                  </p>
                </div>
              </div>
            )}
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
