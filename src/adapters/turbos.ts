import { normalizeStructTag } from '@mysten/sui/utils';
import { Network, TurbosSdk } from 'turbos-clmm-sdk';
import { POOLS } from '../constants.js';
import { minOut } from '../math.js';
import type { NormalizedQuote, QuoteRequest, VenueAdapter } from '../types.js';

export class TurbosAdapter implements VenueAdapter {
  readonly venue = 'Turbos' as const;
  private readonly sdk: TurbosSdk;

  constructor(sdk = new TurbosSdk(Network.mainnet)) {
    this.sdk = sdk;
  }

  async quoteExactIn(req: QuoteRequest): Promise<NormalizedQuote> {
    if (req.amountIn <= 0n) throw new Error('amountIn must be positive');

    const typeArguments = await this.sdk.pool.getPoolTypeArguments(POOLS.turbosV3);
    const coinA = normalizeStructTag(typeArguments[0]!);
    const coinB = normalizeStructTag(typeArguments[1]!);
    const coinIn = normalizeStructTag(req.coinIn);
    const coinOut = normalizeStructTag(req.coinOut);

    let a2b: boolean;
    if (coinIn === coinA && coinOut === coinB) {
      a2b = true;
    } else if (coinIn === coinB && coinOut === coinA) {
      a2b = false;
    } else {
      throw new Error(
        `Turbos pool does not contain requested pair: ${req.coinIn} -> ${req.coinOut}`,
      );
    }

    const [result] = await this.sdk.trade.computeSwapResult({
      pools: [{ pool: POOLS.turbosV3, a2b }],
      address: req.sender,
      amountSpecified: req.amountIn.toString(),
      amountSpecifiedIsInput: true,
    });

    if (!result) throw new Error('Turbos returned no swap result');

    const amountOut = BigInt(a2b ? result.amount_b : result.amount_a);
    if (amountOut <= 0n) throw new Error('Turbos returned a zero/negative output');

    return {
      venue: this.venue,
      poolId: POOLS.turbosV3,
      coinIn: req.coinIn,
      coinOut: req.coinOut,
      amountIn: req.amountIn,
      amountOut,
      minAmountOut: minOut(amountOut, req.slippageBps),
      feeAmount: BigInt(result.fee_amount),
      executable: true,
      raw: result,
    };
  }
}
