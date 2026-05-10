"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForestStore } from "@/app/lib/forestStore";
import { useHubStore } from "@/app/lib/hubStore";
import { buildForestFirstMessage, FOREST_SYSTEM_PROMPT } from "@/app/lib/forestAgentPersona";

const CHOICE_COLORS = {
  A: "border border-blue-400/25 bg-blue-950/35 text-blue-100/90",
  B: "border border-emerald-400/25 bg-emerald-950/35 text-emerald-100/90",
  C: "border border-orange-400/25 bg-orange-950/35 text-orange-100/90",
  D: "border border-rose-400/25 bg-rose-950/35 text-rose-100/90",
};

export default function ForestHUD() {
  const status = useForestStore((s) => s.status);
  const keys = useForestStore((s) => s.keys);
  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const stepCredits = useForestStore((s) => s.stepCredits);
  const lastAgentMessage = useForestStore((s) => s.lastAgentMessage);
  const currentQuestion = useForestStore((s) => s.currentQuestion);
  const error = useForestStore((s) => s.error);
  const reset = useForestStore((s) => s.reset);
  const setError = useForestStore((s) => s.setError);
  const setStatus = useForestStore((s) => s.setStatus);
  const startGame = useForestStore((s) => s.startGame);
  const walkForward = useForestStore((s) => s.walkForward);
  const signingMode = useForestStore((s) => s.signingMode);
  const setSigningMode = useForestStore((s) => s.setSigningMode);

  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const isSpeaking = conv.isSpeaking;
  const muted = conv.isMuted;

  const [starting, setStarting] = useState(false);

  // Auto-mute on connect so background noise doesn't interfere
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && !wasConnected.current) {
      wasConnected.current = true;
      conv.setMuted(true);
    } else if (!connected) {
      wasConnected.current = false;
    }
  }, [connected, conv]);

  // Auto-mute when step is granted so walking animation noise isn't picked up
  const prevCredits = useRef(stepCredits);
  useEffect(() => {
    if (prevCredits.current === 0 && stepCredits > 0 && connected) {
      conv.setMuted(true);
    }
    prevCredits.current = stepCredits;
  }, [stepCredits, connected, conv]);

  // Up Arrow = walk forward
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        walkForward();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [walkForward]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setError(null);
      startGame();
      const character = useHubStore.getState().selectedCharacter ?? "robot";
      const res = await fetch(`/api/signed-url/spell?character=${character}`);
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

  const hasCredit = stepCredits > 0;

  const statusLabel =
    status === "won"     ? "Treasure found!" :
    status === "idle"    ? "Tap start" :
    !connected           ? "Connecting…" :
    status === "walking" ? "Walking…" :
    hasCredit            ? "Press ↑ to walk!" :
    muted                ? "Mic off" :
    isSpeaking           ? "Finn is talking" :
    "Listening";

  // Show center card when question is active (not during walk, not when credit pending)
  const showCard = status === "answering" && !hasCredit;
  // Show "key earned" card when credit is ready
  const showKeyEarned = status === "answering" && hasCredit;

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
            <Pill highlight={hasCredit} pulse={hasCredit}>
              {connected && (
                <span className={`mr-1 inline-block h-2 w-2 rounded-full ${muted ? "bg-rose-400" : isSpeaking ? "bg-emerald-400 listening-glow" : "bg-emerald-300"}`} />
              )}
              {statusLabel}
            </Pill>
          </div>
        </header>

        <div className="flex-1" />

        {/* Center card — question + choices + mic (mirrors maze HUD) */}
        {showCard && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-6">
            <div
              key={currentQuestion.id}
              className="center-card pointer-events-auto rounded-3xl border-2 bg-gradient-to-br from-green-500/30 to-teal-600/30 border-green-300/40 p-6 shadow-2xl backdrop-blur-md"
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-white/70">
                🌲 Forest Guide Finn — Question {nodeIndex + 1}/7
              </div>
              <div className="mt-2 text-2xl font-semibold leading-snug text-white drop-shadow">
                {currentQuestion.question}
              </div>

              {/* ABCD — display-only reference (voice-first; not interactive) */}
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                Choices — listen and say a letter
              </div>
              <div
                className="mt-2 grid grid-cols-2 gap-2"
                role="group"
                aria-label="Answer choices for reference. Answer using your voice."
              >
                {(["A", "B", "C", "D"] as const).map((letter) => (
                  <div
                    key={letter}
                    tabIndex={-1}
                    className={`pointer-events-none flex cursor-default items-center gap-2 rounded-xl px-3 py-2.5 select-none ${CHOICE_COLORS[letter]}`}
                  >
                    <span className="text-lg font-extrabold leading-none tabular-nums">{letter}</span>
                    <span className="text-sm font-medium leading-tight opacity-95">{currentQuestion.choices[letter]}</span>
                  </div>
                ))}
              </div>

              {/* Agent response if any */}
              {lastAgentMessage && (
                <div className="mt-3 text-sm text-white/80 italic">
                  {lastAgentMessage}
                </div>
              )}

              {/* Mic + controls */}
              {connected && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => conv.setMuted(!muted)}
                    className={`rounded-full px-6 py-2.5 text-sm font-bold shadow-xl ring-2 transition ${
                      muted
                        ? "bg-emerald-400 text-emerald-950 ring-emerald-200 hover:scale-105 hover:bg-emerald-300 listening-glow"
                        : "bg-rose-500 text-rose-50 ring-rose-300 hover:bg-rose-400"
                    }`}
                  >
                    {muted ? "🎤 Start Listening" : "🔇 Stop Listening"}
                  </button>
                  <button
                    onClick={() => {
                      const next = !signingMode;
                      setSigningMode(next);
                      conv.setMuted(next);
                    }}
                    className={`rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition ${
                      signingMode
                        ? "bg-emerald-500/40 text-emerald-100 ring-emerald-400/60"
                        : "bg-white/10 text-white ring-white/20 hover:bg-white/20"
                    }`}
                  >
                    {signingMode ? "✋ Signing" : "✋ Sign"}
                  </button>
                  <button
                    onClick={stop}
                    className="rounded-full bg-rose-500/90 px-4 py-2.5 text-sm font-semibold text-rose-950 shadow-xl transition hover:bg-rose-400"
                  >
                    End
                  </button>
                </div>
              )}

              <div className="mt-2 text-center text-xs text-white/50 font-medium">
                {signingMode ? "✋ Space = add letter · Enter = submit word" : '🎤 Say "A", "B", "C", or "D" — on-screen choices are display-only'}
              </div>
            </div>
          </div>
        )}

        {/* Key earned — press ↑ to walk */}
        {showKeyEarned && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="center-card rounded-3xl border-2 border-emerald-300/50 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 px-6 py-6 shadow-2xl backdrop-blur-md">
              <div className="text-4xl">✨🗝️</div>
              <div className="mt-2 text-2xl font-bold text-emerald-200">Key earned!</div>
              <div className="mt-3 text-base font-semibold text-emerald-300">Press ↑ to walk forward</div>
              <div className="mt-3 flex items-center justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-2xl font-black text-emerald-950 shadow-xl ring-2 ring-emerald-200 listening-glow">
                  ↑
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Walking indicator */}
        {status === "walking" && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="rounded-2xl border border-white/15 bg-black/40 px-6 py-3 text-white/80 backdrop-blur-md text-sm font-semibold">
              🌿 Walking down the path…
            </div>
          </div>
        )}

        {/* Start splash */}
        {status === "idle" && (
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

        {error && status !== "idle" && status !== "won" && (
          <div className="pointer-events-auto absolute left-1/2 top-20 max-w-md -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/10 p-2 text-center text-xs text-rose-200">
            {error}
          </div>
        )}
      </div>

      {/* Victory screen */}
      {status === "won" && (
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

function Pill({ children, highlight, pulse }: { children: React.ReactNode; highlight?: boolean; pulse?: boolean }) {
  return (
    <div className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ring-1 ${highlight ? "bg-emerald-400/20 text-emerald-100 ring-emerald-400/40" : "bg-white/10 text-white ring-white/20"} ${pulse ? "listening-glow" : ""}`}>
      {children}
    </div>
  );
}
