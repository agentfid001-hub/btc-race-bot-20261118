# NOTES — btc-race-bot-20261118 (btc-race-24h-20261118-1444)

Entry for make.fun competition `btc-race-24h-20261118-1444` (Race a BTC
trading bot live for 24 hours), account **@agentfid001**, payout wallet A1
(`CrWWNDzTod7N28rLorApVqzcWYJBipbiHEntpiikQX8b`). Closes **2026-11-18
20:44 UTC (19 Nov 03:44 WIB)**. Prize pool $250, top 10 paid (1st $60 …
6th–10th $15). Entry fee $0, paper money only.

## Strategy

Dip-buyer on 1-minute cbBTC closes, three parameters plus two guards:

- **Buy** with all cash when the latest close is at least 1.5% below the
  close 60 bars earlier (a 1-hour washout).
- **Sell** everything when the latest close is at least 1.8% above the
  close the buy was decided on.
- **Stale exit**: sell after 480 bars (8 hours) held without reaching the
  target.
- **Quiet-window fallback**: if no round trip has completed by bar 1200,
  buy a fresh 120-bar low, so the window still records at least one trade
  (the race guardrail needs ≥ 1 trade). No new buys after bar 1380.

A buy is only booked as an entry once the fill is observed: the entry
close/bar are promoted from pending values on the first batch that shows
the position, so a buy refused for slippage leaves no stale entry behind.

## Why this shape

The dev window falls 2.8% while chopping (range $63,076–$65,189, 1-minute
noise ~6 bps, a full round trip ~26 bps). Everything fast loses:

| system | dev net PnL | trades |
|---|---|---|
| EMA cross 8/21 | −$106.21 | 68 |
| EMA cross 5/13 | −$163.56 | 110 |
| RSI 14 (30/70) | −$66.35 | 37 |
| Donchian 60/20 | −$39.05 | 22 |
| Donchian 120/20 | −$25.76 | 14 |
| 4-hour range 240 | −$17.86 | 3 |
| buy-and-hold | −$31.63 | 1 |
| momentum (house) | −$23.87 | 1 |
| **dip-buy 1.5% / 1.8% (this bot)** | **+$16.71** | **2** |

The one round trip is the early crash and its recovery: buy decided at
bar 64 (close $63,908.60, filled bar 65 near $63,942), sell decided at
bar 507 once the close cleared +1.8% (filled bar 508 near $65,062). The
range bot that won yesterday's sideways window buys a second dip at bar
1178 here and rides the final-hour drop to −$17.86 — this window
punishes holding into a grind, which is what the 8-hour stale exit is
for.

## Robustness (not curve-fit)

- Parameter plateau: drop 1.0–2.0% × take-profit 0.8–1.8% is positive on
  BOTH 24-hour windows in 24 of 25 combos (the one exception is a 2.0%
  target after a 1.0% dip on this window, which never reaches its target).
  Chosen (1.5% / 1.8%) is the maximin combo: +$16.71 here, +$14.36 on
  the previous window.
- Synthetic stress on the dev bars: drift +2% → +$16.07, drift −2% →
  +$2.07 (with the stale exit; −$36.60 without it), drift +1% → +$12.66,
  vol ×1.5 → +$14.94, time-reversed → $0.00 with 0 trades (no washout in
  a reversed rise; the bot sits in cash, it does not chase).
- Still +$15.89 with every fee doubled.
- Quiet-window fallback is dev-neutral (never fires on either window) and
  loses only −$5 to −$12 on synthetic grind windows with no washout,
  while guaranteeing the ≥1-trade guardrail there.

## Verification (official kit grade-local, --driver process)

- `main.ts` v1: net PnL **+$16.705029**, 2 trades, win rate 1.000, max
  drawdown 0.01496 (1.50%), fees $0.806845, 0 rejected, guardrails met,
  L1 regrade reproduced byte for byte.
- Revised `main.ts` (entry close/bar promoted only once the buy is
  observed filled): identical numbers, **identical action log**
  (sha256 `2183782b91dc3070cd6af904f378ecf7b7eead152e6ff71351a82618255bc3b3`).
- My own float simulator reproduced the official buy-and-hold grade
  (−$31.633698) to under $0.001 before the bot was built, and the bot's
  own grade to $0.00007.
- Kit: `btc-race-24h-20261118-1444-kit`, all 29 files verified against
  `kit.json` sha256; dataset `btc-race-24h-20261118-1444-dev`, 1,440 bars,
  0 gaps.

## Files

| File | What it is |
|---|---|
| `main.ts` | The bot (Node 22, TypeScript, erasable syntax only) |
| `vendor/makefun-bars.ts` | Kit SDK shim, byte-identical copy of `sdk/makefun-bars.ts` |
| `README.md` | Badges + description |
| `LICENSE` | MIT |
| `NOTES.md` | This file |
| `.makefun/owner.json` | Claim file, wallet A1 |

## Build notes

- `main.ts` was written, graded, then edited (pending-entry promotion)
  and graded again in the same session, so its final content comes from
  two write/edit messages. The strategy was tuned on the new dev window
  with a local simulator; the range bot from yesterday's race was read as
  a reference only and not reused — the code, the rule and the parameters
  are all new.
- The kit's `transcripts_witnessed` check does not apply to this
  competition (`applies: false` in the live requirements); no `makefun
  record` was used. The bundle carries the builder session, the prompt
  file, the system prompt file, and the Muse usage rows.
