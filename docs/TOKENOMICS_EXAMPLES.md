# Token Economics Examples

This guide provides real-world tokenomics configurations you can implement with MintCraft.

## Table of Contents
- [Reflection/Redistribution Tokens](#1-reflectionredistribution-token)
- [Deflationary Burn Tokens](#2-deflationary-burn-token)
- [Community Governance Tokens](#3-community-governance-token)
- [Gaming/Utility Tokens](#4-gamingutility-token)
- [Meme Coins](#5-meme-coin)
- [Stablecoin-Style Tokens](#6-stablecoin-style-token)
- [DAO Treasury Tokens](#7-dao-treasury-token)

---

## 1. Reflection/Redistribution Token

**Concept:** Token holders automatically receive a share of transaction fees.

### Configuration
```
Token Details:
├─ Name: Reflect Token
├─ Symbol: RFLCT
├─ Supply: 1,000,000,000
└─ Decimals: 9

Transfer Fee:
├─ Enabled: Yes
├─ Fee Percentage: 3%
├─ Max Fee: 100,000 RFLCT
└─ Treasury: Your reflection distribution wallet

Max Wallet:
├─ Enabled: Yes
└─ Percentage: 2% (20,000,000 tokens)

Split Recipients:
└─ Not configured (collect to single treasury for redistribution)
```

### How It Works
1. Every transfer collects 3% fee
2. Fees accumulate in withheld accounts
3. Hourly cron job collects to treasury
4. Manually distribute from treasury to holders proportionally

**Math Example:**
- Alice sends 1,000,000 RFLCT to Bob
- Fee: 30,000 RFLCT (3%)
- Bob receives: 970,000 RFLCT
- Treasury receives: 30,000 RFLCT (for redistribution)

### Distribution Strategy
```javascript
// Pseudo-code for reflection distribution
const totalFees = 30_000_000_000; // 30k tokens in base units
const holders = await getAllHolders(mintAddress);
const totalSupply = 1_000_000_000_000_000_000n; // 1B in base units

for (const holder of holders) {
  const balance = await getBalance(holder.address);
  const share = (balance / totalSupply) * totalFees;
  await transfer(treasury, holder.address, share);
}
```

### Pros & Cons
✅ Incentivizes holding
✅ Passive income for holders
✅ Organic price support
❌ Requires periodic distribution work
❌ Gas costs for distributions
❌ Complex tracking

---

## 2. Deflationary Burn Token

**Concept:** Portion of fees permanently burned to reduce supply.

### Configuration
```
Token Details:
├─ Name: Burn Token
├─ Symbol: BURN
├─ Supply: 1,000,000,000
└─ Decimals: 9

Transfer Fee:
├─ Enabled: Yes
├─ Fee Percentage: 5%
├─ Max Fee: No limit
└─ Treasury: Development wallet

Max Wallet:
├─ Enabled: Yes
└─ Percentage: 3%

Split Recipients:
├─ Burn Address: 50% (11111111111111111111111111111111)
├─ Development: 30%
└─ Marketing: 20%
```

### How It Works
1. 5% fee on all transfers
2. 50% sent to burn address (irretrievable)
3. 30% to development
4. 20% to marketing

**Burn Address:**
```
11111111111111111111111111111111
```
This is the System Program, where tokens are permanently lost.

### Example After 1000 Transactions
```
Starting Supply: 1,000,000,000
Average tx size:  100,000 tokens
Total fees:       5,000,000 tokens
Burned:           2,500,000 tokens (50%)
Development:      1,500,000 tokens (30%)
Marketing:        1,000,000 tokens (20%)

Effective Supply: 997,500,000 tokens
```

### Pros & Cons
✅ Decreasing supply → potential price increase
✅ Built-in scarcity
✅ Automated deflation
❌ Can reduce liquidity over time
❌ High fees may discourage usage

---

## 3. Community Governance Token

**Concept:** Token for DAO voting with fair distribution limits.

### Configuration
```
Token Details:
├─ Name: Govern Token
├─ Symbol: GOV
├─ Supply: 100,000,000
└─ Decimals: 9

Transfer Fee:
├─ Enabled: No
└─ (Governance tokens typically don't have transfer fees)

Max Wallet:
├─ Enabled: Yes
└─ Percentage: 1% (prevents whale control)
```

### How It Works
- No transfer fees (free movement)
- Max 1% per wallet (1,000,000 GOV)
- Prevents single entity controlling votes
- Authority wallet exempt (can hold >1% for initial distribution)

### Distribution Strategy
```
Total Supply: 100,000,000 GOV

Allocation:
├─ Community Airdrop: 40% (40M)
├─ Team (vested):     20% (20M)
├─ Treasury/DAO:      20% (20M)
├─ Liquidity:         15% (15M)
└─ Marketing:          5% (5M)
```

### Voting Power
```
1 GOV = 1 Vote
Max voting power: 1,000,000 votes (1% cap)
```

### Pros & Cons
✅ Fair voting distribution
✅ Prevents governance attacks
✅ Encourages decentralization
❌ May limit institutional participation
❌ No revenue mechanism

---

## 4. Gaming/Utility Token

**Concept:** In-game currency with anti-bot protection.

### Configuration
```
Token Details:
├─ Name: Game Coin
├─ Symbol: GAME
├─ Supply: 500,000,000
└─ Decimals: 9

Transfer Fee:
├─ Enabled: Yes
├─ Fee Percentage: 1%
├─ Max Fee: 10,000 GAME
└─ Treasury: Game treasury wallet

Max Wallet:
├─ Enabled: Yes
└─ Percentage: 0.5% (prevents hoarding)

Split Recipients:
├─ Game Development: 60%
├─ Prize Pool:       30%
└─ Burn:             10%
```

### How It Works
1. Low 1% fee (doesn't hurt UX)
2. 0.5% max wallet (2,500,000 GAME)
3. Fees fund ongoing development + prizes
4. Slight deflation via 10% burn

### Use Cases
- Purchase in-game items
- Enter tournaments (burn entry fees)
- Trade with other players
- Stake for rewards

### Economics
```
Player buys 100,000 GAME from DEX
├─ Receives: 99,000 GAME
└─ Fee: 1,000 GAME
    ├─ Development: 600 GAME
    ├─ Prize Pool: 300 GAME
    └─ Burn: 100 GAME

Player trades 50,000 GAME to another player
├─ Recipient gets: 49,500 GAME
└─ Fee: 500 GAME (distributed as above)
```

### Pros & Cons
✅ Self-funding development
✅ Prize pool grows organically
✅ Max wallet prevents botting
❌ May hurt trading UX slightly
❌ Requires careful economic balancing

---

## 5. Meme Coin

**Concept:** Pure speculation, no utility, maximum decentralization.

### Configuration
```
Token Details:
├─ Name: Doge Coin 2.0
├─ Symbol: DOGE2
├─ Supply: 100,000,000,000
└─ Decimals: 9

Transfer Fee:
├─ Enabled: No
└─ (Pure meme, no tax)

Max Wallet:
├─ Enabled: No
└─ (Let the market decide)
```

### How It Works
- Completely permissionless
- No fees, no restrictions
- Launch and let community build
- Renounce mint authority after creation

### Launch Strategy
```
1. Create token
2. Add to DEX with liquidity
3. Renounce mint authority (supply fixed)
4. Renounce freeze authority (can't freeze wallets)
5. Burn LP tokens (liquidity locked)
6. Share CA everywhere
```

### Renouncing Authorities
```bash
# After creation, revoke mint authority
spl-token authorize <TOKEN_ADDRESS> mint --disable

# Revoke freeze authority
spl-token authorize <TOKEN_ADDRESS> freeze --disable
```

### Pros & Cons
✅ Maximum trust (immutable)
✅ No dev control
✅ Pure market forces
❌ No revenue for development
❌ Can't update if issues found
❌ High pump-and-dump risk

---

## 6. Stablecoin-Style Token

**Concept:** Collateralized token attempting to maintain $1 peg.

### Configuration
```
Token Details:
├─ Name: Stable Coin
├─ Symbol: STBL
├─ Supply: Dynamic (mint as needed)
└─ Decimals: 6 (like USDC)

Transfer Fee:
├─ Enabled: Yes
├─ Fee Percentage: 0.1% (very low)
├─ Max Fee: 100 STBL
└─ Treasury: Protocol treasury

Max Wallet:
├─ Enabled: No
└─ (Institutions may need large holdings)

Extensions:
└─ Freeze Authority: Enabled (regulatory compliance)
```

### How It Works
1. User deposits $100 USDC
2. Protocol mints 100 STBL
3. USDC held as collateral
4. User can redeem 1:1 anytime

### Fee Usage
```
0.1% fee on transfers funds:
├─ Protocol maintenance
├─ Oracle costs
└─ Insurance fund
```

### Peg Maintenance
```
Price > $1.00 → Mint more, sell to DEX
Price < $1.00 → Buy from DEX, burn
```

### Pros & Cons
✅ Stable value for commerce
✅ Low fees
✅ Predictable
❌ Requires collateral management
❌ Regulatory complexity
❌ Oracle dependencies

---

## 7. DAO Treasury Token

**Concept:** Token representing share of DAO treasury.

### Configuration
```
Token Details:
├─ Name: Treasury Share
├─ Symbol: TSHARE
├─ Supply: 10,000,000
└─ Decimals: 9

Transfer Fee:
├─ Enabled: Yes
├─ Fee Percentage: 2%
├─ Max Fee: No limit
└─ Treasury: DAO multisig wallet

Max Wallet:
├─ Enabled: Yes
└─ Percentage: 5% (500,000 tokens)

Split Recipients:
├─ DAO Treasury: 70%
├─ Buyback/Burn: 20%
└─ Operations:   10%
```

### How It Works
1. Token holders vote on treasury allocation
2. 2% fee on transfers replenishes treasury
3. 20% used for buybacks (price support)
4. 10% funds ongoing operations

### Treasury Management
```
DAO Treasury receives:
├─ 70% of transfer fees
├─ Protocol revenue
├─ Investment returns
└─ Partnership deals

Token holders vote on:
├─ Grant proposals
├─ Investment decisions
├─ Fee adjustments
└─ Buyback timing
```

### Example Economics
```
DAO holds:
├─ 1,000 SOL
├─ 50,000 USDC
└─ Various tokens

10M tokens issued
= $0.15 per token backing (if treasury = $1.5M)

Buybacks increase backing per token
Burns reduce supply → higher backing/token
```

### Voting
```
1 TSHARE = 1 vote
Proposals require:
├─ Quorum: 10% of supply voting
└─ Approval: >50% of votes
```

### Pros & Cons
✅ Treasury grows over time
✅ Buybacks support price
✅ Democratic governance
❌ Complex coordination
❌ Voting participation challenges
❌ Multisig management overhead

---

## Comparison Matrix

| Model | Transfer Fee | Max Wallet | Complexity | Best For |
|-------|--------------|------------|------------|----------|
| Reflection | High (3-5%) | Yes | Medium | Rewarding holders |
| Burn | High (5-10%) | Yes | Low | Creating scarcity |
| Governance | None | Yes (1%) | Low | DAO voting |
| Gaming | Low (1%) | Yes (0.5%) | High | In-game economy |
| Meme | None | No | Very Low | Pure speculation |
| Stable | Very Low (0.1%) | No | Very High | Payments |
| Treasury | Medium (2%) | Yes (5%) | High | DAO funding |

---

## Calculating Your Tokenomics

### Fee Revenue Calculator
```
Daily Volume:     10,000,000 tokens
Transfer Fee:     3%
Daily Fees:       300,000 tokens

Annual Fees:      109,500,000 tokens (10.95% of 1B supply)

If split:
├─ Treasury (70%): 76,650,000 tokens/year
├─ Burn (20%):     21,900,000 tokens/year
└─ Operations:     10,950,000 tokens/year
```

### Max Wallet Impact
```
Total Supply:     1,000,000,000
Max Wallet %:     2%
Max per wallet:   20,000,000 tokens

Minimum holders to distribute supply: 50 wallets
(In practice, much higher due to long tail)
```

### Burn Rate Projection
```
Starting Supply:  1,000,000,000
Burn per tx:      0.5% of tx amount
Avg tx:           100,000 tokens
Burn per tx:      500 tokens

1000 tx/day:      500,000 burned/day
Annual burn:      182,500,000 (18.25%)

After 5 years:    ~40% supply burned
```

---

## Best Practices

### 1. Start Conservative
- Begin with lower fees (1-2%)
- Test max wallet thoroughly
- Can always increase fees later (if authority retained)

### 2. Align Incentives
- Fee recipients should benefit ecosystem
- Avoid extractive tokenomics
- Consider burn for long-term value

### 3. Document Everything
- Publish tokenomics before launch
- Explain fee structure clearly
- Be transparent about changes

### 4. Test on Devnet
- Create identical test token
- Simulate real usage
- Verify split distributions work
- Check max wallet rejections

### 5. Plan for Growth
- What happens at 10x volume?
- Can treasury handle fee revenue?
- Will max wallet become too restrictive?

---

## Common Pitfalls

❌ **Fees Too High**
- >10% fees hurt adoption
- Users avoid transferring
- Liquidity stagnates

❌ **Max Wallet Too Low**
- <0.1% prevents DEX LPs
- Blocks institutional interest
- Fragments holdings

❌ **Unclear Tokenomics**
- Investors avoid complexity
- FUD spreads easily
- Trust damaged

❌ **Immutable Mistakes**
- Can't fix after renouncing
- Test thoroughly first
- Keep authority initially

✅ **Solution:** Test, document, iterate, then finalize.

---

## Custom Configurations

Mix and match features to create your ideal tokenomics:

```
Your Custom Token:
├─ Transfer Fee: ___%
├─ Max Wallet: ___%
├─ Split Recipients:
│   ├─ Treasury: ___%
│   ├─ Burn: ___%
│   ├─ Development: ___%
│   ├─ Marketing: ___%
│   └─ Community: ___%
└─ Extensions:
    ├─ Transfer Hook: Yes/No
    ├─ Freeze Authority: Yes/No
    └─ Mint Authority: Keep/Renounce
```

---

**Ready to design your tokenomics?** Use the examples above as templates and customize to fit your project's needs!
