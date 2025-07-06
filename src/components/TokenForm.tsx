import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, Image } from 'lucide-react';

export interface TokenFormData {
  name: string;
  symbol: string;
  description: string;
  supply: string;
  decimals: string;
  imageFile: File | null;
}

interface TokenFormProps {
  formData: TokenFormData;
  onFormChange: (data: TokenFormData) => void;
  onImageUpload: (file: File) => void;
}

export function TokenForm({ formData, onFormChange, onImageUpload }: TokenFormProps) {
  const [imagePreview, setImagePreview] = useState<string>('');

  const handleInputChange = (field: keyof TokenFormData, value: string) => {
    onFormChange({
      ...formData,
      [field]: value,
    });
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
      
      onFormChange({
        ...formData,
        imageFile: file,
      });
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="supply">Total Supply *</Label>
            <Input
              id="supply"
              type="number"
              placeholder="1000000"
              value={formData.supply}
              onChange={(e) => handleInputChange('supply', e.target.value)}
              className="border-2 focus:border-primary transition-colors"
              min="1"
            />
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