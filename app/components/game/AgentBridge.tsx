"use client";

import { useConversation, useConversationClientTool } from "@elevenlabs/react";
import { useEffect, useRef } from "react";
import { useGameStore } from "@/app/lib/gameStore";

function perceptionString(p: ReturnType<typeof useGameStore.getState>["perception"] extends () => infer R ? R : never) {
  return [
    `position: (${p.pos.x}, ${p.pos.y})`,
    `goal: (${p.goal.x}, ${p.goal.y})`,
    `forward: ${p.forward}`,
    `left: ${p.left}`,
    `right: ${p.right}`,
    `back: ${p.back}`,
    p.atGoal ? "AT_GOAL" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export default function AgentBridge() {
  const conv = useConversation();
  const stepCredits = useGameStore((s) => s.stepCredits);
  const prevCredits = useRef(stepCredits);

  useConversationClientTool("getPerception", () => {
    const p = useGameStore.getState().perception();
    const credits = useGameStore.getState().stepCredits;
    return `${perceptionString(p)}; step_credits: ${credits}`;
  });

  // Renamed semantically: agent grants the player a step, the player picks
  // the direction. Keeps the same tool name so existing dashboard config works
  // unchanged. Direction param is ignored (kept for backwards compat).
  useConversationClientTool("moveCharacter", () => {
    const credits = useGameStore.getState().grantStep();
    if (credits === 0) {
      return "step_already_pending; wait for the player to take their step before granting another";
    }
    return `step_granted; the player has ${credits} step(s) to walk. Stay silent until you receive a system message telling you to ask the next question.`;
  });

  useConversationClientTool("celebrateWin", () => {
    useGameStore.getState().celebrate();
    return "celebrated";
  });

  // Fire the next-question nudge the moment credits hit zero — i.e. the
  // player just spent their last step. The LLM generates the next question
  // in parallel with the walk animation, eliminating the post-walk pause.
  useEffect(() => {
    const justSpentLast = prevCredits.current > 0 && stepCredits === 0;
    prevCredits.current = stepCredits;
    if (!justSpentLast) return;
    if (conv.status !== "connected") return;
    const p = useGameStore.getState().perception();
    if (p.atGoal) return; // celebrateWin will fire from the agent side
    conv.sendContextualUpdate(
      "The player just finished walking their steps. Ask the next science question now in one short sentence. Do not praise — just ask the question.",
    );
  }, [stepCredits, conv]);

  return null;
}
