import { MARKET_OVERVIEW, STOCK_TAPE } from "@/lib/market/symbols";
import { TradingViewWidget } from "./tradingview-widget";

/** Both TradingView strips from the site account, stacked as on dank.capital. */
export function MarketStrip() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <TradingViewWidget
        kind="tickers"
        symbols={MARKET_OVERVIEW}
        height={72}
        label="Market overview"
      />
      <div className="border-t border-line">
        <TradingViewWidget
          kind="ticker-tape"
          symbols={STOCK_TAPE}
          height={46}
          label="Stock ticker"
        />
      </div>
    </div>
  );
}
