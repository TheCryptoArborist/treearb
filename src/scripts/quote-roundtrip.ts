import { SUI, TREE } from '../constants.js';
import { TurbosAdapter } from '../adapters/turbos.js';
import { CetusAdapter } from '../adapters/cetus.js';
import { mistsToSui, suiToMists } from '../math.js';

const sender =
  process.env.TREE_ARB_QUOTE_ADDRESS ??
  '0x0000000000000000000000000000000000000000000000000000000000000000';

const turbos = new TurbosAdapter();
const cetus = new CetusAdapter();

const inputSui = suiToMists(1);
const buy = await turbos.quoteExactIn({
  coinIn: SUI,
  coinOut: TREE,
  amountIn: inputSui,
  slippageBps: 50,
  sender,
});

const sellExpected = await cetus.quoteExactIn({
  coinIn: TREE,
  coinOut: SUI,
  amountIn: buy.amountOut,
  slippageBps: 50,
  sender,
});

const sellConservative = await cetus.quoteExactIn({
  coinIn: TREE,
  coinOut: SUI,
  amountIn: buy.minAmountOut,
  slippageBps: 50,
  sender,
});

const expectedProfit = sellExpected.amountOut - inputSui;
const protectedProfit = sellConservative.minAmountOut - inputSui;

console.log(JSON.stringify({
  route: 'Turbos -> Cetus',
  inputSui: mistsToSui(inputSui),
  turbosTreeOutBaseUnits: buy.amountOut.toString(),
  turbosTreeMinBaseUnits: buy.minAmountOut.toString(),
  turbosFeeBaseUnits: buy.feeAmount?.toString(),
  cetusExpectedSuiOut: mistsToSui(sellExpected.amountOut),
  cetusExpectedFeeBaseUnits: sellExpected.feeAmount?.toString(),
  expectedGrossProfitSui: mistsToSui(expectedProfit),
  expectedGrossReturnPct: Number(expectedProfit) * 100 / Number(inputSui),
  protectedFinalSui: mistsToSui(sellConservative.minAmountOut),
  protectedGrossProfitSui: mistsToSui(protectedProfit),
  protectedGrossReturnPct: Number(protectedProfit) * 100 / Number(inputSui),
  note: 'Gross round-trip quote only; transaction gas is not deducted here.'
}, null, 2));
