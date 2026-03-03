Here is your new, ground-up **Concrete Implementation Plan**. 

This plan is built on a **secure, scalable LiveKit Cloud architecture**. It entirely eliminates the brittle pattern of connecting a browser directly to an AI provider. Instead, we use a proper client-server WebRTC architecture: your Next.js frontend connects to a LiveKit Room, and a secure Node.js background worker (the Agent) joins that same room to handle the AI processing.

---

# ITA Interactional Competence Trainer — Implementation Plan

## What This Is

A Next.js web application where international teaching assistants (ITAs) practice **interactional competence** through voice conversations with simulated students. Each activity targets a specific interactional skill — managing questions, checking understanding, redirecting off-topic talk — and ends when the objective is met or a turn limit is reached.

No database. No admin UI. Activities live in a TypeScript config file. Add, remove, or edit them by editing that file.

---

## The Architecture (Client-Server WebRTC)

We use a modern, decoupled voice AI architecture:
1. **The Client (Next.js)**: Requests a token, joins a LiveKit Room, captures microphone input, and renders the UI (transcripts, visualizers).
2. **The Room (LiveKit Cloud)**: Handles all WebRTC networking, audio routing, and data channels.
3. **The Worker (Node.js Agent)**: Runs on your server. It listens for newly created LiveKit rooms, joins them securely, executes the LLM logic, and speaks back into the room.

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | UI routing, React Server Components, API routes |
| Infrastructure | LiveKit Cloud | Handles STUN/TURN, WebRTC rooms, and data channels (free tier) |
| Agent Backend | `@livekit/agents` (Node.js) | A standalone worker process that manages the AI logic safely on the server |
| AI Plugin | `@livekit/agents-plugin-openai` | The specific model driver used by the LiveKit worker |
| UI Components | `@livekit/components-react` | Pre-built WebRTC hooks, audio visualizers, and room context |
| Styling & UI | Tailwind CSS + shadcn/ui | Polished, accessible component primitives |
| State | Zustand | Manages the session loop (turn tracking, coach feedback triggers) |

---

## Project Structure

We will use a monorepo setup. During development, you will run both the Next.js frontend and the Node.js Agent worker simultaneously.

```text
src/
├── app/
│   ├── layout.tsx                  # Global layout
│   ├── page.tsx                    # Home — explains the tool, lists ActivityCards
│   ├── api/token/route.ts          # Generates secure LiveKit Room Access Tokens
│   └── practice/
│       └── [activityId]/
│           └── page.tsx            # The main practice UI (LiveKitRoom provider)
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── ActivityCard.tsx            
│   └── TranscriptPanel.tsx         # Renders transcripts + injected Coach text
├── lib/
│   ├── activities.ts               # ← ALL activity definitions live here (Shared config)
│   └── session-store.ts            # Zustand store for turns & feedback
agent/
├── main.ts                         # LiveKit Agent entry point (watches for rooms)
└── agent.ts                        # Agent logic, tools, and persona setup
.env.local                          # API keys (LiveKit & LLM)
package.json                        # Uses `concurrently` to run UI + Agent
```

---

## 1. The Activities Config File

This is the single source of truth for your scenarios. It is imported by *both* the Next.js frontend (for UI display) and the Node.js agent (to configure the AI persona).

### `src/lib/activities.ts`

```typescript
export interface Activity {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  level: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  maxTurns: number;

  studentProfile: {
    name: string;
    personality: string;
    openingLine: string;
  };

  objective: {
    title: string;
    description: string;
    successCriteria: string;
    examplePhrases: string[];
  };

  systemPromptExtension: string;
  
  coachTips: {
    afterTurn: number;
    message: string;
  }[];
}

export const activities: Activity[] = [
  {
    id: "clarify-rubric",
    title: "Clarifying a Rubric",
    shortDescription: "A student visits office hours confused about partial credit.",
    fullDescription: "A freshman in your intro course comes to office hours...",
    level: "beginner",
    estimatedMinutes: 5,
    maxTurns: 12,

    studentProfile: {
      name: "Alex",
      personality: "Confused but polite freshman. Uses simple language. Will say 'I think I get it' when they understand, but might also say that prematurely.",
      openingLine: "Hi, um, I had a question about my grade on problem set 3? I got the right answer but I only got 6 out of 10 points...",
    },

    objective: {
      title: "Explain and confirm understanding",
      description: "Clearly explain how partial credit works, then check that the student genuinely understands.",
      successCriteria: "The TA has (1) explained that showing work matters, (2) given a concrete example, AND (3) asked a genuine comprehension check question.",
      examplePhrases: [
        "So the rubric is looking for...",
        "Can you walk me through what you'd do differently?",
      ],
    },

    systemPromptExtension: `
