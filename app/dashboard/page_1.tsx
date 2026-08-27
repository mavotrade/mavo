"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Relative imports on purpose — these don't depend on a "@/*" path alias
// being set up in tsconfig.json, so they work regardless of your project's
// config. Adjust the "../" depth if you place page.tsx somewhere other than
// app/dashboard/page.tsx relative to your repo root.
import TradingViewAdvancedChart from "../../components/TradingViewAdvancedChart";
import { resolveTradingViewSymbol } from "../../lib/resolveTradingViewSymbol";

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

// Currency picker (Settings menu) — the "top right" wallet balance is shown
// converted into whichever of these is selected. Rates are mock USD-based
// conversion factors for the prototype; a real build would pull live FX.
const CURRENCIES = {
  usd: { label: "US Dollar", short: "USD", symbol: "$", rateFromUsd: 1 },
  gbp: { label: "British Pound", short: "GBP", symbol: "£", rateFromUsd: 0.79 },
  cad: { label: "Canadian Dollar", short: "CAD", symbol: "C$", rateFromUsd: 1.36 },
};

function fmtCurrency(amountUsd, currencyKey) {
  const c = CURRENCIES[currencyKey] ?? CURRENCIES.usd;
  const amount = amountUsd * c.rateFromUsd;
  return `${c.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Embedded as a data URI so the logo renders with zero extra asset setup —
// swap MAVO_LOGO_DATA_URI for a normal /logo.png path once a hosted file exists.
const MAVO_LOGO_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAWB0lEQVR42u1dCYxdVRme96aVxd0oLrgi4oaauO8iitAhrolL3NfgvhHXoIWgIKG0qHEBkRJQwEbUqGhQSNUIKhKNihhxqVQrltZ22ul0lvufd/3/e///3P8sd2beu+/dmco5yZn75r7lnuU7/37+MzY2NpaneruuaRASAFJNAEg1ASDVBIBUEwBSTQBINQEg1QSAVBMAUk0ASDUBINUEgFQTAFJNAEg1ASDVBIBUEwBSTQBINQEg1f8TAKSSSiqppJJKKqmkkkoqqaSSSiqppJJKKqmkksqoSp7nHaxdrONYV3Ed5/v+e+Nc6V5nhfanq9op/emq/vj9HF+pfRn1pBedb/gbq1bCAPIEFxM9BOB0/p8nPpj0Xq93F7z3WAB4rTHm9NyYjXj9HoD5EV6vxvs/xOsmrJ/F1x/Ez07MzMwcceONN94h8tvdZQBxV9/bt2/ffebn55+FbX0Htnl9lmWX4/X7+P/VeKU+fRfrxfjZM/Hem/CzT8TXd19snA70ie/qgZqenr4fdv6NNLF4/RteTd5f2YdfuR7r57M8P37nzp13kd/etGnTyIGgVyo9a25u7rE4kZ8gwGK9rc++9HAMtuL3rsDXb8Wxub9PFQ54Us//dnCQnoId/SrWHdJ5vhIGMq7zXDN9Dz8j90B9ryg4gH/H+2fOzs4+3FudnVEBGa93nIO51xgwm/HZc7o92ESCdGYAsrAvRT/moXwvU+Dv8UDswnopUrlj1bMOPNag0UskHjv1Lbxm0lnqPA8CjRb9pXs9HDSuhivwfaOvAhgaSKMGbxrrhfjyyBjlGQaQ8boan/kGk5ubcoVeO8Flb6q2+rV4D5x+9XrFtwqgqL7Q+1fhonnqMPvSGq/n6yHYk9Oxh/uLWe/1pKNgJxf0YPDVqMnX7/nAsANqB1BW0x6cpLXbtm07VLen6eTjZDwJf/c6DeIcVzRW40y4eg3OxHv9Uu9BBQ7DlAMYCNSvDfjyzk370vbkPxzrL+zEQzFYxl/ZADUrJRgoHwD6d+xqot+3ZBVf/wr582MGHThZdQQCJDUfxh+d4Ukh6gXVcyGYZOB7ztXU9bF8H4J+GQ2E32BfHkft2rx586oVPfko+R6LDf6PQnBFFj3yV90zHqmHelDg58GASwnUIBdzU8oNuEx7u7A9L+oXBEJud+zYcWfiyfxbUJJ5nzKpCbZ9AG/SQa3yhQDvsb6yzPNY/hf7csKKpARq5Z+AdYqFs6yW7EEdWY8OgrfCIlTBeDJE+Z3i+SR74Op5A7dv1VInf+/evffC1z+xQI7yd6hvpwnlGlBUoa4ChJSFxhIpKbVjBoXdl60oECge+Wxs4B4hk9xw6YDTcdCDElsVUhZkAdXARweV5QOW04hqv2qxgVOTf098fR0DeR5ifDuYdAgpkjAmW3uV0As18o4JZQmuwLLHPtQSnr8iQCADhqh8GDbsFjv5luxBlEy7gg8PiVID85LUEjEv7+W0AkvaXk9CIySWQcCrZwoH7hixF8QEPr4eivUqliPmdV/ALCqriBwyT7JPTPEXsi5qoF4oteyg6kuhSSEWtuGYP0LPwbLo+UJWsWE/VjzfQ3MtmZSBgD4MJ+V3SizUUpgIKDL+8s1TU1P31u33wUy2imryQ1nDXe12coBAqm0U/Nzd+GdbsTiM+Re2cbdn+CrIu+2PLw85/apYW/n7+TXC0pbFTqBI/0cVn4xPuO4IT4gMBKuHf8V6CZl7sb4c0U0m3xNQ6HkJEuB34XvnYf2dGF2U7h0VBiHahlKYwrLRHzQZSPzeSS4VW4DSABN4V3//L9Zv4++8G/v1HOzDQxFwh01OTt596tapw+h/MhXjR6lP38O6VxvDICIHgVUnHZaXMXv6yLKwAkX6j6JO84oxVvqND5Y14nCPZ8kcjINyHJHdJTyTHC6PJ7+AI2uAMiSZEAy9kv/T4GpbwQmiUolahRPzNGITBbsQgU/bKrgqNgZCvfCfLfj9k/Pp6cP7WZFktMLf+LQdQ+4PgNaOooYxw5/fSey3dVagyOUXK4lfIdSAqxqZYPJ/igP2ZI+VaFeqX61LlYH3SPyNK3ntZJVgBXplzrPgVNFbNErh/V+j06bQqW+++eaDxD+B92/kvoBvyAEAT5oHMUnP4cPX5bjCpS9r1661/eDXHa8Gbm1ycLG1FPuTexbFmkXFY4nlS60CQK3+R5DVLZcV4xplYuZbMWqcnd+Qrx7A4dHRK5ZJ9idZwCtXI5tk6R5POL23DT+HHkZ4FzluyJxLA3/DDTdIG+6Dn7kuIP0xFdbYyafP/pvYlAdeGpsO175M5tyfj7NcYEqBEuJGL15Q3A5iI+0JhErnP41Jfwa+yTawipWDRh1s6L4tBpekeAEC/uZ7eLYrpwqYHeR2RRnixaTS+b8hKw+p0DPxc38uvyN2Cwh0dyUMyuT/Ay9H028QkGilL9LmJQMB2/RefgZAKMd4co6lAmtbkQUUuT4EG/VHHmxwV40vyVqpdUOf3q2OV517TF4FBB9nkv9bEuTIL1/HiwuX8ezso/DzX8JGzRJkSoESagRY4/Nd4tdPjBiWlrzyFwpyYdZ6hranuIalwM6BaiGyry1bDh65RqDMvc8thSXfXh9YwWTFXLt169ZDhtBAHxQChC4JpHi9U2x17d+//wFEDbAdn8JK1r0Zq02AAVfQiunjhTRumIq90pv8pUx8Z4mUoKBOFPDC7cwL+4fYIYQNaFUaX6Pc0CND3MjZgELoqaL6QcwSpigB8+PjGpKozkJA8A07DIhH4YB9DNtxDfnZgxgEqAwxobcuMOUWVAxBdJHWHpgNdRaZ4L4og15k0r6cpJt6o9o8A/OUpZq7G7MA0nWFb4aeLEuiROK/suHKjw2wM/kCAFo5OHAT2KYrcVXMaAWgXOkSmAEmZFt1HkdW9Xq9rURJfI8cPXsJMkC/IBAt6zuOnBWlsnacrxgpC1D8n8jTTRV58s2+lXWMkfmaIa5+Z+XTREi7smx2jUjzPGi9MgInVx7JwCAV9c87AqyYXzGGT4Q+XqEvRirzUh3dPAw24Anar3QEQkc9DQRTUmNXjwwECgD3wodNMgCMO1gWBGLlI4HpvkNsVEerhPSiN927P67py0T148Gq4g/0RGvLpIFenPdbQdAoy+OXhcKI0UjkCATCxaJpDEsKV2N9X2FfjsHLba8Ip5NkdRwlACRG7WjPJKvs8cZH5bWqM52hC6Ozs2vw9T+VxJyBv5qh8tHHYg2inj4VU8Ds7lAx8mxBaRvv/UysmXz9I9kYhgUCPWbYlmvFQAVxNmVKe0c+p9rQHRkAWHcWI4WJ2f/FVk26eJ8NWpRMygCjj+D97HErBSE/NAt8Ug71PgO+x+SjisTJsktowpnEr2a+/HkFOPqCAOU2svMPEQQiB3zdWlu1ObpiA7IIc6UJjI+NUAU8XnjsYo4X/P/cPhtUCwDNZ0mdEzMwlHwojCqKBW5Y0u9Y1sQdbV245HPHfn2Insmh5qsZdB9zzMUVyxODzE78jacOYxLk++T7CL2TPtWFHrOj49sAwITwpHisWwEKAcDZw1JN1ICcqjQQI34HDUTQerMPiNJ1m0X99mUswrcklpB4vjI28eSzPqHNs+VroXq3oIn4yKakWKnc6yQwJZRnrM/FMADWtAGANZVQAlEBy1KAfDgAUFLxmzX5BVggntA4kTtC2rOaGINbsJ5PexeE2ihfwSHYZyH7YPsde7axLudrEFgHLSD7dPoAwDkWAEGEVNWO1gCA1zV5FWfFZBTc1VAJUI0BoGSPp3HsvwhprspmIBqhw/KIDtSYxHt/wOtleD0ZB+2YXbt23bXGLv8k8h7aaOAMVNCn6y30DTP4u6c1mQxL8TJzrrAAqNszAZYCTLQHAGudMrGoGQHAOU0AIKvn1ltvvSP+/vUiDOlIIONHzJgw6ATfp0nfhBa1V+C/D40NkN6TxwalL3pRSE6ot2cmjkjlZgpZyeMHZQWK5Z3rsIBIjIJiASe2wQJOFBsAQJT8axmgKQDGmf+eEkYaG9c27oKw5Md5vhf/nIU8+cG+eqXjD2IOoyzLX4jP+rkNCQclbMYmwdUwRB74xqAqsIwZjvd6Hu9oxFVBlUyLFMACwHgygDsQjQGg7A5HYL2NAVAKfSa2saKstI+Qjf1oFZw7OjLh3T708HEKu2J9v+cGi0Ri/ZWvnqkA2UueMAgVUDLA+jA62YlP6KlIpxaFQCuExVYBU4DMrG8AgHEtBBnRgz01zpsEWXlf01vDBiXBqs8vIBXPmr/9WMeI+olIyXgMPjvIpKj+b3AogHHDxJglLQcAwET395UTIxRg/YCdlxV4b4q8kdXvGnMgGjLNhpOutzu5sY8eBcLnUCwirWxQziTwbAxQRe2IiXaLCJn9sIKYFgARLYDD1dsDACVpcOwAEOWLIglvaIJ+vL7FGl78bWSebs++h+slX8AwzaEq/Pq1lhX5IXAmanNwglD73J5Wowb6UcMOC5ho0RAExkAYAwgKAIoCrGrmdo6EaVf2B0MBEQXe8uyYUQ2AIsmXBNE6cdVMa0On9TsOPgtwDUFxALSlBaxxhcCo82VgIVCR/8MkmYSTQyDcai0hZ18fZUSMDoZ1vKHRXczg+kSgf199VAao32K+HFpA2XmH71WygACgHxbQ8Z7zPPLwguvwcLx7wn/L5Z8dO+rASOuLyIpEFFYwBXdTqjZDi2/ht/3u4olpAY4r291wU7KAVgHgm0RdoWwQALj8FvL3VKHaES+eCorE+xQMMfKgyEAOUpQJtFDmTQy+v10leegMYggqnEFK0LbPyMrEEstgCCqSWURCwaApC3CQL6QP4ps/xfZ+fhtx8Yo93UNyIFiBEGLb2KGK3V8gUnlp3kB3lzK4+RZaFQJPdIJBgo2gDgsYBABdfs6ljv4fG+QqIPKDIw+I9CaPdjextTGL7fEHxZvx3j68PLAZBVBagDFRQ1BbMsCEIwSG+wCGIgQi3r/rbzc3yv/NJFBcua9rAwBeoMalLouK74Dmz1DSjAcMKAOc42xV93IQgatuTrQaD1CfxaO5KRi/+8OKAtRm5RhW4OmSi0Qg47O/Uu2K9viyv30LKcD+/ilACYBcWKEJKUC1AFuVASZcZ5CJWaeaUwCA7zs2AH/zqTL9YjmpRQogbtrzqr0REBNQNQWYxpDyBzXXAsI8BcvHAhwtIHBPNpcBTHax9gBCgH6H0pzROgAwUjhIihHuKRAADCIDeCyAhOG436FtZ9BE4AzyhEBFAdY10ALOCPzgYezfsDafDMICzg8SY4R7+YdGAYQFhIEvigK0bQq2aqCfAs5AYzUQUfS2QAg0Yfi2BGPKrp1Rg0AB4KuOdG6gF8kdaAGgYhK6g3sDVa4idzf2MsgAOttVmDCpMQvA61M4WjfXyaEiYVGyc+fkllRB0QIudClANLsXbyg1iM+8oACLbCNb2B7iC5uettG6FuBG40LMF3D2oELg9u3b74Tf/3tlc4/l4avMrVj+NKkydYzIBtBRdoqNlQxQl9LW7ije35wF1ADA9QWc2J47mO0AIJG3Q4wIUlTggjKoQoJBanPxZsMOQ4+1R+9ExmdtdEO1IkksFQvAy4P6ZAHiO1gfOIP8jKSwbCzA58vQjx2gs4RnvSj0usV38UqT8DuyYXN1U0qgTL8HS3o52ZOYq3Ry4O3WUa+1EDg0S2AYh9FuVPCEjdCpmxTTmALYTCRYf693yEI88KIQCDkOb5JCuFRmsW7TE04osIUykI+pxFKWAlg7QCQTqjUEwXQDU/AGP2llJE/x8qiBJovvrgUzlKBQiQh+nxOA4aueXmQQp3mbxu+92T+jSPj4WM2eff88I1r5yhDzSbq3hVOxULIIxxJoTMxOIZbA6cZ2ABNPWds6BXCFQM8JUuXtbRQTqAeKQrwkhVuZj8g3u7pg6PEhFPz8yyg5ox/pS4MrGT7USV5d/TlK9MibQnoMgE9oACAcLwgNQUE6N8M5fKb90PS+hUBf29B7I5Zla1iQzNkRUIa9L+DVjk0gsucfnKyahe4o0TiTlBAKgzqfsVhCSnz/bpSdlA56onx9TL5nYhQAP3OBbwo2Nby5FAJFC1jb7dPkvD4WDxATNtuiAGtyhnVAiqsBKINCGwLAiw+8zF1x/j5A3xhjdwfZvEA4UTfhjUtpgykC4iT8//UYePJOfO8MfP1tSXjtpKOtUsye4gHgosBL55wT4GgB+wbQAsZDS2DdppTl9AUYL5EhDI8CaABwNs+/WAdR7Rbw0BjjHSmzWDZq2vSmV7WThEkB4MJYjmQnF0HlDSQW8JBGAHBYQPWMYjMMhcUuRzyAkxXEREPC1g9pd7BsEH06RdcUsfng5QWIZyj109bak7z4+2V20dLjmDmbTj3PZiADKBYQ5khyvXREAXbv3v3gQbQA0kA0BYCYNTRvd19ARAaIR+oM4gxawoBQvr8ZObgpesCCMf5u5SBgM5o7IJ4VfGEAOJs2g5R5Q3YHR3MxyJa4fKRHygQygE7CpFabxwLWDdMyp9rwUo6yyYssYDG10MldBDWndYU6ta/Z5JwHKCIDnOfIJCbcttXQGziuN4dCYHF0Vc42tYDjivSq9OA8N9Ej4Ko98mcN2zSr9u4/C5+zVfFHcCbehGS5Jnop3N1j3y82mpoyXVD2fFYPD5JE1aEdQOf4hzpvYL8U4CxXCHTlnYyNYzQn2czMC0YJgC6nNj+Sjm9lq5uJ5K/VBxq8fUS2eWFHhxcqm97HbxQQ6o+Yq8u9a5NDKumf2M2b/HMEKbFEr/RUAicZqqiICfL6D8wC6PAJJy9CuENYLKDT+tDMUXhC9QkbV3PH5oLIYHu8q9lD+XtH1SC1AbSLA/NWSguvD3WUc/fcbGHhYY46sLI8DNLIqpfki8/w+2CNSia/nKE3Wz4rsFJaIXAAAOhDOfZwH8BxibubcDbHopdHlSvweXJUChsonLN/OYHX6aOO1deZw3gn8anCFrRaxywi884kVm3O5bwfOfplOwl9dLp5jKR629eudfIPg3fucQmsKXRVH9HveFSxB9mnlLzhjDev/kxY1MjPDJAHUCQu1ikvCbMII59r6wQL/7BoOo6dDDw4KD+gI1X6OI1qP6Whwe9+QNLN6zzECzis8HDJbB0uzT3eWOhDoffu63NjiKa61Ab8jS/Expqog4qKbvfUELweRYIekR9sxC8QkhepPXqtHmcWOzUcjUeHc/JoyvKxEa9XUdoXvP6Ksn3iav0mrp3P0ABiPp9H65W+lHMNNAUiEo+/8RYKF4cyQ/kvEVC/xNe/QYH1Q01Is6SRn5nJjqNAFBprrD/D12eOmu8vJUiilj+PjS3fsfUD5uXp+7vDSETRD6vrdy5aOSZeHYi0oo45lwwf6pAm/xCnLmcCHW/abp2DKHJQVHeI4931DqA6MI6VTyWVVFJJJZVUUkllZZU81dt1TYOQAJBqAkCqCQCpJgCkmgCQagJAqgkAqSYApJoAkGoCQKoJAKkmAKSaAJBqAkCqCQCpJgCkmgCQagJAqgkAqSYApHqg1/8BJyG2+mAfqMEAAAAASUVORK5CYII=";

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

/* ---------------------------------------------------------------------------
   Accent theme system

   The whole UI's accent color (Connect Wallet button, active states, focus
   rings, progress bars, toggles, etc.) is driven by the `accent` object
   below, threaded down as a prop from MavoDashboard to every component that
   renders an accent-colored element.

   Each theme's color is an exact user-supplied hex value, so it can't be
   mapped onto Tailwind's built-in color steps (those are fixed swatches,
   not arbitrary hex). Since this environment only ships Tailwind's
   predefined core classes (no JIT compiler for arbitrary bracket values
   like bg-[#f0eb45]), the exact colors are applied via a small block of
   real CSS (see <AccentStyle> below, rendered once near the root) that
   targets a handful of static class names — accent-solid, accent-ring-70,
   etc. Those class names are what components below actually reference;
   only <AccentStyle> needs to know the real hex values.

   Semantic colors (emerald/rose for gains vs losses, the healthy/careful/
   suspicious risk meter) are intentionally left out of this system so they
   keep meaning "good/bad" regardless of which accent theme is active.
--------------------------------------------------------------------------- */

