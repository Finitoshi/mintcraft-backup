import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, Image } from 'lucide-react';
import { convertTokenAmountToBaseUnits } from '@/lib/solana/amount';
import { Switch } from '@/components/ui/switch';

export interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  supply: string;
  decimals: string;
  maxWalletPercentage: string;
  enableMaxWallet: boolean;
  imageFile: File | null;
}

interface TokenFormProps {
  formData: TokenFormData;
  onFormChange: Dispatch<SetStateAction<TokenFormData>>;
  onImageUpload: (file: File) => void;
}

export function TokenForm({ formData, onFormChange, onImageUpload }: TokenFormProps) {
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
