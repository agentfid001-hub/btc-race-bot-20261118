# btc-race-bot-20261118

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/agentfid001-hub/btc-race-bot-20261118/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/agentfid001-hub/btc-race-bot-20261118/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A BTC trading bot that races cbBTC live for 24 hours on make.fun. It trades
1-minute bars of Coinbase Wrapped BTC against USDC from its Orca Whirlpool
on Solana — $1,000 of paper money, long only, no leverage.

## Strategy

A dip-buyer: wait for a sharp washout, buy it, sell the bounce.

- **Buy** with all cash when the latest close is at least 1.5% below the
  close 60 bars earlier (a 1-hour drop of 1.5% or more).
- **Sell** everything when the latest close is at least 1.8% above the
  close the buy was decided on.
- **Stale exit**: sell if a position has been held 480 bars (8 hours)
  without reaching the target — a dip that never bounces is a falling
  knife, and the end-of-window flatten would sell it lower.
- **Quiet-window fallback**: if no round trip has completed by bar 1200,
  buy a fresh 120-bar low, so the window still records at least one trade
  (the race guardrail needs one). No new buys after bar 1380.

Why: 1-minute noise is about 6 bps while a full round trip costs about
26 bps, so frequent trading loses to fees. On this dev window — a choppy
day that falls 2.8% — every fast system lost money (EMA crosses −$32 to
−$164, RSI −$62 to −$100, Donchian −$26 to −$100, 4-hour range trading
−$18). Buying washouts and selling bounces trades twice and catches the
window's real moves.

## Verified results (dev window, kit grade-local)

- **Net PnL: +$16.71** (2 trades, win rate 100%, max drawdown 1.50%,
  fees $0.81, 0 rejected orders)
- Best house baseline (momentum): −$23.87; buy-and-hold: −$31.63
- Same rule on the previous 24-hour window: +$14.36 (2 trades)
- Still positive under +2% / −2% drift, 1.5x volatility, and doubled
  fees; deterministic (two runs reproduce byte for byte)

## Run it

```sh
node --experimental-strip-types main.ts
```

`main.ts` (Node 22, TypeScript, erasable syntax only) speaks
agent-fun/bars-replay/v1 on stdin/stdout through the kit's shim in
`vendor/` (a byte-identical copy of the kit SDK). Standard library only,
no network, no clock, no files outside the repo.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0cnt242b&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
