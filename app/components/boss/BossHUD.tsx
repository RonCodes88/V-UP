"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useBossStore } from "@/app/lib/bossStore";
import { useHubStore } from "@/app/lib/hubStore";
import type { CharacterSlug } from "@/app/lib/characters";

const MAX_HP = 100;

const CHARACTER_NAMES: Record<CharacterSlug, string> = {
  bear: "Bear",
  fox: "Fox",
  robot: "Robot",
  cat: "Cat",
};

type FloatNum = { id: number; text: string; side: "boss" | "player" };

export default function BossHUD() {
  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const muted = conv.isMuted;

  const characterSlug = useHubStore((s) => s.selectedCharacter);
  const playerName = CHARACTER_NAMES[characterSlug ?? "bear"];

  const status = useBossStore((s) => s.status);
  const playerHP = useBossStore((s) => s.playerHP);
  const bossHP = useBossStore((s) => s.bossHP);
  const turn = useBossStore((s) => s.turn);
  const correctAnswers = useBossStore((s) => s.correctAnswers);
  const lastAgentMessage = useBossStore((s) => s.lastAgentMessage);
  const bubbleKey = useBossStore((s) => s.bubbleKey);
  const bossHitKey = useBossStore((s) => s.bossHitKey);
  const playerHitKey = useBossStore((s) => s.playerHitKey);
  const error = useBossStore((s) => s.error);

  const setError = useBossStore((s) => s.setError);
  const setStatus = useBossStore((s) => s.setStatus);
  const reset = useBossStore((s) => s.reset);
  const whiteboardOpen = useBossStore((s) => s.whiteboardOpen);
  const openWhiteboard = useBossStore((s) => s.openWhiteboard);
  const closeWhiteboard = useBossStore((s) => s.closeWhiteboard);

  const [starting, setStarting] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);

  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && !wasConnected.current) {
      wasConnected.current = true;
      conv.setMuted(true);
    } else if (!connected) {
      wasConnected.current = false;
    }
  }, [connected, conv]);
  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);

  useEffect(() => {
    if (bossHitKey === 0) return;
    const id = Date.now();
    setFloatNums((prev) => [...prev, { id, text: "−25", side: "boss" }]);
    const remove = setTimeout(
      () => setFloatNums((prev) => prev.filter((n) => n.id !== id)),
      1100,
    );
    return () => clearTimeout(remove);
  }, [bossHitKey]);

  useEffect(() => {
    if (playerHitKey === 0) return;
    setScreenFlash(true);
    const id = Date.now() + 1;
    setFloatNums((prev) => [...prev, { id, text: "−25", side: "player" }]);
    const flash = setTimeout(() => setScreenFlash(false), 650);
    const remove = setTimeout(
      () => setFloatNums((prev) => prev.filter((n) => n.id !== id)),
      1100,
    );
    return () => {
      clearTimeout(flash);
      clearTimeout(remove);
    };
  }, [playerHitKey]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setError(null);
      reset();
      const slug = useHubStore.getState().selectedCharacter ?? "bear";
      const res = await fetch(`/api/signed-url?game=boss&character=${slug}`);
      if (!res.ok) throw new Error(`Signed URL fetch failed: ${res.status}`);
      const { signedUrl, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      setStatus("battling");
      conv.startSession({ signedUrl });
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

  const tier =
    correctAnswers < 2 ? 1 : correctAnswers < 4 ? 2 : correctAnswers < 6 ? 3 : 4;

  const bossHPPct = (bossHP / MAX_HP) * 100;
  const playerHPPct = (playerHP / MAX_HP) * 100;

  const bossHPColor =
    bossHPPct > 50
      ? "from-rose-500 to-red-400"
      : bossHPPct > 25
        ? "from-orange-500 to-amber-400"
        : "from-yellow-400 to-yellow-300";

  const playerHPColor =
    playerHPPct > 50
      ? "from-emerald-500 to-green-400"
      : playerHPPct > 25
        ? "from-yellow-500 to-amber-400"
        : "from-red-500 to-rose-400";

  return (
    <>
      {screenFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-50 screen-flash-red"
          style={{ boxShadow: "inset 0 0 100px 30px rgba(239,68,68,0.55)" }}
        />
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        {/* Header */}
        <header className="pointer-events-auto flex items-center justify-between gap-3 p-4">
          <button
            onClick={() => {
              if (connected) conv.endSession();
              router.push("/");
            }}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-tight text-white drop-shadow">
              Boss Battle
            </span>
            {status === "battling" && (
              <>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70 ring-1 ring-white/20">
                  Turn {turn}
                </span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30">
                  Tier {tier}
                </span>
              </>
            )}
          </div>

          <div className="w-12" />
        </header>

        {/* HP Bars */}
        {status === "battling" && (
          <div className="pointer-events-auto mx-4 grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-md">
            {/* Player HP */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold">
                <span className="text-white/90">
                  {playerName}
                </span>
                <span
                  className={`${
                    playerHPPct <= 25 ? "animate-pulse text-red-300" : "text-white/70"
                  }`}
                >
                  {playerHP}/{MAX_HP} HP
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${playerHPColor} transition-all duration-600 ease-out`}
                  style={{ width: `${playerHPPct}%` }}
                />
              </div>
            </div>

            {/* Boss HP */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-bold">
                <span className="text-white/90">INFERNAL TITAN</span>
                <span
                  className={`${
                    bossHPPct <= 25 ? "animate-pulse text-amber-300" : "text-white/70"
                  }`}
                >
                  {bossHP}/{MAX_HP} HP
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bossHPColor} transition-all duration-600 ease-out`}
                  style={{ width: `${bossHPPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Arena overlay — damage numbers + agent bubble */}
        <div className="relative flex flex-1 flex-col items-stretch justify-between gap-4 px-6 py-2">
          {status === "battling" && (
            <>
              <div className="pointer-events-none relative mx-auto h-12 w-72">
                {floatNums
                  .filter((n) => n.side === "boss")
                  .map((n) => (
                    <div
                      key={n.id}
                      className="damage-float absolute left-1/2 -translate-x-1/2 text-4xl font-black text-rose-200 drop-shadow-lg"
                      style={{ textShadow: "0 0 14px rgba(251,113,133,1)" }}
                    >
                      {n.text}
                    </div>
                  ))}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-2 rounded-full bg-rose-950/60 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-rose-300/90 ring-1 ring-rose-500/40 backdrop-blur-md">
                  INFERNAL TITAN
                </div>
              </div>

              <div className="pointer-events-none relative mx-auto h-10 w-60">
                {floatNums
                  .filter((n) => n.side === "player")
                  .map((n) => (
                    <div
                      key={n.id}
                      className="damage-float absolute left-1/2 -translate-x-1/2 text-3xl font-black text-red-300 drop-shadow-lg"
                      style={{ textShadow: "0 0 12px rgba(248,113,113,1)" }}
                    >
                      {n.text}
                    </div>
                  ))}
              </div>

              <div
                key={bubbleKey}
                className="center-card pointer-events-none mx-auto mb-2 w-full max-w-xl rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/70 to-slate-900/70 p-4 shadow-2xl backdrop-blur-md"
              >
                <div className="text-xs font-bold uppercase tracking-widest text-rose-400/80">
                  Game Master
                </div>
                <div className="mt-1 text-lg font-semibold leading-snug text-white">
                  {lastAgentMessage}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom controls — text input, mic toggle, whiteboard, retreat */}
        {status === "battling" && (
          <div className="pointer-events-auto flex items-center gap-3 p-4">
            <TypeAnswer
              onSubmit={(text) => conv.sendUserMessage(text)}
              disabled={!connected}
            />
            {connected && (
              <button
                onClick={() => conv.setMuted(!muted)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold shadow-xl ring-1 transition ${
                  muted
                    ? "bg-emerald-400 text-emerald-950 ring-emerald-200 hover:bg-emerald-300"
                    : "bg-rose-500 text-rose-50 ring-rose-300 hover:bg-rose-400"
                }`}
              >
                {muted ? "Start Listening" : "Stop Listening"}
              </button>
            )}
            <button
              onClick={() =>
                whiteboardOpen ? closeWhiteboard() : openWhiteboard()
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold shadow-xl ring-1 transition ${
                whiteboardOpen
                  ? "bg-rose-500/90 text-rose-50 ring-rose-300"
                  : "bg-white/10 text-white ring-white/20 hover:bg-white/20"
              }`}
            >
              Whiteboard
            </button>
            <button
              onClick={stop}
              className="shrink-0 rounded-full bg-rose-600/80 px-4 py-2 text-sm font-semibold text-rose-50 shadow-xl transition hover:bg-rose-500"
            >
              Retreat
            </button>
          </div>
        )}

        {error && status !== "idle" && (
          <div className="pointer-events-auto absolute left-1/2 top-20 max-w-sm -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-center text-xs text-rose-200">
            {error}
          </div>
        )}
      </div>

      {/* Idle splash */}
      {status === "idle" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card pointer-events-auto mx-6 w-full max-w-md rounded-3xl border-2 border-rose-500/40 bg-gradient-to-br from-rose-950/70 to-slate-900/70 p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mt-3 text-3xl font-extrabold tracking-tight text-white">
              Boss Battle
            </div>
            <div className="mt-2 text-sm text-white/80">
              The INFERNAL TITAN awaits. Answer math questions fast to deal damage.
              One wrong answer — the boss strikes back!
            </div>
            <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
              Quick-fire questions! Rapid answers = rapid attacks!
            </div>
            <button
              onClick={start}
              disabled={starting}
              className="mt-5 rounded-full bg-rose-500 px-8 py-3 text-base font-bold text-rose-50 shadow-2xl shadow-rose-500/40 transition hover:scale-105 hover:bg-rose-400 disabled:opacity-60 disabled:hover:scale-100"
            >
              {starting ? "Connecting..." : "Start Battle"}
            </button>
            {error && (
              <div className="mt-3 text-xs text-rose-300">{error}</div>
            )}
          </div>
        </div>
      )}

      {/* Victory screen */}
      {status === "victory" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card pointer-events-auto mx-6 w-full max-w-lg rounded-3xl border-2 border-yellow-300/60 bg-gradient-to-br from-yellow-400/30 to-amber-600/30 px-12 py-10 text-center shadow-2xl backdrop-blur-md">
            <div className="mt-3 text-4xl font-extrabold text-yellow-200 drop-shadow-lg">
              Victory!
            </div>
            <div className="mt-2 text-base text-white/90">
              The INFERNAL TITAN falls! You answered{" "}
              <span className="font-bold text-yellow-300">{correctAnswers}</span>{" "}
              questions correctly!
            </div>
            <button
              onClick={() => {
                conv.endSession();
                reset();
              }}
              className="mt-6 rounded-full bg-emerald-400 px-8 py-3 text-base font-bold text-emerald-950 shadow-xl transition hover:scale-105 hover:bg-emerald-300"
            >
              Fight Again
            </button>
          </div>
        </div>
      )}

      {/* Defeat screen */}
      {status === "defeat" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="center-card pointer-events-auto mx-6 w-full max-w-lg rounded-3xl border-2 border-rose-600/60 bg-gradient-to-br from-rose-950/70 to-slate-900/70 px-12 py-10 text-center shadow-2xl backdrop-blur-md">
            <div className="mt-3 text-4xl font-extrabold text-rose-200 drop-shadow-lg">
              Defeated!
            </div>
            <div className="mt-2 text-base text-white/80">
              The INFERNAL TITAN stands victorious... but math training never ends!
              You got{" "}
              <span className="font-bold text-rose-300">{correctAnswers}</span>{" "}
              correct.
            </div>
            <button
              onClick={() => {
                conv.endSession();
                reset();
              }}
              className="mt-6 rounded-full bg-rose-500 px-8 py-3 text-base font-bold text-rose-50 shadow-xl transition hover:scale-105 hover:bg-rose-400"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function TypeAnswer({
  onSubmit,
  disabled,
}: {
  onSubmit: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (!t || disabled) return;
        onSubmit(t);
        setText("");
      }}
      className="flex flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-black/40 p-1 pl-3 backdrop-blur-md"
    >
      <span className="shrink-0 text-xs font-semibold text-white/60">Answer:</span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer..."
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="shrink-0 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-rose-50 shadow-md transition hover:bg-rose-400 disabled:opacity-40"
      >
        Strike!
      </button>
    </form>
  );
}
