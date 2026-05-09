import { create } from "zustand";
import {
  type Direction,
  type Facing,
  type Maze,
  generateMaze,
  isOpen,
  resolveDirection,
  step,
} from "./maze";

export type Status = "idle" | "playing" | "moving" | "won";

export type BubbleVariant =
  | "intro"
  | "question"
  | "encouragement"
  | "celebration"
  | "victory";

export type Perception = {
  forward: "open" | "wall";
  left: "open" | "wall";
  right: "open" | "wall";
  back: "open" | "wall";
  atGoal: boolean;
  pos: { x: number; y: number };
  goal: { x: number; y: number };
};

export type Transcript = {
  role: "user" | "ai";
  text: string;
  ts: number;
}[];

export type MoveResult =
  | "moved"
  | "blocked"
  | "goal_reached"
  | "no_credit"
  | "wait_for_user_answer";

type State = {
  maze: Maze;
  pos: { x: number; y: number };
  facing: Facing;
  status: Status;
  transcript: Transcript;
  error: string | null;
  seed: number;
  size: number;

  // bubble state
  lastAgentMessage: string;
  bubbleVariant: BubbleVariant;
  bubbleKey: number; // bumps each time a new message arrives, so animations re-trigger

  // move lock — true after step is granted; cleared when user speaks
  awaitingAnswer: boolean;

  // user just spoke/typed — next agent reply gets keyword-evaluated for grant
  pendingEvaluation: boolean;

  // step credits — earned by answering correctly, spent by player to move
  stepCredits: number;

  // actions
  perception: () => Perception;
  /** Agent grants the player a step token. Returns the new credit count. */
  grantStep: () => number;
  /** Player spends one step credit to move 1 cell. Returns blocked/no-credit/moved/goal. */
  playerMove: (dir: Direction) => MoveResult;
  finishMove: () => void;
  celebrate: () => void;
  reset: (opts?: { seed?: number; size?: number }) => void;
  appendTranscript: (m: Transcript[number]) => void;
  setError: (e: string | null) => void;
  setStatus: (s: Status) => void;
  setAgentMessage: (text: string, variant?: BubbleVariant) => void;
  onUserSpoke: () => void;
  setBubble: (variant: BubbleVariant, text?: string) => void;
};

const DEFAULT_SIZE = 5;
const DEFAULT_SEED = 7;

function freshMaze(size: number, seed: number) {
  const maze = generateMaze(size, size, seed);
  // Pick an initial facing that points at an OPEN corridor (never a wall),
  // so the bear starts looking down the path instead of into a wall.
  const startCell = maze.cells[maze.start.y][maze.start.x];
  const facing: Facing = !startCell.walls.e
    ? "e"
    : !startCell.walls.s
      ? "s"
      : !startCell.walls.n
        ? "n"
        : "w";
  return {
    maze,
    pos: { ...maze.start },
    facing,
    status: "idle" as Status,
  };
}

