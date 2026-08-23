"use client";

import { useMemo, useState } from "react";

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
