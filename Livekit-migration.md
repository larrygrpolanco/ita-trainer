
---

# ITA Interactional Competence Trainer — LiveKit Implementation Plan

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | UI, shadcn components, API route for token generation |
| Infrastructure | LiveKit Cloud | Free tier handles all WebRTC routing/servers |
| Agent Backend | `@livekit/agents` (Node.js) | Background worker that joins the room to run the AI |
| AI Model | OpenAI Realtime API | Native speech-to-speech via `@livekit/agents-plugin-openai` |
| UI Components | `@livekit/components-react` | Pre-built audio visualizers and room connection hooks |
| State | React state + zustand | Manages session progression based on Agent data channels |

---

## Project Structure

Everything lives in one repository. In development, you'll use `concurrently` to spin up both the Next.js frontend and the Node.js Agent process simultaneously.

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Home — activity cards
│   ├── api/token/route.ts          # Generates LiveKit Room Access Token
│   └── practice/
│       └── [activityId]/
│           └── page.tsx            # LiveKit Room Provider + UI
├── components/
│   ├── ui/                         # shadcn components
│   ├── ActivityCard.tsx
│   └── TranscriptPanel.tsx         # Renders LiveKit transcript hooks
├── lib/
│   ├── activities.ts               # ← ALL activity definitions live here
│   └── session-store.ts            # Zustand store
agent/
├── main.ts                         # LiveKit Agent entry point
└── agent.ts                        # Agent logic, tools, and OpenAI connection
.env.local                          # LIVEKIT & OPENAI Keys
package.json                        # Uses `concurrently` to run UI and Agent together
```

---

## 1. The Activities Config File

This remains your single source of truth. Everything that varies per activity goes here.

### `src/lib/activities.ts`
*(This is identical to your original plan, just making sure both the Next.js app and the Node Agent import it.)*

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
    afterTurn?: number;
    message: string;
  }[];
}

export const activities: Activity[] = [
  {
    id: "clarify-rubric",
    title: "Clarifying a Rubric",
    shortDescription: "A student visits office hours confused about partial credit.",
    // ... [Rest of your activity details from the original plan]
    studentProfile: {
      name: "Alex",
      personality: "Confused but polite freshman...",
      openingLine: "Hi, um, I had a question about my grade on problem set 3...",
    },
    objective: {
      title: "Explain and confirm understanding",
      description: "Clearly explain how partial credit works...",
      successCriteria: "The TA has (1) explained showing work matters...",
      examplePhrases: ["So the rubric is looking for..."],
    },
    systemPromptExtension: "BEHAVIOR: You start confused and slightly frustrated...",
    coachTips: [
      { afterTurn: 4, message: "💡 Tip: Try giving a concrete example..." }
    ]
  },
  // ... other activities (redirect-question, positive-assessment)
];

export function getActivity(id: string): Activity | undefined {
  return activities.find((a) => a.id === id);
}
```

---

## 2. API Route: LiveKit Token Generation

Instead of an OpenAI ephemeral key, the Next.js app generates a LiveKit Access Token. We dynamically embed the `activityId` into the room name so the backend Agent knows *which* persona to load when it joins.

### `src/app/api/token/route.ts`

```typescript
import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activityId = searchParams.get("activityId");
  const participantName = "TA_Trainee";

  if (!activityId) {
    return NextResponse.json({ error: "Missing activityId" }, { status: 400 });
  }

  // Room name pattern: room-{activityId}-{randomHash}
  // The backend Agent will parse this to load the correct prompt.
  const roomName = `room-${activityId}-${Math.random().toString(36).substring(7)}`;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: `user-${Math.random().toString(36).substring(7)}`,
      name: participantName,
    }
  );

  // Grant permissions to join the room and publish/subscribe to audio and data channels
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });

  return NextResponse.json({ 
    token: await at.toJwt(),
    roomName 
  });
}
```

---

## 3. The Backend Agent (Node.js)

This runs on your server (or locally during dev). It automatically detects when a new room is created, joins it, and wires up the OpenAI Realtime model.

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
    
    // Extract activity ID from the room name (e.g., room-clarify-rubric-1234 -> clarify-rubric)
    const roomParts = ctx.room.name.split('-');
    const activityId = roomParts.slice(1, -1).join('-'); // handles IDs with hyphens
    
    await setupAgent(ctx, activityId);
  },
});

