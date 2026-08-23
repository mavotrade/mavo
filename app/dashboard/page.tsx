"use client";

import { useEffect, useMemo, useState } from "react";

/* ============================================================================
   MAVO — unified memecoin trading terminal (prototype)

   Product shape: user connects their own wallet, discovers a token, and
   buys/sells it without leaving Mavo. Mavo is a client for on-chain swap
   infrastructure (PumpSwap / Raydium / Meteora / etc.) — it never holds
   funds or private keys.

   THIS FILE IS STILL A PROTOTYPE. Everything below is mock:
     - wallet "connect" just sets local state, no real wallet adapter
     - trade "signing" and "submission" are simulated with a timer
     - no private key or seed phrase is ever requested or stored
   Every mock boundary is commented so real logic (wallet adapter, quote
   API, transaction build/sign/submit) can be dropped in without
   restructuring the UI. Search for "REPLACE WITH REAL:" to find them.

   Everything lives in this one file on purpose (mock data, formatting,
   icons, charts, modals, page) so it renders as a standalone artifact.
   Only plain React (useState/useMemo) and standard Tailwind utility
   classes are used — no arbitrary bracket colors, no extra packages.
   ========================================================================== */

const SOL_PRICE_USD = 172; // mock reference price used for USD <-> SOL conversion in the trade UI

/* ---------------------------------------------------------------------------
   Deterministic mock data
--------------------------------------------------------------------------- */

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const NAMES = [
  ["Wojak Reborn", "WOJAK"], ["Pepo Classic", "PEPO"], ["Giga Chad", "GIGA"],
  ["Ratio Coin", "RATIO"], ["Mog Machine", "MOG"], ["Narwhal Finance", "NARV"],
  ["Frogonomics", "FROG"], ["Snek Protocol", "SNEK"], ["Based Beluga", "BELU"],
  ["Doge Prime", "DOGP"], ["Turbo Toad", "TURB"], ["Chad Capital", "CHAD"],
  ["Lucky Llama", "LUCK"], ["Comet Cat", "COMET"], ["Solar Shiba", "SOLR"],
  ["Neon Ninja", "NEON"], ["Rocket Rat", "RCKT"], ["Velvet Viper", "VLVT"],
  ["Cosmic Corgi", "CSMC"], ["Prime Panda", "PNDA"],
];

const AVATAR_COLORS = ["bg-violet-600", "bg-emerald-600", "bg-rose-600", "bg-amber-600", "bg-sky-600", "bg-pink-600", "bg-indigo-600"];

const PLATFORM_SETS = [
  ["Pump.fun", "PumpSwap"],
  ["Pump.fun", "PumpSwap", "Raydium"],
  ["Moonshot", "Raydium"],
  ["Raydium"],
  ["Meteora", "Raydium"],
];

function makeSparkline(rand, trendUp) {
  const points = [];
  let v = 20;
  for (let i = 0; i < 12; i++) {
    v += (trendUp ? 1 : -1) * rand() * 4 + (rand() - 0.5) * 2;
    v = Math.max(2, v);
    points.push(v);
  }
  return points;
}

