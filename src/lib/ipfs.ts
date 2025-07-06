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
   * Upload file to IPFS
   */
  async uploadFile(file: File): Promise<string> {
    console.log('📤 Uploading file to IPFS:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.baseUrl}/api/v0/add`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const ipfsHash = result.Hash;
      const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
      
      console.log('✅ File uploaded to IPFS:', ipfsUrl);
      return ipfsUrl;
    } catch (error) {
      console.error('❌ IPFS upload error:', error);
      throw new Error(`Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    attributes?: Array<{ trait_type: string; value: string | number }>
  ): Promise<string> {
    console.log('🏗️ Creating complete token metadata...');

    let imageUrl = '';
    
    // Upload image first if provided
    if (imageFile) {
      imageUrl = await this.uploadFile(imageFile);
    }

    // Create metadata object
    const metadata: TokenMetadata = {
      name,
      symbol,
      description,
      image: imageUrl,
      external_url: `https://mintcraft.app/token/${symbol}`,
      attributes: attributes || [
        {
          trait_type: 'Token Standard',
          value: 'SPL Token-2022'
        },
        {
          trait_type: 'Network',
          value: 'Solana'
        }
      ],
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