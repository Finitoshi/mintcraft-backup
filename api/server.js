const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { Connection, PublicKey, Transaction, Keypair, SystemProgram } = require('@solana/web3.js');
const { 
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInterestBearingMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeNonTransferableMintInstruction,
  createInitializeMintCloseAuthorityInstruction,
  getMintLen,
  ExtensionType,
  mintTo,
  createAssociatedTokenAccountIdempotent,
  getAssociatedTokenAddressSync,
} = require('@solana/spl-token');

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

// Token Minting Endpoint
app.post('/api/mint-token', async (req, res) => {
  try {
    console.log('🔥 Token minting starting...');
    
    const { tokenConfig, userPublicKey, network, customRpcUrl } = req.body;

    // Set up connection
    const rpcUrl = customRpcUrl || (network === 'mainnet-beta' 
      ? 'https://api.mainnet-beta.solana.com' 
      : 'https://api.devnet.solana.com');
    
    const connection = new Connection(rpcUrl, 'confirmed');

    // Generate mint keypair
    const mintKeypair = Keypair.generate();
    const userPubkey = new PublicKey(userPublicKey);

    // Calculate required extensions
    const extensions = [];
    if (tokenConfig.extensions.transferFee) extensions.push(ExtensionType.TransferFeeConfig);
    if (tokenConfig.extensions.interestBearing) extensions.push(ExtensionType.InterestBearingConfig);
    if (tokenConfig.extensions.permanentDelegate) extensions.push(ExtensionType.PermanentDelegate);
    if (tokenConfig.extensions.nonTransferrable) extensions.push(ExtensionType.NonTransferable);
    if (tokenConfig.extensions.mintCloseAuthority) extensions.push(ExtensionType.MintCloseAuthority);

    // Calculate space needed for mint account
    const mintLen = getMintLen(extensions);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    // Build transaction
    const transaction = new Transaction();

    // Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: userPubkey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );

    // Add extension initialization instructions
    if (tokenConfig.extensions.transferFee) {
      transaction.add(
        createInitializeTransferFeeConfigInstruction(
          mintKeypair.publicKey,
          new PublicKey(tokenConfig.extensions.transferFee.transferFeeConfigAuthority),
          new PublicKey(tokenConfig.extensions.transferFee.withdrawWithheldAuthority),
          tokenConfig.extensions.transferFee.feeBasisPoints,
          BigInt(tokenConfig.extensions.transferFee.maxFee),
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (tokenConfig.extensions.interestBearing) {
      transaction.add(
        createInitializeInterestBearingMintInstruction(
          mintKeypair.publicKey,
          new PublicKey(tokenConfig.extensions.interestBearing.rateAuthority),
          tokenConfig.extensions.interestBearing.rate,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (tokenConfig.extensions.permanentDelegate) {
      transaction.add(
        createInitializePermanentDelegateInstruction(
          mintKeypair.publicKey,
          new PublicKey(tokenConfig.extensions.permanentDelegate.delegate),
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (tokenConfig.extensions.nonTransferrable) {
      transaction.add(
        createInitializeNonTransferableMintInstruction(
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    if (tokenConfig.extensions.mintCloseAuthority) {
      transaction.add(
        createInitializeMintCloseAuthorityInstruction(
          mintKeypair.publicKey,
          new PublicKey(tokenConfig.extensions.mintCloseAuthority.closeAuthority),
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    // Initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        tokenConfig.decimals,
        userPubkey, // mint authority
        userPubkey, // freeze authority
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Create associated token account and mint initial supply
    const userTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      userPubkey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    transaction.add(
      createAssociatedTokenAccountIdempotent(
        userPubkey,
        userTokenAccount,
        userPubkey,
        mintKeypair.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );

    // This is a simplified version - in production you'd need the user to sign this transaction
    // For now, we'll return the transaction for the frontend to sign
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = userPubkey;
    
    // Partial sign with mint keypair
    transaction.partialSign(mintKeypair);

    console.log('✅ Transaction prepared for signing');

    res.json({
      success: true,
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      mintAddress: mintKeypair.publicKey.toBase58(),
    });
  } catch (error) {
    console.error('❌ Token minting failed:', error);
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