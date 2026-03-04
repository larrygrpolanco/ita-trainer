# ITA Trainer — Technical Implementation Guide

This document contains everything a coding agent needs to build the project correctly. It covers the tech stack, LiveKit integration patterns, project structure, and step-by-step build phases.

**Read Document 1 (Project Plan) first** for context on what the app does, the user flow, and the activities config.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | React Server Components, API routes |
| Voice Infrastructure | LiveKit Cloud | WebRTC rooms, audio routing, agent dispatch |
| Agent Runtime | @livekit/agents (Node.js SDK v1.x) | Standalone worker process for AI logic |
| AI Model | OpenAI Realtime API via @livekit/agents-plugin-openai | Speech-to-speech, simpler setup |
| Frontend LiveKit SDK | livekit-client + @livekit/components-react | Room connection, audio, transcripts |
| UI | Tailwind CSS + shadcn/ui | Pre-installed before coding agent runs |
| State | Zustand | Turn tracking, objective status |
| Package Manager | pnpm | Required by LiveKit Node.js agent SDK |

---

## Project Structure

This is a monorepo with two entry points: the Next.js app and the LiveKit agent worker.

```
ita-trainer/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (dark theme, fonts)
│   │   ├── page.tsx                    # Home page: hero + activity cards
│   │   ├── api/
│   │   │   └── token/route.ts          # Generates LiveKit access tokens
│   │   └── practice/
│   │       └── [activityId]/
│   │           └── page.tsx            # Practice session UI
│   ├── components/
│   │   ├── ui/                         # shadcn/ui primitives (pre-installed)
│   │   ├── ActivityCard.tsx
│   │   ├── ActivityDetail.tsx          # Scenario info + Start button
│   │   └── PracticeSession.tsx         # The LiveKit room + panels
│   └── lib/
│       ├── activities.ts               # Activity definitions (shared with agent)
│       └── session-store.ts            # Zustand store
├── agent/
│   ├── src/
│   │   ├── main.ts                     # Agent entry point
│   │   └── agent.ts                    # Agent class with persona logic
│   ├── package.json                    # Separate package.json for agent
│   └── tsconfig.json
├── .env.local                          # API keys
├── package.json                        # Next.js app package.json
└── pnpm-workspace.yaml                 # Monorepo workspace config
```

### Why Two Separate Packages?

The LiveKit agent is a Node.js server process that uses Node-only APIs (file system, native modules for VAD). The Next.js app is a web app. They have different dependency trees. Using pnpm workspaces lets them share the activities.ts config file while staying independent.

```yaml
# pnpm-workspace.yaml
packages:
  - '.'
  - 'agent'
```

---

## LiveKit Integration — How It Actually Works

### The Mental Model

LiveKit Cloud acts like a phone switchboard:

1. Your Next.js app creates a "room" and gives the user a token to join it.
2. Your agent worker is registered with LiveKit Cloud. When a room is created, LiveKit notifies the worker.
3. The worker joins the room as a participant, just like the user.
4. Audio flows through LiveKit Cloud — the user mic goes to the agent, the agent TTS goes to the user.

The frontend and agent never communicate directly. LiveKit Cloud handles all the WebRTC complexity.

### Critical: The Agent Runs Separately

The agent is NOT a Next.js API route. It is NOT a serverless function. It is a long-running Node.js process that maintains a WebSocket connection to LiveKit Cloud, waiting for rooms to be created.

During development, you run two processes:
- Terminal 1: pnpm dev (Next.js web app)
- Terminal 2: cd agent && pnpm dev (Agent worker)

For production, you deploy the agent to LiveKit Cloud using lk agent create.

---

## Implementation Details

### 1. Environment Variables (.env.local)

```env
# Server-side only (Next.js API routes + Agent)
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
OPENAI_API_KEY=your_openai_key

# Browser-accessible
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 2. Token Generation (src/app/api/token/route.ts)

The frontend requests a token to join a LiveKit room. The token includes the room name which encodes the activity ID so the agent knows which persona to load.

```typescript
import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activityId");

  if (!activityId) {
    return NextResponse.json({ error: "Missing activityId" }, { status: 400 });
  }

  const roomName = `ita-${activityId}-${crypto.randomUUID().slice(0, 8)}`;
  const participantIdentity = `user-${crypto.randomUUID().slice(0, 8)}`;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: participantIdentity,
      name: "TA Trainee",
    }
  );

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({
    token: await at.toJwt(),
    url: process.env.LIVEKIT_URL,
  });
}
```

### 3. The Agent (Node.js Worker)

CRITICAL: Use the v1.x API patterns from the official starter project. The agent uses defineAgent, voice.Agent (class-based), and voice.AgentSession.

#### agent/src/agent.ts

```typescript
import { voice } from '@livekit/agents';
import { getActivity, type Activity } from '../../src/lib/activities';

