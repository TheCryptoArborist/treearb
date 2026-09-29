import { SUI, TREE, TRADE_SIZES_SUI } from '../constants.js';
import { TurbosAdapter } from '../adapters/turbos.js';
import { CetusAdapter } from '../adapters/cetus.js';
import { SuiDexAdapter } from '../adapters/suidex.js';
import { mistsToSui, suiToMists } from '../math.js';
import type { VenueAdapter } from '../types.js';

const sender=process.env.TREE_ARB_QUOTE_ADDRESS ??
 '0x0000000000000000000000000000000000000000000000000000000000000000';
const venues:VenueAdapter[]=[new TurbosAdapter(),new CetusAdapter(),new SuiDexAdapter()];
const rows=[];
for(const size of TRADE_SIZES_SUI){
 const input=suiToMists(size);
 for(const buy of venues) for(const sell of venues){
  if(buy.venue===sell.venue) continue;
  try{
   const q1=await buy.quoteExactIn({coinIn:SUI,coinOut:TREE,amountIn:input,slippageBps:50,sender});
   const q2=await sell.quoteExactIn({coinIn:TREE,coinOut:SUI,amountIn:q1.amountOut,slippageBps:50,sender});
   const qc=await sell.quoteExactIn({coinIn:TREE,coinOut:SUI,amountIn:q1.minAmountOut,slippageBps:50,sender});
   const gross=q2.amountOut-input, protectedGross=qc.minAmountOut-input;
   rows.push({sizeSui:size,route:`${buy.venue}->${sell.venue}`,
    finalSui:mistsToSui(q2.amountOut),grossProfitSui:mistsToSui(gross),
    grossReturnPct:Number(gross)*100/Number(input),
    protectedFinalSui:mistsToSui(qc.minAmountOut),
    protectedReturnPct:Number(protectedGross)*100/Number(input)});
  }catch(error){rows.push({sizeSui:size,route:`${buy.venue}->${sell.venue}`,error:error instanceof Error?error.message:String(error)});}
 }
}
console.log(JSON.stringify(rows,null,2));
