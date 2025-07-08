const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// IPFS Upload Endpoint
app.post('/api/upload-to-ipfs', upload.single('image'), async (req, res) => {
  try {
    console.log('🔥 IPFS Upload starting...');
    
    const { name, symbol, description, maxWalletPercentage } = req.body;
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
    if (maxWalletPercentage) {
      metadata.attributes.push({
        trait_type: 'Max Wallet Percentage',
        value: parseFloat(maxWalletPercentage),
      });
    }

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MintCraft API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 MintCraft API server running on port ${PORT}`);
});

module.exports = app;