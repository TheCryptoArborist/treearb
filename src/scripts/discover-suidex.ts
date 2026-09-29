import { SuiGrpcClient } from '@mysten/sui/grpc';
import { normalizeStructTag } from '@mysten/sui/utils';
import { suidexCLMM } from '@suidex/clmm-sdk';
import { SUI, TREE } from '../constants.js';

const client = new SuiGrpcClient({
  network:'mainnet',
  baseUrl:process.env.SUI_RPC_URL ?? 'https://fullnode.mainnet.sui.io:443',
}).$extend(suidexCLMM());

const target = new Set([normalizeStructTag(SUI), normalizeStructTag(TREE)]);
const pools = await client.suidex.api.getAllPools();
const matches = pools.filter((p) => {
  try {
    return target.has(normalizeStructTag(p.tokenXType)) &&
      target.has(normalizeStructTag(p.tokenYType)) &&
      normalizeStructTag(p.tokenXType) !== normalizeStructTag(p.tokenYType);
  } catch { return false; }
});
console.log(JSON.stringify(matches.map(p=>({
  poolId:p.poolId, tokenXType:p.tokenXType, tokenYType:p.tokenYType,
  feeRate:p.feeRate, tickSpacing:p.tickSpacing, liquidity:p.liquidity.toString(),
  tvlUsd:p.tvlUsd, volume24hUsd:p.volume24hUsd, approved:p.approved
})),null,2));
if(matches.length===0) process.exitCode=2;
