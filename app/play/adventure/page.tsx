import Link from "next/link";

export default function AdventurePlayPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1a0b3a] via-[#10052a] to-[#06021a] px-6 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute right-1/3 top-0 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        <div className="text-7xl drop-shadow">🗺️🤟</div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Word Adventure
        </h1>
        <p className="mt-3 text-lg text-white/80">
          Spell words and practice ASL signs as you explore each zone of the
          adventure.
        </p>
        <p className="mt-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
          Game build in progress — this route is wired from the hub as spelling +
          ASL adventure.
        </p>
        <Link
          href="/"
          className="mt-10 rounded-full bg-emerald-400 px-8 py-3 text-lg font-extrabold text-emerald-950 shadow-xl shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-300"
        >
          ← Back to hub
        </Link>
      </div>
    </main>
  );
}
