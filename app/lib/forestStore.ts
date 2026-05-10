import { create } from "zustand";
import { QUESTIONS, type MCQ } from "./forestQuestions";

export type ForestStatus = "idle" | "answering" | "walking" | "won";

type ForestState = {
  nodeIndex: number;
  keys: number;
  status: ForestStatus;
  currentQuestion: MCQ;
  stepCredits: number;
  lastAgentMessage: string;
  awaitingEval: boolean;
  signingMode: boolean;
  error: string | null;

  startGame: () => void;
  submitAnswer: (letter: "A" | "B" | "C" | "D") => "correct" | "wrong";
  walkForward: () => boolean;
  finishWalk: () => void;
  celebrateWin: () => void;
  setAgentMessage: (text: string) => void;
  onUserSpoke: () => void;
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
  stepCredits: 0,
  lastAgentMessage: "",
  awaitingEval: false,
  signingMode: false,
  error: null,

  startGame: () =>
    set({
      nodeIndex: 0,
      keys: 0,
      status: "answering",
      currentQuestion: QUESTIONS[0],
      stepCredits: 0,
      lastAgentMessage: "",
      awaitingEval: false,
      error: null,
    }),

  submitAnswer: (letter) => {
    const { currentQuestion, keys, status } = get();
    if (status !== "answering") return "wrong";
    if (letter === currentQuestion.answer) {
      set({ keys: keys + 1, stepCredits: 1, awaitingEval: false });
      return "correct";
    }
    return "wrong";
  },

  walkForward: () => {
    const { stepCredits, status, nodeIndex } = get();
    if (status !== "answering" || stepCredits <= 0) return false;
    const next = nodeIndex + 1;
    set({ nodeIndex: next, status: "walking", stepCredits: 0 });
    return true;
  },

  finishWalk: () => {
    const { nodeIndex, status } = get();
    if (status !== "walking") return;
    if (nodeIndex >= QUESTIONS.length) {
      get().celebrateWin();
    } else {
      set({
        status: "answering",
        currentQuestion: QUESTIONS[nodeIndex],
        awaitingEval: false,
      });
    }
  },

  celebrateWin: () => {
    const { keys } = get();
    const msg =
      keys === 7
        ? "You found ALL 7 Keys! The treasure is WIDE open!"
        : keys >= 5
          ? "Wonderful! You found most of the keys — the treasure opens!"
          : keys >= 3
            ? "Great exploring! The treasure opens!"
            : "You made it to the treasure! Every explorer learns along the way.";
    set({ status: "won", lastAgentMessage: msg });
  },

  setAgentMessage: (text) => {
    const clean = text.replace(/<call:[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!clean) return;
    const { status, stepCredits, keys, awaitingEval } = get();
    // Credit already granted — ignore all agent speech until player walks
    if (stepCredits > 0) return;
    if (status === "walking") return;
    if (
      awaitingEval &&
      status === "answering" &&
      isPositive(clean) &&
      !isNegative(clean)
    ) {
      set({ lastAgentMessage: clean, keys: keys + 1, stepCredits: 1, awaitingEval: false });
      return;
    }
    if (awaitingEval && isNegative(clean)) {
      set({ lastAgentMessage: clean, awaitingEval: false });
      return;
    }
    set({ lastAgentMessage: clean });
  },

  onUserSpoke: () => {
    const { status, stepCredits } = get();
    if (status === "answering" && stepCredits === 0) {
      set({ awaitingEval: true });
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
      stepCredits: 0,
      lastAgentMessage: "",
      awaitingEval: false,
      signingMode: false,
      error: null,
    }),
}));

const POSITIVE = [
  /\bthat'?s right\b/, /\bcorrect\b/, /\byes\b/, /\bwell done\b/,
  /\bgreat job\b/, /\bgood job\b/, /\bperfect\b/, /\bexcellent\b/,
  /\byou got it\b/, /\bexactly\b/, /\bwonderful\b/, /\bamazing\b/,
];
const NEGATIVE = [
  /\bnot quite\b/, /\balmost\b/, /\btry again\b/, /\blet'?s try\b/,
  /\boops\b/, /\bgood try\b/, /\bnot exactly\b/,
];
function isPositive(t: string) { return POSITIVE.some((r) => r.test(t.toLowerCase())); }
function isNegative(t: string) { return NEGATIVE.some((r) => r.test(t.toLowerCase())); }
