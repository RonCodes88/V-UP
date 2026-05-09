import { create } from "zustand";

export type BattleStatus = "idle" | "battling" | "victory" | "defeat";

export type BossTranscript = {
  role: "user" | "ai";
  text: string;
  ts: number;
}[];

export type DamageEvent = {
  id: number;
  target: "boss" | "player";
  amount: number;
};

const MAX_HP = 100;
const DEFAULT_DAMAGE = 10;

type State = {
  playerHP: number;
  bossHP: number;
  turn: number;
  correctAnswers: number;
  status: BattleStatus;
  transcript: BossTranscript;
  error: string | null;
  lastAgentMessage: string;
  bubbleKey: number;
  bossHitKey: number;
  playerHitKey: number;
  damageEvents: DamageEvent[];

  // actions
  dealDamageToBoss: (amount?: number) => string;
  dealDamageToPlayer: (amount?: number) => string;
  getBattleState: () => string;
  triggerVictory: () => void;
  triggerDefeat: () => void;
  reset: () => void;
  appendTranscript: (m: BossTranscript[number]) => void;
  setError: (e: string | null) => void;
  setStatus: (s: BattleStatus) => void;
  setAgentMessage: (text: string) => void;
  dismissDamageEvent: (id: number) => void;
};

export const useBossStore = create<State>((set, get) => ({
  playerHP: MAX_HP,
  bossHP: MAX_HP,
  turn: 0,
  correctAnswers: 0,
  status: "idle",
  transcript: [],
  error: null,
  lastAgentMessage: "Prepare yourself for battle!",
  bubbleKey: 0,
  bossHitKey: 0,
  playerHitKey: 0,
  damageEvents: [],

  dealDamageToBoss: (amount = DEFAULT_DAMAGE) => {
    const s = get();
    const newBossHP = Math.max(0, s.bossHP - amount);
    const evt: DamageEvent = { id: Date.now(), target: "boss", amount };
    set({
      bossHP: newBossHP,
      correctAnswers: s.correctAnswers + 1,
      turn: s.turn + 1,
      bossHitKey: s.bossHitKey + 1,
      damageEvents: [...s.damageEvents, evt],
      bubbleKey: s.bubbleKey + 1,
    });
    const after = get();
    return `Boss HP: ${newBossHP}/${MAX_HP}. Player HP: ${after.playerHP}/${MAX_HP}. Correct: ${after.correctAnswers}. ${newBossHP <= 0 ? "BOSS_DEFEATED" : "Boss still standing!"}`;
  },

  dealDamageToPlayer: (amount = DEFAULT_DAMAGE) => {
    const s = get();
    const newPlayerHP = Math.max(0, s.playerHP - amount);
    const evt: DamageEvent = { id: Date.now(), target: "player", amount };
    set({
      playerHP: newPlayerHP,
      turn: s.turn + 1,
      playerHitKey: s.playerHitKey + 1,
      damageEvents: [...s.damageEvents, evt],
      bubbleKey: s.bubbleKey + 1,
    });
    const after = get();
    return `Player HP: ${newPlayerHP}/${MAX_HP}. Boss HP: ${after.bossHP}/${MAX_HP}. ${newPlayerHP <= 0 ? "PLAYER_DEFEATED" : "Keep fighting!"}`;
  },

  getBattleState: () => {
    const { playerHP, bossHP, turn, correctAnswers } = get();
    const tier =
      correctAnswers < 3 ? 1 : correctAnswers < 6 ? 2 : correctAnswers < 9 ? 3 : 4;
    return `Player HP: ${playerHP}/${MAX_HP}. Boss HP: ${bossHP}/${MAX_HP}. Turn: ${turn}. Correct: ${correctAnswers}. Difficulty tier: ${tier}.`;
  },

  triggerVictory: () => set({ status: "victory" }),
  triggerDefeat: () => set({ status: "defeat" }),

  reset: () =>
    set({
      playerHP: MAX_HP,
      bossHP: MAX_HP,
      turn: 0,
      correctAnswers: 0,
      status: "idle",
      transcript: [],
      error: null,
      lastAgentMessage: "Prepare yourself for battle!",
      bubbleKey: 0,
      bossHitKey: 0,
      playerHitKey: 0,
      damageEvents: [],
    }),

  appendTranscript: (m) => set((s) => ({ transcript: [...s.transcript, m] })),
  setError: (e) => set({ error: e }),
  setStatus: (s) => set({ status: s }),
  setAgentMessage: (text) => {
    const decoded = text
      // Decode HTML entities for math symbols before any tag processing
      .replace(/&times;/gi, "×")
      .replace(/&divide;/gi, "÷")
      .replace(/&minus;/gi, "−")
      .replace(/&plus;/gi, "+")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&");

    const noTags = decoded
      // Rescue arithmetic operators encoded as self-closing tags e.g. <×/> → ×
      .replace(/<([+\-×÷=±√²³¼½¾])\/>/g, "$1")
      // Strip proper XML/HTML/SSML tags — only those starting with a letter or /
      // This avoids treating math expressions like "x < 3" as tags
      .replace(/<\/?[a-zA-Z][^>]*>/g, " ")
      // Fallback: strip any remaining angle-bracket sequences
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Parse HP values the agent writes in text (e.g. "Boss HP: 90/100")
    const bossMatch = noTags.match(/boss[\s_]hp:\s*(\d+)/i);
    const playerMatch = noTags.match(/player[\s_]hp:\s*(\d+)/i);
    const newBossHP = bossMatch ? parseInt(bossMatch[1], 10) : null;
    const newPlayerHP = playerMatch ? parseInt(playerMatch[1], 10) : null;

    // Strip HP readouts and structured labels so they don't appear in the bubble
    const display = noTags
      .replace(/\b(?:boss|player)[\s_]hp:\s*\d+(?:\s*\/\s*\d+)?\s*\.?/gi, "")
      .replace(/\bresult:\s*(?:correct|wrong)\s*\.?/gi, "")
      .replace(/\bdamage:\s*-?\d+\s*\.?/gi, "")
      .replace(/\bquestion:\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    set((s) => {
      const newEvents = [...s.damageEvents];
      const updates: Partial<State> = {
        lastAgentMessage: display || noTags,
        bubbleKey: s.bubbleKey + 1,
      };

      // Boss took damage
      if (newBossHP !== null && newBossHP < s.bossHP) {
        updates.bossHP = newBossHP;
        updates.bossHitKey = s.bossHitKey + 1;
        updates.correctAnswers = s.correctAnswers + 1;
        updates.turn = s.turn + 1;
        newEvents.push({ id: Date.now(), target: "boss", amount: s.bossHP - newBossHP });
      }

      // Player took damage
      if (newPlayerHP !== null && newPlayerHP < s.playerHP) {
        updates.playerHP = newPlayerHP;
        updates.playerHitKey = s.playerHitKey + 1;
        updates.turn = (updates.turn ?? s.turn) + 1;
        newEvents.push({ id: Date.now() + 1, target: "player", amount: s.playerHP - newPlayerHP });
      }

      if (newEvents.length > s.damageEvents.length) updates.damageEvents = newEvents;
      if (newBossHP !== null && newBossHP <= 0) updates.status = "victory";
      if (newPlayerHP !== null && newPlayerHP <= 0) updates.status = "defeat";

      return updates;
    });
  },
  dismissDamageEvent: (id) =>
    set((s) => ({ damageEvents: s.damageEvents.filter((e) => e.id !== id) })),
}));