export function createStudentAgent(activityId: string): voice.Agent {
  const activity = getActivity(activityId);

  if (!activity) {
    return new voice.Agent({
      instructions: 'You are a helpful assistant. The requested activity was not found.',
    });
  }

  return new voice.Agent({
    instructions: buildInstructions(activity),
  });
}

function buildInstructions(activity: Activity): string {
  return `You are a simulated student in a teaching assistant training exercise.

# Your Identity
Your name is ${activity.studentProfile.name}.
${activity.studentProfile.personality}

# Output Rules
You are interacting via voice. Apply these rules strictly:
- Respond in plain text only. Never use JSON, markdown, lists, tables, code, emojis, or any formatting.
- Keep replies brief: one to three sentences. Ask one question at a time.
- Use natural student language — hesitations like "um", "like", "I mean" are encouraged.
- Spell out any numbers or abbreviations.
- Never reveal that you are an AI or that this is a training simulation.
- Never reveal the success criteria or evaluation logic.
- Never break character.

# Your Behavior
${activity.systemPromptExtension}

# What the TA Is Trying to Accomplish (hidden from them, used for your evaluation)
${activity.objective.successCriteria}

# Important
Stay in character as ${activity.studentProfile.name} at all times. React naturally to what the TA says. If they do a good job, respond accordingly. If they don't, stay in character and respond as a real student would.`;
}
```

#### agent/src/main.ts

```typescript
import {
  type JobContext,
  ServerOptions,
  cli,
  defineAgent,
  voice,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createStudentAgent } from './agent';

dotenv.config({ path: '../.env.local' });