const THEMES = {
  yellow: { label: "Yellow", base: "#f0eb45", hover: "#f2ee63", active: "#cac53a", on: "#000000" },
  darkblue: { label: "Dark Blue", base: "#526fff", hover: "#6e86ff", active: "#455dd6", on: "#ffffff" },
  emerald: { label: "Emerald Green", base: "#038f45", hover: "#2ba163", active: "#03783a", on: "#ffffff" },
  lightblue: { label: "Light Blue", base: "#cae5f2", hover: "#d2e9f4", active: "#aac0cb", on: "#000000" },
  purple: { label: "Purple", base: "#412e67", hover: "#5f4f7f", active: "#372757", on: "#ffffff" },
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)].join(", ");
}

// Renders the real CSS that backs the accent-* class names used throughout
// the tree. Regenerates whenever the selected theme's hex values change.
// This intentionally overrides Tailwind's own --tw-ring-color variable on
// the same pseudo-states Tailwind's ring-2 utility already targets, so the
// structural `ring-2` / `focus-visible:ring-2` classes keep working as-is —
// only the color is swapped.
function AccentStyle({ accent }) {
  const rgb = hexToRgb(accent.base);
  return (
    <style>{`
      .accent-solid { background-color: ${accent.base}; color: ${accent.on}; }
      .accent-solid:hover { background-color: ${accent.hover}; }
      .accent-solid:active { background-color: ${accent.active}; }
      .accent-ring-70:focus-visible { --tw-ring-color: rgba(${rgb}, 0.7); }
      .accent-ring-60:focus-visible { --tw-ring-color: rgba(${rgb}, 0.6); }
      .accent-ring-50:focus { --tw-ring-color: rgba(${rgb}, 0.5); }
      .accent-ring-50-within:focus-within { --tw-ring-color: rgba(${rgb}, 0.5); }
      .accent-text { color: ${accent.base}; }
      .accent-dot { background-color: ${accent.base}; }
      .accent-bar { background-color: ${accent.base}; }
      .accent-toggle-on { background-color: ${accent.base}; }

      /* Dark, theme-blended scrollbars everywhere in the app — replaces the
         default OS scrollbar (which renders as a stark white bar with
         up/down arrow buttons on some platforms). Scrolling itself is
         untouched; only the scrollbar's appearance changes. */
      * {
        scrollbar-width: thin; /* Firefox */
        scrollbar-color: #3f3f46 transparent;
      }
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background-color: #3f3f46;
        border-radius: 9999px;
        border: 2px solid #000;
        background-clip: padding-box;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: #52525b;
      }
      ::-webkit-scrollbar-corner {
        background: transparent;
      }
      /* Removes the up/down (and left/right) arrow buttons at the ends of
         the scrollbar track — the thumb still drags to scroll normally. */
      ::-webkit-scrollbar-button {
        display: none;
        width: 0;
        height: 0;
      }
    `}</style>
  );
}

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

  const top10Pct = Math.round((20 + rand() * 40) * 10) / 10;
  const devPct = Math.round(rand() * 8 * 10) / 10;
  const sniperPct = Math.round(rand() * 15 * 10) / 10;
  const insiderPct = Math.round(rand() * 12 * 10) / 10;
  const bundlersPct = Math.round(rand() * 6 * 10) / 10;
  const lpBurnedPct = Math.floor(rand() * 100);
  const proTraders = Math.floor(rand() * 4000) + 50;
  const dexPaid = rand() > 0.35;

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
      { label: "Top 10", pct: top10Pct },
      { label: "Creator", pct: devPct },
      { label: "Suspected bundle", pct: Math.round(rand() * 20 * 10) / 10 },
    ],
    // Compact holder-composition badges shown on every coin card.
    top10Pct,
    devPct,
    sniperPct,
    insiderPct,
    bundlersPct,
    lpBurnedPct,
    proTraders,
    dexPaid,
    watchingNow: Math.floor(rand() * 300) + 4,
    sparkline: makeSparkline(rand, priceChangePct >= 0),
    platforms,
    route: platforms[platforms.length - 1], // primary venue Mavo would route the swap through
    priceImpactPct,
    slippageBps: 300,
  };
}