BEHAVIOR: You start confused and slightly frustrated.
- If the TA just says "you need to show your work", say "but I did... I wrote the answer."
- If the TA asks "does that make sense?" with no specificity, say "yeah I think so" even if confused.
- Do NOT volunteer that you understand unless the TA has genuinely explained well AND checked comprehension.
`,

    coachTips: [
      { afterTurn: 4, message: "💡 Tip: Try giving a concrete example of what full credit looks like." },
      { afterTurn: 8, message: "💡 Tip: You've explained well — now ask them to restate what you said." },
    ],
  },
  // Add more activities here...
];

export function getActivity(id: string): Activity | undefined {
  return activities.find((a) => a.id === id);
}
```

---

## 2. API Route: Secure Token Generation

The frontend must never have access to your private API keys. Instead, the frontend requests a temporary token to join a specifically named room.

### `src/app/api/token/route.ts`

```typescript
import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activityId");

  if (!activityId) {
    return NextResponse.json({ error: "Missing activityId" }, { status: 400 });
  }

  // Room name pattern: room-{activityId}-{randomHash}
  // This allows the backend Agent to know WHICH activity config to load when it joins.
  const roomName = `room-${activityId}-${Math.random().toString(36).substring(7)}`;
  const participantIdentity = `user-${Math.random().toString(36).substring(7)}`;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantIdentity,
      name: "TA_Trainee",
    }
  );

  // Grant permissions to join, speak, listen, and receive data channel messages
  at.addGrant({ 
    roomJoin: true, 
    room: roomName, 
    canPublish: true, 
    canSubscribe: true, 
    canPublishData: true 
  });

  return NextResponse.json({ 
    token: await at.toJwt(),
    roomName 
  });
}
```

---

## 3. The Backend Worker (Node.js Agent)

This process runs independently of the Next.js UI server. When a room is created on LiveKit Cloud, this worker gets notified, joins the room, sets up the persona, and orchestrates the AI.

### `agent/main.ts`
```typescript
import { cli, defineAgent, JobContext } from '@livekit/agents';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { setupAgent } from './agent.js';

dotenv.config({ path: '.env.local' });

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    console.log(`Agent joined room: ${ctx.room.name}`);
    
    // Extract the activityId from the room name (e.g., room-clarify-rubric-xyz)
    const roomParts = ctx.room.name.split('-');
    const activityId = roomParts.slice(1, -1).join('-'); 
    
    await setupAgent(ctx, activityId);
  },
});

// Starts the worker process
cli.runApp({ agent: fileURLToPath(import.meta.url), agentName: 'ita-student-agent' });
```

### `agent/agent.ts`
```typescript
import { JobContext, voice, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { getActivity } from '../src/lib/activities.js';

export async function setupAgent(ctx: JobContext, activityId: string) {
  const activity = getActivity(activityId);
  if (!activity) throw new Error(`Activity ${activityId} not found`);

  // 1. Setup Data Channel & Evaluation Tool
  // We use function calling so the LLM can evaluate the user silently.
  const fncCtx = new llm.FunctionContext();
  
  fncCtx.register({
    name: 'evaluate_objective',
    description: 'Evaluate whether the TA met the objective. Call this silently after each TA turn.',
    parameters: {
      type: 'object',
      properties: {
        criteria_met: { type: 'boolean', description: 'Whether ALL success criteria have been met' },
        feedback: { type: 'string', description: 'Brief internal note on TA performance' }
      },
      required: ['criteria_met', 'feedback'],
    },
    execute: async ({ criteria_met, feedback }) => {
      // Send the evaluation result back to the frontend UI via LiveKit Data Channels
      const payload = JSON.stringify({ type: 'EVALUATION', met: criteria_met, feedback });
      await ctx.room.localParticipant?.publishData(new TextEncoder().encode(payload), { reliable: true });
      return "Evaluation recorded.";
    }
  });

  // 2. Build the Persona Prompt
  const instructions = `
You are a simulated student in a teaching assistant training exercise.
ROLE: ${activity.studentProfile.name}
${activity.studentProfile.personality}

CURRENT OBJECTIVE FOR THE TA:
${activity.objective.successCriteria}

YOUR BEHAVIOR:
${activity.systemPromptExtension}

# Output Rules
- Respond in plain text only.
- Keep replies brief: 1-3 sentences. Ask one question at a time.
- Use natural student language (hesitations, "um", "like").
- Call 'evaluate_objective' after the TA speaks to assess if they met the criteria.
  `;

  // 3. Initialize the Realtime Voice Pipeline
  const session = new voice.AgentSession({
    llm: new openai.realtime.RealtimeModel({
      voice: 'alloy',
      instructions: instructions,
      turnDetection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        // ITAs (non-native speakers) often pause mid-sentence.
        // A generous silence duration prevents the agent from interrupting them.
        silence_duration_ms: 1200 
      }
    }),
    fncCtx
  });

  await session.start({ room: ctx.room });

  // 4. Trigger the opening line
  await session.generateReply({
    instructions: `Deliver your opening line naturally: "${activity.studentProfile.openingLine}"`,
  });
}
```

