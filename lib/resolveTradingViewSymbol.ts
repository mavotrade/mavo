export interface ResolvableToken {
  ticker: string;
  [key: string]: unknown;
}

const TICKER_TO_TV_SYMBOL: Record<string, string> = {
  SOL: "COINBASE:SOLUSD",
  DOGE: "COINBASE:DOGEUSD",
  BONK: "COINBASE:BONKUSD",
  WIF: "COINBASE:WIFUSD",
  PEPE: "COINBASE:PEPEUSD",
};

export function resolveTradingViewSymbol(token: ResolvableToken): string | null {
  if (!token?.ticker) return null;
  const key = token.ticker.trim().toUpperCase();
  return TICKER_TO_TV_SYMBOL[key] ?? null;
}

export default resolveTradingViewSymbol;
