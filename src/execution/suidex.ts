import type { Transaction, TransactionArgument } from '@mysten/sui/transactions';
import { POOLS, SUI, TREE } from '../constants.js';

const SUIDEX_PACKAGE='0xb5f529c1dcda6580a61bf7ee9fbd524b50be62f11044d137c8202c8cbace9e56';
const SUIDEX_VERSION='0x0999bbc9c063580eca62e888b8f0d8e6e9159cd9db1b8a8c88e448a2b5dd4d4d';
const MIN_SQRT_PRICE=4295048016n;

export function buildSuiDexSuiToTree(
  tx:Transaction,
  inputBalance:TransactionArgument,
  amountIn:bigint,
  minTreeOut:bigint,
):TransactionArgument {
  const [balSui,balTree,receipt]=tx.moveCall({
    target:`${SUIDEX_PACKAGE}::trade::flash_swap`,
    typeArguments:[SUI,TREE],
    arguments:[
      tx.object(POOLS.suidexV3),
      tx.pure.bool(true),
      tx.pure.bool(true),
      tx.pure.u64(amountIn),
      tx.pure.u128(MIN_SQRT_PRICE+1n),
      tx.object.clock(),
      tx.object(SUIDEX_VERSION),
    ],
  });
  const zeroTree=tx.moveCall({target:'0x2::balance::zero',typeArguments:[TREE]});
  tx.moveCall({
    target:`${SUIDEX_PACKAGE}::trade::repay_flash_swap`,
    typeArguments:[SUI,TREE],
    arguments:[tx.object(POOLS.suidexV3),receipt,inputBalance,zeroTree,tx.object(SUIDEX_VERSION)],
  });
  tx.moveCall({target:'0x2::balance::destroy_zero',typeArguments:[SUI],arguments:[balSui]});
  if(minTreeOut>0n){
    const check=tx.moveCall({target:'0x2::balance::split',typeArguments:[TREE],arguments:[balTree,tx.pure.u64(minTreeOut)]});
    tx.moveCall({target:'0x2::balance::join',typeArguments:[TREE],arguments:[balTree,check]});
  }
  return balTree;
}
