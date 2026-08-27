"use client";

/**
 * TradingViewAdvancedChart
 * -------------------------------------------------------------------------
 * Thin wrapper around TradingView's official Advanced Chart widget, using
 * the classic tv.js embed:
 *
 *   <script src="https://s3.tradingview.com/tv.js"></script>
 *   <script>
 *     new TradingView.widget({ ...config..., container_id: "..." });
 *   </script>
 *
 * This is a client-only component. It renders an empty, ID'd container on
 * both the server and the first client render (so there's nothing for
 * React to mismatch during hydration), and only loads tv.js / constructs
 * the widget after mount, inside useEffect. Safe for Next.js SSR/Vercel.
 *
 * Usage:
 *   <TradingViewAdvancedChart symbol="COINBASE:SOLUSD" height={480} />
 */

import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => unknown;
    };
  }
}

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

// Shared across every chart instance on the page — tv.js only needs to be
// loaded once. Cached at module scope so mounting a second chart (or the
// same chart re-mounting) doesn't inject duplicate <script> tags or
// re-download the library.
let tvScriptLoadingPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView?.widget) return Promise.resolve();
  if (tvScriptLoadingPromise) return tvScriptLoadingPromise;

  tvScriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TV_SCRIPT_SRC}"]`);
    if (existing) {
      if (window.TradingView?.widget) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load the TradingView script")));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = TV_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the TradingView script"));
    document.head.appendChild(script);
  });

  return tvScriptLoadingPromise;
}

export interface TradingViewAdvancedChartProps {
  /** Full TradingView symbol, e.g. "COINBASE:SOLUSD", "BINANCE:BTCUSDT", "NASDAQ:AAPL". */
  symbol: string;
  /** Chart height — a pixel number, or any valid CSS height string (e.g. "100%") to fill a sized parent. Width always fills the parent container (autosize). */
  height?: number | string;
  /** TradingView interval code: "1", "5", "15", "60", "240", "D", "W", etc. */
  interval?: string;
  /** "dark" | "light" — defaults to "dark" to match Mavo's terminal look. */
  theme?: "dark" | "light";
  /** Lets the visitor change the symbol from inside the widget's own UI. Off by default since Mavo's token selector already drives the symbol. */
  allowSymbolChange?: boolean;
  className?: string;
}

export default function TradingViewAdvancedChart({
  symbol,
  height = 480,
  interval = "60",
  theme = "dark",
  allowSymbolChange = false,
  className = "",
}: TradingViewAdvancedChartProps) {
  // Unique per instance so multiple charts can live on the same page
  // without fighting over one container_id.
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const containerId = `tv-advanced-chart-${reactId}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    loadTradingViewScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.TradingView) return;
        // Clear out anything from a previous render of this same container
        // (e.g. symbol/interval/theme changed) before creating a new widget.
        containerRef.current.innerHTML = "";
        new window.TradingView.widget({
          autosize: true,
          symbol,
          interval,
          timezone: "Etc/UTC",
          theme,
          style: "1", // candlesticks
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: allowSymbolChange,
          hide_top_toolbar: false, // keeps the timeframe selector + chart-type/indicator controls
          hide_legend: false,
          withdateranges: true, // adds the 1D/5D/1M/... range tabs
          save_image: false,
          calendar: false,
          backgroundColor: theme === "dark" ? "#000000" : "#ffffff",
          gridColor: theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
          container_id: containerId,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, interval, theme, allowSymbolChange, containerId]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-zinc-800 bg-black text-xs text-zinc-500 ${className}`}
        style={{ height }}
      >
        Couldn't load the TradingView chart.
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <div id={containerId} ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