export const useGameStore = create<State>((set, get) => ({
  ...freshMaze(DEFAULT_SIZE, DEFAULT_SEED),
  transcript: [],
  error: null,
  seed: DEFAULT_SEED,
  size: DEFAULT_SIZE,
  lastAgentMessage:
    "Hi friend! Press start when you're ready for our maze adventure.",
  bubbleVariant: "intro",
  bubbleKey: 0,
  awaitingAnswer: false,
  pendingEvaluation: false,
  stepCredits: 0,

  perception: () => {
    const { maze, pos, facing } = get();
    const fwd = resolveDirection(facing, "forward");
    const lft = resolveDirection(facing, "left");
    const rgt = resolveDirection(facing, "right");
    const bck = resolveDirection(facing, "back");
    return {
      forward: isOpen(maze, pos.x, pos.y, fwd) ? "open" : "wall",
      left: isOpen(maze, pos.x, pos.y, lft) ? "open" : "wall",
      right: isOpen(maze, pos.x, pos.y, rgt) ? "open" : "wall",
      back: isOpen(maze, pos.x, pos.y, bck) ? "open" : "wall",
      atGoal: pos.x === maze.goal.x && pos.y === maze.goal.y,
      pos: { ...pos },
      goal: { ...maze.goal },
    };
  },

  grantStep: () => {
    const { status, awaitingAnswer, stepCredits } = get();
    if (status === "won") return stepCredits;
    if (awaitingAnswer) return stepCredits; // already granted; wait for player
    const next = Math.min(1, stepCredits + 1); // cap at 1 to keep loop tight
    set({
      stepCredits: next,
      awaitingAnswer: true,
      bubbleVariant: "celebration",
      lastAgentMessage: "Yes! Pick an arrow to take a step.",
      bubbleKey: get().bubbleKey + 1,
    });
    return next;
  },

  playerMove: (dir) => {
    const { maze, pos, facing, status, stepCredits } = get();
    if (status === "won" || status === "moving") return "blocked";
    if (stepCredits <= 0) return "no_credit";
    const newFacing = resolveDirection(facing, dir);
    if (!isOpen(maze, pos.x, pos.y, newFacing)) return "blocked";
    const next = step(pos, newFacing);
    const reachedGoal =
      next.x === maze.goal.x && next.y === maze.goal.y;
    set({
      pos: next,
      facing: newFacing,
      status: reachedGoal ? "won" : "moving",
      stepCredits: stepCredits - 1,
      bubbleVariant: reachedGoal ? "victory" : "celebration",
      lastAgentMessage: reachedGoal
        ? "🏆 You did it! Hooray!"
        : "Nice step!",
      bubbleKey: get().bubbleKey + 1,
    });
    return reachedGoal ? "goal_reached" : "moved";
  },

  finishMove: () => {
    const { status } = get();
    if (status === "moving") set({ status: "playing" });
  },

  celebrate: () =>
    set({
      status: "won",
      bubbleVariant: "victory",
      lastAgentMessage: "🏆 We did it! Hooray!",
      bubbleKey: get().bubbleKey + 1,
    }),

  reset: (opts) => {
    const seed = opts?.seed ?? Math.floor(Math.random() * 1e9);
    const size = opts?.size ?? get().size;
    set({
      ...freshMaze(size, seed),
      transcript: [],
      error: null,
      seed,
      size,
      lastAgentMessage:
        "New maze, new adventure! Listen for your first question.",
      bubbleVariant: "intro",
      bubbleKey: get().bubbleKey + 1,
      awaitingAnswer: false,
      pendingEvaluation: false,
      stepCredits: 0,
    });
  },

  appendTranscript: (m) =>
    set((s) => ({ transcript: [...s.transcript, m] })),
  setError: (e) => set({ error: e }),
  setStatus: (s) => set({ status: s }),
  setAgentMessage: (text, variant) => {
    const clean = text.replace(/<call:[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const lower = clean.toLowerCase();
    const positive = POSITIVE_PATTERNS.some((re) => re.test(lower));
    const negative = NEGATIVE_PATTERNS.some((re) => re.test(lower));
    set((s) => {
      const base = {
        lastAgentMessage: clean,
        bubbleVariant: variant ?? inferVariant(clean, s),
        bubbleKey: s.bubbleKey + 1,
      };
      const shouldGrant =
        s.pendingEvaluation &&
        positive &&
        !negative &&
        !s.awaitingAnswer &&
        s.stepCredits === 0 &&
        s.status !== "won";
      if (shouldGrant) {
        return {
          ...base,
          stepCredits: 1,
          awaitingAnswer: true,
          pendingEvaluation: false,
          bubbleVariant: "celebration",
        };
      }
      if (s.pendingEvaluation && negative) {
        return { ...base, pendingEvaluation: false };
      }
      return base;
    });
  },
  setBubble: (variant, text) =>
    set((s) => ({
      bubbleVariant: variant,
      lastAgentMessage: text ?? s.lastAgentMessage,
      bubbleKey: s.bubbleKey + 1,
    })),
  onUserSpoke: () => set({ awaitingAnswer: false, pendingEvaluation: true }),
}));

const POSITIVE_PATTERNS = [
  /\bthat'?s right\b/,
  /\bcorrect\b/,
  /\byes\b/,
  /\bwell done\b/,
  /\bgreat (job|work)\b/,
  /\bgood (job|work)\b/,
  /\bnice (job|work|one)\b/,
  /\bwonderful\b/,
  /\bperfect\b/,
  /\bexcellent\b/,
  /\bamazing\b/,
  /\bawesome\b/,
  /\byou (got it|did it)\b/,
  /\bbravo\b/,
  /\bexactly\b/,
];

const NEGATIVE_PATTERNS = [
  /\bnot quite\b/,
  /\balmost\b/,
  /\btry again\b/,
  /\blet'?s try\b/,
  /\bclose\b/,
  /\boops\b/,
  /\bthat'?s okay\b/,
  /\bnot exactly\b/,
  /\bgood try\b/,
];

function inferVariant(text: string, state: State): BubbleVariant {
  if (state.status === "won") return "victory";
  // After a successful move the next agent line is usually praise or next question.
  if (state.status === "moving") return "celebration";
  // Heuristic: agent encouragement after wrong answer often starts with these.
  const t = text.toLowerCase();
  if (
    t.startsWith("almost") ||
    t.startsWith("not quite") ||
    t.startsWith("close") ||
    t.startsWith("good try") ||
    t.startsWith("that's okay") ||
    t.startsWith("its okay") ||
    t.startsWith("oops") ||
    t.includes("try again") ||
    t.includes("let's try")
  ) {
    return "encouragement";
  }
  if (t.includes("?")) return "question";
  return "question";
}
