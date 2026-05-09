# Maze Quest — Voice-Controlled 3D Adventure

A cute bear navigates a 3D maze. The ElevenLabs agent asks math questions out loud; every correct answer steps the bear one cell toward the glowing portal.

The agent drives the game via three **client tools** — when it decides the player got the answer right, it calls `moveCharacter` and the React Three Fiber scene tweens the bear forward.

## What it shows off
- **ElevenLabs Conversational AI** — full-duplex voice, ~75 ms turn-taking
- **Client tools** (`useConversationClientTool`) — agent triggers UI/game actions in real time
- **Signed-URL auth** — API key stays server-side
- **3D scene** — React Three Fiber + drei, postprocessing bloom, Sparkles, animated character
- **Voice → state → animation** — `gameStore` (Zustand) is single source of truth shared by tools, R3F frames, and HUD

## Setup

### 1. Configure the agent in the ElevenLabs dashboard

Open your agent (`agent_3001kr5n…`) at https://elevenlabs.io/app/conversational-ai

**System prompt** (tuned for a special-education audience — warm, slow, very encouraging):

```
You are Professor Bear, a kind and patient friend cheering on a player who is guiding a cute bear adventurer through a magical glowing maze. The player may need extra time, simple words, and lots of encouragement. Be warm, slow, and supportive — never frustrated.

GAMEPLAY LOOP — IMPORTANT:
The player earns "step tokens" by answering correctly, and THE PLAYER picks the direction by pressing an arrow button on screen. You do NOT pick the direction. You only:
- Ask a question.
- Reward a correct answer by calling `moveCharacter` (which gives the player 1 step token).
- Wait while the player walks; then ask the next question.

EACH TURN:
1. Call `getPerception` to know the bear's surroundings (and the current step_credits).
2. Ask exactly ONE short, simple math question. Use small numbers (1–20). Examples: "What is 3 plus 5?" or "How many is 4 plus 2?" Keep your reply under 12 words.
3. If they answer CORRECTLY:
   - Cheer warmly: "Yes!" or "Beautiful!" or "You got it!"
   - Call `moveCharacter` (no direction needed) to grant them a step token.
   - Then say something like: "Now press an arrow to take your step!"
   - Wait for them to move before asking the next question.
4. If they answer WRONG or seem unsure:
   - Be gentle: "That's okay, friend." or "Almost! Let's try together." or "Good try!"
   - Give a tiny hint, then re-ask the SAME question. Do NOT call `moveCharacter`.
5. When `getPerception` shows AT_GOAL, call `celebrateWin` and cheer "We did it! Hooray!"

TOOL RESPONSE HANDLING:
- `moveCharacter` returns "step_granted" → cheer them on and ask them to use the arrows.
- `moveCharacter` returns "step_already_pending" → just remind them: "You still have a step waiting — pick an arrow!" Do not ask a new question yet.
- Trust `getPerception` for walls and goal status; never invent layout.

VOICE:
- Praise effort, not just correctness. Keep voice cheerful and slow.
- Begin with a 1-sentence warm greeting (use "friend" or "buddy"), then call `getPerception` and ask the first question.
- Never read tool names or numbers in parentheses aloud.
```

**Add three Client Tools** (in the agent's Tools section — make sure names match exactly):

| Name | Description | Parameters |
|---|---|---|
| `getPerception` | Returns the bear's position, the goal position, and whether each direction is open or wall. Call this every turn before deciding which way to move. | (none) |
| `moveCharacter` | Reward a correct answer by giving the player one **step token**. The player then picks the direction with on-screen arrows. Returns `step_granted` (player now has a step to take) or `step_already_pending` (they haven't taken their previous step yet). The `direction` parameter is accepted for backwards compatibility but ignored. | `direction` (string, optional, ignored) |
| `celebrateWin` | Trigger the on-screen victory animation. Call only after `moveCharacter` returns `goal_reached`. | (none) |

For each tool, leave "Wait for response" enabled so the agent receives the result before its next utterance.

### 2. Credentials
`.env.local` is already set:
```
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
```

### 3. Run

The app is two processes: a FastAPI backend that mints signed ElevenLabs URLs,
and the Next.js frontend. Run each in its own terminal.

**Backend** (first time):
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
On subsequent runs, just activate the venv and run `uvicorn`.

**Frontend**:
```bash
npm run dev
```

Open http://localhost:3000, click **Start Quest**, allow mic access, answer questions, watch the bear walk.

The frontend's `/api/*` calls are proxied to the backend via a rewrite in
`next.config.ts` (override the target with `BACKEND_URL=...` when starting `npm run dev`).

## Dev affordances

- `?dev=1` query string enables WASD/arrow-key movement + `R` to regenerate the maze. Useful for verifying the scene before voice is wired.
- "New Maze" button in the HUD generates a new random seed.

## Files
- `app/page.tsx` — entry, mounts `MazeGame`
- `app/components/MazeGame.tsx` — `ConversationProvider`, R3F `<Canvas>`, lighting, postprocessing
- `app/components/game/Maze.tsx` — wall + floor geometry from `gameStore.maze`
- `app/components/game/Character.tsx` — primitive bear with procedural walk cycle
- `app/components/game/CameraRig.tsx` — third-person follow camera (lerped)
- `app/components/game/Goal.tsx` — glowing emissive portal + Sparkles
- `app/components/game/HUD.tsx` — overlay UI: transcript, status pill, start/end buttons
- `app/components/game/AgentBridge.tsx` — registers the three client tools
- `app/components/game/KeyboardDevControls.tsx` — `?dev=1` keyboard shortcuts
- `app/lib/maze.ts` — recursive-backtracker maze gen + direction math
- `app/lib/gameStore.ts` — Zustand store
- `backend/main.py` — FastAPI service; `/api/signed-url` mints the signed WS URL using the server-side API key
- `next.config.ts` — rewrites `/api/*` to the FastAPI backend (default `http://localhost:8000`)

## Extension ideas (if you want to push further)
- **Character upgrade**: drop a Quaternius CC0 bear GLB into `public/models/bear.glb` and swap `Character.tsx` to `useGLTF` + `useAnimations` (the existing primitive bear acts as a pre-built fallback).
- **Multi-agent transfer**: at level 5, hand off to a "Boss Battle" agent with a different voice for harder questions.
- **Topic dynamic variable**: pass `{topic: 'spanish'}` at session start; agent switches from math to vocab.
- **Sound effects**: pre-generate level-up + step jingles via the ElevenLabs Sound Effects API; play on `moved`/`goal_reached`.
- **Post-call analysis**: define evaluation criteria on the agent (e.g. "answers per minute") for an end-of-run scorecard.
