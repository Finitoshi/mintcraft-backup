#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::AccountDeserialize;
use anchor_lang::solana_program::{
    program::invoke_signed,
    program_pack::Pack,
    system_instruction,
};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_2022::Token2022;
use anchor_spl::token_interface::TokenAccount;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_token_2022::instruction::{initialize_mint2, mint_to};
use spl_token_2022::{
    extension::StateWithExtensions,
    state::{Account as SplTokenAccount, Mint as SplMint},
};
use spl_transfer_hook_interface::{collect_extra_account_metas_signer_seeds, instruction::ExecuteInstruction};

declare_id!("Hbcw8A9kdqWHt1p5C6XY1864t4PjNWa8zaiysfZMqBn4");

const MAX_WALLET_CONFIG_SEED: &[u8] = b"max-wallet-config";
const REFLECTION_CONFIG_SEED: &[u8] = b"reflection-config";
const USER_CLAIM_STATE_SEED: &[u8] = b"user-claim-state";
const MAX_BPS: u16 = 10_000;

#[program]
pub mod mintcraft {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("Mintcraft program initialized!");
        Ok(())
    }

    pub fn create_token(ctx: Context<CreateToken>, args: TokenArgs) -> Result<()> {
        msg!("Creating token: {}", args.name);
        msg!("Symbol: {}", args.symbol);
        msg!("Decimals: {}", args.decimals);
        msg!("Supply: {}", args.supply);
        msg!("URI: {}", args.uri);

        // Create the mint account
        let mint_space = SplMint::LEN;
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(mint_space);

        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::create_account(
                &ctx.accounts.payer.key(),
                &ctx.accounts.mint.key(),
                lamports,
                mint_space as u64,
                &spl_token_2022::id(),
            ),
            &[
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Initialize the mint account
        anchor_lang::solana_program::program::invoke(
            &initialize_mint2(
                &spl_token_2022::id(),
                &ctx.accounts.mint.key(),
                &ctx.accounts.payer.key(),
                Some(&ctx.accounts.payer.key()),
                args.decimals,
            )?,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.rent.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        // Create the payer's associated token account
        anchor_spl::associated_token::create(CpiContext::new(
            ctx.accounts.associated_token_program.to_account_info(),
            anchor_spl::associated_token::Create {
                payer: ctx.accounts.payer.to_account_info(),
                associated_token: ctx.accounts.associated_token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        ))?;

        // Mint initial supply to the associated token account
        anchor_lang::solana_program::program::invoke(
            &mint_to(
                &spl_token_2022::id(),
                &ctx.accounts.mint.key(),
                &ctx.accounts.associated_token_account.key(),
                &ctx.accounts.payer.key(),
                &[],
                args.supply,
            )?,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.associated_token_account.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn initialize_max_wallet_config(
        ctx: Context<InitializeMaxWalletConfig>,
        max_wallet_bps: u16,
    ) -> Result<()> {
        require!(
            max_wallet_bps <= MAX_BPS,
            MaxWalletError::InvalidMaxWalletBps
        );

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.max_wallet_bps = max_wallet_bps;
        config.bump = ctx.bumps.config;
        config.reserved = [0; 5];

        let mint_key = ctx.accounts.mint.key();
        let (extra_meta_address, extra_meta_bump) =
            spl_transfer_hook_interface::get_extra_account_metas_address_and_bump_seed(
                &mint_key,
                ctx.program_id,
            );
        require_keys_eq!(
            extra_meta_address,
            ctx.accounts.extra_account_metas.key(),
            MaxWalletError::InvalidExtraAccountMetaAccount
        );

        let extra_meta_info = ctx.accounts.extra_account_metas.to_account_info();
        let extra_meta_space = ExtraAccountMetaList::size_of(1)
            .map_err(|_| MaxWalletError::ExtraAccountMetaSerialization)?;
        let rent = Rent::get()?;
        let required_lamports = rent.minimum_balance(extra_meta_space);

        if extra_meta_info.owner != ctx.program_id || extra_meta_info.data_len() == 0 {
            invoke_signed(
                &system_instruction::create_account(
                    &ctx.accounts.payer.key(),
                    &extra_meta_address,
                    required_lamports,
                    extra_meta_space as u64,
                    ctx.program_id,
                ),
                &[
                    ctx.accounts.payer.to_account_info(),
                    extra_meta_info.clone(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[&collect_extra_account_metas_signer_seeds(
                    &mint_key,
                    &[extra_meta_bump],
                )],
            )?;
        }

        let extra_meta = ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: MAX_WALLET_CONFIG_SEED.to_vec(),
                },
                Seed::AccountKey { index: 1 }, // mint account
            ],
            false,
            false,
        )
        .map_err(|_| MaxWalletError::ExtraAccountMetaSerialization)?;

        {
            let mut data = extra_meta_info
                .try_borrow_mut_data()
                .map_err(|_| MaxWalletError::ExtraAccountMetaSerialization)?;
            let result = if data.iter().all(|byte| *byte == 0) {
                ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &[extra_meta])
            } else {
                ExtraAccountMetaList::update::<ExecuteInstruction>(&mut data, &[extra_meta])
            };
            result.map_err(|_| MaxWalletError::ExtraAccountMetaSerialization)?;
        }

        Ok(())
    }

    pub fn update_max_wallet_config(
        ctx: Context<UpdateMaxWalletConfig>,
        max_wallet_bps: u16,
    ) -> Result<()> {
        require!(
            max_wallet_bps <= MAX_BPS,
            MaxWalletError::InvalidMaxWalletBps
        );
        let config = &mut ctx.accounts.config;
        config.max_wallet_bps = max_wallet_bps;
        Ok(())
    }

    #[instruction(discriminator = &EXECUTE_DISCRIMINATOR)]
    pub fn execute(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
        process_execute(ctx, amount)
    }

    /// Initialize reflection configuration for a token
    pub fn initialize_reflection_config(
        ctx: Context<InitializeReflectionConfig>,
        reward_token_mint: Pubkey,
        min_holding: u64,
        gas_rebate_bps: u16,
    ) -> Result<()> {
        require!(
            gas_rebate_bps <= MAX_BPS,
            ReflectionError::InvalidGasRebateBps
        );

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.reward_token_mint = reward_token_mint;
        config.min_holding = min_holding;
        config.gas_rebate_bps = gas_rebate_bps;
        config.total_distributed = 0;
        config.bump = ctx.bumps.config;

        msg!("Reflection config initialized");
        msg!("Reward token mint: {}", reward_token_mint);
        msg!("Min holding: {}", min_holding);
        msg!("Gas rebate BPS: {}", gas_rebate_bps);

        Ok(())
    }

    /// Update reflection configuration (authority only)
    pub fn update_reflection_config(
        ctx: Context<UpdateReflectionConfig>,
        min_holding: Option<u64>,
        gas_rebate_bps: Option<u16>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(min) = min_holding {
            config.min_holding = min;
            msg!("Updated min holding: {}", min);
        }

        if let Some(bps) = gas_rebate_bps {
            require!(bps <= MAX_BPS, ReflectionError::InvalidGasRebateBps);
            config.gas_rebate_bps = bps;
            msg!("Updated gas rebate BPS: {}", bps);
        }

        Ok(())
    }

    /// Claim reflections with gas rebate deducted
    pub fn claim_reflection(
        ctx: Context<ClaimReflection>,
        amount: u64,
    ) -> Result<()> {
        let config = &ctx.accounts.reflection_config;
        let user_state = &mut ctx.accounts.user_claim_state;

        // Initialize user claim state if this is the first claim
        if user_state.user == Pubkey::default() {
            user_state.user = ctx.accounts.user.key();
            user_state.mint = ctx.accounts.mint.key();
            user_state.total_claimed = 0;
            user_state.last_claim_timestamp = 0;
        }

        // Calculate gas rebate
        let gas_rebate = (amount as u128)
            .checked_mul(config.gas_rebate_bps as u128)
            .ok_or(ReflectionError::NumericalOverflow)?
            .checked_div(MAX_BPS as u128)
            .ok_or(ReflectionError::NumericalOverflow)? as u64;

        let net_amount = amount
            .checked_sub(gas_rebate)
            .ok_or(ReflectionError::InsufficientAmount)?;

        msg!("Claiming reflection");
        msg!("Gross amount: {}", amount);
        msg!("Gas rebate ({}%): {}", config.gas_rebate_bps as f64 / 100.0, gas_rebate);
        msg!("Net amount: {}", net_amount);

        // Transfer net amount to user
        let cpi_accounts = anchor_spl::token_2022::Transfer {
            from: ctx.accounts.treasury_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.treasury_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        anchor_spl::token_2022::transfer(cpi_ctx, net_amount)?;

        // Update user claim state
        user_state.total_claimed = user_state
            .total_claimed
            .checked_add(amount)
            .ok_or(ReflectionError::NumericalOverflow)?;
        user_state.last_claim_timestamp = Clock::get()?.unix_timestamp;

        // Update global config
        let config_mut = &mut ctx.accounts.reflection_config;
        config_mut.total_distributed = config_mut
            .total_distributed
            .checked_add(amount)
            .ok_or(ReflectionError::NumericalOverflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Mint account created within the instruction
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    /// CHECK: Associated token account created within the instruction
    #[account(mut)]
    pub associated_token_account: AccountInfo<'info>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TokenArgs {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub supply: u64,
    pub uri: String,
}

#[derive(Accounts)]
pub struct InitializeMaxWalletConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: The Token-2022 mint
    pub mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = MaxWalletConfig::LEN,
        seeds = [MAX_WALLET_CONFIG_SEED, mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, MaxWalletConfig>,
    /// CHECK: Extra account meta PDA derived by the interface
    #[account(mut)]
    pub extra_account_metas: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateMaxWalletConfig<'info> {
    pub authority: Signer<'info>,
    /// CHECK: The Token-2022 mint
    pub mint: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [MAX_WALLET_CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, MaxWalletConfig>,
}

#[derive(Accounts)]
pub struct TransferHookExecute<'info> {
    /// CHECK: Provided by the SPL Token-2022 program
    pub source: AccountInfo<'info>,
    /// CHECK: Provided by the SPL Token-2022 program
    pub mint: AccountInfo<'info>,
    /// CHECK: Provided by the SPL Token-2022 program
    pub destination: AccountInfo<'info>,
    /// CHECK: Owner or delegate authorized for the transfer
    pub authority: AccountInfo<'info>,
    /// CHECK: Extra account metas provided by SPL Token-2022
    pub extra_account_metas: AccountInfo<'info>,
    #[account(
        seeds = [MAX_WALLET_CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, MaxWalletConfig>,
}

#[account]
pub struct MaxWalletConfig {
    pub authority: Pubkey,
    pub max_wallet_bps: u16,
    pub bump: u8,
    pub reserved: [u8; 5],
}

impl MaxWalletConfig {
    pub const LEN: usize = 8 /*disc*/ + 32 + 2 + 1 + 5;
}

const EXECUTE_DISCRIMINATOR: [u8; 8] = [105, 37, 101, 197, 75, 251, 102, 26];

fn process_execute(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.config;

    if config.max_wallet_bps == 0 || config.max_wallet_bps >= MAX_BPS {
        return Ok(());
    }

    let mint_data = ctx
        .accounts
        .mint
        .try_borrow_data()
        .map_err(|_| MaxWalletError::AccountBorrowFailed)?;
    let mint_state = StateWithExtensions::<SplMint>::unpack(&mint_data)
        .map_err(|_| MaxWalletError::InvalidMint)?;
    let mint_base = mint_state.base;

    let destination_data = ctx
        .accounts
        .destination
        .try_borrow_data()
        .map_err(|_| MaxWalletError::AccountBorrowFailed)?;
    let destination_state = StateWithExtensions::<SplTokenAccount>::unpack(&destination_data)
        .map_err(|_| MaxWalletError::InvalidTokenAccount)?;
    let destination_base = destination_state.base;

    require_keys_eq!(
        destination_base.mint,
        ctx.accounts.mint.key(),
        MaxWalletError::DestinationMintMismatch
    );

    if destination_base.owner == config.authority {
        return Ok(());
    }

    let cap = {
        let scaled = (mint_base.supply as u128)
            .checked_mul(config.max_wallet_bps as u128)
            .ok_or(MaxWalletError::NumericalOverflow)?
            .checked_add((MAX_BPS as u128) - 1)
            .ok_or(MaxWalletError::NumericalOverflow)?;

        let mut value = scaled / (MAX_BPS as u128);
        if value == 0 && config.max_wallet_bps > 0 && mint_base.supply > 0 {
            value = 1;
        }
        value
    };

    let current_balance = destination_base.amount as u128;
    let transfer_amount = amount as u128;
    let (pre_balance, post_balance) = if current_balance >= transfer_amount {
        (current_balance - transfer_amount, current_balance)
    } else {
        (
            current_balance,
            current_balance
                .checked_add(transfer_amount)
                .ok_or(MaxWalletError::NumericalOverflow)?,
        )
    };

    msg!(
        "max_wallet_bps: {}, cap: {}, pre_balance: {}, amount: {}, post_balance: {}",
        config.max_wallet_bps,
        cap,
        pre_balance,
        amount,
        post_balance
    );

    require!(post_balance <= cap, MaxWalletError::MaxWalletExceeded);

    Ok(())
}

// Reflection account structures
#[derive(Accounts)]
pub struct InitializeReflectionConfig<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: The Token-2022 mint
    pub mint: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = ReflectionConfig::LEN,
        seeds = [REFLECTION_CONFIG_SEED, mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, ReflectionConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReflectionConfig<'info> {
    pub authority: Signer<'info>,
    /// CHECK: The Token-2022 mint
    pub mint: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [REFLECTION_CONFIG_SEED, mint.key().as_ref()],
        bump = config.bump,
        has_one = authority
    )]
    pub config: Account<'info, ReflectionConfig>,
}

#[derive(Accounts)]
pub struct ClaimReflection<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: The Token-2022 mint
    pub mint: UncheckedAccount<'info>,
    #[account(
        seeds = [REFLECTION_CONFIG_SEED, mint.key().as_ref()],
        bump = reflection_config.bump
    )]
    pub reflection_config: Account<'info, ReflectionConfig>,
    #[account(
        init_if_needed,
        payer = user,
        space = UserClaimState::LEN,
        seeds = [USER_CLAIM_STATE_SEED, mint.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_claim_state: Account<'info, UserClaimState>,
    /// CHECK: Treasury authority that holds the reflection pool
    pub treasury_authority: Signer<'info>,
    #[account(mut)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ReflectionConfig {
    pub authority: Pubkey,
    pub reward_token_mint: Pubkey,  // The token to distribute as rewards (can be same as main token or different)
    pub min_holding: u64,
    pub gas_rebate_bps: u16,
    pub total_distributed: u64,
    pub bump: u8,
}

impl ReflectionConfig {
    pub const LEN: usize = 8 /*disc*/ + 32 + 32 + 8 + 2 + 8 + 1;  // Added 32 bytes for reward_token_mint
}

#[account]
pub struct UserClaimState {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub total_claimed: u64,
    pub last_claim_timestamp: i64,
}

impl UserClaimState {
    pub const LEN: usize = 8 /*disc*/ + 32 + 32 + 8 + 8;
}

#[error_code]
pub enum MaxWalletError {
    #[msg("Maximum wallet basis points must be 0-10,000")]
    InvalidMaxWalletBps,
    #[msg("Bump not found for config PDA")]
    BumpNotFound,
    #[msg("Invalid extra account meta state account")]
    InvalidExtraAccountMetaAccount,
    #[msg("Failed to serialize extra account meta data")]
    ExtraAccountMetaSerialization,
    #[msg("Account borrow failed")]
    AccountBorrowFailed,
    #[msg("Invalid mint account")]
    InvalidMint,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Destination account mint mismatch")]
    DestinationMintMismatch,
    #[msg("Numerical overflow")]
    NumericalOverflow,
    #[msg("Transfer exceeds the maximum allowed wallet allocation")]
    MaxWalletExceeded,
}

#[error_code]
pub enum ReflectionError {
    #[msg("Gas rebate basis points must be 0-10,000")]
    InvalidGasRebateBps,
    #[msg("Numerical overflow")]
    NumericalOverflow,
    #[msg("Insufficient amount for gas rebate")]
    InsufficientAmount,
}
