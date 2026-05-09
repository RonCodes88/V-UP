"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#1a0b3a] via-[#10052a] to-[#06021a] px-6 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-80 w-80 translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 translate-y-1/3 rounded-full bg-emerald-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
        <div className="text-7xl drop-shadow-[0_0_30px_rgba(168,139,255,0.6)]">
          🌟
        </div>
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight drop-shadow-2xl sm:text-6xl">
          Brain Quest
        </h1>
        <p className="mt-3 text-lg text-white/80 sm:text-xl">
          Three magical worlds. Pick a topic, pick a buddy, learn together.
        </p>

        <Link
          href="/select-topic"
          className="mt-10 rounded-full bg-emerald-400 px-10 py-4 text-xl font-extrabold text-emerald-950 shadow-2xl shadow-emerald-500/40 transition hover:scale-105 hover:bg-emerald-300"
        >
          ▶ Start
        </Link>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm text-white/60">
          <Tag emoji="🔬" label="Science" />
          <Tag emoji="⚔️" label="Math" />
          <Tag emoji="🗺️" label="Spelling & ASL" />
        </div>
      </div>
    </main>
  );
}

function Tag({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-md">
      {emoji} {label}
    </span>
  );
}
