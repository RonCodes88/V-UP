"use client";

import { useConversationClientTool } from "@elevenlabs/react";
import { useForestStore } from "@/app/lib/forestStore";

export default function ForestAgentBridge() {
  useConversationClientTool("submitAnswer", (params: Record<string, unknown>) => {
    const raw = typeof params?.letter === "string" ? params.letter : "";
    const upper = raw.trim().toUpperCase() as "A" | "B" | "C" | "D";
    if (!["A", "B", "C", "D"].includes(upper)) {
      return "invalid_letter; please use A, B, C, or D";
    }
    const result = useForestStore.getState().submitAnswer(upper);
    return result;
  });

  useConversationClientTool("getGameState", () => {
    const { nodeIndex, keys } = useForestStore.getState();
    return `question: ${nodeIndex + 1}/7; keys_collected: ${keys}`;
  });

  useConversationClientTool("celebrateWin", () => {
    useForestStore.getState().celebrateWin();
    return "celebrated";
  });

  return null;
}
