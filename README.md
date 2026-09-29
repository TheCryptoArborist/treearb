# TREE Arb

Arbitrage scanner/execution project for TREE on Sui across **SuiDex, Cetus, and Turbos**.

TREE coin type:
`0x6c5a609f6d0288523ce4a6ed87d19ae127f62073ab75fd9b0b1c9b455d4895cf::tree::TREE`

## Current state

- Core six-direction arbitrage engine implemented.
- Trade-size matrix: 1 / 5 / 10 / 25 / 50 / 100 / 250 SUI.
- Slippage-aware two-leg calculation and estimated-gas deduction.
- Live adapters are intentionally disabled until their current SDK signatures are verified by CI/live tests.
- Mock quotes are explicitly non-executable and must never be surfaced as live opportunities.

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
npm run scan
```

Set `TREE_ARB_QUOTE_ADDRESS` to a public Sui address for SDK transaction inspection. No private key is required for quote-only testing.

## Sui implementation guidance

Before technical changes, check the current MystenLabs/skills repository. Relevant skills: `sui-sdks`, `ptbs`, `accessing-data`, and `frontend-apps`.

## Safety boundary

No transaction execution is enabled until each venue adapter is proven against current mainnet quote/swap interfaces and minimum-output protection is validated.

<!-- CI discovery trigger: 2026-09-29 -->

<!-- full matrix trigger: 2026-09-29 -->
