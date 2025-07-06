import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IPFSUploadRequest {
  name: string;
  symbol: string;
  description: string;
  imageFile: {
    name: string;
    type: string;
    data: string; // base64 encoded
  };
  maxWalletPercentage?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, symbol, description, imageFile, maxWalletPercentage }: IPFSUploadRequest = await req.json();

    console.log('🔥 IPFS Upload starting for:', name);

    // Convert base64 to Uint8Array
    const imageData = Uint8Array.from(atob(imageFile.data), c => c.charCodeAt(0));

    // Upload image to IPFS
    const imageFormData = new FormData();
    const imageBlob = new Blob([imageData], { type: imageFile.type });
    imageFormData.append('file', imageBlob, imageFile.name);

    const imageResponse = await fetch('https://api.ipfs.bitty.money/api/v0/add', {
      method: 'POST',
      body: imageFormData,
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to upload image to IPFS: ${imageResponse.statusText}`);
    }

    const imageResult = await imageResponse.json();
    const imageUri = `https://ipfs.bitty.money/ipfs/${imageResult.Hash}`;

    console.log('✅ Image uploaded to IPFS:', imageUri);

    // Create metadata
    const metadata = {
      name,
      symbol,
      description,
      image: imageUri,
      attributes: [],
      properties: {
        files: [
          {
            uri: imageUri,
            type: imageFile.type,
          },
        ],
        category: 'image',
        creators: [],
      },
    };

    // Add max wallet percentage if provided
    if (maxWalletPercentage) {
      metadata.attributes.push({
        trait_type: 'Max Wallet Percentage',
        value: maxWalletPercentage,
      });
    }

    // Upload metadata to IPFS
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataFormData = new FormData();
    metadataFormData.append('file', metadataBlob, 'metadata.json');

    const metadataResponse = await fetch('https://api.ipfs.bitty.money/api/v0/add', {
      method: 'POST',
      body: metadataFormData,
    });

    if (!metadataResponse.ok) {
      throw new Error(`Failed to upload metadata to IPFS: ${metadataResponse.statusText}`);
    }

    const metadataResult = await metadataResponse.json();
    const metadataUri = `https://ipfs.bitty.money/ipfs/${metadataResult.Hash}`;

    console.log('✅ Metadata uploaded to IPFS:', metadataUri);

    return new Response(
      JSON.stringify({
        success: true,
        metadataUri,
        imageUri,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('❌ IPFS upload failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});