---

## 4. The Frontend Practice UI

The UI acts purely as a terminal to connect to the LiveKit Room. It visualizes the audio, renders transcripts, and listens for the `EVALUATION` data channel messages.

### `src/app/practice/[activityId]/page.tsx`
```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  VoiceAssistantControlBar, 
  BarVisualizer, 
  useDataChannel,
  useTrackTranscription,
  useRoomContext
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { getActivity } from "@/lib/activities";
import { useSessionStore } from "@/lib/session-store";

export default function PracticePage() {
  const { activityId } = useParams();
  const activity = getActivity(activityId as string);
  
  const [token, setToken] = useState("");
  const { objectiveMet, setObjectiveMet, incrementTurn } = useSessionStore();

  useEffect(() => {
    fetch(`/api/token?activityId=${activityId}`)
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, [activityId]);

  if (!activity) return <div>Activity not found</div>;
  if (!token) return <div className="flex h-screen items-center justify-center text-white bg-neutral-950">Initializing simulation...</div>;

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={true}
      audio={true}
      className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans"
    >
      <RoomAudioRenderer />
      
      {/* Invisible listener for Agent tool calls */}
      <AgentDataListener onObjectiveMet={() => setObjectiveMet(true)} />

      <header className="p-4 border-b border-neutral-800 flex justify-between items-center">
        <a href="/" className="text-neutral-400 hover:text-white transition-colors">← Back to Activities</a>
        <h1 className="font-semibold">{activity.title}</h1>
        <div className="w-24"></div> {/* Spacer for centering */}
      </header>

      <div className="flex flex-1 p-6 gap-6 w-full max-w-7xl mx-auto overflow-hidden">
        
        {/* LEFT: VISUALIZER & MIC CONTROLS */}
        <div className="w-1/3 flex flex-col items-center justify-center bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <div className="h-48 w-full flex items-center justify-center">
            <BarVisualizer state="speaking" barCount={7} className="h-full text-indigo-500" />
          </div>
          <p className="text-neutral-400 mt-4 mb-8 text-center text-sm">
            {activity.studentProfile.name} is connected.
          </p>
          <VoiceAssistantControlBar />
        </div>

        {/* CENTER: TRANSCRIPT & COACH TIPS */}
        <div className="w-1/3 flex flex-col bg-neutral-900 rounded-xl border border-neutral-800 p-6 overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 text-neutral-300">Transcript</h2>
          <TranscriptPanel activity={activity} onUserSpoke={incrementTurn} />
        </div>

        {/* RIGHT: OBJECTIVE TRACKING */}
        <div className="w-1/3 flex flex-col bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <h2 className="text-lg font-semibold mb-2">Objective</h2>
          <p className="text-sm text-neutral-400 mb-6">{activity.objective.description}</p>
          
          <div className={`p-4 rounded-lg border transition-colors ${
            objectiveMet ? 'bg-green-900/20 border-green-500 text-green-400' 
                         : 'bg-neutral-800 border-neutral-700'
          }`}>
            {objectiveMet ? "✅ Success Criteria Met!" : "⏳ In Progress..."}
          </div>

          <h3 className="text-sm font-semibold mt-8 mb-3 text-neutral-300">Example Phrases</h3>
          <ul className="text-sm text-neutral-500 space-y-3">
            {activity.objective.examplePhrases.map((phrase, i) => (
              <li key={i} className="pl-3 border-l-2 border-indigo-500/30">"{phrase}"</li>
            ))}
          </ul>
        </div>
      </div>
    </LiveKitRoom>
  );
}

// ---------------------------
// Sub-components
// ---------------------------

function AgentDataListener({ onObjectiveMet }: { onObjectiveMet: () => void }) {
  useDataChannel((msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === 'EVALUATION' && data.met) {
        onObjectiveMet();
      }
    } catch (e) { /* ignore */ }
  });
  return null;
}

function TranscriptPanel({ activity, onUserSpoke }: { activity: any, onUserSpoke: () => void }) {
  const room = useRoomContext();
  const transcripts = useTrackTranscription({ publication: true, source: Track.Source.Microphone, room });
  const { turnCount } = useSessionStore();

  // Trigger turn increment when user finishes a spoken segment
  useEffect(() => {
    const latestSegment = transcripts.segments[transcripts.segments.length - 1];
    if (latestSegment && latestSegment.isLocal && latestSegment.final) {
      onUserSpoke();
    }
  }, [transcripts.segments, onUserSpoke]);

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
      {transcripts.segments.map((segment) => (
        <div key={segment.id} className={`flex flex-col ${segment.isLocal ? 'items-end' : 'items-start'}`}>
          <span className="text-xs text-neutral-500 mb-1">{segment.isLocal ? 'You' : activity.studentProfile.name}</span>
          <div className={`px-4 py-2 rounded-lg text-sm max-w-[85%] ${
            segment.isLocal ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-200'
          }`}>
            {segment.text}
          </div>
        </div>
      ))}

      {/* Inject Coach Tips inline based on turn count */}
      {activity.coachTips.map((tip: any) => {
        if (turnCount >= tip.afterTurn) {
          return (
            <div key={tip.afterTurn} className="flex flex-col items-center my-4">
              <div className="px-4 py-2 rounded-lg text-sm bg-amber-900/30 border border-amber-700/50 text-amber-200 text-center max-w-[90%]">
                {tip.message}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
```

