import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { SUI, TREE } from '../constants.js';
import { suiToMists } from '../math.js';
import { SuiDexAdapter } from '../adapters/suidex.js';
import { CetusAdapter } from '../adapters/cetus.js';
import { buildSuiDexSuiToTree } from '../execution/suidex.js';
import { buildCetusTreeToSui } from '../execution/cetus.js';

const sender=process.env.TREE_ARB_SIM_ADDRESS;
if(!sender) throw new Error('TREE_ARB_SIM_ADDRESS is required');
const client=new SuiGrpcClient({network:'mainnet',baseUrl:process.env.SUI_RPC_URL ?? 'https://fullnode.mainnet.sui.io:443'});
const inputSui=suiToMists(1);

const suidex=new SuiDexAdapter();
const cetus=new CetusAdapter();
const buy=await suidex.quoteExactIn({coinIn:SUI,coinOut:TREE,amountIn:inputSui,slippageBps:50,sender});
const sell=await cetus.quoteExactIn({coinIn:TREE,coinOut:SUI,amountIn:buy.minAmountOut,slippageBps:50,sender});

const tx=new Transaction();
tx.setSender(sender);
const [suiCoin]=tx.splitCoins(tx.gas,[tx.pure.u64(inputSui)]);
const suiBal=tx.moveCall({target:'0x2::coin::into_balance',typeArguments:[SUI],arguments:[suiCoin]});
const treeBal=buildSuiDexSuiToTree(tx,suiBal,inputSui,buy.minAmountOut);
const outSuiBal=buildCetusTreeToSui(tx,treeBal,buy.minAmountOut,sell.minAmountOut);

// End-to-end profitability guard. Splitting this amount aborts atomically if
// the final SUI balance is below the caller's required return.
const requiredFinalSui=BigInt(process.env.TREE_ARB_MIN_FINAL_MIST ?? inputSui.toString());
const profitGuard=tx.moveCall({
  target:'0x2::balance::split',
  typeArguments:[SUI],
  arguments:[outSuiBal,tx.pure.u64(requiredFinalSui)],
});
tx.moveCall({
  target:'0x2::balance::join',
  typeArguments:[SUI],
  arguments:[outSuiBal,profitGuard],
});

const outSuiCoin=tx.moveCall({target:'0x2::coin::from_balance',typeArguments:[SUI],arguments:[outSuiBal]});
tx.transferObjects([outSuiCoin],tx.pure.address(sender));

const result=await client.core.simulateTransaction({transaction:tx,checksEnabled:false,include:{effects:true,events:true}});
console.log(JSON.stringify({
  quotes:{suidexTreeMin:buy.minAmountOut.toString(),cetusSuiMin:sell.minAmountOut.toString()},
  result
},(_,v)=>typeof v==='bigint'?v.toString():v,2));
if(result.$kind==='FailedTransaction') process.exitCode=2;
