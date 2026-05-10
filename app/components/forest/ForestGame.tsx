"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { useForestStore } from "@/app/lib/forestStore";
import ForestAgentBridge from "./ForestAgentBridge";
import ForestScene from "./ForestScene";
import ForestHUD from "./ForestHUD";
import ASLSigningOverlay from "./ASLSigningOverlay";

export default function ForestGame() {
  const setError = useForestStore((s) => s.setError);
  const setStatus = useForestStore((s) => s.setStatus);
  const setAgentMessage = useForestStore((s) => s.setAgentMessage);
  const onUserSpoke = useForestStore((s) => s.onUserSpoke);

  return (
    <ConversationProvider
      onConnect={() => setError(null)}
      onError={(e) => {
        setError(typeof e === "string" ? e : "Connection error");
        setStatus("idle");
      }}
      onDisconnect={(details) => {
        const reason = (details as { reason?: string })?.reason;
        if (reason === "error") {
          setError((details as { message?: string })?.message ?? "Connection lost");
        }
        if (reason !== "user") setStatus("idle");
      }}
      onMessage={({ message, source }) => {
        if (source === "user") {
          onUserSpoke();
        } else {
          setAgentMessage(message);
        }
      }}
    >
      <div className="relative h-screen w-screen overflow-hidden bg-[#0a1a0a]">
        <ForestScene />
        <ForestAgentBridge />
        <ForestHUD />
        <ASLSigningOverlay />
      </div>
    </ConversationProvider>
  );
}
