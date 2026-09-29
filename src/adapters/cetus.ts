import { normalizeStructTag } from '@mysten/sui/utils';
import { CetusClmmSDK } from '@cetusprotocol/sui-clmm-sdk';
import { POOLS } from '../constants.js';
import { minOut } from '../math.js';
import type { NormalizedQuote, QuoteRequest, VenueAdapter } from '../types.js';

export class CetusAdapter implements VenueAdapter {
  readonly venue = 'Cetus' as const;
  private readonly sdk: ReturnType<typeof CetusClmmSDK.createSDK>;

  constructor(sdk = CetusClmmSDK.createSDK({ env: 'mainnet' })) {
    this.sdk = sdk;
  }

  async quoteExactIn(req: QuoteRequest): Promise<NormalizedQuote> {
    if (req.amountIn <= 0n) throw new Error('amountIn must be positive');

    const pool = await this.sdk.Pool.getPool(POOLS.cetusV3);
    const coinA = normalizeStructTag(pool.coin_type_a);
    const coinB = normalizeStructTag(pool.coin_type_b);
    const coinIn = normalizeStructTag(req.coinIn);
    const coinOut = normalizeStructTag(req.coinOut);

    let a2b: boolean;
    if (coinIn === coinA && coinOut === coinB) a2b = true;
    else if (coinIn === coinB && coinOut === coinA) a2b = false;
    else throw new Error(`Cetus pool does not contain requested pair: ${req.coinIn} -> ${req.coinOut}`);

    const result = await this.sdk.Swap.preSwap({
      pool,
      current_sqrt_price: pool.current_sqrt_price,
      coin_type_a: pool.coin_type_a,
      coin_type_b: pool.coin_type_b,
      decimals_a: pool.coin_amount_a,
      decimals_b: pool.coin_amount_b,
      a2b,
      by_amount_in: true,
      amount: req.amountIn.toString(),
    });

    if (!result) throw new Error('Cetus returned no pre-swap result');
    if (result.is_exceed) throw new Error('Cetus quote exceeds available liquidity');

    const amountOut = BigInt(result.estimated_amount_out);
    if (amountOut <= 0n) throw new Error('Cetus returned a zero/negative output');

    return {
      venue: this.venue,
      poolId: POOLS.cetusV3,
      coinIn: req.coinIn,
      coinOut: req.coinOut,
      amountIn: req.amountIn,
      amountOut,
      minAmountOut: minOut(amountOut, req.slippageBps),
      feeAmount: BigInt(result.estimated_fee_amount),
      executable: true,
      raw: result,
    };
  }
}
