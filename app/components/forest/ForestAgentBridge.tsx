"use client";

import { useConversation, useConversationClientTool } from "@elevenlabs/react";
import { useEffect, useRef } from "react";
import { useForestStore } from "@/app/lib/forestStore";
import { QUESTIONS } from "@/app/lib/forestQuestions";

function formatQuestion(idx: number): string {
  const q = QUESTIONS[idx];
  return `${q.question} A: ${q.choices.A}. B: ${q.choices.B}. C: ${q.choices.C}. D: ${q.choices.D}.`;
}

export default function ForestAgentBridge() {
  const conv = useConversation();
  const status = useForestStore((s) => s.status);
  const prevStatus = useRef(status);

  useConversationClientTool("submitAnswer", (params: Record<string, unknown>) => {
    const raw = typeof params?.letter === "string" ? params.letter : "";
    const upper = raw.trim().toUpperCase() as "A" | "B" | "C" | "D";
    if (!["A", "B", "C", "D"].includes(upper)) {
      return "invalid_letter; please use A, B, C, or D";
    }
    const result = useForestStore.getState().submitAnswer(upper);
    if (result === "correct") {
      return "correct. Say ONE short affirmation then STOP. Do NOT say anything else. Do NOT read the next question. Stay silent until the SYSTEM gives you the next question text.";
    }
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

  useEffect(() => {
    const wasWalking = prevStatus.current === "walking";
    prevStatus.current = status;
    if (!wasWalking || status !== "answering") return;
    if (conv.status !== "connected") return;
    const idx = useForestStore.getState().nodeIndex;
    if (idx >= QUESTIONS.length) return;
    conv.sendUserMessage(
      `Speak this verbatim, with no preamble or additions: "${formatQuestion(idx)}"`,
    );
  }, [status, conv]);

  return null;
}
