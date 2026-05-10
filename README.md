# V↑ Conversational and Gamified Learning Platform

**HackDavis 2026** | Social Good Track

An accessible education platform that uses voice-driven AI conversations to teach math, reading, and ASL through immersive 3D mini-games. Built for neurodivergent kids, kids with limb differences, and Deaf ASL learners.

---

## The Problem

Traditional educational software relies heavily on keyboard/mouse input and text-heavy interfaces, creating barriers for children with motor differences, learning disabilities, or who communicate through sign language. These kids deserve learning tools that meet them where they are.

## Our Solution

V is a web-based game hub where children pick a topic, choose an animated buddy, and play through voice-first 3D games. An AI companion (powered by ElevenLabs Conversational AI) guides them through each challenge using natural speech -- asking questions, giving hints, and celebrating correct answers out loud. No typing required.

---

## Games

### Boss Battle (Math)
A dark-arena boss fight where players solve math problems to deal damage. The AI companion narrates the battle, poses questions ranging from arithmetic to calculus, and reacts to each answer. Players can draw solutions on a built-in whiteboard that gets graded by Gemini vision.

### Word Adventure (Reading / Spelling + ASL)
A forest path journey where players answer multiple-choice reading and spelling questions to collect Knowledge Keys and advance through zones. Includes an ASL signing overlay that uses the device camera and a computer vision model to recognize hand-signed letters, letting players fingerspell words as part of the challenge.

### Maze Quest (Explore / Science)
A procedurally generated hedge maze with fog and atmospheric lighting. The AI asks science trivia -- each correct answer earns a step. Players navigate with a D-pad to reach the goal.

---

## How It Works

1. **Landing page** -- dark cinematic hub UI with topic selection
2. **Pick a topic** -- Math, ASL, or Explore
3. **Pick a buddy** -- Brave Bear, Clever Fox, Helper Robot, or Curious Cat (animated 3D characters via GLB models)
4. **Play** -- the AI companion speaks through the entire game session, adapting its personality to the chosen character

All interaction happens through voice. The AI asks a question, the child answers by speaking, and the game responds instantly -- unlocking a maze step, dealing boss damage, or advancing along the forest path.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| 3D Rendering | React Three Fiber, drei, Three.js |
| Post-processing | @react-three/postprocessing |
| Voice AI | ElevenLabs Conversational AI (`@elevenlabs/react`) |
| Vision Grading | Google Gemini (handwriting recognition for math whiteboard) |
| State Management | Zustand (one store per game + hub store) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict) |

---

## Architecture

```
app/
  page.tsx                  Landing page
  select-topic/             Topic picker (Math / ASL / Explore)
  select-character/         Character picker (Bear / Fox / Robot / Cat)
  play/
    boss/                   Math boss battle game
    adventure/              Reading + ASL forest adventure
    maze/                   Science maze quest
  components/
    boss/                   Boss game UI, 3D arena, drawing pad, HUD
    forest/                 Forest game scene, path, ASL overlay, HUD
    game/                   Maze game components, agent bridge
    hub/                    Hub UI, character preview
    shared/                 Shared 3D character component
  lib/
    hubStore.ts             Global topic + character state
    bossStore.ts            Boss battle state
    forestStore.ts          Forest adventure state
    gameStore.ts            Maze quest state
    characters.ts           Character definitions
    *Questions.ts           Question banks per game
    *AgentPersona.ts        AI companion personality per game
  api/
    signed-url/             ElevenLabs WebSocket auth
    grade-drawing/          Gemini vision math grading
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Environment Variables

Create a `.env.local` file:

```
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
HACKDAVIS_GEMINI_API_KEY=...
```

### Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Team

| Name | Role |
|---|---|
| Ronald Li ([@RonCodes88](https://github.com/RonCodes88)) | Hub UI, Maze Quest, Boss Battle, shared systems |
| Forest ([@SkennyMon](https://github.com/SkennyMon)) | Forest Path Adventure, reading/spelling game |
| Cindy ([@cywlol](https://github.com/cywlol)) | ASL Sign Quest, computer vision pipeline |

---

## Built At

HackDavis 2026 -- May 10-11, 2026

**Track:** Social Good

**Theme:** Accessible education for children with disabilities
