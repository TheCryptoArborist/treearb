import type {ArbResult,VenueAdapter} from './types.js';
import {TREE,SUI} from './constants.js';
export async function scanArbitrage(adapters:VenueAdapter[],inputSui:bigint,sender:string,slippageBps=50,estimatedGasSui=5_000_000n):Promise<ArbResult[]> {
 const out:ArbResult[]=[];
 for (const buy of adapters) for (const sell of adapters) {
  if (buy.venue===sell.venue) continue;
  const buyQuote=await buy.quoteExactIn({coinIn:SUI,coinOut:TREE,amountIn:inputSui,slippageBps,sender});
  const sellQuote=await sell.quoteExactIn({coinIn:TREE,coinOut:SUI,amountIn:buyQuote.minAmountOut,slippageBps,sender});
  const finalSui=sellQuote.minAmountOut;
  const netProfitSui=finalSui-inputSui-estimatedGasSui;
  out.push({buyVenue:buy.venue,sellVenue:sell.venue,inputSui,finalSui,estimatedGasSui,netProfitSui,netReturnPct:Number(netProfitSui)*100/Number(inputSui),buyQuote,sellQuote});
 }
 return out.sort((a,b)=>a.netProfitSui>b.netProfitSui?-1:a.netProfitSui<b.netProfitSui?1:0);
}
