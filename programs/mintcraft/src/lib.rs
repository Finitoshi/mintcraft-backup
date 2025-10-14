#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_2022::Token2022;
use anchor_lang::solana_program::program_pack::Pack;
use spl_token_2022::instruction::{initialize_mint2, mint_to};
use spl_token_2022::state::Mint as SplMint;

declare_id!("9HeGKECKeVEK6XEjjqTdwjReX2n28xdZJ8TSb4ibi9K1");

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
