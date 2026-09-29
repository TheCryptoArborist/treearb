import { Transaction } from '@mysten/sui/transactions';
import { SUI } from '../constants.js';
import { buildSuiDexSuiToTree } from './suidex.js';
import { buildCetusTreeToSui } from './cetus.js';

export interface SuiDexToCetusAtomicParams {
  sender: string;
  amountInSui: bigint;
  minTreeOut: bigint;
  minCetusSuiOut: bigint;
  minFinalSui: bigint;
}

/**
 * Builds (but does not sign or execute) an atomic SuiDex -> Cetus arb PTB.
 * Any leg failure or final-return shortfall reverts the whole transaction.
 */
export function buildSuiDexToCetusAtomic(params:SuiDexToCetusAtomicParams):Transaction {
  const tx=new Transaction();
  tx.setSender(params.sender);

  const [suiCoin]=tx.splitCoins(tx.gas,[tx.pure.u64(params.amountInSui)]);
  const suiBal=tx.moveCall({
    target:'0x2::coin::into_balance',
    typeArguments:[SUI],
    arguments:[suiCoin],
  });

  const treeBal=buildSuiDexSuiToTree(
    tx,suiBal,params.amountInSui,params.minTreeOut,
  );
  const finalSuiBal=buildCetusTreeToSui(
    tx,treeBal,params.minTreeOut,params.minCetusSuiOut,
  );

  // End-to-end profit/return guard. balance::split aborts if insufficient.
  const guard=tx.moveCall({
    target:'0x2::balance::split',
    typeArguments:[SUI],
    arguments:[finalSuiBal,tx.pure.u64(params.minFinalSui)],
  });
  tx.moveCall({
    target:'0x2::balance::join',
    typeArguments:[SUI],
    arguments:[finalSuiBal,guard],
  });

  const finalCoin=tx.moveCall({
    target:'0x2::coin::from_balance',
    typeArguments:[SUI],
    arguments:[finalSuiBal],
  });
  tx.transferObjects([finalCoin],tx.pure.address(params.sender));
  return tx;
}