cli.runApp({ agent: fileURLToPath(import.meta.url), agentName: 'ita-coach-agent' });
```

### `agent/agent.ts`
```typescript
import { JobContext, voice, llm } from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import { getActivity } from '../src/lib/activities.js';

export async function setupAgent(ctx: JobContext, activityId: string) {
  const activity = getActivity(activityId);
  if (!activity) throw new Error(`Activity ${activityId} not found`);

  // 1. Define LLM Tools (How the agent evaluates the user)
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
      // Send the evaluation result back to the Next.js frontend via LiveKit Data Channel
      const payload = JSON.stringify({ type: 'EVALUATION', met: criteria_met, feedback });
      await ctx.room.localParticipant?.publishData(new TextEncoder().encode(payload), { reliable: true });
      return "Evaluation recorded.";
    }
  });

  // 2. Construct LiveKit-optimized System Prompt
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
- Do NOT make it too easy. The TA needs to actually demonstrate the skill.
- Call 'evaluate_objective' after the TA speaks to assess if they met the criteria.
  `;

  // 3. Create the OpenAI Realtime Session via LiveKit
  const session = new voice.AgentSession({
    llm: new openai.realtime.RealtimeModel({
      voice: 'alloy',
      instructions: instructions,
      turnDetection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 1000 // IMPORTANT: Patient turn detection for non-native speakers!
      }
    }),
    fncCtx
  });

  await session.start({
    room: ctx.room,
  });

  // 4. Trigger the opening line
  await session.generateReply({
    instructions: `Deliver your opening line naturally: "${activity.studentProfile.openingLine}"`,
  });
}
```

---

## 4. Frontend Practice Page

LiveKit provides pre-built React components, drastically reducing the frontend code required. We wrap our layout in `<LiveKitRoom>`.

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

export default function PracticePage() {
  const { activityId } = useParams();
  const activity = getActivity(activityId as string);
  
  const [token, setToken] = useState("");
  const [wsUrl] = useState(process.env.NEXT_PUBLIC_LIVEKIT_URL!);
  const [objectiveMet, setObjectiveMet] = useState(false);

  useEffect(() => {
    fetch(`/api/token?activityId=${activityId}`)
      .then((res) => res.json())
      .then((data) => setToken(data.token));
  }, [activityId]);

  if (!activity) return <div>Activity not found</div>;
  if (!token) return <div className="flex h-screen items-center justify-center">Initializing simulation...</div>;

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect={true}
      audio={true}
      className="flex flex-col h-screen bg-neutral-950 text-neutral-100"
    >
      <RoomAudioRenderer />
      
      {/* Hidden component listening to Agent's 'evaluate_objective' tool via Data Channel */}
      <AgentDataListener onObjectiveMet={() => setObjectiveMet(true)} />

      {/* Header */}
      <header className="p-4 border-b border-neutral-800 flex justify-between items-center">
        <a href="/" className="text-neutral-400 hover:text-white">← Back to Activities</a>
        <h1 className="font-semibold">{activity.title}</h1>
      </header>

      <div className="flex flex-1 p-6 gap-6 w-full max-w-7xl mx-auto">
        
        {/* LEFT: AUDIO VISUALIZER & CONTROLS */}
        <div className="w-1/3 flex flex-col items-center justify-center bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <div className="h-48 w-full flex items-center justify-center">
            {/* LiveKit's built-in audio orb/bars */}
            <BarVisualizer state="speaking" barCount={7} className="h-full text-indigo-500" />
          </div>
          <p className="text-neutral-400 mt-4 mb-8 text-center">{activity.studentProfile.name} is connected.</p>
          <VoiceAssistantControlBar />
        </div>

        {/* CENTER: TRANSCRIPT */}
        <div className="w-1/3 flex flex-col bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <h2 className="text-lg font-semibold mb-4 text-neutral-300">Transcript</h2>
          <TranscriptPanel />
        </div>

        {/* RIGHT: OBJECTIVE */}
        <div className="w-1/3 flex flex-col bg-neutral-900 rounded-xl border border-neutral-800 p-6">
          <h2 className="text-lg font-semibold mb-2">Objective</h2>
          <p className="text-sm text-neutral-400 mb-4">{activity.objective.description}</p>
          
          <div className={`p-4 rounded-lg border transition-colors ${
            objectiveMet ? 'bg-green-900/20 border-green-500 text-green-400' 
                         : 'bg-neutral-800 border-neutral-700'
          }`}>
            {objectiveMet ? "✅ Success Criteria Met!" : "⏳ In Progress..."}
          </div>

          <h3 className="text-sm font-semibold mt-8 mb-2 text-neutral-300">Example Phrases</h3>
          <ul className="text-sm text-neutral-500 space-y-2">
            {activity.objective.examplePhrases.map((phrase, i) => (
              <li key={i}>"{phrase}"</li>
            ))}
          </ul>
        </div>
      </div>
    </LiveKitRoom>
  );
}

