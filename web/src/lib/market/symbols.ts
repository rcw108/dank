// Market data shown in the investor account, mirrored from dank.capital/account.
// Delisted or renamed tickers that error on the site are fixed here:
// FB → META, NYSE:WMT → NASDAQ:WMT, NYSE:GPS → NYSE:GAP, XETR:TSLA → NASDAQ:TSLA;
// Twitter (TWTR) and Splunk (SPLK) no longer trade and are dropped.

export type TickerSymbol = {
  proName: string;
  title?: string;
  description?: string;
};

/** Top block: indices, FX, crypto, commodities. */
export const MARKET_OVERVIEW: TickerSymbol[] = [
  { title: "S&P 500", proName: "OANDA:SPX500USD" },
  { title: "Nasdaq 100", proName: "OANDA:NAS100USD" },
  { description: "USD/EUR", proName: "FX_IDC:USDEUR" },
  { description: "USD/MXN", proName: "FX:USDMXN" },
  { description: "BTC/USD", proName: "BITSTAMP:BTCUSD" },
  { description: "OIL", proName: "TVC:USOIL" },
  { description: "GOLD", proName: "SAXO:XAUUSD" },
];

/** Scrolling tape: individual stocks. */
export const STOCK_TAPE: TickerSymbol[] = [
  { description: "Apple", proName: "NASDAQ:AAPL" },
  { description: "Microsoft", proName: "NASDAQ:MSFT" },
  { description: "Bank of America", proName: "NYSE:BAC" },
  { description: "Lululemon", proName: "NASDAQ:LULU" },
  { description: "Goldman Sachs", proName: "NYSE:GS" },
  { description: "Netflix", proName: "NASDAQ:NFLX" },
  { description: "Disney", proName: "NYSE:DIS" },
  { description: "FedEx", proName: "NYSE:FDX" },
  { description: "Amazon", proName: "NASDAQ:AMZN" },
  { description: "Meta", proName: "NASDAQ:META" },
  { description: "Google", proName: "NASDAQ:GOOGL" },
  { description: "Walmart", proName: "NASDAQ:WMT" },
  { description: "Procter & Gamble", proName: "NYSE:PG" },
  { description: "Pfizer", proName: "NYSE:PFE" },
  { description: "Shopify", proName: "NYSE:SHOP" },
  { description: "Uber", proName: "NYSE:UBER" },
  { description: "Salesforce", proName: "NYSE:CRM" },
  { description: "General Motors", proName: "NYSE:GM" },
  { description: "Tesla", proName: "NASDAQ:TSLA" },
  { description: "Canopy Growth", proName: "NASDAQ:CGC" },
  { description: "Alibaba", proName: "NYSE:BABA" },
  { description: "American Airlines", proName: "NASDAQ:AAL" },
  { description: "VIX", proName: "CBOE:VIX" },
  { description: "Gap", proName: "NYSE:GAP" },
  { description: "Spotify", proName: "NYSE:SPOT" },
  { description: "Cloudflare", proName: "NYSE:NET" },
  { description: "Exxon", proName: "NYSE:XOM" },
  { description: "Occidental Petroleum", proName: "NYSE:OXY" },
  { description: "Oracle", proName: "NYSE:ORCL" },
  { description: "Adobe", proName: "NASDAQ:ADBE" },
  { description: "IBM", proName: "NYSE:IBM" },
  { description: "Coca-Cola", proName: "NYSE:KO" },
  { description: "JPMorgan", proName: "NYSE:JPM" },
  { description: "Costco", proName: "NASDAQ:COST" },
  { description: "Nike", proName: "NYSE:NKE" },
  { description: "Home Depot", proName: "NYSE:HD" },
];
