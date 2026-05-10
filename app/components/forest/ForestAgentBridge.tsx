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
  const nodeIndex = useForestStore((s) => s.nodeIndex);
  const prevStatus = useRef(status);

  useConversationClientTool("submitAnswer", (params: Record<string, unknown>) => {
    const raw = typeof params?.letter === "string" ? params.letter : "";
    const upper = raw.trim().toUpperCase() as "A" | "B" | "C" | "D";
    if (!["A", "B", "C", "D"].includes(upper)) {
      return "invalid_letter; please use A, B, C, or D";
    }
    return useForestStore.getState().submitAnswer(upper);
  });

  useConversationClientTool("getGameState", () => {
    const { nodeIndex: idx, keys } = useForestStore.getState();
    return `question: ${idx + 1}/7; keys_collected: ${keys}`;
  });

  useConversationClientTool("celebrateWin", () => {
    useForestStore.getState().celebrateWin();
    return "celebrated";
  });

  // After walk finishes (walking → answering), send next question text to
  // agent so it speaks it aloud. Client already shows the question on screen;
  // agent is just TTS here — same pattern as maze AgentBridge.
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
