"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHubStore, type Topic } from "@/app/lib/hubStore";

type TopicCard = {
  topic: Topic;
  title: string;
  game: string;
  blurb: string;
  imageSrc: string;
  imageAlt: string;
  labelClass: string;
  hoverGlow: string;
};

const TOPICS: TopicCard[] = [
  {
    topic: "science",
    title: "Science",
    game: "Maze Quest",
    blurb:
      "Answer a science question, earn a step, and find your way through the glowing maze.",
    imageSrc: "/topic-cards/topic-maze.jpg",
    imageAlt:
      "Nighttime hedge maze with purple fog and lit paths, matching the Maze Quest scene",
    labelClass: "text-[#c4b5fd]",
    hoverGlow: "hover:shadow-[0_0_48px_rgba(167,139,255,0.35)]",
  },
  {
    topic: "math",
    title: "Math",
    game: "Boss Battle",
    blurb:
      "Solve math problems to power your attacks in the dark arena boss fight.",
    imageSrc: "/topic-cards/topic-boss.jpg",
    imageAlt:
      "Dark circular arena with dramatic red and magenta lighting like the boss battle",
    labelClass: "text-[#fda4af]",
    hoverGlow: "hover:shadow-[0_0_48px_rgba(244,114,182,0.35)]",
  },
  {
    topic: "spelling_asl",
    title: "Spelling & ASL",
    game: "Word Adventure",
    blurb:
      "Spell words and practice signs along a forest path through every zone.",
    imageSrc: "/topic-cards/topic-adventure.jpg",
    imageAlt:
      "Sunlit forest trail through green woods like the Word Adventure journey",
    labelClass: "text-[#6ee7b7]",
    hoverGlow: "hover:shadow-[0_0_48px_rgba(52,211,153,0.35)]",
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

      <div className="relative z-10 mx-auto max-w-7xl">
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

        <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3 lg:gap-8">
          {TOPICS.map((t) => (
            <button
              key={t.topic}
              type="button"
              onClick={() => pick(t.topic)}
              className={`group flex w-full flex-col overflow-hidden rounded-3xl border-2 border-white/10 bg-white/5 text-left text-white shadow-2xl backdrop-blur-md ring-2 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/10 hover:ring-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#10052a] ${t.hoverGlow}`}
            >
              <div className="relative px-3 pt-3">
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-6 h-[42%] min-h-[8rem] w-[88%] max-w-none -translate-x-1/2 rounded-[1.75rem] bg-cover bg-center opacity-[0.45] blur-3xl saturate-[1.15]"
                  style={{ backgroundImage: `url(${t.imageSrc})` }}
                />
                <div className="relative overflow-hidden rounded-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.55)] ring-1 ring-white/15">
                  <div className="relative aspect-[5/4] w-full bg-[#12082e]">
                    <Image
                      src={t.imageSrc}
                      alt={t.imageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      priority={t.topic === "science"}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#10052a]/95 via-[#10052a]/20 to-transparent"
                      aria-hidden
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col px-5 pb-5 pt-5">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.12em] ${t.labelClass}`}
                >
                  {t.game}
                </p>
                <h2 className="mt-1.5 text-[1.125rem] font-semibold leading-snug tracking-tight text-white">
                  {t.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  {t.blurb}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-sm font-semibold text-emerald-200 underline decoration-white/25 underline-offset-4 transition group-hover:text-emerald-100 group-hover:decoration-emerald-200/80">
                    Continue
                  </span>
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/35 transition group-hover:bg-emerald-300"
                    aria-hidden
                  >
                    →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
