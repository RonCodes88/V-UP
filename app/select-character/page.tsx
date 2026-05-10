"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CharacterPreview from "@/app/components/hub/CharacterPreview";
import { CHARACTER_LIST, type CharacterSlug } from "@/app/lib/characters";
import { TOPIC_TO_ROUTE, useHubStore, type Topic } from "@/app/lib/hubStore";

const TOPIC_LABEL: Record<Topic, string> = {
  science: "science",
  math: "math",
  spelling_asl: "spelling & ASL",
};

const CHARACTER_BLURB: Record<CharacterSlug, string> = {
  bear: "Warm, patient, gives big cheers.",
  fox: "Quick and clever — loves a puzzle.",
  robot: "Helpful and steady. Beep boop!",
  cat: "Curious explorer, lands on her feet.",
};

export default function SelectCharacterPage() {
  const router = useRouter();
  const selectedTopic = useHubStore((s) => s.selectedTopic);
  const setSelectedCharacter = useHubStore((s) => s.setSelectedCharacter);
  const [hovered, setHovered] = useState<CharacterSlug | null>(null);

  useEffect(() => {
    if (!selectedTopic) router.replace("/select-topic");
  }, [selectedTopic, router]);

  if (!selectedTopic) return null;

  const pick = (slug: CharacterSlug) => {
    setSelectedCharacter(slug);
    router.push(TOPIC_TO_ROUTE[selectedTopic]);
  };

  return (
    <main className="relative min-h-screen w-full bg-gradient-to-b from-[#1a0b3a] via-[#10052a] to-[#06021a] px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute right-1/3 top-0 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl" />
        <div className="absolute left-1/4 bottom-0 h-80 w-80 rounded-full bg-emerald-500/30 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link
            href="/select-topic"
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
          >
            ← Back
          </Link>
          <div className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Step 2 of 2
          </div>
        </header>

        <div className="mt-8 text-center">
          <h1 className="text-4xl font-extrabold drop-shadow sm:text-5xl">
            Pick your buddy
          </h1>
          <p className="mt-2 text-base text-white/75 sm:text-lg">
            Who&apos;s coming on the {TOPIC_LABEL[selectedTopic]} adventure?
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHARACTER_LIST.map((c) => {
            const isHover = hovered === c.slug;
            return (
              <button
                key={c.slug}
                onMouseEnter={() => setHovered(c.slug)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => pick(c.slug)}
                className="group flex flex-col items-center rounded-3xl border-2 border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur-md transition hover:-translate-y-1 hover:bg-white/10 ring-2 ring-white/10 hover:ring-white/40"
                style={{
                  boxShadow: isHover
                    ? `0 0 60px ${c.color}55`
                    : undefined,
                }}
              >
                <div
                  className="h-40 w-40 overflow-hidden rounded-full ring-4 ring-white/10 transition group-hover:ring-white/30"
                  style={{ background: `${c.color}22` }}
                >
                  <CharacterPreview slug={c.slug} hovered={isHover} />
                </div>
                <div className="mt-4 text-xl font-extrabold">{c.label}</div>
                <div className="mt-1 text-xs text-white/70">
                  {CHARACTER_BLURB[c.slug]}
                </div>
                <div className="mt-4 rounded-full bg-emerald-400/0 px-4 py-1.5 text-sm font-bold text-emerald-200 transition group-hover:bg-emerald-400 group-hover:text-emerald-950">
                  Play →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

