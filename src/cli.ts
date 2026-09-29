import {POOLS,TRADE_SIZES_SUI} from './constants.js'; import {MockAdapter} from './adapters/mock.js'; import {scanArbitrage} from './engine.js'; import {suiToMists,mistsToSui} from './math.js';
const sender=process.env.TREE_ARB_QUOTE_ADDRESS ?? '0x0';
const adapters=[new MockAdapter('Turbos',POOLS.turbosV3,1.00),new MockAdapter('Cetus',POOLS.cetusV3,1.01),new MockAdapter('SuiDex',POOLS.suidexV3,0.99)];
for (const size of TRADE_SIZES_SUI){ const r=await scanArbitrage(adapters,suiToMists(size),sender); console.log(size,'SUI',r.map(x=>({route:`${x.buyVenue}->${x.sellVenue}`,net:mistsToSui(x.netProfitSui),executable:x.buyQuote.executable&&x.sellQuote.executable}))); }
console.warn('Mock-only scanner: results are NOT executable and MUST NOT be shown as live arbitrage.');