function buildToken(i, stage) {
  const rand = seededRandom(i * 97 + 13);
  const [name, ticker] = NAMES[i % NAMES.length];
  const riskScore = Math.floor(rand() * 100);
  const priceChangePct = Math.round((rand() * 160 - 40) * 10) / 10;
  const marketCap = Math.floor(rand() * 3_000_000) + 15_000;
  const migrationPct =
    stage === "new" ? Math.floor(rand() * 40)
    : stage === "migrating" ? 40 + Math.floor(rand() * 55)
    : 100;

  const riskReasons = [];
  if (riskScore >= 70) {
    riskReasons.push("Mint authority is still active");
    riskReasons.push("Top holders control an unusually large share of supply");
  } else if (riskScore >= 40) {
    riskReasons.push("Liquidity is thinner than average for this market cap");
    riskReasons.push("A few wallets show suspected coordinated buying");
  } else {
    riskReasons.push("No major warning signs detected");
  }

  const platforms = PLATFORM_SETS[i % PLATFORM_SETS.length];
  const priceImpactPct = Math.round((0.15 + rand() * 1.8) * 100) / 100;
  const mockHoldingTokens = i % 3 === 0 ? Math.floor(rand() * 50000) + 500 : 0;

  return {
    id: `${stage}-${i}`,
    name, ticker,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    ageMinutes:
      stage === "new" ? Math.floor(rand() * 90) + 1
      : stage === "migrating" ? Math.floor(rand() * 600) + 90
      : Math.floor(rand() * 40000) + 1440,
    marketCap,
    liquidity: Math.floor(marketCap * (0.08 + rand() * 0.3)),
    volume24h: Math.floor(marketCap * (0.3 + rand() * 2)),
    holders: Math.floor(rand() * 5000) + 20,
    priceChangePct,
    price: Math.round((rand() * 0.002 + 0.0000001) * 1e8) / 1e8,
    stage,
    riskScore,
    riskReasons,
    migrationPct,
    creator: {
      wallet: `${Math.floor(rand() * 0xffff).toString(16).padStart(4, "0")}...${Math.floor(rand() * 0xffff).toString(16).padStart(4, "0")}`,
      ageDays: Math.floor(rand() * 400) + 1,
      tokensCreated: Math.floor(rand() * 6),
    },
    topHolders: [
      { label: "Top 1", pct: Math.round(rand() * 15 * 10) / 10 },
      { label: "Top 10", pct: Math.round((20 + rand() * 40) * 10) / 10 },
      { label: "Creator", pct: Math.round(rand() * 8 * 10) / 10 },
      { label: "Suspected bundle", pct: Math.round(rand() * 20 * 10) / 10 },
    ],
    watchingNow: Math.floor(rand() * 300) + 4,
    sparkline: makeSparkline(rand, priceChangePct >= 0),
    platforms,
    route: platforms[platforms.length - 1], // primary venue Mavo would route the swap through
    priceImpactPct,
    slippageBps: 300,
    mockHoldingTokens, // "your position" for the sell flow — 0 means no position yet
  };
}

const MOCK_TOKENS = [
  ...Array.from({ length: 8 }, (_, i) => buildToken(i, "new")),
  ...Array.from({ length: 6 }, (_, i) => buildToken(i + 8, "migrating")),
  ...Array.from({ length: 6 }, (_, i) => buildToken(i + 14, "migrated")),
];

/* ---------------------------------------------------------------------------
   Formatting + risk helpers
--------------------------------------------------------------------------- */

