import { create } from "zustand";
import { QUESTIONS, type MCQ } from "./forestQuestions";

export type ForestStatus = "idle" | "playing" | "answering" | "walking" | "won";
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
  questionReady: boolean;  // true only after agent has spoken the question aloud
  error: string | null;

  startGame: () => void;
  submitAnswer: (letter: "A" | "B" | "C" | "D") => "correct" | "wrong";
  advanceNode: () => void;
  finishWalk: () => void;
  celebrateWin: () => void;
  setAgentMessage: (text: string) => void;
  onUserSpoke: () => void;
  setError: (e: string | null) => void;
  setStatus: (s: ForestStatus) => void;
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
  error: null,

  startGame: () =>
    set({
      nodeIndex: 0,
      keys: 0,
      status: "answering",
      currentQuestion: QUESTIONS[0],
      lastAnswer: null,
      lastAgentMessage: "Here comes your first question!",
      bubbleVariant: "question",
      bubbleKey: get().bubbleKey + 1,
      awaitingMove: false,
      pendingEvaluation: false,
      questionReady: false,
      error: null,
    }),

  submitAnswer: (letter) => {
    const { nodeIndex, keys, currentQuestion, status, awaitingMove } = get();
    if (status === "won") return "wrong";
    const isCorrect = letter === currentQuestion.answer;
    if (isCorrect) {
      // awaitingMove may already be true if keyword detection fired first — don't double-count keys
      set({
        keys: awaitingMove ? keys : keys + 1,
        lastAnswer: "correct",
        awaitingMove: true,
        pendingEvaluation: false,
        bubbleVariant: "correct",
        bubbleKey: get().bubbleKey + 1,
        lastAgentMessage: "You earned a Knowledge Key! Walk down the path.",
      });
    } else {
      set({
        lastAnswer: "wrong",
        pendingEvaluation: false,
        bubbleVariant: "wrong",
        bubbleKey: get().bubbleKey + 1,
        lastAgentMessage: `Not quite — ${QUESTIONS[nodeIndex].hint}`,
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
      questionReady: false,
      pendingEvaluation: false,
      lastAnswer: null,
      lastAgentMessage: isLast ? "Almost there — the treasure awaits!" : "Great! Walking to the next fork…",
      bubbleVariant: "correct",
      bubbleKey: get().bubbleKey + 1,
    });
  },

  finishWalk: () => {
    const { nodeIndex, status } = get();
    if (status !== "walking") return;
    const isLast = nodeIndex >= QUESTIONS.length;
    if (isLast) {
      get().celebrateWin();
    } else {
      set({
        status: "answering",
        currentQuestion: QUESTIONS[nodeIndex],
        lastAnswer: null,
        awaitingMove: false,
        questionReady: false,
        pendingEvaluation: false,
        bubbleVariant: "question",
        bubbleKey: get().bubbleKey + 1,
        lastAgentMessage: "Here comes the next question!",
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
    // Agent is presenting a question when it reads choices (always says "A:" and "B:")
    // or when the message contains a literal "?". Using choices is more reliable than
    // "?" alone because some question texts end with "." (e.g. "Pick the word that rhymes…").
    const hasChoices = /\bA:/i.test(clean) && /\bB:/i.test(clean);
    const hasQuestion = clean.includes("?") || hasChoices;
    set((s) => {
      const base = {
        lastAgentMessage: clean,
        bubbleVariant: inferBubbleVariant(clean, s),
        bubbleKey: s.bubbleKey + 1,
      };
      // Agent said something positive after the user answered → unlock the arrow
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
      // Agent asked a question while in answering state → show the MCQ choices
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
      error: null,
    }),
}));

const POSITIVE_PATTERNS = [
  /\bthat'?s right\b/,
  /\bcorrect\b/,
  /\bwell done\b/,
  /\bgreat job\b/,
  /\bgood job\b/,
  /\bperfect\b/,
  /\bexcellent\b/,
  /\bwonderful\b/,
  /\bamazing\b/,
  /\bawesome\b/,
  /\byou got it\b/,
  /\byes[,!]?\s/,
  /^yes[.!,]?$/,
];

const NEGATIVE_PATTERNS = [
  /\bnot quite\b/,
  /\balmost\b/,
  /\btry again\b/,
  /\blet'?s try\b/,
  /\bgood try\b/,
  /\bnot exactly\b/,
  /\boops\b/,
  /\bhint\b/,
];

function inferBubbleVariant(text: string, state: ForestState): ForestBubbleVariant {
  if (state.status === "won") return "victory";
  const t = text.toLowerCase();
  if (POSITIVE_PATTERNS.some((re) => re.test(t))) return "correct";
  if (NEGATIVE_PATTERNS.some((re) => re.test(t))) return "wrong";
  if (t.includes("?")) return "question";
  return "question";
}
