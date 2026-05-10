"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForestStore } from "@/app/lib/forestStore";
import { buildForestFirstMessage, FOREST_SYSTEM_PROMPT } from "@/app/lib/forestAgentPersona";

const CHOICE_COLORS = {
  A: "bg-blue-400/20 text-blue-100 ring-blue-400/30",
  B: "bg-emerald-400/20 text-emerald-100 ring-emerald-400/30",
  C: "bg-orange-400/20 text-orange-100 ring-orange-400/30",
  D: "bg-rose-400/20 text-rose-100 ring-rose-400/30",
};

export default function ForestHUD() {
  const forestStatus = useForestStore((s) => s.status);
  const keys = useForestStore((s) => s.keys);
  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const awaitingMove = useForestStore((s) => s.awaitingMove);
  const lastAgentMessage = useForestStore((s) => s.lastAgentMessage);
  const bubbleVariant = useForestStore((s) => s.bubbleVariant);
  const currentQuestion = useForestStore((s) => s.currentQuestion);
  const questionReady = useForestStore((s) => s.questionReady);
  const error = useForestStore((s) => s.error);
  const reset = useForestStore((s) => s.reset);
  const setError = useForestStore((s) => s.setError);
  const setStatus = useForestStore((s) => s.setStatus);
  const startGame = useForestStore((s) => s.startGame);
  const signingMode = useForestStore((s) => s.signingMode);
  const setSigningMode = useForestStore((s) => s.setSigningMode);

  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const isSpeaking = conv.isSpeaking;
  const muted = conv.isMuted;

  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setError(null);
      startGame();
      const res = await fetch("/api/signed-url/spell");
      if (!res.ok) throw new Error(`Signed URL fetch failed: ${res.status}`);
      const { signedUrl, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      conv.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: FOREST_SYSTEM_PROMPT },
            firstMessage: buildForestFirstMessage(),
          },
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
      setStatus("idle");
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    conv.endSession();
    setStatus("idle");
  };

  const isWalking = forestStatus === "walking";

  const variantTone: Record<typeof bubbleVariant, string> = {
    intro:    "from-emerald-500/30 to-green-600/30 border-emerald-300/40",
    question: "from-green-500/30 to-teal-600/30 border-green-300/40",
    correct:  "from-emerald-400/40 to-teal-500/40 border-emerald-300/60",
    wrong:    "from-amber-500/30 to-orange-500/30 border-amber-300/40",
    victory:  "from-yellow-400/40 to-amber-500/40 border-yellow-300/60",
  };

  const statusLabel =
    forestStatus === "won"       ? "Treasure found!" :
    forestStatus === "idle"      ? "Tap start" :
    !connected                   ? "Connecting…" :
    isWalking                    ? "Walking…" :
    awaitingMove                 ? "Walk to next fork!" :
    muted                        ? "Mic off" :
    isSpeaking                   ? "Finn is talking" :
    "Listening";

  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {/* Header */}
        <header className="pointer-events-auto flex items-start justify-between gap-3 p-5">
          <div className="flex items-start gap-3">
            <button
              onClick={() => { if (connected) conv.endSession(); router.push("/"); }}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
            >
              ← Hub
            </button>
            <div>
              <div className="text-lg font-bold tracking-tight text-white drop-shadow-lg">🌲 Forest Path Adventure</div>
              <div className="text-xs text-white/70">Answer questions → collect keys → find treasure</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Pill highlight={keys > 0}>🗝️ {keys}/7 keys</Pill>
            <Pill>🌿 Fork {Math.min(nodeIndex + 1, 7)}/7</Pill>
            <Pill highlight={connected && !muted}>
              {connected && (
                <span className={`mr-1 inline-block h-2 w-2 rounded-full ${muted ? "bg-rose-400" : isSpeaking ? "bg-emerald-400 listening-glow" : "bg-emerald-300"}`} />
              )}
              {statusLabel}
            </Pill>
            {connected && (
              <button
                onClick={() => conv.setMuted(!muted)}
                className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ring-1 transition ${muted ? "bg-rose-500/30 text-rose-100 ring-rose-400/50 hover:bg-rose-500/40" : "bg-white/10 text-white ring-white/20 hover:bg-white/20"}`}
              >
                {muted ? "🔇 Mic off" : "🎤 Mic on"}
              </button>
            )}
            {connected && (
              <button
                onClick={() => {
                  const next = !signingMode;
                  setSigningMode(next);
                  conv.setMuted(next);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ring-1 transition ${signingMode ? "bg-emerald-500/40 text-emerald-100 ring-emerald-400/60 hover:bg-emerald-500/50" : "bg-white/10 text-white ring-white/20 hover:bg-white/20"}`}
              >
                {signingMode ? "✋ Signing ON" : "✋ Sign Mode"}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1" />

        {/* Center message card */}
        {forestStatus === "answering" && !awaitingMove && !isWalking && (
          <div className="pointer-events-none absolute left-1/2 top-[38%] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-6">
            <div
              key={lastAgentMessage}
              className={`center-card pointer-events-auto rounded-3xl border-2 bg-gradient-to-br p-5 shadow-2xl backdrop-blur-md ${variantTone[bubbleVariant]}`}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-white/70">🌲 Forest Guide Finn</div>
              <div className="mt-1 text-xl font-semibold leading-snug text-white drop-shadow">{lastAgentMessage}</div>
              {bubbleVariant === "wrong" && (
                <div className="mt-2 text-sm text-amber-200">💛 Take your time — you can do it!</div>
              )}
            </div>
          </div>
        )}

        {/* Key earned notification — brief toast, arrow in 3D scene handles walk */}
        {awaitingMove && forestStatus !== "won" && (
          <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 px-4">
            <div className="rounded-2xl border border-emerald-300/50 bg-emerald-900/70 px-5 py-2.5 text-center shadow-xl backdrop-blur-md">
              <span className="text-sm font-bold text-emerald-200">✨ Key earned! Click the arrow on the path to continue</span>
            </div>
          </div>
        )}

        {/* Walking progress indicator */}
        {isWalking && (
          <div className="pointer-events-none absolute left-1/2 top-[38%] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="rounded-2xl border border-white/15 bg-black/40 px-6 py-3 text-white/80 backdrop-blur-md text-sm font-semibold">
              🌿 Walking down the path…
            </div>
          </div>
        )}

        {/* Start splash */}
        {forestStatus === "idle" && (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="center-card rounded-3xl border-2 border-emerald-300/30 bg-gradient-to-br from-emerald-700/40 to-green-800/40 p-7 shadow-2xl backdrop-blur-md">
              <div className="text-5xl">🌲✨</div>
              <div className="mt-2 text-2xl font-bold text-white">Forest Path Adventure</div>
              <div className="mt-2 text-sm text-white/85">Answer 7 spelling & reading questions. Collect Knowledge Keys. Open the treasure!</div>
              <button
                onClick={start}
                disabled={starting}
                className="mt-5 rounded-full bg-emerald-400 px-7 py-3 text-base font-bold text-emerald-950 shadow-2xl shadow-emerald-500/40 transition hover:scale-105 hover:bg-emerald-300 disabled:opacity-60 disabled:hover:scale-100"
              >
                {starting ? "Connecting…" : "🌿 Enter the Forest"}
              </button>
              {error && (
                <div className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</div>
              )}
            </div>
          </div>
        )}

        {/* Choice display — only after agent has spoken the question, hidden once answered correctly */}
        {forestStatus === "answering" && questionReady && !awaitingMove && !isWalking && (
          <div className="pointer-events-auto absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 p-5">
            {/* Current question */}
            {currentQuestion && (
              <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-black/50 px-4 py-2 text-center text-sm text-white/80 backdrop-blur-md">
                <span className="font-semibold text-white/60 text-xs uppercase tracking-wider">Question {nodeIndex + 1}/7 — </span>
                {currentQuestion.question}
              </div>
            )}
            {/* Read-only choice labels — say the letter aloud to answer */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg sm:grid-cols-4">
              {(["A", "B", "C", "D"] as const).map((letter) => {
                const choice = currentQuestion?.choices[letter] ?? "";
                return (
                  <div
                    key={letter}
                    className={`flex flex-col items-center justify-center rounded-2xl px-3 py-3 text-sm font-extrabold ring-2 select-none ${CHOICE_COLORS[letter]}`}
                  >
                    <span className="text-lg leading-none">{letter}</span>
                    <span className="mt-0.5 text-xs font-semibold leading-tight text-center opacity-90 line-clamp-2">{choice}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-white/50 font-medium">
              {signingMode ? "✋ Space = add letter · Enter = submit word" : '🎤 Say "A", "B", "C", or "D" to answer'}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={stop}
                className="rounded-full bg-rose-500/90 px-4 py-2 text-sm font-semibold text-rose-950 shadow-xl transition hover:bg-rose-400"
              >
                End
              </button>
            </div>
          </div>
        )}

        {error && forestStatus !== "idle" && forestStatus !== "won" && (
          <div className="pointer-events-auto absolute left-1/2 top-20 max-w-md -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/10 p-2 text-center text-xs text-rose-200">
            {error}
          </div>
        )}
      </div>

      {/* Victory screen */}
      {forestStatus === "won" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
          <div className="center-card rounded-3xl border-2 border-yellow-300/60 bg-gradient-to-br from-yellow-400/30 to-amber-600/30 px-10 py-8 text-center shadow-2xl backdrop-blur-md max-w-md">
            <div className="text-6xl">{keys >= 5 ? "🏆" : keys >= 3 ? "🗝️" : "🌲"}</div>
            <div className="mt-2 text-3xl font-extrabold text-yellow-200">
              {keys >= 5 ? "Treasure Found!" : keys >= 3 ? "Great Exploring!" : "You Made It!"}
            </div>
            <div className="mt-2 text-base text-white/90">{lastAgentMessage}</div>
            <div className="mt-3 flex justify-center gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className={`text-xl ${i < keys ? "opacity-100" : "opacity-20"}`}>🗝️</span>
              ))}
            </div>
            <div className="mt-2 text-sm text-white/70">{keys}/7 Knowledge Keys collected</div>
            <div className="mt-5 flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => { if (connected) conv.endSession(); reset(); }}
                className="rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-bold text-emerald-950 shadow-xl transition hover:bg-emerald-300"
              >
                🌿 Try Again
              </button>
              <button
                onClick={() => { if (connected) conv.endSession(); router.push("/"); }}
                className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white shadow-xl ring-1 ring-white/20 transition hover:bg-white/20"
              >
                ← Back to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Pill({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ring-1 ${highlight ? "bg-emerald-400/20 text-emerald-100 ring-emerald-400/40" : "bg-white/10 text-white ring-white/20"}`}>
      {children}
    </div>
  );
}

