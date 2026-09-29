import { SUI, TREE } from '../constants.js';
import { TurbosAdapter } from '../adapters/turbos.js';
import { mistsToSui, suiToMists } from '../math.js';

const sender =
  process.env.TREE_ARB_QUOTE_ADDRESS ??
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const adapter = new TurbosAdapter();
const quote = await adapter.quoteExactIn({
  coinIn: SUI,
  coinOut: TREE,
  amountIn: suiToMists(1),
  slippageBps: 50,
  sender,
});

console.log(
  JSON.stringify(
    {
      venue: quote.venue,
      poolId: quote.poolId,
      inputSui: mistsToSui(quote.amountIn),
      amountOutTreeBaseUnits: quote.amountOut.toString(),
      minAmountOutTreeBaseUnits: quote.minAmountOut.toString(),
      feeAmount: quote.feeAmount?.toString(),
      executable: quote.executable,
    },
    null,
    2,
  ),
);
