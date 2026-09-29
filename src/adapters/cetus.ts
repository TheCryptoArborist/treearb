import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';
import { POOLS } from '../constants.js';
import { minOut } from '../math.js';
import type { NormalizedQuote, QuoteRequest, VenueAdapter } from '../types.js';

const CETUS_INTEGRATE =
  '0x996c4d9480708fb8b92aa7acf819fb0497b5ec8e65ba06601cae2fb6db3312c3';

function parseTypeArgs(type: string): [string, string] {
  const start = type.indexOf('<');
  const end = type.lastIndexOf('>');
  if (start < 0 || end <= start) throw new Error(`Unable to parse Cetus pool type: ${type}`);
  const inner = type.slice(start + 1, end);
  const args: string[] = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '<') depth++;
    else if (inner[i] === '>') depth--;
    else if (inner[i] === ',' && depth === 0) {
      args.push(inner.slice(last, i).trim());
      last = i + 1;
    }
  }
  args.push(inner.slice(last).trim());
  if (args.length < 2) throw new Error(`Expected two Cetus coin type args, got ${args.length}`);
  return [args[0]!, args[1]!];
}

export class CetusAdapter implements VenueAdapter {
  readonly venue = 'Cetus' as const;
  private readonly client: SuiGrpcClient;

  constructor(
    client = new SuiGrpcClient({
      network: 'mainnet',
      baseUrl: process.env.SUI_RPC_URL ?? 'https://fullnode.mainnet.sui.io:443',
    }),
  ) {
    this.client = client;
  }

  async quoteExactIn(req: QuoteRequest): Promise<NormalizedQuote> {
    if (req.amountIn <= 0n) throw new Error('amountIn must be positive');

    const { object } = await this.client.core.getObject({
      objectId: POOLS.cetusV3,
      include: { content: true },
    });
    if (!object.type) throw new Error('Cetus pool object has no type');

    const [rawA, rawB] = parseTypeArgs(object.type);
    const coinA = normalizeStructTag(rawA);
    const coinB = normalizeStructTag(rawB);
    const coinIn = normalizeStructTag(req.coinIn);
    const coinOut = normalizeStructTag(req.coinOut);

    let a2b: boolean;
    if (coinIn === coinA && coinOut === coinB) a2b = true;
    else if (coinIn === coinB && coinOut === coinA) a2b = false;
    else throw new Error(`Cetus pool does not contain requested pair: ${req.coinIn} -> ${req.coinOut}`);

    const tx = new Transaction();
    tx.moveCall({
      target: `${CETUS_INTEGRATE}::fetcher_script::calculate_swap_result`,
      typeArguments: [rawA, rawB],
      arguments: [
        tx.object(POOLS.cetusV3),
        tx.pure.bool(a2b),
        tx.pure.bool(true),
        tx.pure.u64(req.amountIn),
      ],
    });
    tx.setSender(req.sender);

    const sim = await this.client.core.simulateTransaction({
      transaction: tx,
      checksEnabled: false,
      include: { events: true },
    });
    if (sim.$kind === 'FailedTransaction') {
      throw new Error(`Cetus quote simulation failed: ${sim.FailedTransaction.status.error?.message ?? 'unknown error'}`);
    }

    const event = (sim.Transaction.events ?? []).find((e) =>
      e.eventType.includes('::fetcher_script::CalculatedSwapResultEvent'),
    );
    if (!event) throw new Error('Cetus CalculatedSwapResultEvent missing');

    const data = event.json as Record<string, unknown> | undefined;
    if (!data) throw new Error('Cetus quote event JSON missing');
    if (data.amount_out === undefined) {
      throw new Error(`Cetus quote event shape: ${JSON.stringify(data)}`);
    }

    const amountOut = BigInt(String(data.amount_out));
    const feeAmount = BigInt(String(data.fee_amount ?? 0));
    if (String(data.is_exceed) === 'true') throw new Error('Cetus quote exceeds available liquidity');
    if (amountOut <= 0n) throw new Error('Cetus returned a zero/negative output');

    return {
      venue: this.venue,
      poolId: POOLS.cetusV3,
      coinIn: req.coinIn,
      coinOut: req.coinOut,
      amountIn: req.amountIn,
      amountOut,
      minAmountOut: minOut(amountOut, req.slippageBps),
      feeAmount,
      executable: true,
      raw: data,
    };
  }
}
