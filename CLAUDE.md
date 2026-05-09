# HackDavis 26 — Education Game Hub

3 themed mini-games for a special-education audience. Players pick a topic, pick a character, play. Built in 36 hours by a team of 3.

## Stack
- **Next.js 16** (app router, React 19) — **breaking changes from older Next.js; check `node_modules/next/dist/docs/` before assuming APIs**
- **React Three Fiber + drei + postprocessing** — 3D scenes
- **Zustand** — state (one store per game + one hub store)
- **ElevenLabs Conversational AI** (`@elevenlabs/react`) — voice agent + client tools
- **Tailwind v4** — styling
- TypeScript strict

## Hackathon rules
- **MVP first.** Hardcode liberally — levels, words, questions, character lists. Refactor later.
- **Don't over-engineer.** No premature abstractions. 3 similar things > 1 generic thing.
- **No comments unless WHY is non-obvious.** Names should explain WHAT.
- **Don't break each other's code.** Stay in your lanes (see ownership).

## Topic ↔ Game ↔ Owner

| Topic | Game | Owner |
|---|---|---|
| Math | Maze Quest (existing) | RonCodes88 |
| Reading / Spelling | Forest Path Adventure | SkennyMon |
| ASL / Sign Language | Sign Quest | cywlol |

## Ownership

| Area | Owner | Path |
|---|---|---|
| Hub UI (landing, topic, character) | RonCodes88 | `app/page.tsx`, `app/select-*/`, `app/components/hub/` |
| Maze game (Math) | RonCodes88 | `app/play/maze/`, `app/components/game/` |
| Forest game (Reading) | SkennyMon | `app/play/forest/`, `app/components/forest/`, `app/lib/forestStore.ts` |
| Sign Quest (ASL) + ML | cywlol | `app/play/sign-quest/`, `app/components/sign-quest/`, `app/lib/asl/` |
| Shared character system | RonCodes88 (interface) | `app/lib/characters.ts`, `app/components/shared/Character3D.tsx` |

## Routes

- `/` — landing splash + Start
- `/select-topic` — three topic cards
- `/select-character` — pick avatar (used across all games)
- `/play/maze` — math maze
- `/play/forest` — reading forest
- `/play/sign-quest` — ASL sign quest

## Shared contracts (don't change without team agreement)
- **`hubStore`** (`app/lib/hubStore.ts`) exposes `selectedTopic`, `selectedCharacter`, setters. Both game-owners read from it.
- **`Character3D`** (`app/components/shared/Character3D.tsx`) is the 3D avatar all games use — takes no character prop, reads from hubStore.
- **`/api/signed-url`** mints ElevenLabs WS URLs; reuse it if you wire voice into Forest or Sign Quest.

## Run

```bash
npm run dev          # http://localhost:3000
```

Required `.env.local`:
```
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
```

Maze dev shortcuts: append `?dev=1` to enable WASD + `R` to regenerate.

## Patterns to follow
- **Zustand store per game** — single source of truth; React components subscribe with selectors.
- **ElevenLabs client tools** — agent calls `useConversationClientTool('toolName', handler)`. See `app/components/game/AgentBridge.tsx` for the maze example.
- **R3F scene shape** — `<Canvas>` parent, lighting + `<Environment>`, `<Suspense>` around models, postprocessing last.
- **Routing** — `app/<route>/page.tsx`. Use `useRouter()` from `next/navigation` for client-side nav.

## Currently working
- Maze game end-to-end (voice questions, step credits, D-pad movement, win screen)
- Signed-URL auth flow

## Not yet built (see GitHub issues)
- Hub (landing, topic picker, character picker)
- Forest game (everything)
- Sign Quest game + ASL ML pipeline (everything)
- Shared `Character3D` + `hubStore`
