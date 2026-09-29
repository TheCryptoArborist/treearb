import { SuiGrpcClient } from '@mysten/sui/grpc';
import { normalizeStructTag } from '@mysten/sui/utils';
import { suidexCLMM } from '@suidex/clmm-sdk';
import { POOLS } from '../constants.js';
import { minOut } from '../math.js';
import type { NormalizedQuote, QuoteRequest, VenueAdapter } from '../types.js';

export class SuiDexAdapter implements VenueAdapter {
  readonly venue = 'SuiDex' as const;
  private readonly client;

  constructor(
    client = new SuiGrpcClient({
      network: 'mainnet',
      baseUrl: process.env.SUI_RPC_URL ?? 'https://fullnode.mainnet.sui.io:443',
    }).$extend(suidexCLMM()),
  ) {
    this.client = client;
  }

  async quoteExactIn(req: QuoteRequest): Promise<NormalizedQuote> {
    if (req.amountIn <= 0n) throw new Error('amountIn must be positive');

    const pool = await this.client.suidex.getPool(POOLS.suidexV3);
    if (!pool.tokenXType || pool.tokenXType === '0x' || !pool.tokenYType || pool.tokenYType === '0x') {
      throw new Error(`SuiDex pool ${POOLS.suidexV3} did not expose token types via getPool(): ${JSON.stringify(pool, (_, v) => typeof v === 'bigint' ? v.toString() : v)}`);
    }
    const tokenX = normalizeStructTag(pool.tokenXType);
    const tokenY = normalizeStructTag(pool.tokenYType);
    const coinIn = normalizeStructTag(req.coinIn);
    const coinOut = normalizeStructTag(req.coinOut);

    let isXtoY: boolean;
    if (coinIn === tokenX && coinOut === tokenY) isXtoY = true;
    else if (coinIn === tokenY && coinOut === tokenX) isXtoY = false;
    else throw new Error(`SuiDex pool does not contain requested pair: ${req.coinIn} -> ${req.coinOut}`);

    const quote = await this.client.suidex.view.getQuote({
      poolId: POOLS.suidexV3,
      tokenXType: pool.tokenXType,
      tokenYType: pool.tokenYType,
      isXtoY,
      amountIn: req.amountIn,
    });

    if (quote.amountOut <= 0n) throw new Error('SuiDex returned a zero/negative output');

    return {
      venue: this.venue,
      poolId: POOLS.suidexV3,
      coinIn: req.coinIn,
      coinOut: req.coinOut,
      amountIn: req.amountIn,
      amountOut: quote.amountOut,
      minAmountOut: minOut(quote.amountOut, req.slippageBps),
      feeAmount: quote.feeAmount,
      priceImpactPct: Number(quote.priceImpact),
      executable: true,
      raw: quote,
    };
  }
}
