import { SUI, TREE, TRADE_SIZES_SUI } from '../constants.js';
import { TurbosAdapter } from '../adapters/turbos.js';
import { CetusAdapter } from '../adapters/cetus.js';
import { mistsToSui, suiToMists } from '../math.js';

const sender = process.env.TREE_ARB_QUOTE_ADDRESS ??
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const turbos = new TurbosAdapter();
const cetus = new CetusAdapter();

async function route(size: number, buy: TurbosAdapter | CetusAdapter, sell: TurbosAdapter | CetusAdapter) {
  const input = suiToMists(size);
  const q1 = await buy.quoteExactIn({coinIn:SUI, coinOut:TREE, amountIn:input, slippageBps:50, sender});
  const q2 = await sell.quoteExactIn({coinIn:TREE, coinOut:SUI, amountIn:q1.amountOut, slippageBps:50, sender});
  const conservative = await sell.quoteExactIn({coinIn:TREE, coinOut:SUI, amountIn:q1.minAmountOut, slippageBps:50, sender});
  const expectedProfit = q2.amountOut-input;
  const protectedProfit = conservative.minAmountOut-input;
  return {
    sizeSui:size, route:`${buy.venue}->${sell.venue}`,
    finalSui:mistsToSui(q2.amountOut),
    grossProfitSui:mistsToSui(expectedProfit),
    grossReturnPct:Number(expectedProfit)*100/Number(input),
    protectedFinalSui:mistsToSui(conservative.minAmountOut),
    protectedReturnPct:Number(protectedProfit)*100/Number(input)
  };
}
const results=[];
for (const size of TRADE_SIZES_SUI) {
  results.push(await route(size,turbos,cetus));
  results.push(await route(size,cetus,turbos));
}
console.log(JSON.stringify(results,null,2));