function fmtUsd(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtPrice(n) {
  if (n >= 1) return `$${n.toFixed(4)}`;
  const decimals = n < 0.000001 ? 8 : 6;
  return `$${n.toFixed(decimals)}`;
}
function fmtAge(mins) {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}
function fmtHolders(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
}
function fmtTokenAmount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function riskLevel(score) {
  if (score >= 70) return "suspicious";
  if (score >= 40) return "careful";
  return "healthy";
}

const RISK_META = {
  healthy: { emoji: "🟢", label: "Looks Healthy", text: "text-emerald-400", bg: "bg-emerald-950" },
  careful: { emoji: "🟡", label: "Be Careful", text: "text-amber-400", bg: "bg-amber-950" },
  suspicious: { emoji: "🔴", label: "Suspicious", text: "text-rose-400", bg: "bg-rose-950" },
};

function priceImpactLabel(pct) {
  if (pct < 0.5) return "Low";
  if (pct < 2) return "Moderate";
  return "High";
}

/* ---------------------------------------------------------------------------
   Small inline icons (no icon package)
--------------------------------------------------------------------------- */

function SearchIcon({ className = "" }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
function BackIcon({ className = "" }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloseIcon({ className = "" }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
function WalletIcon({ className = "" }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7h18v13H3zM3 7l3-4h12l3 4M16 13h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SpinnerIcon({ className = "" }) {
  return (
    <svg className={`${className} animate-spin`} width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon({ className = "" }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LightningIcon({ className = "" }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Charts (inline SVG, no chart package)
--------------------------------------------------------------------------- */

function Sparkline({ data, positive }) {
  const w = 84, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0">
      <polyline points={points} fill="none" stroke={positive ? "#34d399" : "#fb7185"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TokenChart({ token }) {
  const data = useMemo(() => {
    const seed = token.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = seededRandom(seed);
    const points = [];
    let v = 50;
    for (let i = 0; i < 60; i++) {
      v += Math.sin(i / 3 + seed) * 4 + (rand() - 0.48) * 3;
      v = Math.max(5, v);
      points.push(v);
    }
    return points;
  }, [token.id]);

  const w = 640, h = 220;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const path = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 16) - 8}`).join(" L ");
  const positive = token.priceChangePct >= 0;
  const stroke = positive ? "#34d399" : "#fb7185";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold text-zinc-100 font-mono tabular-nums">{fmtPrice(token.price)}</span>
            <span className={`text-sm font-medium font-mono ${positive ? "text-emerald-400" : "text-rose-400"}`}>
              {positive ? "+" : ""}{token.priceChangePct.toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-zinc-500">{token.ticker}/SOL</span>
        </div>
        <div className="flex gap-1">
          {["5m", "1H", "6H", "1D"].map((tf, i) => (
            <button key={tf} className={`px-2 py-1 rounded-md text-xs font-medium ${i === 1 ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
              {tf}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[220px]" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="#27272a" strokeWidth="1" />
        ))}
        <path d={`M ${path} L ${w},${h} L 0,${h} Z`} fill={stroke} opacity="0.12" stroke="none" />
        <path d={`M ${path}`} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Platform badges
--------------------------------------------------------------------------- */

function PlatformBadges({ platforms }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {platforms.map((p) => (
        <span key={p} className="text-[10px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-md px-1.5 py-0.5">
          {p}
        </span>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Coin card
--------------------------------------------------------------------------- */

const QUICK_BUY_USD = 10; // preset amount used by the one-tap quick buy button

function CoinCard({ token, onOpen, onTrade, onQuickBuy }) {
  const risk = RISK_META[riskLevel(token.riskScore)];
  const positive = token.priceChangePct >= 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
      <button onClick={() => onOpen(token.id)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg">
        <div className="flex items-start gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${token.color}`}>
            {token.ticker.slice(0, 2)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-sm text-zinc-100 font-mono truncate">{token.ticker}</span>
                  <span className="text-xs text-zinc-500 truncate">{token.name}</span>
                </div>
                <span className="text-xs text-zinc-500">{fmtAge(token.ageMinutes)} old</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Sparkline data={token.sparkline} positive={positive} />
                <span className={`text-sm font-semibold font-mono ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {positive ? "+" : ""}{token.priceChangePct.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${risk.bg} ${risk.text}`}>
              <span>{risk.emoji}</span>
              <span>{risk.label}</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-y-1 gap-x-3 text-xs">
              <span className="flex items-center justify-between text-zinc-500"><span>Mcap</span><span className="font-mono text-zinc-300 tabular-nums">{fmtUsd(token.marketCap)}</span></span>
              <span className="flex items-center justify-between text-zinc-500"><span>Liq</span><span className="font-mono text-zinc-300 tabular-nums">{fmtUsd(token.liquidity)}</span></span>
              <span className="flex items-center justify-between text-zinc-500"><span>Holders</span><span className="font-mono text-zinc-300 tabular-nums">{fmtHolders(token.holders)}</span></span>
              <span className="flex items-center justify-between text-zinc-500"><span>Vol</span><span className="font-mono text-zinc-300 tabular-nums">{fmtUsd(token.volume24h)}</span></span>
            </div>
          </div>
        </div>
      </button>

      <div className="mt-2.5 flex gap-1.5">
        <button
          onClick={() => onTrade(token, "buy")}
          className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors text-emerald-950 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          Buy
        </button>
        <button
          onClick={() => onQuickBuy(token)}
          title={`Quick buy $${QUICK_BUY_USD}`}
          aria-label={`Quick buy $${QUICK_BUY_USD} of ${token.ticker}`}
          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <LightningIcon />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Discover column
--------------------------------------------------------------------------- */

const SORTS = [
  { id: "new", label: "Newest" },
  { id: "volume", label: "Volume" },
  { id: "mcap", label: "Mcap" },
];

function ColumnPanel({ title, live, tokens, onOpen, onTrade, onQuickBuy }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("new");
  const [safeOnly, setSafeOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = tokens.filter((t) => (query.trim() === "" ? true : (t.ticker + t.name).toLowerCase().includes(query.toLowerCase())));
    if (safeOnly) list = list.filter((t) => t.riskScore < 70);
    list = [...list].sort((a, b) => {
      if (sort === "volume") return b.volume24h - a.volume24h;
      if (sort === "mcap") return b.marketCap - a.marketCap;
      return a.ageMinutes - b.ageMinutes;
    });
    return list;
  }, [tokens, query, sort, safeOnly]);

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-950 min-w-0 h-full">
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm text-zinc-100">{title}</h2>
          {live && <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> live</span>}
          <span className="ml-auto text-xs text-zinc-500">{filtered.length}</span>
        </div>

        <div className="mt-2 relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-lg border border-zinc-800 bg-black pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
          />
        </div>

        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {SORTS.map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)} className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${sort === s.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
              {s.label}
            </button>
          ))}
          <button onClick={() => setSafeOnly((v) => !v)} className={`ml-auto px-2 py-1 rounded-md text-xs font-medium transition-colors ${safeOnly ? "bg-emerald-950 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            🟢 Safer only
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[75vh]">
        {filtered.length > 0 ? (
          filtered.map((t) => <CoinCard key={t.id} token={t} onOpen={onOpen} onTrade={onTrade} onQuickBuy={onQuickBuy} />)
        ) : (
          <div className="text-center text-xs text-zinc-500 py-10">No tokens match.</div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Wallet connect modal
   REPLACE WITH REAL: swap the setTimeout below for a real wallet-adapter
   connect() call (e.g. Solana Wallet Adapter). Never request a seed
   phrase or private key here — the adapter handles signing in the
   wallet's own extension/app, Mavo never sees key material.
--------------------------------------------------------------------------- */

function WalletConnectModal({ onClose, onConnected }) {
  const [connectingId, setConnectingId] = useState(null);
  const wallets = [
    { id: "phantom", name: "Phantom" },
    { id: "solflare", name: "Solflare" },
    { id: "backpack", name: "Backpack" },
  ];

  function handleSelect(w) {
    setConnectingId(w.id);
    // REPLACE WITH REAL: await wallet adapter's connect(), read the real
    // public key and balance instead of generating mock ones.
    setTimeout(() => {
      onConnected({
        address: `${w.id.slice(0, 4)}${Math.random().toString(36).slice(2, 6)}...${Math.random().toString(36).slice(2, 6)}`,
        balanceSol: 12.4,
      });
    }, 700);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-zinc-100">Connect a wallet</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Mavo never asks for your seed phrase or private key. Your wallet signs every trade — Mavo never holds your funds.</p>

        <div className="space-y-2">
          {wallets.map((w) => (
            <button
              key={w.id}
              onClick={() => handleSelect(w)}
              disabled={connectingId !== null}
              className="w-full flex items-center justify-between rounded-lg border border-zinc-800 bg-black hover:bg-zinc-900 transition-colors px-3.5 py-3 disabled:opacity-50"
            >
              <span className="text-sm font-medium text-zinc-100">{w.name}</span>
              {connectingId === w.id ? <SpinnerIcon className="text-violet-400" /> : <span className="text-xs text-zinc-500">Connect</span>}
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-zinc-600 text-center">Prototype — this simulates a wallet connection. No real wallet adapter is wired up yet.</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Trade modal — unified Buy/Sell flow regardless of the token's platform
   REPLACE WITH REAL:
     1. "review" step  -> call a quote API (e.g. Jupiter) for real price impact/route
     2. "signing" step -> build the swap transaction and request signature
        from the connected wallet adapter (user approves in their own wallet UI)
     3. "success" step -> submit the signed transaction and poll for
        confirmation; show the real transaction signature/explorer link
--------------------------------------------------------------------------- */

function TradeModal({ token, side: initialSide, wallet, onClose, quick = false }) {
  const [side, setSide] = useState(initialSide);
  const [amount, setAmount] = useState(quick ? String(QUICK_BUY_USD) : "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [step, setStep] = useState(quick ? "signing" : "review"); // review -> signing -> success

  // Quick buy skips the review screen entirely — one tap goes straight to
  // simulated signing with the preset amount. REPLACE WITH REAL: this is
  // still the same wallet-adapter signing step as the regular flow, just
  // triggered immediately instead of after a manual confirm click.
  useEffect(() => {
    if (quick) {
      const t = setTimeout(() => setStep("success"), 1400);
      return () => clearTimeout(t);
    }
  }, [quick]);

  const risk = RISK_META[riskLevel(token.riskScore)];
  const numericAmount = parseFloat(amount) || 0;

  const paySol = side === "buy" ? numericAmount / SOL_PRICE_USD : null;
  const sellTokens = side === "sell" ? (token.mockHoldingTokens * numericAmount) / 100 : null;
  const receiveTokens = side === "buy" && numericAmount > 0
    ? (numericAmount / token.price) * (1 - token.priceImpactPct / 100)
    : null;
  const receiveSol = side === "sell" && sellTokens
    ? sellTokens * token.price / SOL_PRICE_USD * (1 - token.priceImpactPct / 100)
    : null;

  const presets = side === "buy" ? ["$5", "$10", "$25", "$50"] : ["25", "50", "75", "100"];
  const canSubmit = numericAmount > 0 && (side === "buy" || token.mockHoldingTokens > 0);

  function handlePresetClick(p) {
    setAmount(p.replace(/[^0-9.]/g, ""));
  }

  function handleConfirm() {
    setStep("signing");
    // REPLACE WITH REAL: request signature from the wallet adapter, then
    // submit the signed transaction and wait for on-chain confirmation.
    setTimeout(() => setStep("success"), 1400);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
        {step === "review" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${token.color}`}>
                  {token.ticker.slice(0, 2)}
                </div>
                <span className="text-sm font-semibold text-zinc-100 font-mono">{token.ticker}</span>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
            </div>

            <div className="flex rounded-lg bg-zinc-900 p-1 mb-4">
              <button onClick={() => setSide("buy")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${side === "buy" ? "bg-emerald-950 text-emerald-400" : "text-zinc-500"}`}>Buy</button>
              <button onClick={() => setSide("sell")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${side === "sell" ? "bg-rose-950 text-rose-400" : "text-zinc-500"}`}>Sell</button>
            </div>

            {side === "sell" && token.mockHoldingTokens === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-black p-3 text-xs text-zinc-500 mb-4">
                You don&apos;t hold any {token.ticker} in this wallet yet.
              </div>
            ) : (
              <>
                <label className="text-xs text-zinc-500 uppercase tracking-wide">{side === "buy" ? "Amount (USD)" : "Amount (% of your position)"}</label>
                <div className="mt-1.5 flex items-center rounded-lg border border-zinc-800 bg-black px-3 py-2.5 focus-within:ring-2 focus-within:ring-violet-500">
                  <span className="text-zinc-500 mr-1.5">{side === "buy" ? "$" : ""}</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="bg-transparent outline-none w-full text-sm font-mono text-zinc-100 placeholder-zinc-600"
                    autoFocus
                  />
                  {side === "sell" && <span className="text-zinc-500 ml-1.5">%</span>}
                </div>
                {side === "sell" && (
                  <div className="mt-1 text-[11px] text-zinc-600">You hold ~{fmtTokenAmount(token.mockHoldingTokens)} {token.ticker}</div>
                )}

                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {presets.map((p) => (
                    <button key={p} onClick={() => handlePresetClick(p)} className="py-1.5 rounded-md bg-zinc-900 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
                      {side === "buy" ? p : `${p}%`}
                    </button>
                  ))}
                </div>

                {/* Beginner-simple summary */}
                <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>You pay</span>
                    <span className="font-mono text-zinc-100">{side === "buy" ? `${numericAmount > 0 ? paySol.toFixed(4) : "0"} SOL` : `${sellTokens ? fmtTokenAmount(sellTokens) : "0"} ${token.ticker}`}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>You receive</span>
                    <span className="font-mono text-zinc-100">
                      {side === "buy"
                        ? `~${receiveTokens ? fmtTokenAmount(receiveTokens) : "0"} ${token.ticker}`
                        : `~${receiveSol ? receiveSol.toFixed(4) : "0"} SOL`}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Price impact</span>
                    <span className="font-mono text-zinc-100">{priceImpactLabel(token.priceImpactPct)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Risk</span>
                    <span className={`font-medium ${risk.text}`}>{risk.emoji} {risk.label}</span>
                  </div>
                </div>

                <button onClick={() => setShowAdvanced((v) => !v)} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 underline decoration-dotted">
                  {showAdvanced ? "Hide" : "Show"} advanced details
                </button>

                {showAdvanced && (
                  <div className="mt-2 rounded-lg border border-zinc-800 bg-black p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-zinc-500"><span>Route</span><span className="font-mono text-zinc-300">{token.route}</span></div>
                    <div className="flex justify-between text-zinc-500"><span>Price impact</span><span className="font-mono text-zinc-300">{token.priceImpactPct.toFixed(2)}%</span></div>
                    <div className="flex justify-between text-zinc-500"><span>Slippage tolerance</span><span className="font-mono text-zinc-300">{(token.slippageBps / 100).toFixed(1)}%</span></div>
                    <div className="flex justify-between text-zinc-500"><span>Network fee (est.)</span><span className="font-mono text-zinc-300">~0.000005 SOL</span></div>
                    <div className="flex justify-between text-zinc-500"><span>Platforms detected</span><PlatformBadges platforms={token.platforms} /></div>
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={!canSubmit}
                  className={`mt-4 w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
                    !canSubmit ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : side === "buy" ? "bg-emerald-500 hover:bg-emerald-400 text-emerald-950" : "bg-rose-500 hover:bg-rose-400 text-rose-950"
                  }`}
                >
                  {side === "buy" ? `Buy ${token.ticker}` : `Sell ${token.ticker}`}
                </button>
                <p className="mt-2 text-center text-[11px] text-zinc-600">
                  You&apos;ll be asked to approve this in {wallet ? "your connected wallet" : "your wallet"} — Mavo never holds your funds.
                </p>
              </>
            )}
          </>
        )}

        {step === "signing" && (
          <div className="py-8 flex flex-col items-center text-center">
            <SpinnerIcon className="text-violet-400 mb-4" />
            <div className="text-sm font-semibold text-zinc-100">Waiting for wallet approval</div>
            <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">Simulated for this prototype — a real build would prompt your wallet extension to sign the transaction now.</p>
          </div>
        )}

        {step === "success" && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-11 h-11 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center mb-3">
              <CheckIcon />
            </div>
            <div className="text-sm font-semibold text-zinc-100">Simulated trade complete</div>
            {quick && (
              <p className="text-xs text-zinc-400 mt-1">Quick bought ${QUICK_BUY_USD} of {token.ticker}</p>
            )}
            <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">
              This prototype did not send a real transaction. A finished build would show the real transaction signature and an explorer link here.
            </p>
            <div className="mt-3 w-full rounded-lg border border-dashed border-zinc-800 bg-black px-3 py-2 text-[11px] font-mono text-zinc-500 truncate">
              MOCK_TX_SIGNATURE_NOT_REAL
            </div>
            <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Advanced token view
--------------------------------------------------------------------------- */

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-mono font-medium text-zinc-100 tabular-nums">{value}</div>
    </div>
  );
}

function ComingSoonPanel({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{title}</span>
        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">Not connected yet</span>
      </div>
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function QuickTrade({ token, wallet, onTrade }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Trade</div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onTrade(token, "buy")} className="py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors text-emerald-950 text-sm font-semibold">
          Buy {token.ticker}
        </button>
        <button onClick={() => onTrade(token, "sell")} className="py-3 rounded-lg bg-rose-500 hover:bg-rose-400 transition-colors text-rose-950 text-sm font-semibold">
          Sell {token.ticker}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-zinc-600 text-center">
        {wallet ? `Connected: ${wallet.address}` : "You'll be asked to connect a wallet first."}
      </p>
    </div>
  );
}

function TokenDetail({ token, wallet, onBack, onTrade }) {
  const risk = RISK_META[riskLevel(token.riskScore)];
  const stageLabel = token.stage === "new" ? "New pair" : token.stage === "migrating" ? "Migrating" : "Migrated";

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 mb-4 transition-colors">
        <BackIcon />
        Back to Discover
      </button>

      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${token.color}`}>
            {token.ticker.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold font-mono">{token.ticker}</h1>
              <span className="text-sm text-zinc-500">{token.name}</span>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${risk.bg} ${risk.text}`}>
                {risk.emoji} {risk.label}
              </span>
            </div>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {token.watchingNow} watching now
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Platforms</div>
          <PlatformBadges platforms={token.platforms} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <div className="min-w-0 space-y-4">
          <TokenChart token={token} />

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
            <Stat label="Market cap" value={fmtUsd(token.marketCap)} />
            <Stat label="Liquidity" value={fmtUsd(token.liquidity)} />
            <Stat label="Volume (24h)" value={fmtUsd(token.volume24h)} />
            <Stat label="Holders" value={fmtHolders(token.holders)} />
            <Stat label="Age" value={fmtAge(token.ageMinutes)} />
            <Stat label="Watching now" value={`${token.watchingNow}`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Migration status</span>
                <span className="text-xs font-medium text-zinc-100">{stageLabel}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-violet-500" style={{ width: `${token.migrationPct}%` }} />
              </div>
              <div className="mt-1.5 text-xs text-zinc-500">{token.migrationPct}% to full migration</div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Risk analysis</span>
              </div>
              <div className="space-y-2">
                {token.riskReasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-zinc-600" />
                    <span className="text-zinc-300">{r}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-500">Estimates based on on-chain heuristics — not proof, and not financial advice.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2.5">Top holders</div>
              <div className="space-y-2">
                {token.topHolders.map((h) => (
                  <div key={h.label} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-32 shrink-0">{h.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: `${Math.min(100, h.pct * 2.2)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-zinc-300 w-10 text-right">{h.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2.5">Creator</div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <Stat label="Wallet" value={token.creator.wallet} />
                <Stat label="Wallet age" value={`${token.creator.ageDays}d`} />
                <Stat label="Other tokens created" value={`${token.creator.tokensCreated}`} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ComingSoonPanel title="Bubble map" description="Visual map of wallet clusters and how supply is connected." />
            <ComingSoonPanel title="Wallet activity" description="Live feed of buys, sells, and transfers for this token." />
          </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <QuickTrade token={token} wallet={wallet} onTrade={onTrade} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Top navigation
--------------------------------------------------------------------------- */

const NAV_ITEMS = ["Discover", "Pulse", "Trackers", "Portfolio", "Rewards"];

function TopNav({ activeNav, onNavChange, wallet, onOpenWalletModal }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-black/95 backdrop-blur">
      <div className="flex items-center gap-6 px-5 py-3">
        <button onClick={() => onNavChange("Discover")} className="flex items-center gap-2 shrink-0">
          {/* REPLACE WITH REAL: point src at the actual hosted logo file
              (e.g. /logo.png in the Next.js public/ folder) once it's
              added to the repo — white artwork on transparent background
              reads correctly against this bar's black backdrop as-is. */}
          <img src="/logo.png" alt="Mavo" className="w-7 h-7 object-contain shrink-0" />
          <span className="font-semibold text-base tracking-tight text-zinc-100">Mavo</span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => onNavChange(item)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                activeNav === item ? "text-zinc-100 bg-zinc-900" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {wallet ? (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-zinc-300">{wallet.balanceSol.toFixed(2)} SOL</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300">{wallet.address}</span>
            </div>
          ) : null}
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors px-3.5 py-1.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <WalletIcon />
            {wallet ? "Wallet Connected" : "Connect Wallet"}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------------
   Page
--------------------------------------------------------------------------- */

export default function MavoDashboard() {
  const [activeNav, setActiveNav] = useState("Discover");
  const [selectedId, setSelectedId] = useState(null);
  const [wallet, setWallet] = useState(null); // { address, balanceSol } | null
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [tradeRequest, setTradeRequest] = useState(null); // { token, side } | null

  const newPairs = useMemo(() => MOCK_TOKENS.filter((t) => t.stage === "new"), []);
  const migrating = useMemo(() => MOCK_TOKENS.filter((t) => t.stage === "migrating"), []);
  const migrated = useMemo(() => MOCK_TOKENS.filter((t) => t.stage === "migrated"), []);
  const selectedToken = selectedId ? MOCK_TOKENS.find((t) => t.id === selectedId) : null;

  function handleNavChange(item) {
    setActiveNav(item);
    setSelectedId(null);
  }

  // Entry point for every Buy/Sell button in the app — if no wallet is
  // connected yet, prompt that first, then open the trade modal.
  function handleTradeRequest(token, side) {
    if (!wallet) {
      setTradeRequest({ token, side, quick: false });
      setWalletModalOpen(true);
      return;
    }
    setTradeRequest({ token, side, quick: false });
  }

  // One-tap quick buy from a coin card — same wallet-connect gate as a
  // normal trade, but the resulting TradeModal opens in "quick" mode
  // (preset amount, skips straight to signing).
  function handleQuickBuy(token) {
    if (!wallet) {
      setTradeRequest({ token, side: "buy", quick: true });
      setWalletModalOpen(true);
      return;
    }
    setTradeRequest({ token, side: "buy", quick: true });
  }

  function handleWalletConnected(w) {
    setWallet(w);
    setWalletModalOpen(false);
    // if the user clicked Buy/Sell before connecting, resume straight into the trade modal
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <TopNav activeNav={activeNav} onNavChange={handleNavChange} wallet={wallet} onOpenWalletModal={() => setWalletModalOpen(true)} />

      <main className="p-4 md:p-5">
        {activeNav !== "Discover" ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-10 text-center max-w-md mx-auto mt-10">
            <div className="text-lg font-semibold text-zinc-100 mb-1">{activeNav}</div>
            <p className="text-sm text-zinc-500">This section isn&apos;t built yet — the navigation is wired up so it can be added without reworking the rest of Mavo.</p>
          </div>
        ) : selectedToken ? (
          <TokenDetail token={selectedToken} wallet={wallet} onBack={() => setSelectedId(null)} onTrade={handleTradeRequest} />
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-lg font-semibold text-zinc-100">Discover</h1>
              <p className="text-xs text-zinc-500">Find a coin, check the risk, enter an amount, buy — all without leaving Mavo. Mock data for now.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ColumnPanel title="New Pairs" live tokens={newPairs} onOpen={setSelectedId} onTrade={handleTradeRequest} onQuickBuy={handleQuickBuy} />
              <ColumnPanel title="Migrating · Final Stretch" live tokens={migrating} onOpen={setSelectedId} onTrade={handleTradeRequest} onQuickBuy={handleQuickBuy} />
              <ColumnPanel title="Migrated" tokens={migrated} onOpen={setSelectedId} onTrade={handleTradeRequest} onQuickBuy={handleQuickBuy} />
            </div>
          </>
        )}
      </main>

      {walletModalOpen && (
        <WalletConnectModal
          onClose={() => {
            setWalletModalOpen(false);
            setTradeRequest(null);
          }}
          onConnected={handleWalletConnected}
        />
      )}

      {!walletModalOpen && wallet && tradeRequest && (
        <TradeModal token={tradeRequest.token} side={tradeRequest.side} wallet={wallet} onClose={() => setTradeRequest(null)} quick={tradeRequest.quick} />
      )}
    </div>
  );
}
