export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
  };
}

export class IPFSService {
  private baseUrl: string;

  constructor(ipfsNodeUrl = 'http://localhost:5001') {
    this.baseUrl = ipfsNodeUrl;
  }

  /**
   * Upload file to IPFS with retry logic
   */
  async uploadFile(file: File): Promise<string> {
    console.log('📤 Uploading file to IPFS:', file.name, 'to:', this.baseUrl);
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
    }
    
    const formData = new FormData();
    formData.append('file', file);

    // Retry logic for IPFS uploads
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const uploadUrl = `${this.baseUrl}/api/v0/add`;
        console.log(`🌐 IPFS upload attempt ${attempt}/${maxRetries} to:`, uploadUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        console.log('🔍 Testing CORS preflight...');
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          mode: 'cors', // Explicitly set CORS mode
        });
        
        clearTimeout(timeoutId);
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ IPFS upload failed (attempt ${attempt}):`, response.status, errorText);
          throw new Error(`IPFS upload failed: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        const ipfsHash = result.Hash;
        const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
        
        console.log('✅ File uploaded to IPFS:', ipfsUrl);
        return ipfsUrl;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`❌ IPFS upload error (attempt ${attempt}):`, lastError);
        
        if (attempt === maxRetries) break;
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    if (lastError instanceof TypeError && lastError.message.includes('fetch')) {
      throw new Error(`Failed to connect to IPFS node at ${this.baseUrl}. Please check the URL and CORS settings.`);
    }
    throw new Error(`Failed to upload to IPFS after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadMetadata(metadata: TokenMetadata): Promise<string> {
    console.log('📤 Uploading metadata to IPFS...', metadata);

    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });

    const metadataFile = new File([metadataBlob], 'metadata.json', {
      type: 'application/json',
    });

    return this.uploadFile(metadataFile);
  }

  /**
   * Create complete token metadata with image and upload to IPFS
   */
  async createAndUploadTokenMetadata(
    name: string,
    symbol: string,
    description: string,
    imageFile?: File,
    attributes?: Array<{ trait_type: string; value: string | number }>,
    maxWalletPercentage?: number,
    transferFeePercentage?: number,
    transferFeeMaxTokens?: number,
    transferFeeTreasuryAddress?: string
  ): Promise<string> {
    console.log('🏗️ Creating complete token metadata...');

    let imageUrl = '';
    
    // Upload image first if provided
    if (imageFile) {
      imageUrl = await this.uploadFile(imageFile);
    }

    // Create metadata object
    const baseAttributes = [
      {
        trait_type: 'Token Standard',
        value: 'SPL Token-2022'
      },
      {
        trait_type: 'Network',
        value: 'Solana'
      }
    ];

    // Add max wallet percentage if specified
    if (maxWalletPercentage) {
      baseAttributes.push({
        trait_type: 'Max Wallet Percentage',
        value: `${maxWalletPercentage}%`
      });
    }

    if (typeof transferFeePercentage === 'number') {
      baseAttributes.push({
        trait_type: 'Transfer Fee (%)',
        value: transferFeePercentage,
      });
    }

    if (typeof transferFeeMaxTokens === 'number') {
      baseAttributes.push({
        trait_type: 'Max Fee Per Transfer (Tokens)',
        value: transferFeeMaxTokens,
      });
    }

    if (transferFeeTreasuryAddress) {
      baseAttributes.push({
        trait_type: 'Transfer Fee Treasury',
        value: transferFeeTreasuryAddress,
      });
    }

    const metadata: TokenMetadata = {
      name,
      symbol,
      description,
      image: imageUrl,
      external_url: `https://mintcraft.app/token/${symbol}`,
      attributes: attributes || baseAttributes,
      properties: {
        files: imageFile ? [{
          uri: imageUrl,
          type: imageFile.type
        }] : [],
        category: 'image'
      }
    };

    // Upload metadata
    return this.uploadMetadata(metadata);
  }

  /**
   * Fetch metadata from IPFS URL
   */
  async fetchMetadata(ipfsUrl: string): Promise<TokenMetadata> {
    console.log('📥 Fetching metadata from IPFS:', ipfsUrl);
    
    try {
      const response = await fetch(ipfsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      console.log('✅ Metadata fetched successfully');
      return metadata;
    } catch (error) {
      console.error('❌ Error fetching metadata:', error);
      throw new Error(`Failed to fetch metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
