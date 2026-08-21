export default function Home() {
  return (
    <main className="min-h-screen bg-[#08090b] text-white">
      {/* Top navigation */}
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black font-bold">
            M
          </div>
          <span className="text-xl font-semibold tracking-tight">Mavo</span>
        </div>

        <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <a href="#" className="hover:text-white">
            Discover
          </a>
          <a href="#" className="hover:text-white">
            Paper Trading
          </a>
          <a href="#" className="hover:text-white">
            Portfolio
          </a>
          <a href="#" className="hover:text-white">
            Bot
          </a>
        </nav>

        <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200">
          Connect Wallet
        </button>
      </header>

      {/* Main content */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium text-zinc-400">
            MEMECOIN TERMINAL
          </p>

          <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">
            Trade memecoins
            <br />
            without the confusion.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Discover new pairs, understand token risk, practice with paper
            trading, and trade with powerful tools when you're ready.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-xl bg-white px-6 py-3 font-medium text-black hover:bg-zinc-200">
              Explore tokens
            </button>

            <button className="rounded-xl border border-white/10 px-6 py-3 font-medium text-white hover:bg-white/5">
              Try paper trading
            </button>
          </div>
        </div>

        {/* Market overview */}
        <div className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Market</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Find new and active tokens
              </p>
            </div>

            <button className="text-sm text-zinc-400 hover:text-white">
              View all →
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <TokenCard
              name="MAVO"
              symbol="$MAVO"
              marketCap="$842K"
              liquidity="$126K"
              status="New"
            />

            <TokenCard
              name="Moon Cat"
              symbol="$MCAT"
              marketCap="$2.4M"
              liquidity="$384K"
              status="Trending"
            />

            <TokenCard
              name="Sol Dog"
              symbol="$SDOG"
              marketCap="$671K"
              liquidity="$98K"
              status="Migrated"
            />
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <Feature
            title="Spot risky tokens"
            description="Clear warnings and holder information help you understand what you're buying."
          />

          <Feature
            title="Practice first"
            description="Use paper trading to learn the terminal without risking real money."
          />

          <Feature
            title="Automate later"
            description="Configure your own trading strategy with the optional Mavo bot."
          />
        </div>
      </section>
    </main>
  );
}

function TokenCard({
  name,
  symbol,
  marketCap,
  liquidity,
  status,
}: {
  name: string;
  symbol: string;
  marketCap: string;
  liquidity: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 font-semibold">
            {name[0]}
          </div>

          <div>
            <h3 className="font-medium">{name}</h3>
            <p className="text-sm text-zinc-500">{symbol}</p>
          </div>
        </div>

        <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
          {status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500">Market cap</p>
          <p className="mt-1 font-medium">{marketCap}</p>
        </div>

        <div>
          <p className="text-xs text-zinc-500">Liquidity</p>
          <p className="mt-1 font-medium">{liquidity}</p>
        </div>
      </div>

      <button className="mt-6 w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium hover:bg-white/5">
        View token
      </button>
    </div>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  );
}