---

## 5. Session State Store (Zustand)

Keeps track of local UI logic (like turns and objectives) without over-complicating React component trees.

### `src/lib/session-store.ts`
```typescript
import { create } from "zustand";

interface SessionState {
  turnCount: number;
  objectiveMet: boolean;
  incrementTurn: () => void;
  setObjectiveMet: (met: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  turnCount: 0,
  objectiveMet: false,
  incrementTurn: () => set((s) => ({ turnCount: s.turnCount + 1 })),
  setObjectiveMet: (met) => set({ objectiveMet: met }),
  reset: () => set({ turnCount: 0, objectiveMet: false }),
}));
```

---

## 6. Environment & Package Setup

### `package.json` setup
We use `concurrently` so a single `npm run dev` boots both the web app and the Node worker.

```json
{
  "name": "ita-trainer",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev:next": "next dev",
    "dev:agent": "tsx agent/main.ts dev",
    "dev": "concurrently -c \"cyan,magenta\" \"npm run dev:next\" \"npm run dev:agent\"",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@livekit/agents": "^1.x",
    "@livekit/agents-plugin-openai": "^1.x",
    "@livekit/components-react": "latest",
    "@livekit/components-styles": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "dotenv": "^16.4.5",
    "livekit-client": "latest",
    "livekit-server-sdk": "latest",
    "lucide-react": "latest",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.2.1",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "concurrently": "^8.2.2",
    "tailwindcss": "^3.4.1",
    "tsx": "^4.7.1",
    "typescript": "^5"
  }
}
```

### `.env.local`
You need a free account at [LiveKit Cloud](https://cloud.livekit.io/) to get your keys.
```env
# Shared securely on the server (Next.js API & Node.js Agent)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
OPENAI_API_KEY=your_llm_api_key

# Exposed to Next.js Browser Client
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

---

## Build Phases

### Phase 1: Foundation & "Hello World" (Day 1)
1. Initialize Next.js app, install dependencies, and configure `package.json` scripts.
2. Add `.env.local` with LiveKit and LLM keys.
3. Build the `/api/token` route.
4. Create minimal `agent/main.ts` and `agent/agent.ts` with a hardcoded persona.
5. Build a skeleton `practice/[activityId]/page.tsx` just to render `<LiveKitRoom>` and check the mic.
6. **Milestone**: Run `npm run dev`. Connect to the room via browser, see the Node worker log that it joined, and hear the AI say "Hello".

### Phase 2: Configuration & Activities (Day 2)
1. Create `activities.ts` and paste in the 3 base activities.
2. Update `agent.ts` to parse the `activityId` from the room name and dynamically inject the Persona instructions.
3. **Milestone**: Navigating to `/practice/clarify-rubric` results in a confused student, while `/practice/redirect-question` results in an off-topic student. 

### Phase 3: Evaluation Tools & UI Data Binding (Day 3)
1. Add the `evaluate_objective` tool to the agent's `FunctionContext`.
2. Send data channel messages from the Agent when the tool fires.
3. Create the `AgentDataListener` in the frontend to catch the evaluation events.
4. Integrate the Zustand `session-store.ts`.
5. **Milestone**: The "Objective" UI panel flips to "✅ Success Criteria Met!" automatically when you successfully explain the rubric.

### Phase 4: Polish & Transcripts (Day 4)
1. Build the `TranscriptPanel` using LiveKit's `useTrackTranscription`.
2. Wire the transcript finalization event to the Zustand `incrementTurn` action.
3. Inject the `coachTips` into the transcript UI conditionally based on turn count.
4. Finalize Tailwind styling (dark mode, layout, visualizer).
5. Build the Home page (`page.tsx`) with Activity Cards linking to the practice routes.
6. **Milestone**: Full application complete, polished, and ready for user testing.