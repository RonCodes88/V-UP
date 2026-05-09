"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { useBossStore } from "@/app/lib/bossStore";
import BossAgentBridge from "./BossAgentBridge";
import BossHUD from "./BossHUD";

export default function BossGame() {
  const appendTranscript = useBossStore((s) => s.appendTranscript);
  const setError = useBossStore((s) => s.setError);
  const setStatus = useBossStore((s) => s.setStatus);
  const setAgentMessage = useBossStore((s) => s.setAgentMessage);

  return (
    <ConversationProvider
      onConnect={() => setError(null)}
      onError={(e) => {
        setError(typeof e === "string" ? e : "Connection error");
        setStatus("idle");
      }}
      onDisconnect={(details) => {
        const reason = details?.reason;
        if (reason === "error") {
          setError(details?.message ?? "Connection lost");
        }
        if (reason !== "user") setStatus("idle");
      }}
      onMessage={({ message, source }) => {
        const role = source === "user" ? "user" : "ai";
        appendTranscript({ role, text: message, ts: Date.now() });
        if (role === "ai") {
          setAgentMessage(message);
        }
      }}
    >
      <div
        className="relative h-screen w-screen overflow-hidden"
        style={{
          background:
            "linear-gradient(to bottom, #1a0512, #2a0822 40%, #0a0318)",
        }}
      >
        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-rose-700/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-red-600/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-700/10 blur-3xl" />
        </div>

        <BossAgentBridge />
        <BossHUD />
      </div>
    </ConversationProvider>
  );
}