import { create } from "zustand";
import { QUESTIONS, type MCQ } from "./forestQuestions";

export type ForestStatus = "idle" | "answering" | "walking" | "won";
export type ForestBubbleVariant = "intro" | "question" | "correct" | "wrong" | "victory";

type ForestState = {
  nodeIndex: number;
  keys: number;
  status: ForestStatus;
  currentQuestion: MCQ;
  lastAnswer: "correct" | "wrong" | null;
  lastAgentMessage: string;
  bubbleVariant: ForestBubbleVariant;
  bubbleKey: number;
  awaitingMove: boolean;
  pendingEvaluation: boolean;
  questionReady: boolean;
  signingMode: boolean;
  error: string | null;

  startGame: () => void;
  submitAnswer: (letter: "A" | "B" | "C" | "D") => "correct" | "wrong";
  advanceNode: () => void;
  finishWalk: () => void;
  celebrateWin: () => void;
  setAgentMessage: (text: string) => void;
  setError: (e: string | null) => void;
  setStatus: (s: ForestStatus) => void;
  setSigningMode: (v: boolean) => void;
  reset: () => void;
};

export const useForestStore = create<ForestState>((set, get) => ({
  nodeIndex: 0,
  keys: 0,
  status: "idle",
  currentQuestion: QUESTIONS[0],
  lastAnswer: null,
  lastAgentMessage: "Welcome, explorer! Press start to begin your forest adventure.",
  bubbleVariant: "intro",
  bubbleKey: 0,
  awaitingMove: false,
  pendingEvaluation: false,
  questionReady: false,
  signingMode: false,
  error: null,

  startGame: () =>
    set({
      nodeIndex: 0,
      keys: 0,
      status: "answering",
      currentQuestion: QUESTIONS[0],
      lastAnswer: null,
      lastAgentMessage: QUESTIONS[0].question,
      bubbleVariant: "question",
      bubbleKey: get().bubbleKey + 1,
      awaitingMove: false,
      error: null,
    }),

  submitAnswer: (letter) => {
    const { currentQuestion, keys, status } = get();
    if (status === "won") return "wrong";
    const isCorrect = letter === currentQuestion.answer;
    if (isCorrect) {
      set({
        keys: keys + 1,
        lastAnswer: "correct",
        awaitingMove: true,
        bubbleVariant: "correct",
        bubbleKey: get().bubbleKey + 1,
        lastAgentMessage: "You earned a Knowledge Key! Click the arrow to continue.",
      });
    } else {
      set({
        lastAnswer: "wrong",
        bubbleVariant: "wrong",
        bubbleKey: get().bubbleKey + 1,
        lastAgentMessage: `Not quite — ${currentQuestion.hint}`,
      });
    }
    return isCorrect ? "correct" : "wrong";
  },

  advanceNode: () => {
    const { nodeIndex } = get();
    const next = nodeIndex + 1;
    const isLast = next >= QUESTIONS.length;
    set({
      nodeIndex: next,
      status: "walking",
      awaitingMove: false,
      lastAnswer: null,
      lastAgentMessage: isLast ? "Almost there — the treasure awaits!" : "Walking to the next fork…",
      bubbleVariant: "correct",
      bubbleKey: get().bubbleKey + 1,
    });
  },

  finishWalk: () => {
    const { nodeIndex, status } = get();
    if (status !== "walking") return;
    if (nodeIndex >= QUESTIONS.length) {
      get().celebrateWin();
    } else {
      const q = QUESTIONS[nodeIndex];
      set({
        status: "answering",
        currentQuestion: q,
        lastAnswer: null,
        awaitingMove: false,
        bubbleVariant: "question",
        bubbleKey: get().bubbleKey + 1,
        lastAgentMessage: q.question,
      });
    }
  },

  celebrateWin: () => {
    const { keys } = get();
    let msg = "";
    if (keys >= 5) msg = keys === 7 ? "You found ALL 7 Keys! The treasure is WIDE open! You're amazing!" : "Wonderful! You found most of the keys — the treasure opens!";
    else if (keys >= 3) msg = "Great exploring! The treasure opens — here's a little review for next time.";
    else msg = "You made it to the treasure! Every explorer learns along the way. Want to try again?";
    set({
      status: "won",
      bubbleVariant: "victory",
      lastAgentMessage: msg,
      bubbleKey: get().bubbleKey + 1,
    });
  },

  setAgentMessage: (text) => {
    const clean = text.replace(/<call:[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const lower = clean.toLowerCase();
    const positive = POSITIVE_PATTERNS.some((re) => re.test(lower));
    const negative = NEGATIVE_PATTERNS.some((re) => re.test(lower));
    const hasChoices = /\bA:/i.test(clean) && /\bB:/i.test(clean);
    const hasQuestion = clean.includes("?") || hasChoices;
    set((s) => {
      const base = {
        lastAgentMessage: clean,
        bubbleVariant: inferBubbleVariant(clean, s),
        bubbleKey: s.bubbleKey + 1,
      };
      // Agent said something positive after user spoke → unlock the arrow
      const shouldUnlock =
        s.pendingEvaluation &&
        positive &&
        !negative &&
        !s.awaitingMove &&
        s.status !== "won" &&
        s.status !== "walking";
      if (shouldUnlock) {
        return {
          ...base,
          keys: s.keys + 1,
          awaitingMove: true,
          lastAnswer: "correct",
          pendingEvaluation: false,
          bubbleVariant: "correct" as ForestBubbleVariant,
        };
      }
      if (s.pendingEvaluation && negative) {
        return { ...base, pendingEvaluation: false, lastAnswer: "wrong" };
      }
      // Agent asked a question → show MCQ choices
      if (hasQuestion && s.status === "answering" && !s.awaitingMove) {
        return { ...base, questionReady: true };
      }
      return base;
    });
  },

  onUserSpoke: () => {
    const { status, questionReady } = get();
    if (status === "answering" && questionReady) {
      set({ pendingEvaluation: true });
    }
  },

  setError: (e) => set({ error: e }),
  setStatus: (s) => set({ status: s }),

  setSigningMode: (v) => set({ signingMode: v }),

  reset: () =>
    set({
      nodeIndex: 0,
      keys: 0,
      status: "idle",
      currentQuestion: QUESTIONS[0],
      lastAnswer: null,
      lastAgentMessage: "Welcome back, explorer! Press start when you're ready.",
      bubbleVariant: "intro",
      bubbleKey: get().bubbleKey + 1,
      awaitingMove: false,
      pendingEvaluation: false,
      questionReady: false,
      signingMode: false,
      error: null,
    }),
}));
