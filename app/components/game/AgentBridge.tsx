"use client";

import { useConversationClientTool } from "@elevenlabs/react";
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
      return "step_already_pending; the player still has a step to take";
    }
    return "step_granted; tell the player to use the arrow buttons to take their step, then ask the next question after they move";
  });

  useConversationClientTool("celebrateWin", () => {
    useGameStore.getState().celebrate();
    return "celebrated";
  });

  return null;
}
