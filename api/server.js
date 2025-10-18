const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { createMeteoraPoolHandler } = require('./meteora-pool');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// IPFS Upload Endpoint
app.post('/api/upload-to-ipfs', upload.single('image'), async (req, res) => {
  try {
    console.log('🔥 IPFS Upload starting...');
    
    const {
      name,
      symbol,
      description,
      maxWalletPercentage,
      decimals,
      supply,
      transferFeePercentage,
      transferFeeMaxTokens,
      transferFeeTreasuryAddress,
      transferFeeSplitRecipients,
    } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    // Upload image to IPFS
    const imageFormData = new FormData();
    imageFormData.append('file', imageFile.buffer, {
      filename: imageFile.originalname,
      contentType: imageFile.mimetype,
    });

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
    const parsedDecimals = decimals ? parseInt(decimals, 10) : undefined;
    const parsedSupply = supply ? parseFloat(supply) : undefined;

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
            type: imageFile.mimetype,
          },
        ],
        category: 'image',
        creators: [],
      },
    };

    // Add max wallet percentage if provided
    const baseAttributes = [
      {
        trait_type: 'Token Standard',
        value: 'SPL Token-2022',
      },
      {
        trait_type: 'Network',
        value: 'Solana Devnet',
      },
    ];

    if (typeof parsedDecimals === 'number' && !Number.isNaN(parsedDecimals)) {
      baseAttributes.push({
        trait_type: 'Decimals',
        value: parsedDecimals,
      });
    }

    if (typeof parsedSupply === 'number' && !Number.isNaN(parsedSupply)) {
      baseAttributes.push({
        trait_type: 'Initial Supply',
        value: parsedSupply,
      });
    }

    if (maxWalletPercentage) {
      const parsedMaxWallet = parseFloat(maxWalletPercentage);
      if (!Number.isNaN(parsedMaxWallet)) {
        baseAttributes.push({
          trait_type: 'Max Wallet Percentage',
          value: parsedMaxWallet,
        });
      }
    }

    if (transferFeePercentage) {
      const parsedTransferFeePct = parseFloat(transferFeePercentage);
      if (!Number.isNaN(parsedTransferFeePct)) {
        baseAttributes.push({
          trait_type: 'Transfer Fee (%)',
          value: parsedTransferFeePct,
        });
      }
    }

    if (transferFeeMaxTokens) {
      const parsedMaxFeeTokens = parseFloat(transferFeeMaxTokens);
      if (!Number.isNaN(parsedMaxFeeTokens)) {
        baseAttributes.push({
          trait_type: 'Max Fee Per Transfer (Tokens)',
          value: parsedMaxFeeTokens,
        });
      }
    }

    let parsedSplitRecipients = [];
    if (transferFeeSplitRecipients) {
      try {
        const rawSplit = JSON.parse(transferFeeSplitRecipients);
        if (Array.isArray(rawSplit)) {
          parsedSplitRecipients = rawSplit
            .map((entry) => ({
              address: typeof entry.address === 'string' ? entry.address : '',
              percent: typeof entry.percent === 'number' ? entry.percent : Number(entry.percent),
            }))
            .filter(
              (entry) =>
                entry.address &&
                !Number.isNaN(entry.percent) &&
                Number.isFinite(entry.percent) &&
                entry.percent > 0
            );
        }
      } catch (error) {
        console.warn('⚠️ Failed to parse transfer fee split recipients:', error);
      }
    }

    if (transferFeeTreasuryAddress) {
      baseAttributes.push({
        trait_type: 'Transfer Fee Treasury',
        value: transferFeeTreasuryAddress,
      });
    }

    if (parsedSplitRecipients.length > 0) {
      baseAttributes.push({
        trait_type: 'Transfer Fee Split Recipients',
        value: parsedSplitRecipients
          .map((entry) => `${entry.address}:${entry.percent}`)
          .join(', '),
      });
      metadata.properties.transferFeeSplits = parsedSplitRecipients;
    }

    metadata.attributes = baseAttributes;

    // Upload metadata to IPFS
    const metadataFormData = new FormData();
    metadataFormData.append('file', Buffer.from(JSON.stringify(metadata)), {
      filename: 'metadata.json',
      contentType: 'application/json',
    });

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

    res.json({
      success: true,
      metadataUri,
      imageUri,
    });
  } catch (error) {
    console.error('❌ IPFS upload failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
    });
  }
});

// Meteora pool creation endpoint
app.post('/api/create-meteora-pool', createMeteoraPoolHandler);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MintCraft API is running' });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 MintCraft API server running on http://${HOST}:${PORT}`);
});

module.exports = app;