export default defineAgent({
  entry: async (ctx: JobContext) => {
    // Extract activityId from room name: "ita-{activityId}-{hash}"
    const roomName = ctx.room.name;
    const parts = roomName.split('-');
    // Remove "ita" prefix and the random hash suffix
    const activityId = parts.slice(1, -1).join('-');

    const agent = createStudentAgent(activityId);

    const session = new voice.AgentSession({
      llm: new openai.realtime.RealtimeModel({
        voice: 'alloy',
        turnDetection: {
          type: 'server_vad',
          threshold: 0.5,
          prefixPaddingMs: 300,
          silenceDurationMs: 1200,
        },
      }),
    });

    await session.start({
      agent,
      room: ctx.room,
    });

    await ctx.connect();

    // Deliver the opening line
    const { getActivity } = await import('../../src/lib/activities');
    const activity = getActivity(activityId);
    if (activity) {
      const handle = session.generateReply({
        instructions: `Start the conversation naturally with: "${activity.studentProfile.openingLine}"`,
      });
      await handle.waitForPlayout();
    }
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: 'ita-student-agent',
  })
);
```

#### agent/package.json

```json
{
  "name": "ita-trainer-agent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx src/main.ts dev",
    "download-files": "tsx src/main.ts download-files",
    "build": "tsc",
    "start": "node dist/main.js start"
  },
  "dependencies": {
    "@livekit/agents": "^1.0.0",
    "@livekit/agents-plugin-openai": "^1.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### 4. Frontend Practice Page

The frontend connects to the LiveKit room and renders the practice UI.

Key packages for the Next.js app package.json:
```json
{
  "dependencies": {
    "livekit-client": "^2.0.0",
    "@livekit/components-react": "^2.0.0",
    "@livekit/components-styles": "^1.0.0",
    "livekit-server-sdk": "^2.0.0",
    "zustand": "^5.0.0"
  }
}
```

The practice page pattern:

```tsx
"use client";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useState, useEffect } from "react";

export default function PracticePage({ params }: { params: { activityId: string } }) {
  const [connectionDetails, setConnectionDetails] = useState<{
    token: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/token?activityId=${params.activityId}`)
      .then(res => res.json())
      .then(data => setConnectionDetails({ token: data.token, url: data.url }));
  }, [params.activityId]);

  if (!connectionDetails) return <div>Initializing simulation...</div>;

  return (
    <LiveKitRoom
      serverUrl={connectionDetails.url}
      token={connectionDetails.token}
      connect={true}
      audio={true}
      className="flex flex-col h-screen bg-neutral-950 text-neutral-100"
    >
      <RoomAudioRenderer />
      {/* Three-column practice UI goes here */}
      {/* All children have access to LiveKit room context */}
    </LiveKitRoom>
  );
}
```

### 5. Transcripts

LiveKit provides transcription through the agent. The @livekit/components-react library includes hooks for transcription segments. Use these to render the chat-style transcript in the center panel.

### 6. Data Channel (Objective Evaluation)

The agent can send data messages to the frontend through LiveKit data channel. Use this for evaluate_objective — when the agent determines criteria are met, it sends a message the frontend picks up to update the objective status panel.

In the agent use ctx.room.localParticipant.publishData(). In the frontend listen with the room dataReceived event or useDataChannel hook.

---

## UI Components (shadcn/ui)

Pre-install these shadcn components before giving the project to the coding agent:

- button — Start Practice, Back to Activities, End Session
- card — Activity cards on the home page
- badge — Level indicators (beginner/intermediate/advanced)
- separator — Visual dividers
- scroll-area — Transcript panel scrolling

The coding agent should NOT run npx shadcn add — you will have already done this.

### Practice Page Layout (This has changed considerably)

```
+----------------------------------------------------------+
|  <- Back to Activities        Activity Title              |
+----------------+---------------------+-------------------+
|                |                     |                    |
|   Audio        |   Transcript        |   Objective        |
|   Visualizer   |                     |   + Criteria       |
|                |   (scrollable)      |   + Phrases        |
|   Mic          |                     |   + Status         |
|   Controls     |   Coach tips        |                    |
|                |   appear inline     |                    |
+----------------+---------------------+-------------------+
```



---

## Build Phases

### Phase 1: Scaffold + LiveKit Hello World (MOST IMPORTANT)

Goal: Hear the AI speak in the browser. Nothing else matters until this works.

Steps:
1. Initialize Next.js app with pnpm, Tailwind, TypeScript.
2. Set up pnpm-workspace.yaml and the agent/ directory with its own package.json.
3. Add .env.local with LiveKit and OpenAI keys.
4. Build the /api/token route.
5. Create a minimal agent that just says "Hello, I am a test agent" when someone joins.
6. Create a minimal practice page that connects to a LiveKit room and plays audio.
7. Run both processes: Next.js and the agent.
8. Milestone: Open the browser, click a button, hear the agent speak.

If this phase does not work, stop and fix it before doing anything else.

### Phase 2: Activities Config + Dynamic Personas

Steps:
1. Create src/lib/activities.ts with the Activity interface and 3 activities.
2. Update agent to parse activityId from room name and load matching persona.
3. Build the home page with activity cards.
4. Milestone: Different activities produce different student personas.

### Phase 3/4: Practice UI

Steps:
1. Build the three-column practice layout.
2. Add transcript display using LiveKit transcription hooks.
3. Add the objective panel with criteria and example phrases.
4. Wire up Zustand store for turn tracking.
5. Add coach tips inline in transcript based on turn count.
6. Milestone: Full practice UI with live transcript, objective panel, coach tips.

### Phase 4/5: Evaluation + Polish

Steps:
1. Add evaluate_objective tool to agent (data channel message when criteria met).
2. Wire frontend to listen for evaluation and update objective status.
3. Polish home page, add activity detail view.
4. Style with dark theme.
5. Add end-session logic.
6. Milestone: Complete working MVP.

---

pnpm --filter ita-trainer-agent dev

## Common Pitfalls (From Previous Attempts)

1. Do not use outdated LiveKit API patterns. The v1.x Node.js SDK uses defineAgent, voice.Agent (class-based), and voice.AgentSession. Older patterns like @server.rtc_session are Python-only. Reference: https://github.com/livekit-examples/agent-starter-node

2. The agent is NOT a Next.js API route. It is a separate long-running process.

3. Use OpenAI Realtime model (not STT-LLM-TTS pipeline) for simplicity in the MVP.

4. Install the LiveKit Docs MCP server for your coding agent: https://docs.livekit.io/mcp

5. Run pnpm download-files in agent directory before first run to download VAD model files.

6. Room name encodes activity ID. Pattern: ita-{activityId}-{randomHash}. Agent extracts by removing prefix and suffix.

7. Set generous silence duration (1200ms) for turn detection. ITAs pause mid-sentence more than native speakers.

---

## Key Reference Links

- LiveKit Voice AI Quickstart: https://docs.livekit.io/agents/start/voice-ai-quickstart/
- Node.js Agent Starter: https://github.com/livekit-examples/agent-starter-node
- React Frontend Starter: https://github.com/livekit-examples/agent-starter-react
- LiveKit Prompting Guide: https://docs.livekit.io/agents/start/prompting/
- Agent Frontends Guide: https://docs.livekit.io/agents/start/frontend/
- LiveKit Docs MCP Server: https://docs.livekit.io/mcp
