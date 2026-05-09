import Link from "next/link";

export default function BossPlayPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1a0b3a] via-[#10052a] to-[#06021a] px-6 py-12 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-rose-500/25 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-red-600/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        <div className="text-7xl drop-shadow">⚔️👾</div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Boss Battle
        </h1>
        <p className="mt-3 text-lg text-white/80">
          Math powers every strike. Answer questions correctly to attack the boss
          and win the fight.
        </p>
        <p className="mt-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70">
          Game build in progress — this route is wired from the hub as the math /
          boss topic.
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
