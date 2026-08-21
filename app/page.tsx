```tsx
"use client";

import { useState } from "react";

type Token = {
  name: string;
  symbol: string;
  status: "New" | "Migrated" | "Soon";
  marketCap: string;
  liquidity: string;
  volume: string;
  holders: string;
  viewers: number;
  risk: "Low" | "Medium" | "High";
  change: string;
};

const tokens: Token[] = [
  {
    name: "Moon Cat",
    symbol: "$MCAT",
    status: "New",
    marketCap: "$2.4M",
    liquidity: "$384K",
    volume: "$1.1M",
    holders: "2,841",
    viewers: 184,
    risk: "Low",
    change: "+42.8%",
  },
  {
    name: "Sol Dog",
    symbol: "$SDOG",
    status: "Migrated",
    marketCap: "$671K",
    liquidity: "$98K",
    volume: "$426K",
    holders: "1,294",
    viewers: 91,
    risk: "Medium",
    change: "+18.4%",
  },
  {
    name: "Mavo Cat",
    symbol: "$MAVO",
    status: "Soon",
    marketCap: "$842K",
    liquidity: "$126K",
    volume: "$583K",
    holders: "1,672",
    viewers: 137,
    risk: "Low",
    change: "+27.1%",
  },
  {
    name: "Rocket Frog",
    symbol: "$RFROG",
    status: "New",
    marketCap: "$214K",
    liquidity: "$31K",
    volume: "$182K",
    holders: "634",
    viewers: 46,
    risk: "High",
    change: "-13.7%",
  },
  {
    name: "Pixel Ape",
    symbol: "$PAPE",
    status: "Migrated",
    marketCap: "$4.8M",
    liquidity: "$711K",
    volume: "$2.7M",
    holders: "6,281",
    viewers: 422,
    risk: "Low",
    change: "+64.2%",
  },
  {
    name: "Degen Fish",
    symbol: "$DFISH",
    status: "New",
    marketCap: "$387K",
    liquidity: "$57K",
    volume: "$294K",
    holders: "892",
    viewers: 73,
    risk: "Medium",
    change: "+8.9%",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");

  const filteredTokens = tokens.filter((token) => {
    const matchesTab =
      activeTab === "All" || token.status === activeTab;

    const matchesSearch =
      token.name.toLowerCase().includes(search.toLowerCase()) ||
      token.symbol.toLowerCase().includes(search.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#07080a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07080a]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-bold text-black">
              M
            </div>

            <span className="text-xl font-semibold tracking-tight">
              Mavo
            </span>
          </div>

          <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <button className="text-white">Discover</button>
            <button className="hover:text-white">Paper Trading</button>
            <button className="hover:text-white">Portfolio</button>
            <button className="hover:text-white">Bot</button>
          </nav>

          <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200">
            Connect Wallet
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-5 py-8">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Mavo Terminal
            </p>

            <h1 className="text-3xl font-semibold tracking-tight">
              Discover
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Find new pairs and understand the risk before you trade.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-sm text-zinc-400">
              Market data online
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mt-8">
          <div className="relative max-w-xl">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              ⌕
            </span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search token or ticker..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-zinc-600 focus:border-white/20"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-7 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
          {["All", "New", "Migrated", "Soon"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                activeTab === tab
                  ? "bg-white text-black"
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Market stats */}
        <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Tokens tracked" value="1,284" />
          <Stat label="New today" value="347" />
          <Stat label="24h volume" value="$48.2M" />
          <Stat label="Active traders" value="8,421" />
        </div>

        {/* Token list */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_100px] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-wide text-zinc-600 lg:grid">
            <span>Token</span>
            <span>Market cap</span>
            <span>Liquidity</span>
            <span>Volume</span>
            <span>Risk</span>
            <span />
          </div>

          {filteredTokens.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500">
              No tokens found.
            </div>
          ) : (
            filteredTokens.map((token) => (
              <TokenRow key={token.symbol} token={token} />
            ))
          )}
        </div>

        {/* Beginner information */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <InfoCard
            icon="⚠"
            title="Risk warnings"
            text="Mavo highlights suspicious holder concentration, weak liquidity, and other warning signals."
          />

          <InfoCard
            icon="◉"
            title="Paper trading"
            text="Practice buying and selling with virtual money before putting real funds at risk."
          />

          <InfoCard
            icon="⌁"
            title="Advanced tools"
            text="Experienced traders can open deeper token data, charts, holders and trading controls."
          />
        </div>
      </div>
    </main>
  );
}

function TokenRow({ token }: { token: Token }) {
  const riskClass =
    token.risk === "Low"
      ? "border-green-500/20 bg-green-500/10 text-green-400"
      : token.risk === "Medium"
        ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
        : "border-red-500/20 bg-red-500/10 text-red-400";

  return (
    <div className="border-b border-white/10 px-5 py-5 last:border-0 hover:bg-white/[0.025]">
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_100px] lg:items-center lg:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-semibold">
            {token.name[0]}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium">{token.name}</p>

              <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                {token.status}
              </span>
            </div>

            <div className="mt-1 flex gap-3 text-xs text-zinc-600">
              <span>{token.symbol}</span>
              <span>{token.holders} holders</span>
              <span>{token.viewers} viewing</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs text-zinc-600 lg:hidden">Market cap</p>
          <p className="mt-1 font-medium">{token.marketCap}</p>
          <p className="text-xs text-green-400">{token.change}</p>
        </div>

        <div>
          <p className="text-xs text-zinc-600 lg:hidden">Liquidity</p>
          <p className="mt-1 font-medium">{token.liquidity}</p>
        </div>

        <div>
          <p className="text-xs text-zinc-600 lg:hidden">24h volume</p>
          <p className="mt-1 font-medium">{token.volume}</p>
        </div>

        <div>
          <p className="mb-1 text-xs text-zinc-600 lg:hidden">Risk</p>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${riskClass}`}
          >
            {token.risk} risk
          </span>
        </div>

        <button className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white">
          View
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <p className="text-xs text-zinc-600">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-sm">
        {icon}
      </div>

      <h3 className="font-medium">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {text}
      </p>
    </div>
  );
}
```
