import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';
import { POOLS, SUI, TREE } from '../constants.js';

const CETUS_CLMM='0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb';
const CETUS_CONFIG='0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f';
const MAX_SQRT_PRICE=79226673515401279992447579055n;

export function buildCetusTreeToSui(
  tx:Transaction,
  inputTreeBalance:TransactionArgument,
  amountIn:bigint,
  minSuiOut:bigint,
):TransactionArgument {
  // TREE is CoinTypeA and SUI is CoinTypeB for this pool; TREE -> SUI is a2b.
  const [balTree,balSui,receipt]=tx.moveCall({
    target:`${CETUS_CLMM}::pool::flash_swap`,
    typeArguments:[TREE,SUI],
    arguments:[
      tx.object(CETUS_CONFIG),
      tx.object(POOLS.cetusV3),
      tx.pure.bool(true),
      tx.pure.bool(true),
      tx.pure.u64(amountIn),
      tx.pure.u128(4295048016n),
      tx.object.clock(),
    ],
  });

  // The flash receipt determines the exact TREE repayment. For the first
  // composability probe we require amountIn to be sufficient and split the
  // quoted exact-input amount from the provided TREE balance.
  const payTree=tx.moveCall({
    target:'0x2::balance::split',
    typeArguments:[TREE],
    arguments:[inputTreeBalance,tx.pure.u64(amountIn)],
  });
  const zeroSui=tx.moveCall({target:'0x2::balance::zero',typeArguments:[SUI]});
  tx.moveCall({
    target:`${CETUS_CLMM}::pool::repay_flash_swap`,
    typeArguments:[TREE,SUI],
    arguments:[tx.object(CETUS_CONFIG),tx.object(POOLS.cetusV3),payTree,zeroSui,receipt],
  });
  tx.moveCall({target:'0x2::balance::destroy_zero',typeArguments:[TREE],arguments:[balTree]});

  if(minSuiOut>0n){
    const check=tx.moveCall({target:'0x2::balance::split',typeArguments:[SUI],arguments:[balSui,tx.pure.u64(minSuiOut)]});
    tx.moveCall({target:'0x2::balance::join',typeArguments:[SUI],arguments:[balSui,check]});
  }
  return balSui;
}
