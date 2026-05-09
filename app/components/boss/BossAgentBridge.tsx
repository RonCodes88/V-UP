"use client";

import { useConversationClientTool } from "@elevenlabs/react";
import { useBossStore } from "@/app/lib/bossStore";

export default function BossAgentBridge() {
  useConversationClientTool("dealDamageToBoss", () => {
    return useBossStore.getState().dealDamageToBoss();
  });

  useConversationClientTool("dealDamageToPlayer", () => {
    return useBossStore.getState().dealDamageToPlayer();
  });

  useConversationClientTool("getBattleState", () => {
    return useBossStore.getState().getBattleState();
  });

  useConversationClientTool("triggerVictory", () => {
    useBossStore.getState().triggerVictory();
    return "Victory triggered.";
  });

  useConversationClientTool("triggerDefeat", () => {
    useBossStore.getState().triggerDefeat();
    return "Defeat triggered.";
  });

  return null;
}