// Sub-component to catch evaluation tool calls sent from the Node backend
function AgentDataListener({ onObjectiveMet }: { onObjectiveMet: () => void }) {
  useDataChannel((msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload));
      if (data.type === 'EVALUATION' && data.met) {
        onObjectiveMet();
      }
    } catch (e) { /* ignore non-JSON messages */ }
  });
  return null;
}

// Sub-component to render LiveKit's auto-generated transcripts
function TranscriptPanel() {
  const room = useRoomContext();
  // Automatically pulls Speech-to-Text data emitted by the OpenAI Realtime model
  const transcripts = useTrackTranscription({ publication: true, source: Track.Source.Microphone, room });
  
  return (
    <div className="flex-1 overflow-y-auto space-y-4">
      {transcripts.segments.map((segment) => (
        <div key={segment.id} className={`flex flex-col ${segment.isLocal ? 'items-end' : 'items-start'}`}>
          <span className="text-xs text-neutral-500 mb-1">{segment.isLocal ? 'You' : 'Student'}</span>
          <div className={`px-4 py-2 rounded-lg text-sm max-w-[85%] ${
            segment.isLocal ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-200'
          }`}>
            {segment.text}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 5. Environment Variables & Package Setup

### `.env.local`
1. Create a free account at [LiveKit Cloud](https://cloud.livekit.io/).
2. Create a Project and generate API Keys.
3. Get an OpenAI API Key.
```env
# Server-side (Used by Next.js API & Node.js Agent)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
OPENAI_API_KEY=your_openai_api_key

# Client-side (Used by Next.js UI)
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### `package.json`
To make development smooth, install `concurrently` so you don't have to run the UI and the Agent in separate terminal windows.

```json
{
  "scripts": {
    "dev:next": "next dev",
    "dev:agent": "tsx agent/main.ts dev",
    "dev": "concurrently -c \"cyan,magenta\" \"npm run dev:next\" \"npm run dev:agent\"",
    "build": "next build",
    "start": "next start"
  }
}
```

### Dependencies
Install exactly these:
```bash
# Next.js / React essentials
npm install next react react-dom zustand lucide-react class-variance-authority clsx tailwind-merge

# LiveKit Frontend SDKs
npm install livekit-client @livekit/components-react @livekit/components-styles

# LiveKit Backend SDKs (Next API + Node Agent)
npm install livekit-server-sdk @livekit/agents @livekit/agents-plugin-openai dotenv

# Dev dependencies
npm install -D typescript @types/node @types/react tsx concurrently
```

---

## Build Phases

### Phase 1: Infrastructure & "Hello World" (1 day)
- Setup Next.js App Router and configure `package.json` with `concurrently`.
- Add LiveKit Cloud API keys to `.env.local`.
- Create `/api/token` route.
- Create minimal `agent/main.ts` and `agent/agent.ts`.
- Run `npm run dev`. Verify the UI connects to the room, the Node agent joins, and you can hear the OpenAI model say the opening line.

### Phase 2: Activity Logic & Tools (1-2 days)
- Create `src/lib/activities.ts`.
- Update `agent.ts` to fetch the correct activity dynamically based on the room name.
- Implement the `evaluate_objective` tool in `agent.ts` and ensure it broadcasts a JSON payload to the `ctx.room.localParticipant.publishData`.
- Implement `AgentDataListener` in the frontend to catch that payload and update the `objectiveMet` state.

### Phase 3: Polish Frontend UI (1-2 days)
- Build out the home page (`page.tsx`) with cards linking to specific `/practice/[activityId]` routes.
- Implement the `TranscriptPanel` using `useTrackTranscription`.
- Finalize Tailwind styling, the `<BarVisualizer>`, and the Objective Success state formatting.