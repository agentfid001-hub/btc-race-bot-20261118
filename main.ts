// Dip-buyer bot for make.fun btc-race-24h-20261118-1444: race a BTC bot live.
//
// The 1-minute closes of cbBTC are noisy (about 6 bps a minute) while one
// full round trip costs about 26 bps in fee, slippage and price impact, so
// any bot that trades often pays the pool more than it can catch. This bot
// therefore trades rarely, and only after the market has done something
// worth reacting to: a sharp one-hour washout.
//
//   - BUY with all cash when the latest close sits at least 1.5% below
//     the close 60 bars earlier. A drop that fast is a washout, not noise.
//   - SELL the whole position when the latest close is at least 1.8%
//     above the close the buy was decided on. The bounce target is wider
//     than the drop trigger, so a buy only fires where the recovery has
//     room to pay for the round trip twice over.
//   - STALE EXIT: if a position has been held 480 bars (8 hours) without
//     reaching the target, sell anyway. A dip that never bounces is a
//     falling knife; the flatten at the end of the window would sell it
//     lower, so an 8-hour cap bounds the damage.
//   - QUIET-WINDOW FALLBACK: if no round trip has completed yet and the
//     window reaches bar 1200, buy a fresh 120-bar low. A window with no
//     sharp drop would otherwise end with zero trades, and the race
//     guardrail needs at least one; one small trade beats none.
//   - No new buys after bar 1380: a buy that late cannot climb 1.8%
//     before the flatten, it would only pay the round trip.
//
// Why these numbers: on the dev window the bot makes +$16.71 on 2 trades
// (max drawdown 1.51%), and on the previous 24-hour window +$14.36, also
// 2 trades. The same rule stays positive under +2% / -2% drift, 1.5x
// volatility and doubled fees, and the stale exit turns the worst stress
// case (a -2% drift, -$36.60 without it) into +$2.07. Every faster
// system tested on the dev window lost money (EMA crosses -$32 to
// -$164, RSI -$62 to -$100, Donchian -$26 to -$100, 4-hour range
// trading -$18), because this window falls 2.8% while chopping.
//
// Protocol: agent-fun/bars-replay/v1, spoken through the kit's TypeScript
// shim (vendor/makefun-bars.ts, a byte-identical copy of sdk/makefun-bars.ts).
// Bigint prices only, no floats, no clock, no network, no files, no
// randomness: two runs on the same bars send the same orders.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
// A washout is a drop of at least this many basis points over one hour.
const DROP_BPS = 150n;
// How far back the drop is measured (60 one-minute bars = 1 hour).
const DROP_BARS = 60;
// The bounce target, in basis points above the close the buy used.
const TAKE_BPS = 180n;
// Bars a position may be held before the stale exit sells it (8 hours).
const STALE_BARS = 480;
// Bar from which the quiet-window fallback may fire.
const FALLBACK_BAR = 1200;
// Bars of history a fallback low is measured against (2 hours).
const FALLBACK_BARS = 120;
// No new buys this late: a buy here cannot reach its target in time.
const NO_BUY_AFTER = 1380;
// Orders are refused if the next open moved more than 1% past the close
// the decision was made on; a refused order is retried on the next bar.
const MAX_SLIPPAGE_BPS = 100;

// Integer closes (price scale 5), one entry per fresh bar, in order.
const closes: bigint[] = [];
// Close the open position's buy was decided on (0 while flat). It is only
// set once the buy is observed filled: a buy refused for slippage leaves
// no position behind, and must not leave a stale entry behind either.
let entryClose = 0n;
// Bar index the open position's buy was decided on (-1 while flat).
let buyBar = -1;
// The buy a flat bot has just ordered but not yet seen filled: its close
// and bar, promoted into entryClose / buyBar on the first batch that
// shows the position. A refused order's pending values are simply
// overwritten by the next buy decision.
let pendingEntryClose = 0n;
let pendingBuyBar = -1;
// Completed round trips so far; the fallback only fires while this is 0.
let roundTrips = 0;

// Lowest close among the bars before the latest one, over `count` bars.
function lowestBefore(count: number): bigint {
  const window = closes.slice(-count - 1, -1);
  let low = window[0];
  for (const c of window) if (c < low) low = c;
  return low;
}

await runBars({
  onBatch(state: BarsState, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(BigInt(bar.c));
    }
    if (state.warmingUp) return [];
    if (closes.length <= DROP_BARS) return [];
    const barIndex = closes.length - 1;
    const price = closes[barIndex];
    const held = state.positions.get(SYMBOL);
    if (held === undefined) {
      if (barIndex >= NO_BUY_AFTER) return [];
      const hourAgo = closes[barIndex - DROP_BARS];
      const washedOut = price * 10000n <= hourAgo * (10000n - DROP_BPS);
      const freshLow = roundTrips === 0 && barIndex >= FALLBACK_BAR
        && price <= lowestBefore(FALLBACK_BARS);
      if (washedOut || freshLow) {
        pendingEntryClose = price;
        pendingBuyBar = barIndex;
        const order: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [order];
      }
      return [];
    }
    if (entryClose === 0n) {
      entryClose = pendingEntryClose;
      buyBar = pendingBuyBar;
      pendingEntryClose = 0n;
      pendingBuyBar = -1;
    }
    const bounced = price * 10000n >= entryClose * (10000n + TAKE_BPS);
    const stale = barIndex - buyBar >= STALE_BARS;
    if (bounced || stale) {
      roundTrips += 1;
      entryClose = 0n;
      buyBar = -1;
      const order: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [order];
    }
    return [];
  },
});
