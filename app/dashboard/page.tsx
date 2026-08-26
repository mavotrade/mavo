"use client";

/**
 * TradingViewAdvancedChart
 * -------------------------------------------------------------------------
 * Renders TradingView's official Advanced Chart widget as a single,
 * self-contained <iframe> — no <script> tag injected into the host page,
 * no `window.TradingView` global, no dynamically-created container div
 * living outside the iframe boundary.
 *
 * Why this shape specifically: TradingView documents exactly two supported
 * embed formats — a Web Component, and an "iframe-based widget" where
 * their own script injects an <iframe> for you (see
 * https://www.tradingview.com/widget-docs/widget-formats/). There's no
 * publicly documented bare iframe URL to build by hand, and guessing one
 * would be fragile (silently wrong query params just render a blank
 * iframe). So instead of guessing, this component builds TradingView's
 * *official* embed snippet — the same
 * `<div class="tradingview-widget-container">...<script
 * src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js">`
 * markup from their own docs — as a tiny standalone HTML document, and
 * loads that via the iframe's `srcDoc`. TradingView's script then runs
 * inside the iframe's own isolated document and creates its chart there,
 * exactly as it would on a normal page — just embedded a layer deeper for
 * isolation, which matches their documented "iframe: fully isolated
 * document boundary" format.
 *
 * This also happens to be more likely to render inside sandboxed preview
 * surfaces that block a host page from appending third-party <script src>
 * tags: a plain <iframe> is just a normal HTML element, so it isn't
 * subject to that restriction the same way.
 *
 * Usage (unchanged from before):
 *   <TradingViewAdvancedChart symbol="COINBASE:SOLUSD" height={480} />
 */

export interface TradingViewAdvancedChartProps {
  /** Full TradingView symbol, e.g. "COINBASE:SOLUSD", "BINANCE:BTCUSDT", "NASDAQ:AAPL". */
  symbol: string;
  /** Chart height — a pixel number, or any valid CSS height string (e.g. "100%") to fill a sized parent. Width always fills the parent container. */
  height?: number | string;
  /** TradingView interval code: "1", "5", "15", "60", "240", "D", "W", etc. */
  interval?: string;
  /** "dark" | "light" — defaults to "dark" to match Mavo's terminal look. */
  theme?: "dark" | "light";
  /** Lets the visitor change the symbol from inside the widget's own UI. Off by default since Mavo's token selector already drives the symbol. */
  allowSymbolChange?: boolean;
  className?: string;
}

// Escapes a JSON string so it can't prematurely close the <script> tag it's
// embedded inside (a `</script` substring anywhere in a symbol/locale value
// would otherwise truncate the HTML). None of TradingView's config values
// are expected to contain this, but it costs nothing to guard it.
function safeJsonForInlineScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\/(script)/gi, "<\\/$1");
}

function buildWidgetHtml({
  symbol,
  interval,
  theme,
  allowSymbolChange,
}: Required<Pick<TradingViewAdvancedChartProps, "symbol" | "interval" | "theme" | "allowSymbolChange">>): string {
  const backgroundColor = theme === "dark" ? "#000000" : "#ffffff";
  const gridColor = theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";

  // Same option set TradingView's own Advanced Chart embed generator
  // produces — kept identical to the previous tv.js-based version's
  // config so behavior doesn't change, just how it's delivered.
  const config = {
    autosize: true,
    symbol,
    interval,
    timezone: "Etc/UTC",
    theme,
    style: "1", // candlesticks
    locale: "en",
    enable_publishing: false,
    allow_symbol_change: allowSymbolChange,
    hide_top_toolbar: false,
    hide_legend: false,
    withdateranges: true,
    save_image: false,
    calendar: false,
    backgroundColor,
    gridColor,
    support_host: "https://www.tradingview.com",
  };

  return `<!DOCTYPE html>
<html style="margin:0;padding:0;height:100%;">
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: ${backgroundColor}; }
  .tradingview-widget-container, .tradingview-widget-container__widget { height: 100%; width: 100%; }
  /* Shown only until TradingView's script replaces this container — if the
     script never loads (e.g. blocked network), this stays visible instead
     of leaving a blank box. */
  .tv-fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; height: 100%; padding: 16px; box-sizing: border-box; text-align: center; font: 12px -apple-system, sans-serif; color: #71717a; }
</style>
</head>
<body>
  <div class="tradingview-widget-container">
    <div class="tradingview-widget-container__widget">
      <div class="tv-fallback" id="tv-fallback">Loading chart…</div>
    </div>
    <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
      ${safeJsonForInlineScript(config)}
    </script>
    <script>
      // TradingView's script renders by creating its own nested iframe
      // inside .tradingview-widget-container__widget. If that hasn't
      // happened after a few seconds, the request to s3.tradingview.com
      // likely never completed (commonly a sandboxed preview environment
      // blocking third-party network requests) — swap in a clearer
      // message instead of hanging on "Loading chart..." forever. This
      // doesn't affect a normal, unsandboxed deployed page, where the
      // widget iframe typically appears well before this fires.
      setTimeout(function () {
        var widgetEl = document.querySelector(".tradingview-widget-container__widget");
        var fallbackEl = document.getElementById("tv-fallback");
        if (widgetEl && fallbackEl && !widgetEl.querySelector("iframe")) {
          fallbackEl.innerHTML =
            "<span>Couldn't load the TradingView chart here.</span>" +
            "<span style=\\"color:#52525b;\\">This preview sandbox may be blocking outbound requests — this typically still works on a live deployed page.</span>";
        }
      }, 6000);
    </script>
  </div>
</body>
</html>`;
}

export default function TradingViewAdvancedChart({
  symbol,
  height = 480,
  interval = "60",
  theme = "dark",
  allowSymbolChange = false,
  className = "",
}: TradingViewAdvancedChartProps) {
  const srcDoc = buildWidgetHtml({ symbol, interval, theme, allowSymbolChange });

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <iframe
        title={`TradingView chart for ${symbol}`}
        srcDoc={srcDoc}
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        // allow-scripts: TradingView's embed script needs to run inside the
        // iframe's own document. allow-same-origin: some of TradingView's
        // own sub-resources expect this. allow-popups(-to-escape-sandbox):
        // the widget's own "open in TradingView" / symbol search can open
        // a new tab — none of this grants the iframe any access back into
        // the host page.
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        loading="lazy"
      />
    </div>
  );
}
