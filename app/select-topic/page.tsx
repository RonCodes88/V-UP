"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHubStore, type Topic } from "@/app/lib/hubStore";

type TopicCard = {
  topic: Topic;
  emoji: string;
  title: string;
  game: string;
  blurb: string;
  gradient: string;
  ring: string;
};

const TOPICS: TopicCard[] = [
  {
    topic: "science",
    emoji: "🔬",
    title: "Science",
    game: "Maze Quest",
    blurb: "Answer a science question, earn a step, find your way out of the maze.",
    gradient: "from-indigo-500/40 to-violet-600/40",
    ring: "ring-indigo-300/40 hover:ring-indigo-300/80",
  },
  {
    topic: "math",
    emoji: "⚔️",
    title: "Math",
    game: "Boss Battle",
    blurb: "Answer math questions to power your attacks and defeat the boss.",
    gradient: "from-rose-500/40 to-red-600/40",
    ring: "ring-rose-300/40 hover:ring-rose-300/80",
  },
  {
    topic: "spelling_asl",
    emoji: "🗺️",
    title: "Spelling & ASL",
    game: "Word Adventure",
    blurb: "Spell words and use ASL signs on an adventure through every zone.",
    gradient: "from-emerald-500/40 to-teal-600/40",
    ring: "ring-emerald-300/40 hover:ring-emerald-300/80",
  },
];

export default function SelectTopicPage() {
  const router = useRouter();
  const setSelectedTopic = useHubStore((s) => s.setSelectedTopic);

  const pick = (t: Topic) => {
    setSelectedTopic(t);
    router.push("/select-character");
  };

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-[#1a0b3a] via-[#10052a] to-[#06021a] px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute left-1/3 top-0 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
          >
            ← Back
          </Link>
          <div className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Step 1 of 2
          </div>
        </header>

        <div className="mt-8 text-center">
          <h1 className="text-4xl font-extrabold drop-shadow sm:text-5xl">
            Pick a topic
          </h1>
          <p className="mt-2 text-base text-white/75 sm:text-lg">
            What do you want to practice today?
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t) => (
            <button
              key={t.topic}
              onClick={() => pick(t.topic)}
              className={`group flex flex-col items-start rounded-3xl border-2 border-white/10 bg-gradient-to-br p-6 text-left shadow-2xl backdrop-blur-md ring-2 transition hover:-translate-y-1 hover:scale-[1.02] ${t.gradient} ${t.ring}`}
            >
              <div className="text-6xl drop-shadow">{t.emoji}</div>
              <div className="mt-3 text-2xl font-extrabold">{t.title}</div>
              <div className="text-sm font-semibold uppercase tracking-widest text-white/70">
                {t.game}
              </div>
              <div className="mt-3 text-sm text-white/85">{t.blurb}</div>
              <div className="mt-5 self-end text-sm font-bold text-white/90 transition group-hover:translate-x-1">
                Choose →
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
