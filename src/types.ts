export type VenueName = 'Turbos'|'Cetus'|'SuiDex';
export interface QuoteRequest { coinIn:string; coinOut:string; amountIn:bigint; slippageBps:number; sender:string; }
export interface NormalizedQuote { venue:VenueName; poolId:string; coinIn:string; coinOut:string; amountIn:bigint; amountOut:bigint; minAmountOut:bigint; feeAmount?:bigint; priceImpactPct?:number; executable:boolean; raw?:unknown; }
export interface VenueAdapter { readonly venue:VenueName; quoteExactIn(req:QuoteRequest):Promise<NormalizedQuote>; }
export interface ArbResult { buyVenue:VenueName; sellVenue:VenueName; inputSui:bigint; finalSui:bigint; estimatedGasSui:bigint; netProfitSui:bigint; netReturnPct:number; buyQuote:NormalizedQuote; sellQuote:NormalizedQuote; }
