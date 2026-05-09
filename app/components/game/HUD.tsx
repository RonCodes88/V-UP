"use client";

import { useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/app/lib/gameStore";
import { useHubStore } from "@/app/lib/hubStore";
import { buildFirstMessage, buildSystemPrompt, getPersona } from "@/app/lib/agentPersona";
import type { Direction } from "@/app/lib/maze";

export default function HUD() {
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);
  const reset = useGameStore((s) => s.reset);
  const pos = useGameStore((s) => s.pos);
  const goal = useGameStore((s) => s.maze.goal);
  const lastAgentMessage = useGameStore((s) => s.lastAgentMessage);
  const bubbleVariant = useGameStore((s) => s.bubbleVariant);
  const bubbleVisible = useGameStore((s) => s.bubbleVisible);
  const stepCredits = useGameStore((s) => s.stepCredits);
  const perception = useGameStore((s) => s.perception);
  const playerMove = useGameStore((s) => s.playerMove);

  const router = useRouter();
  const conv = useConversation();
  const connected = conv.status === "connected";
  const isSpeaking = conv.isSpeaking;
  const muted = conv.isMuted;

  const characterSlug = useHubStore((s) => s.selectedCharacter);
  const persona = getPersona(characterSlug);

  const setError = useGameStore((s) => s.setError);
  const setStatus = useGameStore((s) => s.setStatus);

  const [starting, setStarting] = useState(false);

  // Auto-mute on first connect — user must explicitly click "Start Listening"
  // before each answer. Keeps background noise from the demo room out.
  const wasConnected = useRef(false);
  useEffect(() => {
    if (connected && !wasConnected.current) {
      wasConnected.current = true;
      conv.setMuted(true);
    } else if (!connected) {
      wasConnected.current = false;
    }
  }, [connected, conv]);

  // Auto-mute the moment a step is granted (correct answer) so the walking
  // animation isn't picked up as an answer to a not-yet-asked question.
  const prevCredits = useRef(stepCredits);
  useEffect(() => {
    if (prevCredits.current === 0 && stepCredits > 0 && connected) {
      conv.setMuted(true);
    }
    prevCredits.current = stepCredits;
  }, [stepCredits, connected, conv]);

  // Defensive: also mute during the walk animation.
  useEffect(() => {
    if (status === "moving" && connected && !muted) {
      conv.setMuted(true);
    }
  }, [status, connected, muted, conv]);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    try {
      setError(null);
      reset();
      const res = await fetch("/api/signed-url");
      if (!res.ok) throw new Error(`Signed URL fetch failed: ${res.status}`);
      const { signedUrl, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      const slug = useHubStore.getState().selectedCharacter;
      setStatus("playing");
      conv.startSession({
        signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: buildSystemPrompt(slug) },
            firstMessage: buildFirstMessage(slug),
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

  const dist = Math.abs(pos.x - goal.x) + Math.abs(pos.y - goal.y);

  // Live perception, used to disable D-pad arrows that face walls.
  const p = perception();

  const canMove = stepCredits > 0 && status !== "moving" && status !== "won";

  // Center card only shows when the agent has fresh narration to deliver —
  // hidden during the answer→walk→next-question pause so the player can think.
  const showCard = bubbleVisible && !canMove && status !== "moving";

  const statusLabel =
    status === "won"
      ? "We did it!"
      : status === "idle"
        ? "Tap start"
        : !connected
          ? "Connecting…"
          : status === "moving"
            ? "Walking…"
            : muted
              ? "Mic off"
              : isSpeaking
                ? `${persona.name.split(" ")[0]} talking`
                : canMove
                  ? "Pick a direction!"
                  : "Listening";

  const variantTone: Record<typeof bubbleVariant, string> = {
    intro: "from-indigo-500/30 to-violet-500/30 border-indigo-300/40",
    question: "from-indigo-500/30 to-violet-500/30 border-indigo-300/40",
    encouragement: "from-amber-500/30 to-orange-500/30 border-amber-300/40",
    celebration: "from-emerald-500/30 to-teal-500/30 border-emerald-300/40",
    victory: "from-yellow-400/40 to-amber-500/40 border-yellow-300/60",
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto flex items-start justify-between gap-3 p-5">
          <div className="flex items-start gap-3">
            <button
              onClick={() => {
                if (connected) conv.endSession();
                router.push("/");
              }}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20"
              title="Back to hub"
            >
              ← Hub
            </button>
            <div>
              <div className="text-lg font-bold tracking-tight text-white drop-shadow-lg">
                {persona.emoji} Maze Quest
              </div>
              <div className="text-xs text-white/70">
                Science question → earn a step → pick a direction
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill>📍 {dist} step{dist === 1 ? "" : "s"} to go</Pill>
            <Pill highlight={canMove} pulse={canMove}>
              🎟️ {stepCredits} step{stepCredits === 1 ? "" : "s"}
            </Pill>
            <Pill highlight={connected && !muted}>
              {connected && (
                <span
                  className={`mr-1 inline-block h-2 w-2 rounded-full ${
                    muted
                      ? "bg-rose-400"
                      : isSpeaking
                        ? "bg-emerald-400 listening-glow"
                        : "bg-emerald-300"
                  }`}
                />
              )}
              {statusLabel}
            </Pill>
          </div>
        </header>

        <div className="flex-1" />

        {/* Center modal-style card */}
        {status !== "idle" && status !== "won" && showCard && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-6 transition-opacity duration-300"
          >
            <div
              key={lastAgentMessage}
              className={`center-card pointer-events-auto rounded-3xl border-2 bg-gradient-to-br p-6 shadow-2xl backdrop-blur-md ${variantTone[bubbleVariant]}`}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-white/70">
                {persona.name}
              </div>
              <div className="mt-1 text-2xl font-semibold leading-snug text-white drop-shadow">
                {lastAgentMessage}
              </div>
              {bubbleVariant === "encouragement" && (
                <div className="mt-3 text-sm text-white/80">
                  💛 Take your time — I&apos;m right here with you.
                </div>
              )}
              {connected && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => conv.setMuted(!muted)}
                    className={`rounded-full px-7 py-3 text-base font-bold shadow-xl ring-2 transition ${
                      muted
                        ? "bg-emerald-400 text-emerald-950 ring-emerald-200 hover:scale-105 hover:bg-emerald-300 listening-glow"
                        : "bg-rose-500 text-rose-50 ring-rose-300 hover:bg-rose-400"
                    }`}
                  >
                    {muted ? "🎤 Start Listening" : "🔇 Stop Listening"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Idle/start splash */}
        {status === "idle" && (
          <div className="pointer-events-auto absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-6 text-center">
            <div className="center-card rounded-3xl border-2 border-white/20 bg-gradient-to-br from-indigo-600/40 to-purple-700/40 p-7 shadow-2xl backdrop-blur-md">
              <div className="text-4xl">{persona.emoji}🌟</div>
              <div className="mt-2 text-2xl font-bold text-white">
                Welcome, friend!
              </div>
              <div className="mt-2 text-sm text-white/85">
                Answer a science question → earn a step → pick an arrow to walk
                your buddy toward the glowing portal.
              </div>
              <button
                onClick={start}
                disabled={starting}
                className="mt-5 rounded-full bg-emerald-400 px-7 py-3 text-base font-bold text-emerald-950 shadow-2xl shadow-emerald-500/40 transition hover:scale-105 hover:bg-emerald-300 disabled:opacity-60 disabled:hover:scale-100"
              >
                {starting ? "Connecting…" : "▶ Start Adventure"}
              </button>
              {error && (
                <div className="mt-3 rounded-xl border border-rose-400/40 bg-rose-500/10 p-2 text-xs text-rose-200">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom row — D-pad on right, controls in middle, text input on left */}
        {status !== "idle" && status !== "won" && (
          <div className="pointer-events-auto absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-5">
            <div className="flex flex-col gap-2">
              <TypeAnswer
                onSubmit={(text) => conv.sendUserMessage(text)}
                disabled={!connected}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={stop}
                  className="rounded-full bg-rose-500/90 px-5 py-2 text-sm font-semibold text-rose-950 shadow-xl transition hover:bg-rose-400"
                >
                  End
                </button>
                <button
                  onClick={() => reset()}
                  className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white shadow-xl ring-1 ring-white/20 transition hover:bg-white/20"
                >
                  Restart
                </button>
              </div>
            </div>

            <DPad
              canMove={canMove}
              walls={{
                forward: p.forward === "wall",
                back: p.back === "wall",
                left: p.left === "wall",
                right: p.right === "wall",
              }}
              onMove={(dir) => playerMove(dir)}
            />
          </div>
        )}

        {error && status !== "idle" && status !== "won" && (
          <div className="pointer-events-auto absolute left-1/2 top-20 max-w-md -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/10 p-2 text-center text-xs text-rose-200">
            {error}
          </div>
        )}
      </div>

      {status === "won" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center">
          <div className="center-card rounded-3xl border-2 border-yellow-300/60 bg-gradient-to-br from-yellow-400/30 to-amber-500/30 px-12 py-8 text-center shadow-2xl backdrop-blur-md">
            <div className="text-6xl">🏆</div>
            <div className="mt-2 text-4xl font-extrabold text-yellow-200">
              You did it!
            </div>
            <div className="mt-2 text-base text-white/90">
              Your buddy made it home — wonderful work, friend.
            </div>
            <button
              onClick={() => reset()}
              className="mt-5 rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-bold text-emerald-950 shadow-xl transition hover:bg-emerald-300"
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Pill({
  children,
  highlight,
  pulse,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ring-1 ${
        highlight
          ? "bg-emerald-400/20 text-emerald-100 ring-emerald-400/40"
          : "bg-white/10 text-white ring-white/20"
      } ${pulse ? "listening-glow" : ""}`}
    >
      {children}
    </div>
  );
}

function DPad({
  canMove,
  walls,
  onMove,
}: {
  canMove: boolean;
  walls: { forward: boolean; back: boolean; left: boolean; right: boolean };
  onMove: (dir: Direction) => void;
}) {
  const btnBase =
    "flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black shadow-xl ring-2 transition active:scale-90";
  const enabled =
    "bg-emerald-400 text-emerald-950 ring-emerald-200 hover:scale-110 hover:bg-emerald-300";
  const disabled = "bg-white/5 text-white/30 ring-white/10 cursor-not-allowed";
  const cls = (wall: boolean) =>
    `${btnBase} ${canMove && !wall ? enabled : disabled}`;

  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-white/10 bg-black/30 p-3 shadow-2xl backdrop-blur-md">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
        {canMove ? "Pick a direction!" : "Answer to unlock"}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div />
        <button
          className={cls(walls.forward)}
          disabled={!canMove || walls.forward}
          onClick={() => onMove("forward")}
          aria-label="Move forward"
        >
          ↑
        </button>
        <div />
        <button
          className={cls(walls.left)}
          disabled={!canMove || walls.left}
          onClick={() => onMove("left")}
          aria-label="Move left"
        >
          ←
        </button>
        <button
          className={cls(walls.back)}
          disabled={!canMove || walls.back}
          onClick={() => onMove("back")}
          aria-label="Move back"
        >
          ↓
        </button>
        <button
          className={cls(walls.right)}
          disabled={!canMove || walls.right}
          onClick={() => onMove("right")}
          aria-label="Move right"
        >
          →
        </button>
      </div>
    </div>
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
      className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/40 p-1 pl-3 backdrop-blur-md"
    >
      <span className="text-xs font-semibold text-white/60">Type:</span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer if it's loud…"
        disabled={disabled}
        className="w-56 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-full bg-indigo-400 px-3 py-1 text-xs font-bold text-indigo-950 shadow-md transition hover:bg-indigo-300 disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}
