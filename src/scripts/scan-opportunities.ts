import { SUI, TREE, TRADE_SIZES_SUI } from '../constants.js';
import { TurbosAdapter } from '../adapters/turbos.js';
import { CetusAdapter } from '../adapters/cetus.js';
import { SuiDexAdapter } from '../adapters/suidex.js';
import { suiToMists, mistsToSui } from '../math.js';
import type { VenueAdapter } from '../types.js';

const sender=process.env.TREE_ARB_QUOTE_ADDRESS ??
 '0x0000000000000000000000000000000000000000000000000000000000000000';
const gasSui=Number(process.env.TREE_ARB_GAS_SUI ?? '0.005');
const gas=suiToMists(gasSui);
const minNetPct=Number(process.env.TREE_ARB_MIN_NET_PCT ?? '0');
const slippageBps=Number(process.env.TREE_ARB_SLIPPAGE_BPS ?? '50');
const venues:VenueAdapter[]=[new TurbosAdapter(),new CetusAdapter(),new SuiDexAdapter()];
const rows=[];

for(const size of TRADE_SIZES_SUI){
  const input=suiToMists(size);
  for(const buy of venues) for(const sell of venues){
    if(buy.venue===sell.venue) continue;
    try{
      const q1=await buy.quoteExactIn({coinIn:SUI,coinOut:TREE,amountIn:input,slippageBps,sender});
      const q2=await sell.quoteExactIn({coinIn:TREE,coinOut:SUI,amountIn:q1.minAmountOut,slippageBps,sender});
      const protectedFinal=q2.minAmountOut;
      const net=protectedFinal-input-gas;
      const netPct=Number(net)*100/Number(input);
      rows.push({
        sizeSui:size, route:`${buy.venue}->${sell.venue}`,
        protectedFinalSui:mistsToSui(protectedFinal),
        estimatedGasSui:gasSui,
        netProfitSui:mistsToSui(net),
        netReturnPct:netPct,
        actionable:net>0n && netPct>=minNetPct,
      });
    }catch(error){
      rows.push({sizeSui:size,route:`${buy.venue}->${sell.venue}`,error:error instanceof Error?error.message:String(error),actionable:false});
    }
  }
}

const ranked=rows.filter((r:any)=>!r.error).sort((a:any,b:any)=>b.netReturnPct-a.netReturnPct);
const actionable=ranked.filter((r:any)=>r.actionable);
console.log(JSON.stringify({
  generatedAt:new Date().toISOString(),
  assumptions:{slippageBps,estimatedGasSui:gasSui,minNetPct},
  bestRoute:ranked[0] ?? null,
  actionableCount:actionable.length,
  actionable,
},null,2));

if(actionable.length===0) console.log('NO_EXECUTABLE_ARB');