// Real, actually-listed tokens — these get the genuine TradingView chart
// instead of the mock sparkline (see lib/resolveTradingViewSymbol.ts).
const REAL_TOKENS = [
  { name: "Solana", ticker: "SOL" },
  { name: "Dogecoin", ticker: "DOGE" },
  { name: "Bonk", ticker: "BONK" },
  { name: "dogwifhat", ticker: "WIF" },
  { name: "Pepe", ticker: "PEPE" },
].map((t, i) => ({
  ...buildToken(1000 + i, "migrated"),
  id: `real-${t.ticker.toLowerCase()}`,
  name: t.name,
  ticker: t.ticker,
}));

const MOCK_TOKENS = [
  ...REAL_TOKENS,
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
function GearIcon({ className = "" }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
      />
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
function CardIcon({ className = "" }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" strokeLinecap="round" />
      <path d="M6 15h4" strokeLinecap="round" />
    </svg>
  );
}
function MobilePayIcon({ className = "" }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" strokeLinecap="round" />
    </svg>
  );
}
function BankIcon({ className = "" }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10l9-6 9 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9M3 19h18" strokeLinecap="round" />
    </svg>
  );
}
function ArrowDownTrayIcon({ className = "" }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4v11m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18h16" strokeLinecap="round" />
    </svg>
  );
}
function ArrowUpTrayIcon({ className = "" }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18h16" strokeLinecap="round" />
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
function EyeOffIcon({ className = "" }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-10-8-10-8a18.5 18.5 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 1l22 22" strokeLinecap="round" />
    </svg>
  );
}
function BanIcon({ className = "" }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
function FilterIcon({ className = "" }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 5h16M7 12h10M10 19h4" strokeLinecap="round" />
    </svg>
  );
}
function UsersIcon({ className = "" }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function WrenchIcon({ className = "" }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 10-5.4 5.4L2 19v3h3l7.3-7.3a4 4 0 005.4-5.4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CrosshairIcon({ className = "" }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
    </svg>
  );
}
function EyeIcon({ className = "" }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
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
  const risk = RISK_META[riskLevel(token.riskScore)];

  // Only render the real TradingView widget when we're confident a genuine
  // listing exists for this token (see lib/resolveTradingViewSymbol.ts).
  // Mavo's demo tokens are fictional memecoins, so this will be null for
  // essentially all of them — that's intentional, not a bug: we never
  // substitute a different real market's chart in place of one that
  // doesn't exist.
  const tvSymbol = resolveTradingViewSymbol(token);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono tabular-nums">{fmtPrice(token.price)}</span>
            <span className={`text-sm font-medium font-mono ${positive ? "text-emerald-400" : "text-rose-400"}`}>
              {positive ? "+" : ""}{token.priceChangePct.toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-zinc-500">{token.ticker}/SOL</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Risk verdict lives here — next to the graph — and nowhere
              else in the app (not on the list cards). */}
          <div className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${risk.bg} ${risk.text}`}>
            <span>{risk.emoji}</span>
            <span>{risk.label}</span>
          </div>
          {!tvSymbol && (
            <div className="flex gap-1">
              {["5m", "1H", "6H", "1D"].map((tf, i) => (
                <button key={tf} className={`px-2 py-1 rounded-lg text-xs font-medium ${i === 1 ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tvSymbol ? (
        // Real TradingView Advanced Chart Widget — its own toolbar already
        // provides candlesticks, volume, zoom, fullscreen, and timeframe
        // selection, so Mavo's fake timeframe row above is hidden for this
        // branch only (the mock fallback below is untouched).
        <div style={{ height: "clamp(360px, 60vh, 560px)" }}>
          <TradingViewAdvancedChart symbol={tvSymbol} theme="dark" interval="60" height="100%" />
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[220px]" preserveAspectRatio="none">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="#27272a" strokeWidth="1" />
            ))}
            <path d={`M ${path} L ${w},${h} L 0,${h} Z`} fill={stroke} opacity="0.12" stroke="none" />
            <path d={`M ${path}`} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
          </svg>
          <p className="mt-2 text-[11px] text-zinc-600">
            Mock preview chart — {token.ticker} isn't a listed symbol on TradingView, so no real chart is substituted here.
          </p>
        </>
      )}
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
        <span key={p} className="text-[10px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg px-1.5 py-0.5">
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

