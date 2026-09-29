export const SUI_SCALE = 1_000_000_000n;
export function suiToMists(v:number){ return BigInt(Math.round(v*1e9)); }
export function mistsToSui(v:bigint){ return Number(v)/1e9; }
export function minOut(amount:bigint,bps:number){ return amount*BigInt(10_000-bps)/10_000n; }