function CoinCard({ token, onOpen, onQuickBuy, onHide, onBlacklistDev, accent, showChart = true }) {
  const positive = token.priceChangePct >= 0;

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 p-3 hover:border-zinc-700 hover:bg-zinc-900 transition-colors">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onHide(token); }}
          title="Hide this coin"
          aria-label={`Hide ${token.ticker}`}
          className="p-1.5 rounded-lg bg-black/60 text-zinc-500 hover:text-zinc-200 hover:bg-black transition-colors"
        >
          <EyeOffIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onBlacklistDev(token); }}
          title="Blacklist this dev's wallet"
          aria-label={`Blacklist the dev behind ${token.ticker}`}
          className="p-1.5 rounded-lg bg-black/60 text-zinc-500 hover:text-rose-400 hover:bg-black transition-colors"
        >
          <BanIcon />
        </button>
      </div>
      <button onClick={() => onOpen(token.id)} className={`w-full text-left focus-visible:outline-none focus-visible:ring-2 accent-ring-60 rounded-xl`}>
        <div className="flex items-start gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${token.color}`}>
            {token.ticker.slice(0, 2)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 pr-12">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-sm text-zinc-100 font-mono truncate">{token.ticker}</span>
                  <span className="text-xs text-zinc-500 truncate">{token.name}</span>
                </div>
                <span className="text-xs text-zinc-500">{fmtAge(token.ageMinutes)} old</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {showChart && <Sparkline data={token.sparkline} positive={positive} />}
              <span className={`text-sm font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                {positive ? "+" : ""}{token.priceChangePct.toFixed(0)}%
              </span>
            </div>

            {/* Holder composition — small icon + percentage, each with a
                tooltip naming what it measures. The risk verdict itself
                (Be Careful / Looks Healthy / etc.) intentionally lives only
                on the detail page next to the chart, not here. */}
            <div className="mt-2 flex items-center gap-2.5 flex-wrap">
              <span title="Top 10 holders" className="flex items-center gap-1 text-[11px] text-zinc-400">
                <UsersIcon className="text-zinc-500" />{token.top10Pct}%
              </span>
              <span title="Dev holding" className="flex items-center gap-1 text-[11px] text-zinc-400">
                <WrenchIcon className="text-zinc-500" />{token.devPct}%
              </span>
              <span title="Snipers holding" className="flex items-center gap-1 text-[11px] text-zinc-400">
                <CrosshairIcon className="text-zinc-500" />{token.sniperPct}%
              </span>
              <span title="Insiders holding" className="flex items-center gap-1 text-[11px] text-zinc-400">
                <EyeIcon className="text-zinc-500" />{token.insiderPct}%
              </span>
            </div>

            {/* Stacked label-over-value so each number's label is unambiguous
                at a glance, sized up and off monospace so it reads as a
                clean figure rather than a raw data dump. */}
            <div className="mt-3 grid grid-cols-2 gap-y-2.5 gap-x-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Mcap</div>
                <div className="text-sm font-semibold text-zinc-100">{fmtUsd(token.marketCap)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Liq</div>
                <div className="text-sm font-semibold text-zinc-100">{fmtUsd(token.liquidity)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Holders</div>
                <div className="text-sm font-semibold text-zinc-100">{fmtHolders(token.holders)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">Vol</div>
                <div className="text-sm font-semibold text-zinc-100">{fmtUsd(token.volume24h)}</div>
              </div>
            </div>
          </div>
        </div>
      </button>

      <button
        onClick={() => onQuickBuy(token)}
        aria-label={`Quick buy $${QUICK_BUY_USD} of ${token.ticker}`}
        className={`mt-2.5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full accent-solid transition-colors text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 accent-ring-70 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
      >
        <LightningIcon />
        Quick Buy · ${QUICK_BUY_USD}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Discover column
--------------------------------------------------------------------------- */

function TokenListPage({ title, tokens, onOpen, onQuickBuy, query, hiddenTokenIds, blacklistedDevWallets, onHide, onBlacklistDev, accent }) {
  const [safeOnly, setSafeOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = tokens.filter((t) => !hiddenTokenIds.has(t.id) && !blacklistedDevWallets.has(t.creator.wallet));
    list = list.filter((t) => (query.trim() === "" ? true : (t.ticker + t.name).toLowerCase().includes(query.toLowerCase())));
    if (safeOnly) list = list.filter((t) => t.riskScore < 70);
    // No exposed sort control — each list defaults to whatever ordering
    // fits its purpose (freshest first for Trenches, highest volume first
    // for Trending).
    list = [...list].sort((a, b) => (title === "Trenches" ? a.ageMinutes - b.ageMinutes : b.volume24h - a.volume24h));
    return list;
  }, [tokens, query, safeOnly, title, hiddenTokenIds, blacklistedDevWallets]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100" style={{ fontFamily: '"Fredoka", sans-serif' }}>{title}</h1>
          <p className="text-xs text-zinc-500">Find a coin, check the risk, enter an amount, buy — all without leaving Mavo. Mock data for now.</p>
        </div>
        <button
          onClick={() => setSafeOnly((v) => !v)}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            safeOnly ? "bg-emerald-950 text-emerald-400" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          🟢 Safer only
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => <CoinCard key={t.id} token={t} onOpen={onOpen} onQuickBuy={onQuickBuy} onHide={onHide} onBlacklistDev={onBlacklistDev} accent={accent} showChart={false} />)}
        </div>
      ) : (
        <div className="text-center text-sm text-zinc-500 py-16">No results match your search.</div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Trenches — split into New / Soon / Migrated sections, each with its own
   filter toggle and independently filtered/sorted token list.
--------------------------------------------------------------------------- */

function TrenchSection({ label, tokens, onOpen, onQuickBuy, query, hiddenTokenIds, blacklistedDevWallets, onHide, onBlacklistDev, sortBy, accent }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [safeOnly, setSafeOnly] = useState(false);
  // Per-column search, layered on top of the shared top-nav search — matches
  // the reference layout where each list has its own "Search by ticker" box.
  const [localQuery, setLocalQuery] = useState("");

  const filtered = useMemo(() => {
    let list = tokens.filter((t) => !hiddenTokenIds.has(t.id) && !blacklistedDevWallets.has(t.creator.wallet));
    list = list.filter((t) => (query.trim() === "" ? true : (t.ticker + t.name).toLowerCase().includes(query.toLowerCase())));
    list = list.filter((t) => (localQuery.trim() === "" ? true : (t.ticker + t.name).toLowerCase().includes(localQuery.toLowerCase())));
    if (safeOnly) list = list.filter((t) => t.riskScore < 70);
    list = [...list].sort(sortBy);
    return list;
  }, [tokens, query, localQuery, safeOnly, hiddenTokenIds, blacklistedDevWallets, sortBy]);

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 min-w-0 h-full">
      <div className="p-2.5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm text-zinc-100 whitespace-nowrap" style={{ fontFamily: '"Fredoka", sans-serif' }}>{label}</h2>
          <span className="text-[11px] text-zinc-500">{filtered.length}</span>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            title="Filters"
            aria-pressed={filtersOpen || safeOnly}
            className={`ml-auto p-1.5 rounded-lg transition-colors ${
              filtersOpen || safeOnly ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <FilterIcon />
          </button>
        </div>

        <div className="relative mt-2">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search by ticker"
            className="w-full rounded-lg border border-zinc-800 bg-black pl-8 pr-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none accent-ring-50 focus:ring-2 transition-shadow"
          />
        </div>

        {filtersOpen && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setSafeOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                safeOnly ? "bg-emerald-950 text-emerald-400" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              🟢 Safer only
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {filtered.length > 0 ? (
          filtered.map((t) => <CoinCard key={t.id} token={t} onOpen={onOpen} onQuickBuy={onQuickBuy} onHide={onHide} onBlacklistDev={onBlacklistDev} accent={accent} showChart={false} />)
        ) : (
          <div className="text-center text-xs text-zinc-500 py-10">No coins match right now.</div>
        )}
      </div>
    </div>
  );
}

function TrenchesPage({ newTokens, soonTokens, migratedTokens, onOpen, onQuickBuy, query, hiddenTokenIds, blacklistedDevWallets, onHide, onBlacklistDev, accent }) {
  const sharedProps = { onOpen, onQuickBuy, query, hiddenTokenIds, blacklistedDevWallets, onHide, onBlacklistDev, accent };
  return (
    <div className="flex flex-col h-[calc(100vh-160px)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold text-zinc-100" style={{ fontFamily: '"Fredoka", sans-serif' }}>Trenches</h1>
        <p className="text-xs text-zinc-500">Fresh pairs, sorted into New, Soon, and Migrated. Mock data for now.</p>
      </div>
      {/* Always 3 columns side by side, like a trading terminal — this does
          NOT depend on a responsive breakpoint class, on purpose: it stays
          3-up at every viewport width, with the row itself scrolling
          horizontally (not stacking) if the screen is too narrow to fit
          all three comfortably. */}
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="grid gap-4 h-full" style={{ gridTemplateColumns: "repeat(3, minmax(280px, 1fr))", minWidth: 900 }}>
          <TrenchSection label="New" tokens={newTokens} sortBy={(a, b) => a.ageMinutes - b.ageMinutes} {...sharedProps} />
          <TrenchSection label="Soon" tokens={soonTokens} sortBy={(a, b) => b.migrationPct - a.migrationPct} {...sharedProps} />
          <TrenchSection label="Migrated" tokens={migratedTokens} sortBy={(a, b) => b.volume24h - a.volume24h} {...sharedProps} />
        </div>
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

function WalletConnectModal({ onClose, onConnected, onWithdraw, wallet, currency, accent }) {
  // step "choose"    -> the little "Deposit or Withdraw" tab that opens first
  // step "pick"      -> choosing which wallet/on-ramp to use (Deposit)
  // step "amount"    -> the little deposit tab that pops up once a wallet is picked
  // step "connecting"-> simulated connect/deposit in flight
  // step "withdraw"  -> amount + destination for sending SOL out
  // step "withdraw-disconnected" -> shown if Withdraw is picked with nothing to withdraw
  // step "withdrawing" -> simulated withdrawal in flight
  const [step, setStep] = useState("choose");
  const [selectedWallet, setSelectedWallet] = useState(null); // { id, name }
  const [amountUnit, setAmountUnit] = useState("fiat"); // "fiat" | "sol" — "fiat" follows whatever currency is picked in Settings
  const [amount, setAmount] = useState("100");
  const [withdrawAmountUnit, setWithdrawAmountUnit] = useState("sol");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const curr = CURRENCIES[currency] ?? CURRENCIES.usd;

  const cryptoWallets = [
    { id: "phantom", name: "Phantom" },
    { id: "solflare", name: "Solflare" },
    { id: "backpack", name: "Backpack" },
    { id: "coinbase", name: "Coinbase Wallet" },
    { id: "trust", name: "Trust Wallet" },
    { id: "glow", name: "Glow" },
    { id: "exodus", name: "Exodus" },
    { id: "ledger", name: "Ledger" },
    { id: "walletconnect", name: "WalletConnect" },
  ];
  // Fiat on-ramps — these don't "connect" an existing wallet like the list
  // above; they'd buy SOL directly and deposit it into a fresh Mavo wallet.
  // REPLACE WITH REAL: wire these to an actual on-ramp provider (e.g.
  // MoonPay, Stripe, or Coinbase Onramp) instead of simulating a connection.
  const fiatOptions = [
    { id: "applepay", name: "Apple Pay", icon: MobilePayIcon },
    { id: "googlepay", name: "Google Pay", icon: MobilePayIcon },
    { id: "card", name: "Debit or Credit Card", icon: CardIcon },
    { id: "bank", name: "Bank Transfer", icon: BankIcon },
  ];

  const fiatPresets = ["50", "100", "250", "500"];
  const solPresets = ["1", "5", "10", "25"];
  const numericAmount = parseFloat(amount) || 0;
  // Amount typed while in "fiat" mode is in whichever currency is selected
  // in Settings (curr), so it's converted back to USD via curr.rateFromUsd
  // before being turned into a SOL amount.
  const amountUsd = amountUnit === "fiat" ? numericAmount / curr.rateFromUsd : numericAmount * SOL_PRICE_USD;
  const amountSol = amountUnit === "fiat" ? amountUsd / SOL_PRICE_USD : numericAmount;

  const availableSol = wallet?.balanceSol ?? 0;
  const numericWithdraw = parseFloat(withdrawAmount) || 0;
  const withdrawAmountUsd = withdrawAmountUnit === "fiat" ? numericWithdraw / curr.rateFromUsd : numericWithdraw * SOL_PRICE_USD;
  const withdrawAmountSol = withdrawAmountUnit === "fiat" ? withdrawAmountUsd / SOL_PRICE_USD : numericWithdraw;
  const withdrawTooMuch = withdrawAmountSol > availableSol + 1e-9;
  const canWithdraw = withdrawAmountSol > 0 && !withdrawTooMuch && withdrawAddress.trim().length > 0;

  // Which step the Back button returns to from each step — keeps the two
  // flows (deposit vs withdraw) from tangling into each other.
  const BACK_STEP = { pick: "choose", amount: "pick", withdraw: "choose", "withdraw-disconnected": "choose" };

  // Clicking a wallet/on-ramp no longer connects immediately — it opens the
  // little "how much do you want to add" tab first.
  function handlePick(w) {
    setSelectedWallet(w);
    setStep("amount");
  }

  function handleConfirmAmount() {
    if (numericAmount <= 0) return;
    // REPLACE WITH REAL: await wallet adapter's connect() for the crypto
    // wallet list, or the on-ramp provider's checkout flow for the fiat
    // options — then read the real public key/balance instead of these
    // mock values. amountSol below stands in for the deposit the user
    // just requested. Instant here (no fake loading delay), same as buy/sell.
    onConnected({
      address: `${selectedWallet.id.slice(0, 4)}${Math.random().toString(36).slice(2, 6)}...${Math.random().toString(36).slice(2, 6)}`,
      balanceSol: amountSol,
    });
  }

  function handleConfirmWithdraw() {
    if (!canWithdraw) return;
    // REPLACE WITH REAL: build and send an actual on-chain transfer to
    // withdrawAddress, then only credit it as withdrawn once confirmed.
    // Instant here (no fake loading delay), same as buy/sell.
    onWithdraw(withdrawAmountSol);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm mx-auto my-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {!["choose", "connecting", "withdrawing"].includes(step) && (
          <button
            onClick={() => setStep(BACK_STEP[step] ?? "choose")}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 mb-2 -ml-1"
          >
            <BackIcon /> Back
          </button>
        )}

        {step === "choose" && (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-zinc-100">Wallet</h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              {wallet ? `Available balance: ${availableSol.toFixed(3)} SOL` : "Connect a wallet or buy SOL to get started."}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => setStep("pick")}
                className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-black hover:bg-zinc-900 transition-colors px-4 py-3.5"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-full accent-solid shrink-0"><ArrowDownTrayIcon /></span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-zinc-100">Deposit</span>
                  <span className="block text-xs text-zinc-500">Connect a wallet or buy SOL</span>
                </span>
              </button>
              <button
                onClick={() => setStep(wallet && availableSol > 0 ? "withdraw" : "withdraw-disconnected")}
                className="w-full flex items-center gap-3 rounded-xl border border-zinc-800 bg-black hover:bg-zinc-900 transition-colors px-4 py-3.5"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-800 text-zinc-300 shrink-0"><ArrowUpTrayIcon /></span>
                <span className="text-left">
                  <span className="block text-sm font-semibold text-zinc-100">Withdraw</span>
                  <span className="block text-xs text-zinc-500">{wallet && availableSol > 0 ? "Send SOL out of Mavo" : "Connect a wallet first"}</span>
                </span>
              </button>
            </div>
          </>
        )}

        {step === "pick" && (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-zinc-100">Connect a wallet</h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">Mavo never asks for your seed phrase or private key. Your wallet signs every trade — Mavo never holds your funds.</p>

            <div className="space-y-4">
              <div>
                <div className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Crypto wallets</div>
                <div className="space-y-2">
                  {cryptoWallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handlePick(w)}
                      className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-black hover:bg-zinc-900 transition-colors px-3.5 py-3"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-medium text-zinc-100">
                        <WalletIcon className="text-zinc-500" />
                        {w.name}
                      </span>
                      <span className="text-xs text-zinc-500">Connect</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Or buy SOL instantly</div>
                <div className="space-y-2">
                  {fiatOptions.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        onClick={() => handlePick(w)}
                        className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-black hover:bg-zinc-900 transition-colors px-3.5 py-3"
                      >
                        <span className="flex items-center gap-2.5 text-sm font-medium text-zinc-100">
                          <Icon className="text-zinc-500" />
                          {w.name}
                        </span>
                        <span className="text-xs text-zinc-500">Continue</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-zinc-600 text-center">Prototype — this simulates a wallet connection. No real wallet adapter or on-ramp is wired up yet.</p>
          </>
        )}

        {step === "amount" && selectedWallet && (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-zinc-100">Add funds — {selectedWallet.name}</h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">How much do you want to put into your Mavo account?</p>

            <div className="rounded-xl border border-zinc-800 bg-black p-3.5 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Amount</span>
                <div className="flex rounded-lg border border-zinc-800 overflow-hidden text-[11px] font-semibold">
                  <button
                    onClick={() => setAmountUnit("fiat")}
                    className={`px-2.5 py-1 transition-colors ${amountUnit === "fiat" ? "accent-solid" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {curr.short}
                  </button>
                  <button
                    onClick={() => setAmountUnit("sol")}
                    className={`px-2.5 py-1 transition-colors ${amountUnit === "sol" ? "accent-solid" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    SOL
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-semibold text-zinc-600">{amountUnit === "fiat" ? curr.symbol : ""}</span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-2xl font-semibold text-zinc-100 placeholder-zinc-700 outline-none"
                />
                {amountUnit === "sol" && <span className="text-2xl font-semibold text-zinc-600">SOL</span>}
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                {amountUnit === "fiat" ? `≈ ${amountSol.toFixed(3)} SOL` : `≈ ${fmtCurrency(amountUsd, currency)}`}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {(amountUnit === "fiat" ? fiatPresets : solPresets).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(p)}
                    className={`rounded-lg border border-zinc-800 py-1.5 text-xs font-semibold transition-colors ${
                      amount === p ? "accent-solid" : "text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    {amountUnit === "fiat" ? `${curr.symbol}${p}` : `${p}`}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirmAmount}
              disabled={numericAmount <= 0}
              className="w-full rounded-xl accent-solid py-3 text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              Add funds & connect
            </button>
            <p className="mt-3 text-[11px] text-zinc-600 text-center">Prototype — this simulates a deposit. No real funds move yet.</p>
          </>
        )}

        {step === "withdraw-disconnected" && (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-zinc-100">Withdraw</h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              {wallet ? "Your balance is 0.00 SOL — deposit first before you can withdraw." : "You'll need to connect a wallet and add funds before you can withdraw."}
            </p>
            <button
              onClick={() => setStep("pick")}
              className="w-full rounded-xl accent-solid py-3 text-sm font-semibold transition-colors"
            >
              Go to Deposit
            </button>
          </>
        )}

        {step === "withdraw" && wallet && (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-zinc-100">Withdraw</h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
            </div>
            <p className="text-xs text-zinc-500 mb-4">Available: {availableSol.toFixed(3)} SOL</p>

            <div className="rounded-xl border border-zinc-800 bg-black p-3.5 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Amount</span>
                <div className="flex rounded-lg border border-zinc-800 overflow-hidden text-[11px] font-semibold">
                  <button
                    onClick={() => setWithdrawAmountUnit("sol")}
                    className={`px-2.5 py-1 transition-colors ${withdrawAmountUnit === "sol" ? "accent-solid" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    SOL
                  </button>
                  <button
                    onClick={() => setWithdrawAmountUnit("fiat")}
                    className={`px-2.5 py-1 transition-colors ${withdrawAmountUnit === "fiat" ? "accent-solid" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {curr.short}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-semibold text-zinc-600">{withdrawAmountUnit === "fiat" ? curr.symbol : ""}</span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-2xl font-semibold text-zinc-100 placeholder-zinc-700 outline-none"
                />
                {withdrawAmountUnit === "sol" && <span className="text-2xl font-semibold text-zinc-600">SOL</span>}
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                {withdrawAmountUnit === "fiat" ? `≈ ${withdrawAmountSol.toFixed(3)} SOL` : `≈ ${fmtCurrency(withdrawAmountUsd, currency)}`}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const solAmt = (availableSol * pct) / 100;
                      setWithdrawAmount(withdrawAmountUnit === "fiat" ? (solAmt * SOL_PRICE_USD * curr.rateFromUsd).toFixed(2) : solAmt.toFixed(4));
                    }}
                    className="rounded-lg border border-zinc-800 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 transition-colors"
                  >
                    {pct === 100 ? "Max" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black p-3.5 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Withdraw to</span>
              <input
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder="Destination wallet address"
                className="w-full mt-1.5 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
              />
            </div>

            {withdrawTooMuch && <p className="text-xs text-rose-400 mb-2 mt-2">That's more than your available balance.</p>}

            <button
              onClick={handleConfirmWithdraw}
              disabled={!canWithdraw}
              className="w-full rounded-xl accent-solid py-3 text-sm font-semibold disabled:opacity-40 transition-colors mt-3"
            >
              Withdraw
            </button>
            <p className="mt-3 text-[11px] text-zinc-600 text-center">Prototype — this simulates a withdrawal. No real funds move yet.</p>
          </>
        )}
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

function TradeModal({ token, side: initialSide, wallet, onClose, quick = false, paper = false, paperWallet, paperBuy, paperSell, walletBuy, walletSell, accent }) {
  const [side, setSide] = useState(initialSide);
  const [amount, setAmount] = useState(quick ? String(QUICK_BUY_USD) : "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [step, setStep] = useState(quick ? "signing" : "review"); // review -> signing -> success
  const [result, setResult] = useState(null); // filled in on a sell: { pnlSol, pnlPct }

  const risk = RISK_META[riskLevel(token.riskScore)];
  const numericAmount = parseFloat(amount) || 0;

  // Practice mode trades against the separate paper wallet/position for this
  // token; the real-wallet flow trades against the connected wallet's own
  // position for it — both are tracked the same way, just in different
  // buckets, so buying actually spends from (and selling actually credits
  // back to) whichever balance is shown in the top right.
  const paperPosition = paper ? paperWallet?.positions?.[token.id] : null;
  const walletPosition = !paper ? wallet?.positions?.[token.id] : null;
  const position = paper ? paperPosition : walletPosition;
  const holdingTokens = position ? position.tokensHeld : 0;
  const availableBalanceSol = paper ? (paperWallet?.balanceSol ?? 0) : (wallet?.balanceSol ?? 0);

  const paySol = side === "buy" ? numericAmount / SOL_PRICE_USD : null;
  const sellTokens = side === "sell" ? (holdingTokens * numericAmount) / 100 : null;
  const receiveTokens = side === "buy" && numericAmount > 0
    ? (numericAmount / token.price) * (1 - token.priceImpactPct / 100)
    : null;
  const receiveSol = side === "sell" && sellTokens
    ? sellTokens * token.price / SOL_PRICE_USD * (1 - token.priceImpactPct / 100)
    : null;

  const presets = side === "buy" ? ["$5", "$10", "$25", "$50"] : ["25", "50", "75", "100"];
  const overBalance = side === "buy" && paySol !== null && paySol > availableBalanceSol;
  const canSubmit = numericAmount > 0 && (side === "buy" ? !overBalance : holdingTokens > 0);

  function handlePresetClick(p) {
    setAmount(p.replace(/[^0-9.]/g, ""));
  }

  // Runs the trade against whichever wallet's real balance/position math
  // applies — practice or connected — so the balance shown in the top
  // right (and the position shown here) actually changes.
  // REPLACE WITH REAL: for the real-wallet path this is where the built
  // transaction gets sent to the wallet adapter for signing; state would
  // then update only after on-chain confirmation instead of immediately.
  function executeTrade() {
    if (side === "buy" && numericAmount > 0) {
      if (paper) paperBuy(token, numericAmount);
      else walletBuy(token, numericAmount);
    } else if (side === "sell" && numericAmount > 0) {
      const costBasisSold = (position?.costBasisSol ?? 0) * (numericAmount / 100);
      const proceeds = receiveSol ?? 0;
      const pnlSol = proceeds - costBasisSold;
      const pnlPct = costBasisSold > 0 ? (pnlSol / costBasisSold) * 100 : 0;
      setResult({ pnlSol, pnlPct });
      if (paper) paperSell(token, numericAmount);
      else walletSell(token, numericAmount);
    }
  }

  // Quick buy skips the review screen entirely — one tap goes straight to
  // executing with the preset amount. REPLACE WITH REAL: this would still
  // need the wallet adapter's signing step; instant here to match the rest
  // of the app.
  useEffect(() => {
    if (quick) {
      executeTrade();
      setStep("success");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quick]);

  function handleConfirm() {
    // REPLACE WITH REAL: request signature from the wallet adapter, then
    // submit the signed transaction and wait for on-chain confirmation.
    // Instant here — no simulated signing delay.
    executeTrade();
    setStep("success");
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm mx-auto my-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
        {step === "review" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${token.color}`}>
                  {token.ticker.slice(0, 2)}
                </div>
                <span className="text-sm font-semibold text-zinc-100 font-mono">{token.ticker}</span>
                {paper && (
                  <span className="text-[10px] font-semibold text-zinc-300 bg-zinc-800 rounded-full px-2 py-0.5">Practice</span>
                )}
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
            </div>

            <div className="flex rounded-xl bg-zinc-900 p-1 mb-4">
              <button onClick={() => setSide("buy")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${side === "buy" ? "bg-emerald-950 text-emerald-400" : "text-zinc-500"}`}>Buy</button>
              <button onClick={() => setSide("sell")} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${side === "sell" ? "bg-rose-950 text-rose-400" : "text-zinc-500"}`}>Sell</button>
            </div>

            {side === "sell" && holdingTokens === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-black p-3 text-xs text-zinc-500 mb-4">
                You don&apos;t hold any {token.ticker} in {paper ? "your practice wallet" : "this wallet"} yet.
              </div>
            ) : (
              <>
                <label className="text-xs text-zinc-500 uppercase tracking-wide">{side === "buy" ? "Amount (USD)" : "Amount (% of your position)"}</label>
                <div className={`mt-1.5 flex items-center rounded-xl border border-zinc-800 bg-black px-3 py-2.5 focus-within:ring-2 accent-ring-50-within`}>
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
                  <div className="mt-1 text-[11px] text-zinc-600">You hold ~{fmtTokenAmount(holdingTokens)} {token.ticker}</div>
                )}
                {side === "buy" && (
                  <div className="mt-1 text-[11px] text-zinc-600">
                    {paper ? "Practice balance" : "Wallet balance"}: {availableBalanceSol.toFixed(3)} SOL
                  </div>
                )}

                <div className="grid grid-cols-4 gap-1.5 mt-2">
                  {presets.map((p) => (
                    <button key={p} onClick={() => handlePresetClick(p)} className="py-1.5 rounded-lg bg-zinc-900 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
                      {side === "buy" ? p : `${p}%`}
                    </button>
                  ))}
                </div>

                {/* Beginner-simple summary */}
                <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-3 space-y-1.5 text-sm">
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
                  <div className="mt-2 rounded-xl border border-zinc-800 bg-black p-3 space-y-1.5 text-xs">
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
                  className={`mt-4 w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                    !canSubmit ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : side === "buy" ? "bg-emerald-500 hover:bg-emerald-400 text-emerald-950" : "bg-rose-500 hover:bg-rose-400 text-rose-950"
                  }`}
                >
                  {side === "buy" ? `Buy ${token.ticker}` : `Sell ${token.ticker}`}
                </button>
                <p className="mt-2 text-center text-[11px] text-zinc-600">
                  {paper
                    ? "This trade uses your separate practice balance — no real funds are involved."
                    : `You'll be asked to approve this in ${wallet ? "your connected wallet" : "your wallet"} — Mavo never holds your funds.`}
                </p>
              </>
            )}
          </>
        )}

        {step === "signing" && (
          <div className="py-8 flex flex-col items-center text-center">
            <SpinnerIcon className={`accent-text mb-4`} />
            <div className="text-sm font-semibold text-zinc-100">{paper ? "Placing practice trade" : "Waiting for wallet approval"}</div>
            <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">
              {paper
                ? "Running this against your practice balance."
                : "Simulated for this prototype — a real build would prompt your wallet extension to sign the transaction now."}
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-11 h-11 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center mb-3">
              <CheckIcon />
            </div>
            <div className="text-sm font-semibold text-zinc-100">{paper ? "Practice trade complete" : "Simulated trade complete"}</div>
            {quick && (
              <p className="text-xs text-zinc-400 mt-1">Quick bought ${QUICK_BUY_USD} of {token.ticker}</p>
            )}
            {side === "sell" && result && (
              <p className={`text-sm font-semibold mt-1 ${result.pnlSol >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {result.pnlSol >= 0 ? "+" : ""}{result.pnlSol.toFixed(4)} SOL ({result.pnlPct >= 0 ? "+" : ""}{result.pnlPct.toFixed(1)}%)
              </p>
            )}
            <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">
              {paper
                ? "This was a practice trade — your practice balance and position were updated, but no real funds moved."
                : `Your wallet balance and position were updated${side === "buy" ? " — SOL was spent to buy" : ""}${side === "sell" ? " — you were credited SOL for the sale" : ""}. This prototype did not send a real on-chain transaction.`}
            </p>
            {!paper && (
              <div className="mt-3 w-full rounded-xl border border-dashed border-zinc-800 bg-black px-3 py-2 text-[11px] font-mono text-zinc-500 truncate">
                MOCK_TX_SIGNATURE_NOT_REAL
              </div>
            )}
            <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition-colors">
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
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{title}</span>
        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">Not connected yet</span>
      </div>
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  );
}

function QuickTrade({ token, wallet, onTrade, paperMode, paperWallet }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Trade</div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onTrade(token, "buy")} className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 transition-colors text-emerald-950 text-sm font-semibold">
          Buy {token.ticker}
        </button>
        <button onClick={() => onTrade(token, "sell")} className="py-3 rounded-xl bg-rose-500 hover:bg-rose-400 transition-colors text-rose-950 text-sm font-semibold">
          Sell {token.ticker}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-zinc-600 text-center">
        {paperMode
          ? `Practice mode — balance: ${(paperWallet?.balanceSol ?? 0).toFixed(3)} SOL`
          : wallet ? `Connected: ${wallet.address}` : "You'll be asked to connect a wallet first."}
      </p>
    </div>
  );
}

// Compact 3x3 grid of on-chain heuristic badges — top holder concentration,
// dev/sniper/insider/bundler share, LP-burn status, holder count, active
// pro-trader count, and whether the token paid for a DEX profile listing.
// All values come from buildToken(), so every token (real or mock) has them.
function TokenInfoPanel({ token }) {
  const items = [
    { label: "Top 10 H.", value: `${token.top10Pct.toFixed(2)}%`, warn: token.top10Pct > 30 },
    { label: "Dev H.", value: `${token.devPct.toFixed(1)}%`, warn: token.devPct > 5 },
    { label: "Snipers H.", value: `${token.sniperPct.toFixed(1)}%`, warn: token.sniperPct > 5 },
    { label: "Insiders", value: `${token.insiderPct.toFixed(2)}%`, warn: token.insiderPct > 5 },
    { label: "Bundlers", value: `${token.bundlersPct.toFixed(2)}%`, warn: token.bundlersPct > 3 },
    { label: "LP Burned", value: `${token.lpBurnedPct}%`, positive: token.lpBurnedPct >= 50, warn: token.lpBurnedPct < 50 },
    { label: "Holders", value: fmtHolders(token.holders) },
    { label: "Pro Traders", value: `${token.proTraders}` },
    { label: "Dex Paid", value: token.dexPaid ? "Paid" : "Unpaid", positive: token.dexPaid, warn: !token.dexPaid },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Token info</div>
      <div className="grid grid-cols-3 gap-2.5">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 text-center">
            <div
              className={`text-sm font-semibold font-mono ${
                it.warn ? "text-rose-400" : it.positive ? "text-emerald-400" : "text-zinc-100"
              }`}
            >
              {it.value}
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500 leading-tight">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenDetail({ token, wallet, onBack, onTrade, paperMode, paperWallet, backLabel = "Trending", accent }) {
  const stageLabel = token.stage === "new" ? "New pair" : token.stage === "migrating" ? "Migrating" : "Migrated";

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 mb-4 transition-colors">
        <BackIcon />
        Back to {backLabel}
      </button>

      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${token.color}`}>
            {token.ticker.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold font-mono">{token.ticker}</h1>
              <span className="text-sm text-zinc-500">{token.name}</span>
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

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
            <Stat label="Market cap" value={fmtUsd(token.marketCap)} />
            <Stat label="Liquidity" value={fmtUsd(token.liquidity)} />
            <Stat label="Volume (24h)" value={fmtUsd(token.volume24h)} />
            <Stat label="Holders" value={fmtHolders(token.holders)} />
            <Stat label="Age" value={fmtAge(token.ageMinutes)} />
            <Stat label="Watching now" value={`${token.watchingNow}`} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wide">Migration status</span>
                <span className="text-xs font-medium text-zinc-100">{stageLabel}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full accent-bar`} style={{ width: `${token.migrationPct}%` }} />
              </div>
              <div className="mt-1.5 text-xs text-zinc-500">{token.migrationPct}% to full migration</div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
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
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2.5">Top holders</div>
              <div className="space-y-2">
                {token.topHolders.map((h) => (
                  <div key={h.label} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-32 shrink-0">{h.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full accent-bar`} style={{ width: `${Math.min(100, h.pct * 2.2)}%` }} />
                    </div>
                    <span className="text-xs font-mono text-zinc-300 w-10 text-right">{h.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
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

        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start space-y-4">
          <QuickTrade token={token} wallet={wallet} onTrade={onTrade} paperMode={paperMode} paperWallet={paperWallet} />
          <TokenInfoPanel token={token} />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Practice mode — separate paper wallet with its own balance, positions,
   and trade history. Buys/sells here run real arithmetic against mock
   token prices (average-cost basis for P&L) so the stats below are
   genuinely derived, not decorative placeholders.
--------------------------------------------------------------------------- */

function ToggleSwitch({ checked, onChange, accent }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 accent-ring-70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        checked ? "accent-toggle-on" : "bg-zinc-800"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
          checked ? "translate-x-6 bg-black" : "translate-x-1 bg-zinc-400"
        }`}
      />
    </button>
  );
}

function MiniEquityCurve({ points, positive }) {
  const w = 260, h = 56;
  if (points.length < 2) {
    return <div className="h-14 flex items-center text-[11px] text-zinc-600">No practice trades yet</div>;
  }
  const values = points.map((p) => p.equity);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const path = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p.equity - min) / range) * (h - 8) - 4}`).join(" L ");
  const stroke = positive ? "#34d399" : "#fb7185";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <path d={`M ${path} L ${w},${h} L 0,${h} Z`} fill={stroke} opacity="0.12" stroke="none" />
      <path d={`M ${path}`} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function PaperTradingPage({ paperMode, onTogglePaperMode, paperWallet, onFundWallet, accent, allTokens }) {
  const [fundInput, setFundInput] = useState(String(paperWallet.startingBalanceSol));

  const stats = useMemo(() => {
    const positions = Object.entries(paperWallet.positions);
    const openCount = positions.length;
    const equity = paperWallet.balanceSol + positions.reduce((sum, [id, p]) => {
      const tok = allTokens.find((t) => t.id === id);
      return sum + (tok ? (p.tokensHeld * tok.price) / SOL_PRICE_USD : 0);
    }, 0);
    const rounds = paperWallet.trades.filter((t) => t.side === "sell");
    const realizedPnl = rounds.reduce((sum, r) => sum + r.pnlSol, 0);
    const wins = rounds.filter((r) => r.pnlSol > 0).length;
    const winRate = rounds.length > 0 ? (wins / rounds.length) * 100 : 0;
    const bestRound = rounds.length > 0 ? rounds.reduce((a, b) => (b.pnlSol > a.pnlSol ? b : a)) : null;
    const worstRound = rounds.length > 0 ? rounds.reduce((a, b) => (b.pnlSol < a.pnlSol ? b : a)) : null;
    const equityChangeSol = equity - paperWallet.startingBalanceSol;
    const equityChangePct = paperWallet.startingBalanceSol > 0 ? (equityChangeSol / paperWallet.startingBalanceSol) * 100 : 0;
    return { openCount, equity, rounds, realizedPnl, winRate, bestRound, worstRound, equityChangeSol, equityChangePct };
  }, [paperWallet, allTokens]);

  function handleFund() {
    const val = parseFloat(fundInput);
    if (!isNaN(val) && val > 0) onFundWallet(val);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-zinc-100" style={{ fontFamily: '"Fredoka", sans-serif' }}>Paper Trading</h1>
        <p className="text-xs text-zinc-500">Practice with a separate balance before risking real funds. Nothing here touches your connected wallet.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <ToggleSwitch checked={paperMode} onChange={onTogglePaperMode} accent={accent} />
          <div>
            <div className="text-sm font-semibold text-zinc-100">Practice Mode</div>
            <div className="text-xs text-zinc-500">{paperMode ? "On — Discover, Quick Buy, and trades use your practice balance" : "Off — Discover and trades use your connected wallet"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className={`flex items-center rounded-xl border border-zinc-800 bg-black px-3 py-2 focus-within:ring-2 accent-ring-50-within`}>
            <input
              value={fundInput}
              onChange={(e) => setFundInput(e.target.value.replace(/[^0-9.]/g, ""))}
              className="bg-transparent outline-none w-20 text-sm font-mono text-zinc-100"
            />
            <span className="text-xs text-zinc-500 ml-1.5">SOL</span>
          </div>
          <button onClick={handleFund} className={`px-4 py-2 rounded-xl accent-solid transition-colors text-sm font-semibold whitespace-nowrap`}>
            Reset & Fund
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Practice Equity</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-zinc-100 font-mono tabular-nums">{stats.equity.toFixed(3)}</span>
            <span className="text-xs text-zinc-500">SOL</span>
          </div>
          <div className={`text-xs font-medium ${stats.equityChangeSol >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {stats.equityChangeSol >= 0 ? "+" : ""}{stats.equityChangeSol.toFixed(3)} SOL ({stats.equityChangePct >= 0 ? "+" : ""}{stats.equityChangePct.toFixed(1)}%)
          </div>
          <div className="mt-2">
            <MiniEquityCurve points={paperWallet.equityHistory} positive={stats.equityChangeSol >= 0} />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Realized P&amp;L</div>
          <div className={`mt-1 text-2xl font-semibold font-mono tabular-nums ${stats.realizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {stats.realizedPnl >= 0 ? "+" : ""}{stats.realizedPnl.toFixed(3)}
          </div>
          <div className="text-xs text-zinc-500">{stats.rounds.length} closed round{stats.rounds.length === 1 ? "" : "s"}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Win Rate</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100 font-mono tabular-nums">{stats.rounds.length > 0 ? `${stats.winRate.toFixed(0)}%` : "—"}</div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-2">
            <div className="h-full bg-emerald-500" style={{ width: `${stats.winRate}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Open / Rounds</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-100 font-mono tabular-nums">{stats.openCount} / {stats.rounds.length}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Best Round</div>
          {stats.bestRound ? (
            <>
              <div className="mt-1 text-lg font-semibold font-mono text-emerald-400">+{stats.bestRound.pnlSol.toFixed(3)} SOL</div>
              <div className="text-xs text-zinc-500">{stats.bestRound.ticker} · +{stats.bestRound.pnlPct.toFixed(1)}%</div>
            </>
          ) : (
            <div className="mt-1 text-sm text-zinc-600">No closed rounds yet</div>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Worst Round</div>
          {stats.worstRound ? (
            <>
              <div className={`mt-1 text-lg font-semibold font-mono ${stats.worstRound.pnlSol >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {stats.worstRound.pnlSol >= 0 ? "+" : ""}{stats.worstRound.pnlSol.toFixed(3)} SOL
              </div>
              <div className="text-xs text-zinc-500">{stats.worstRound.ticker} · {stats.worstRound.pnlPct >= 0 ? "+" : ""}{stats.worstRound.pnlPct.toFixed(1)}%</div>
            </>
          ) : (
            <div className="mt-1 text-sm text-zinc-600">No closed rounds yet</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Recent Round Trips</div>
        {stats.rounds.length === 0 ? (
          <div className="text-center text-xs text-zinc-500 py-8">Sell part of a practice position to log your first round trip.</div>
        ) : (
          <div className="space-y-2">
            {stats.rounds.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-900 last:border-0">
                <div>
                  <div className="text-sm font-semibold text-zinc-100 font-mono">{r.ticker}</div>
                  <div className="text-xs text-zinc-500">{fmtAge(Math.max(1, Math.round((Date.now() - r.timestamp) / 60000)))} ago</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold font-mono ${r.pnlSol >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.pnlSol >= 0 ? "+" : ""}{r.pnlSol.toFixed(4)} SOL
                  </div>
                  <div className={`text-xs ${r.pnlSol >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
                    {r.pnlPct >= 0 ? "+" : ""}{r.pnlPct.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Top navigation
--------------------------------------------------------------------------- */

const NAV_ITEMS = ["Trending", "Trenches", "Paper Trading", "Portfolio", "Rewards", "Trackers"];

// Settings is rendered as a real full-screen modal (its own "tab"), not a
// small popover — see SettingsModal below, mounted at the page root. This
// button just opens it. (It used to render the modal here, inline, but
// nesting a `position: fixed` modal inside the header's `backdrop-blur`
// broke it: `backdrop-filter` makes an element a containing block for its
// fixed-position descendants, so the modal was being sized/positioned
// against the header's small box instead of the viewport. Rendering the
// modal at the root — outside the header entirely — avoids that.)
function SettingsButton({ onOpen }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Settings"
      className={`flex items-center justify-center w-9 h-9 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 accent-ring-60`}
    >
      <GearIcon />
    </button>
  );
}

function SettingsModal({ onClose, theme, onThemeChange, currency, onCurrencyChange, balanceDisplayMode, onBalanceDisplayModeChange }) {
  // Changes are staged locally and only committed to the real app state
  // once the user confirms "Save changes" — closing without saving just
  // discards the draft, since this state re-initializes from the live
  // props each time the modal is opened.
  const [draftTheme, setDraftTheme] = useState(theme);
  const [draftCurrency, setDraftCurrency] = useState(currency);
  const [draftBalanceDisplayMode, setDraftBalanceDisplayMode] = useState(balanceDisplayMode);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const curr = CURRENCIES[draftCurrency] ?? CURRENCIES.usd;

  useEffect(() => {
    function handleKey(e) {
      if (e.key !== "Escape") return;
      if (confirmOpen) setConfirmOpen(false);
      else onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, confirmOpen]);

  function handleSaveConfirmed() {
    onThemeChange(draftTheme);
    onCurrencyChange(draftCurrency);
    onBalanceDisplayModeChange(draftBalanceDisplayMode);
    setConfirmOpen(false);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" onClick={onClose}>
        <div
          className="w-full max-w-sm mx-auto my-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-100">Settings</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200"><CloseIcon /></button>
          </div>

          <div>
            <div className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Accent color</div>
            <div className="space-y-1">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setDraftTheme(key)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-200 hover:bg-zinc-900 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/20" style={{ backgroundColor: t.base }} />
                  <span className="flex-1 text-left">{t.label}</span>
                  {draftTheme === key && <CheckIcon className={`accent-text shrink-0`} />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Currency</div>
            <div className="space-y-1">
              {Object.entries(CURRENCIES).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => setDraftCurrency(key)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-200 hover:bg-zinc-900 transition-colors"
                >
                  <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold bg-zinc-800 text-zinc-300">
                    {c.symbol}
                  </span>
                  <span className="flex-1 text-left">{c.label}</span>
                  {draftCurrency === key && <CheckIcon className={`accent-text shrink-0`} />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="px-0.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Balance shown as</div>
            <div className="space-y-1">
              {[
                { key: "fiat", label: `${curr.symbol} big · SOL small` },
                { key: "sol", label: `SOL big · ${curr.symbol} small` },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDraftBalanceDisplayMode(opt.key)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-zinc-200 hover:bg-zinc-900 transition-colors"
                >
                  <span className="flex-1 text-left">{opt.label}</span>
                  {draftBalanceDisplayMode === opt.key && <CheckIcon className={`accent-text shrink-0`} />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            className="mt-4 w-full py-2.5 rounded-full accent-solid transition-colors text-sm font-semibold"
          >
            Save changes
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setConfirmOpen(false)}>
          <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center" style={{ maxWidth: 260 }} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-zinc-100 mb-3">Are you sure you want to save these settings?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                No
              </button>
              <button
                onClick={handleSaveConfirmed}
                className="flex-1 py-2 rounded-lg text-sm font-semibold accent-solid transition-colors"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TopNav({ activeNav, onNavChange, wallet, onOpenWalletModal, paperMode, paperWallet, searchQuery, onSearchChange, currency, balanceDisplayMode, onOpenSettings, accent }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-black/95 backdrop-blur">
      <div className="flex items-center gap-4 px-5 py-3">
        <button onClick={() => onNavChange("Trending")} className="flex items-center gap-2 shrink-0">
          {/* Logo is embedded as a base64 data URI (MAVO_LOGO_DATA_URI, near
              the top of the file) so it renders with no extra asset setup.
              Swap this for a normal /logo.png path once a hosted file
              exists in the Next.js public/ folder, if preferred. */}
          <img src={MAVO_LOGO_DATA_URI} alt="Mavo" className="w-7 h-7 object-contain shrink-0" />
          <span className="font-semibold text-lg text-zinc-100">Mavo</span>
        </button>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => onNavChange(item)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 accent-ring-60 whitespace-nowrap ${
                activeNav === item ? "text-zinc-100 bg-zinc-900" : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <div className="relative hidden sm:block w-40 md:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            {/* REPLACE WITH REAL: this filters the mock token lists by
                name/ticker only. Looking up a pasted contract address or
                wallet would need a real indexer/RPC call — the placeholder
                reflects the intended scope, but that lookup isn't wired
                up yet. */}
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search coin, CA, or wallet"
              className={`w-full rounded-full border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:ring-2 accent-ring-50 transition-shadow`}
            />
          </div>
          <SettingsButton onOpen={onOpenSettings} />
          <button
            onClick={paperMode ? () => onNavChange("Paper Trading") : onOpenWalletModal}
            className={`flex items-center gap-1.5 rounded-full accent-solid transition-colors px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 accent-ring-70 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
          >
            <WalletIcon />
            {/* Practice mode replaces the connected-wallet balance here with
                the practice wallet's balance instead — same big/small
                SOL-vs-money logic as the real wallet, just clearly labeled
                "Paper Trading" so it's never mistaken for real funds. */}
            {paperMode ? (
              <span className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">Paper Trading</span>
                {balanceDisplayMode === "sol" ? (
                  <span className="flex items-baseline gap-1.5">
                    <span>{paperWallet.balanceSol.toFixed(2)} SOL</span>
                    <span className="text-[10px] font-medium opacity-70">{fmtCurrency(paperWallet.balanceSol * SOL_PRICE_USD, currency)}</span>
                  </span>
                ) : (
                  <span className="flex items-baseline gap-1.5">
                    <span>{fmtCurrency(paperWallet.balanceSol * SOL_PRICE_USD, currency)}</span>
                    <span className="text-[10px] font-medium opacity-70">{paperWallet.balanceSol.toFixed(2)} SOL</span>
                  </span>
                )}
              </span>
            ) : wallet ? (
              balanceDisplayMode === "sol" ? (
                <span className="flex items-baseline gap-1.5">
                  <span>{wallet.balanceSol.toFixed(2)} SOL</span>
                  <span className="text-[10px] font-medium opacity-70">{fmtCurrency(wallet.balanceSol * SOL_PRICE_USD, currency)}</span>
                </span>
              ) : (
                <span className="flex items-baseline gap-1.5">
                  <span>{fmtCurrency(wallet.balanceSol * SOL_PRICE_USD, currency)}</span>
                  <span className="text-[10px] font-medium opacity-70">{wallet.balanceSol.toFixed(2)} SOL</span>
                </span>
              )
            ) : (
              // Not connected yet — shown as a real 0.00 balance (same
              // big/small SOL-vs-money layout as the connected state)
              // instead of a plain "Connect Wallet" label, so the button
              // always reads as "your balance," tap it to manage it.
              balanceDisplayMode === "sol" ? (
                <span className="flex items-baseline gap-1.5">
                  <span>0.00 SOL</span>
                  <span className="text-[10px] font-medium opacity-70">{fmtCurrency(0, currency)}</span>
                </span>
              ) : (
                <span className="flex items-baseline gap-1.5">
                  <span>{fmtCurrency(0, currency)}</span>
                  <span className="text-[10px] font-medium opacity-70">0.00 SOL</span>
                </span>
              )
            )}
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
  const [activeNav, setActiveNav] = useState("Trending");
  const [selectedId, setSelectedId] = useState(null);
  const [wallet, setWallet] = useState(null); // { address, balanceSol } | null
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tradeRequest, setTradeRequest] = useState(null); // { token, side, quick, paper } | null

  // Accent theme — chosen from the gear icon in the top nav. Defaults to
  // yellow. `accent` is threaded down as a prop to every component that
  // renders an accent-colored button/ring/dot, so switching it re-themes
  // the whole UI in one place.
  const [theme, setTheme] = useState("yellow");
  const accent = THEMES[theme] ?? THEMES.yellow;

  // Display currency — also chosen from the gear icon (Settings). Only
  // affects how the connected wallet's SOL balance is displayed in the top
  // right; trading itself still happens in SOL under the hood.
  const [currency, setCurrency] = useState("usd");

  // Which of money/SOL is shown "big" in the top-right wallet balance —
  // also picked from the gear icon (Settings). The other one always still
  // shows, just smaller, next to it.
  const [balanceDisplayMode, setBalanceDisplayMode] = useState("fiat"); // "fiat" | "sol"

  // Global search — lives in the top nav and filters whichever list page
  // (Trending or Trenches) is currently active.
  const [searchQuery, setSearchQuery] = useState("");

  // Coins the user has explicitly hidden, and dev (creator) wallets the
  // user has blacklisted — both apply everywhere a token list is rendered.
  const [hiddenTokenIds, setHiddenTokenIds] = useState(() => new Set());
  const [blacklistedDevWallets, setBlacklistedDevWallets] = useState(() => new Set());

  // Hiding (or blacklisting) removes a coin from view, but a real feed
  // wouldn't just shrink — a new one would keep flowing in. This pool holds
  // freshly-generated same-stage replacement tokens, one per hide/blacklist,
  // so each list stays at full strength. Counters start well above the
  // original mock token id ranges so replacement ids never collide.
  const [extraTokens, setExtraTokens] = useState({ new: [], migrating: [], migrated: [] });
  const replacementCounterRef = useRef({ new: 1000, migrating: 2000, migrated: 3000 });

  function spawnReplacement(stage) {
    const nextIndex = replacementCounterRef.current[stage]++;
    const replacement = buildToken(nextIndex, stage);
    setExtraTokens((prev) => ({ ...prev, [stage]: [...prev[stage], replacement] }));
  }

  function hideToken(token) {
    setHiddenTokenIds((prev) => new Set(prev).add(token.id));
    spawnReplacement(token.stage);
  }
  function blacklistDev(token) {
    setBlacklistedDevWallets((prev) => new Set(prev).add(token.creator.wallet));
    spawnReplacement(token.stage);
  }

  // Practice wallet — entirely separate ledger from the connected real
  // wallet above. Toggled on from the Paper Trading page; once on, Buy/Sell
  // and Quick Buy everywhere (Discover cards and the token detail page)
  // route here instead of prompting a real wallet connection.
  const [paperMode, setPaperMode] = useState(false);
  const [paperWallet, setPaperWallet] = useState(() => ({
    balanceSol: 5,
    startingBalanceSol: 5,
    positions: {}, // tokenId -> { ticker, tokensHeld, costBasisSol }
    trades: [], // { id, tokenId, ticker, side, amountSol, tokens, pnlSol?, pnlPct?, timestamp }
    equityHistory: [{ t: Date.now(), equity: 5 }],
  }));

  function computeEquity(balanceSol, positions) {
    return balanceSol + Object.entries(positions).reduce((sum, [id, p]) => {
      const tok = MOCK_TOKENS.find((t) => t.id === id)
        || extraTokens.new.find((t) => t.id === id)
        || extraTokens.migrating.find((t) => t.id === id)
        || extraTokens.migrated.find((t) => t.id === id);
      return sum + (tok ? (p.tokensHeld * tok.price) / SOL_PRICE_USD : 0);
    }, 0);
  }

  function paperBuy(token, amountUsd) {
    setPaperWallet((prev) => {
      const amountSolSpent = amountUsd / SOL_PRICE_USD;
      if (amountUsd <= 0 || amountSolSpent > prev.balanceSol) return prev;
      const tokensBought = (amountUsd / token.price) * (1 - token.priceImpactPct / 100);
      const existing = prev.positions[token.id] || { ticker: token.ticker, tokensHeld: 0, costBasisSol: 0 };
      const positions = {
        ...prev.positions,
        [token.id]: {
          ticker: token.ticker,
          tokensHeld: existing.tokensHeld + tokensBought,
          costBasisSol: existing.costBasisSol + amountSolSpent,
        },
      };
      const balanceSol = prev.balanceSol - amountSolSpent;
      const trade = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, tokenId: token.id, ticker: token.ticker, side: "buy", amountSol: amountSolSpent, tokens: tokensBought, timestamp: Date.now() };
      const equity = computeEquity(balanceSol, positions);
      return { ...prev, balanceSol, positions, trades: [trade, ...prev.trades], equityHistory: [...prev.equityHistory, { t: Date.now(), equity }] };
    });
  }

  function paperSell(token, pct) {
    setPaperWallet((prev) => {
      const pos = prev.positions[token.id];
      if (!pos || pos.tokensHeld <= 0 || pct <= 0) return prev;
      const fraction = Math.min(100, pct) / 100;
      const tokensSold = pos.tokensHeld * fraction;
      const costBasisSold = pos.costBasisSol * fraction;
      const proceedsSol = ((tokensSold * token.price) / SOL_PRICE_USD) * (1 - token.priceImpactPct / 100);
      const pnlSol = proceedsSol - costBasisSold;
      const pnlPct = costBasisSold > 0 ? (pnlSol / costBasisSold) * 100 : 0;
      const remainingTokens = pos.tokensHeld - tokensSold;
      const remainingCostBasis = pos.costBasisSol - costBasisSold;
      const positions = { ...prev.positions };
      if (remainingTokens <= 0.0000001) {
        delete positions[token.id];
      } else {
        positions[token.id] = { ticker: pos.ticker, tokensHeld: remainingTokens, costBasisSol: remainingCostBasis };
      }
      const balanceSol = prev.balanceSol + proceedsSol;
      const trade = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, tokenId: token.id, ticker: token.ticker, side: "sell", amountSol: proceedsSol, tokens: tokensSold, pnlSol, pnlPct, timestamp: Date.now() };
      const equity = computeEquity(balanceSol, positions);
      return { ...prev, balanceSol, positions, trades: [trade, ...prev.trades], equityHistory: [...prev.equityHistory, { t: Date.now(), equity }] };
    });
  }

  // Resets the practice wallet entirely — clears positions and trade
  // history and starts fresh at the chosen balance.
  function fundPaperWallet(startingBalanceSol) {
    setPaperWallet({
      balanceSol: startingBalanceSol,
      startingBalanceSol,
      positions: {},
      trades: [],
      equityHistory: [{ t: Date.now(), equity: startingBalanceSol }],
    });
  }

  // Same buy/sell math as the practice wallet above, but applied to the
  // connected (real) wallet's own balance and positions — so buying a coin
  // actually spends SOL out of the wallet shown in the top right, and
  // selling actually credits SOL back in, gain or loss depending on the
  // coin's price versus what was paid for it.
  // REPLACE WITH REAL: this still just updates local mock state — a real
  // build would build the swap transaction, send it to the wallet adapter
  // for signing, and only update local state after on-chain confirmation.
  function walletBuy(token, amountUsd) {
    setWallet((prev) => {
      if (!prev) return prev;
      const amountSolSpent = amountUsd / SOL_PRICE_USD;
      if (amountUsd <= 0 || amountSolSpent > prev.balanceSol) return prev;
      const tokensBought = (amountUsd / token.price) * (1 - token.priceImpactPct / 100);
      const existing = prev.positions?.[token.id] || { ticker: token.ticker, tokensHeld: 0, costBasisSol: 0 };
      const positions = {
        ...(prev.positions || {}),
        [token.id]: {
          ticker: token.ticker,
          tokensHeld: existing.tokensHeld + tokensBought,
          costBasisSol: existing.costBasisSol + amountSolSpent,
        },
      };
      const balanceSol = prev.balanceSol - amountSolSpent;
      return { ...prev, balanceSol, positions };
    });
  }

  function walletSell(token, pct) {
    setWallet((prev) => {
      if (!prev) return prev;
      const pos = prev.positions?.[token.id];
      if (!pos || pos.tokensHeld <= 0 || pct <= 0) return prev;
      const fraction = Math.min(100, pct) / 100;
      const tokensSold = pos.tokensHeld * fraction;
      const costBasisSold = pos.costBasisSol * fraction;
      const proceedsSol = ((tokensSold * token.price) / SOL_PRICE_USD) * (1 - token.priceImpactPct / 100);
      const remainingTokens = pos.tokensHeld - tokensSold;
      const remainingCostBasis = pos.costBasisSol - costBasisSold;
      const positions = { ...prev.positions };
      if (remainingTokens <= 0.0000001) {
        delete positions[token.id];
      } else {
        positions[token.id] = { ticker: pos.ticker, tokensHeld: remainingTokens, costBasisSol: remainingCostBasis };
      }
      const balanceSol = prev.balanceSol + proceedsSol;
      return { ...prev, balanceSol, positions };
    });
  }

  // Load Inter for a cleaner, more legible UI typeface than the OS default.
  // REPLACE WITH REAL: swap this for next/font/google's Inter loader once
  // this lives in the actual Next.js app — that avoids the flash of
  // fallback font and self-hosts the file instead of fetching from Google.
  useEffect(() => {
    if (document.getElementById("mavo-inter-font")) return;
    const link = document.createElement("link");
    link.id = "mavo-inter-font";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fredoka:wght@500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const newPairs = useMemo(() => [...MOCK_TOKENS.filter((t) => t.stage === "new"), ...extraTokens.new], [extraTokens.new]);
  const migrating = useMemo(() => [...MOCK_TOKENS.filter((t) => t.stage === "migrating"), ...extraTokens.migrating], [extraTokens.migrating]);
  const migrated = useMemo(() => [...MOCK_TOKENS.filter((t) => t.stage === "migrated"), ...extraTokens.migrated], [extraTokens.migrated]);
  const allTokens = useMemo(
    () => [...MOCK_TOKENS, ...extraTokens.new, ...extraTokens.migrating, ...extraTokens.migrated],
    [extraTokens]
  );
  const selectedToken = selectedId ? allTokens.find((t) => t.id === selectedId) : null;

  function handleNavChange(item) {
    setActiveNav(item);
    setSelectedId(null);
  }

  // Entry point for every Buy/Sell button in the app. Practice mode routes
  // straight to the trade modal against the paper wallet — no real wallet
  // connection needed since it's a separate balance. Otherwise, prompt a
  // real wallet connection first if one isn't already linked.
  function handleTradeRequest(token, side) {
    if (paperMode) {
      setTradeRequest({ token, side, quick: false, paper: true });
      return;
    }
    if (!wallet) {
      setTradeRequest({ token, side, quick: false, paper: false });
      setWalletModalOpen(true);
      return;
    }
    setTradeRequest({ token, side, quick: false, paper: false });
  }

  // One-tap quick buy from a coin card — same routing logic as above, but
  // the resulting TradeModal opens in "quick" mode (preset amount, skips
  // straight to signing).
  function handleQuickBuy(token) {
    if (paperMode) {
      setTradeRequest({ token, side: "buy", quick: true, paper: true });
      return;
    }
    if (!wallet) {
      setTradeRequest({ token, side: "buy", quick: true, paper: false });
      setWalletModalOpen(true);
      return;
    }
    setTradeRequest({ token, side: "buy", quick: true, paper: false });
  }

  function handleWalletConnected(w) {
    // If a wallet is already connected, treat this as an additional deposit
    // into it (top up the existing balance) rather than replacing it with a
    // brand-new address — only the very first connection sets the address.
    setWallet((prev) => (prev ? { ...prev, balanceSol: prev.balanceSol + w.balanceSol } : { ...w, positions: w.positions || {} }));
    setWalletModalOpen(false);
    // if the user clicked Buy/Sell before connecting, resume straight into the trade modal
  }

  function handleWalletWithdraw(amountSol) {
    setWallet((prev) => (prev ? { ...prev, balanceSol: Math.max(0, prev.balanceSol - amountSol) } : prev));
  }

  return (
    <div
      className="min-h-screen bg-black text-zinc-100 antialiased"
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <AccentStyle accent={accent} />
      <TopNav
        activeNav={activeNav}
        onNavChange={handleNavChange}
        wallet={wallet}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        paperMode={paperMode}
        paperWallet={paperWallet}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currency={currency}
        balanceDisplayMode={balanceDisplayMode}
        onOpenSettings={() => setSettingsOpen(true)}
        accent={accent}
      />

      <main className="p-4 md:p-5">
        {activeNav === "Paper Trading" ? (
          <PaperTradingPage
            paperMode={paperMode}
            onTogglePaperMode={setPaperMode}
            paperWallet={paperWallet}
            onFundWallet={fundPaperWallet}
            accent={accent}
            allTokens={allTokens}
          />
        ) : activeNav === "Trending" || activeNav === "Trenches" ? (
          selectedToken ? (
            <TokenDetail token={selectedToken} wallet={wallet} onBack={() => setSelectedId(null)} onTrade={handleTradeRequest} paperMode={paperMode} paperWallet={paperWallet} backLabel={activeNav} accent={accent} />
          ) : activeNav === "Trenches" ? (
            <TrenchesPage
              newTokens={newPairs}
              soonTokens={migrating}
              migratedTokens={migrated}
              onOpen={setSelectedId}
              onQuickBuy={handleQuickBuy}
              query={searchQuery}
              hiddenTokenIds={hiddenTokenIds}
              blacklistedDevWallets={blacklistedDevWallets}
              onHide={hideToken}
              onBlacklistDev={blacklistDev}
              accent={accent}
            />
          ) : (
            <TokenListPage
              title={activeNav}
              tokens={migrating}
              onOpen={setSelectedId}
              onQuickBuy={handleQuickBuy}
              query={searchQuery}
              hiddenTokenIds={hiddenTokenIds}
              blacklistedDevWallets={blacklistedDevWallets}
              onHide={hideToken}
              onBlacklistDev={blacklistDev}
              accent={accent}
            />
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-10 text-center max-w-md mx-auto mt-10">
            <div className="text-lg font-semibold text-zinc-100 mb-1">{activeNav}</div>
            <p className="text-sm text-zinc-500">This section isn&apos;t built yet — the navigation is wired up so it can be added without reworking the rest of Mavo.</p>
          </div>
        )}
      </main>

      {walletModalOpen && (
        <WalletConnectModal
          onClose={() => {
            setWalletModalOpen(false);
            setTradeRequest(null);
          }}
          onConnected={handleWalletConnected}
          onWithdraw={handleWalletWithdraw}
          wallet={wallet}
          currency={currency}
          accent={accent}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          onThemeChange={setTheme}
          currency={currency}
          onCurrencyChange={setCurrency}
          balanceDisplayMode={balanceDisplayMode}
          onBalanceDisplayModeChange={setBalanceDisplayMode}
        />
      )}

      {!walletModalOpen && tradeRequest && (tradeRequest.paper || wallet) && (
        <TradeModal
          token={tradeRequest.token}
          side={tradeRequest.side}
          wallet={wallet}
          onClose={() => setTradeRequest(null)}
          quick={tradeRequest.quick}
          paper={tradeRequest.paper}
          paperWallet={paperWallet}
          paperBuy={paperBuy}
          paperSell={paperSell}
          walletBuy={walletBuy}
          walletSell={walletSell}
          accent={accent}
        />
      )}
    </div>
  );
}
