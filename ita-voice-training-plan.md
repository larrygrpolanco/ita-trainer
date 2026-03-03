# ITA Interactional Competence Trainer — Concrete Implementation Plan

## What This Is

A Next.js app where international teaching assistants (ITAs) practice **interactional competence** through voice conversations with simulated students. Each activity targets a specific interactional skill — managing questions, checking understanding, redirecting off-topic talk — and ends when the objective is met or a turn limit is reached.

No database. No admin UI. Activities live in a TypeScript config file. Add, remove, or edit them by editing that file.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | shadcn/ui access, API routes, SSR |
| Voice | OpenAI Agents SDK (`@openai/agents`) | Single-service STT→LLM→TTS via WebRTC |
| UI Components | shadcn/ui + inspiration from LiveKit/ElevenLabs component patterns | Polished audio visualizer, transcript panel |
| Styling | Tailwind CSS | Ships with shadcn |
| State | React state + zustand (small store for session) | No persistence needed for MVP |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout, fonts, global styles
│   ├── page.tsx                    # Home — explains interactional competence, activity cards
│   └── practice/
│       └── [activityId]/
│           └── page.tsx            # Practice page — voice session UI
├── components/
│   ├── ui/                         # shadcn components (Button, Card, Badge, etc.)
│   ├── ActivityCard.tsx            # Expandable card on home page
│   ├── AudioVisualizer.tsx         # Mic visualization orb/waveform
│   ├── TranscriptPanel.tsx         # Live scrolling transcript
│   ├── ObjectiveTracker.tsx        # Shows current objective + completion state
│   ├── CoachMessage.tsx            # Inline colored coach feedback in transcript
│   └── SessionControls.tsx         # Start/stop, turn counter
├── lib/
│   ├── activities.ts               # ← ALL activity definitions live here
│   ├── agent.ts                    # RealtimeAgent + tool setup
│   ├── prompts.ts                  # Shared prompt fragments
│   └── session-store.ts            # Zustand store for session state
├── api/
│   └── session/
│       └── route.ts                # POST — generates ephemeral key
.env.local                          # OPENAI_API_KEY
```

---

## The Activities Config File

This is the single source of truth. Everything that varies per activity goes here. Everything shared (how the agent responds to tools, turn detection settings, the practice page layout) stays in the app code.

### `src/lib/activities.ts`

```typescript
export interface Activity {
  id: string;
  title: string;
  shortDescription: string;        // Shown on the card before expanding
  fullDescription: string;          // Shown when card is expanded
  level: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  maxTurns: number;                 // Hard stop — session ends after this many exchanges

  // Student simulation config
  studentProfile: {
    name: string;
    personality: string;            // e.g. "confused but polite freshman"
    openingLine: string;            // What the student says first
  };

  // What the ITA needs to demonstrate
  objective: {
    title: string;                  // e.g. "Check for understanding"
    description: string;            // Shown in the objective panel
    successCriteria: string;        // Used in the system prompt for the model to evaluate
    examplePhrases: string[];       // Hints the ITA can peek at
  };

  // The custom part of the system prompt (student-specific behavior)
  systemPromptExtension: string;

  // Optional coach tips that appear as colored messages in the transcript
  coachTips: {
    afterTurn?: number;             // Show tip after this many turns if objective not met
    message: string;
  }[];
}

// ──────────────────────────────────────────────
// ACTIVITIES — edit, add, remove here
// ──────────────────────────────────────────────

export const activities: Activity[] = [
  {
    id: "clarify-rubric",
    title: "Clarifying a Rubric",
    shortDescription:
      "A student visits office hours confused about how partial credit works on an assignment.",
    fullDescription:
      "A freshman in your intro course comes to office hours and says they don't understand how partial credit is awarded. They're frustrated because they 'got the right answer but lost points.' Your goal is to explain the rubric clearly, check that the student understands, and leave them feeling heard.",
    level: "beginner",
    estimatedMinutes: 5,
    maxTurns: 12,

    studentProfile: {
      name: "Alex",
      personality:
        "Confused but not hostile. Uses simple language. Gets more relaxed as things make sense. Will say 'I think I get it' when they understand, but might also say that prematurely.",
      openingLine:
        "Hi, um, I had a question about my grade on problem set 3? I got the right answer on question 2 but I only got 6 out of 10 points and I don't really understand why.",
    },

    objective: {
      title: "Explain and confirm understanding",
      description:
        "Clearly explain how partial credit works, then check that the student genuinely understands (not just says 'okay').",
      successCriteria:
        "The TA has (1) explained that showing work matters for partial credit, (2) given a concrete example or restated the rubric criteria, AND (3) asked a genuine comprehension check question — not just 'does that make sense?' but something that requires the student to demonstrate understanding, like 'can you tell me what you'd do differently next time?' or 'so what would full credit look like on that problem?'",
      examplePhrases: [
        "So the rubric is looking for...",
        "Can you walk me through what you'd do differently?",
        "Let me show you what a 10/10 answer looks like.",
        "Does that match what you were thinking, or is there a part that's still unclear?",
      ],
    },

    systemPromptExtension: `
BEHAVIOR: You start confused and slightly frustrated but not rude.
- If the TA just says "you need to show your work" without explaining further, stay confused and say something like "but I did show my work... I wrote the answer."
- If the TA gives a clear, specific explanation with an example, start nodding along: "Oh okay, so it's like..."
- If the TA asks a real comprehension check (not just "make sense?"), respond genuinely — either demonstrate understanding or reveal remaining confusion.
- If the TA asks "does that make sense?" with no specificity, say "yeah I think so" even if confused. This tests whether the TA digs deeper.
- Do NOT volunteer that you understand unless the TA has genuinely explained well AND checked comprehension.
`,

    coachTips: [
      {
        afterTurn: 4,
        message:
          "💡 Tip: Try giving a concrete example of what full credit vs. partial credit looks like on this specific problem.",
      },
      {
        afterTurn: 8,
        message:
          "💡 Tip: You've explained well — now check if they actually understood. Ask them to restate or apply what you said.",
      },
    ],
  },

  {
    id: "redirect-question",
    title: "Redirecting an Off-Topic Question",
    shortDescription:
      "A student in your lab section keeps asking questions beyond the scope of today's activity.",
    fullDescription:
      "During a lab section on basic circuit analysis, a curious student keeps asking about advanced topics (like transistor amplifiers) that aren't part of today's lab. You need to acknowledge their interest while firmly but warmly redirecting them to the task at hand.",
    level: "intermediate",
    estimatedMinutes: 5,
    maxTurns: 10,

    studentProfile: {
      name: "Jordan",
      personality:
        "Enthusiastic and talkative. Not trying to be difficult — genuinely curious. Responds well to being taken seriously but needs clear boundaries. If redirected dismissively, pushes back. If acknowledged, cooperates.",
      openingLine:
        "Hey, so I was reading ahead and I had a question — like, how does a transistor amplify a signal? Is it related to what we're doing with these resistors?",
    },

    objective: {
      title: "Acknowledge and redirect",
      description:
        "Validate the student's curiosity while redirecting to the current lab task. Do this without dismissing them.",
      successCriteria:
        "The TA has (1) acknowledged that the question is interesting or valid (not dismissed it), (2) clearly stated that it's outside the scope of today's lab, AND (3) offered a concrete next step — like 'come to office hours', 'we'll cover that in week 8', or 'that's a great thing to look into after you finish today's exercise.'",
      examplePhrases: [
        "That's a great question — it's actually related to what we'll cover later in the course.",
        "I want to make sure we stay focused on today's lab, but let's talk about that after.",
        "Why don't you finish the current circuit first, and we can chat about transistors during office hours?",
      ],
    },

    systemPromptExtension: `
BEHAVIOR: You are enthusiastic and well-meaning.
- If the TA just says "that's not relevant" or "we're not covering that," look a bit deflated and say "oh, okay" but then try asking another off-topic question to test if the TA can redirect again.
- If the TA acknowledges your curiosity AND gives a redirect with a concrete alternative (office hours, future lecture, after lab), say "Oh cool, yeah that makes sense. So for this circuit..."
- If the TA provides a partial explanation of transistors, get even more excited and ask a deeper follow-up, pulling them further off-topic. This tests their ability to stop and redirect.
- Only accept the redirect fully if the TA both validates you AND gives a clear alternative.
`,

    coachTips: [
      {
        afterTurn: 4,
        message:
          "💡 Tip: Acknowledge their curiosity first before redirecting. 'That's a great question' goes a long way.",
      },
      {
        afterTurn: 7,
        message:
          "💡 Tip: Offer a concrete alternative — when and where they can explore this topic.",
      },
    ],
  },

  {
    id: "positive-assessment",
    title: "Responding to a Difficult Question",
    shortDescription:
      "A student asks a question you're not fully sure how to answer.",
    fullDescription:
      "During your presentation in a TA training simulation, a panel member asks a question that's at the edge of your knowledge. You need to manage the response professionally — acknowledging the question, giving what you can, and being honest about the limits of your answer without losing credibility. This is directly based on the interactional moves observed in the TEACH test research.",
    level: "advanced",
    estimatedMinutes: 5,
    maxTurns: 10,

    studentProfile: {
      name: "Professor Kim",
      personality:
        "Calm, neutral tone. Asks probing questions. Not trying to trip you up but won't let vague answers slide. If you say 'that's a great question' and then give a non-answer, will follow up.",
      openingLine:
        "You mentioned that this method works best for large datasets. Can you explain what happens when the dataset is small — does the algorithm still converge?",
    },

    objective: {
      title: "Handle an uncertain question with competence",
      description:
        "Respond to a question at the edge of your knowledge. Demonstrate honesty about limits without losing authority.",
      successCriteria:
        "The TA has (1) acknowledged the question as valid (not dismissively), (2) shared what they DO know relevant to the answer, (3) been honest about uncertainty — saying something like 'I'm not entirely sure about the specifics of convergence with small n, but...' AND (4) offered a next step such as 'I can look into that and follow up' or 'that might be worth exploring in the documentation.' The TA should NOT just say 'good question' and then ramble vaguely.",
      examplePhrases: [
        "That's an important edge case. From what I understand...",
        "I'm not 100% certain on the convergence behavior, but I believe...",
        "Let me look into the specifics and get back to you on that.",
        "That's a great question — here's what I know, and here's where I'd need to verify...",
      ],
    },

    systemPromptExtension: `
BEHAVIOR: You are a faculty evaluator in a TA training context (TEACH test style).
- If the TA gives a vague non-answer after "that's a great question," press gently: "Could you say a bit more about that?"
- If the TA is honest about uncertainty but shows relevant knowledge, nod along: "Okay, that's reasonable."
- If the TA makes something up or overcommits to an answer they clearly don't know, look slightly skeptical: "Are you sure about that? My understanding was different."
- If the TA offers to follow up, accept that gracefully: "Sure, that would be helpful."
- Reward the combination of partial knowledge + honesty + a concrete next step.
`,

    coachTips: [
      {
        afterTurn: 3,
        message:
          "💡 Tip: It's okay not to know everything. Share what you do know, and be upfront about what you'd need to check.",
      },
      {
        afterTurn: 6,
        message:
          "💡 Tip: Offer a concrete follow-up — 'I'll look into that and email you' shows professionalism, not weakness.",
      },
    ],
  },
];

export function getActivity(id: string): Activity | undefined {
  return activities.find((a) => a.id === id);
}
```

### Adding a new activity

1. Add an object to the `activities` array.
2. Done. The home page renders it automatically, the practice page loads it by `id`.

---

## System Prompt Architecture

The agent gets a combined prompt built from shared scaffolding + the activity-specific parts:

### `src/lib/prompts.ts`

```typescript
import { Activity } from "./activities";

export function buildSystemPrompt(activity: Activity): string {
  return `
You are simulating a student in a teaching assistant training exercise focused on INTERACTIONAL COMPETENCE — the ability to manage real classroom conversations effectively.

ROLE: ${activity.studentProfile.name}
${activity.studentProfile.personality}

CURRENT OBJECTIVE FOR THE TRAINEE (TA):
${activity.objective.title}
Success criteria: ${activity.objective.successCriteria}

YOUR BEHAVIOR:
${activity.systemPromptExtension}

RULES:
1. Stay in character at all times. Never break the fourth wall. Never mention that you are an AI.
2. Use natural student language — hesitations, filler words ("um", "like"), simple vocabulary.
3. Keep responses short: 1–3 sentences. This is a voice conversation.
4. Do NOT make it too easy. The TA needs to actually demonstrate the skill, not just hear you say "okay."
5. After each TA response, silently evaluate whether the success criteria have been met.
   - Call the evaluate_objective tool with your honest assessment.
6. If the TA meets ALL parts of the success criteria, call mark_complete.
7. Be a realistic student — sometimes unclear, sometimes premature with "I get it", sometimes needing things repeated.

IMPORTANT TURN DETECTION NOTE:
The person practicing may be a non-native English speaker. They may pause for 2-3 seconds mid-thought.
Do NOT interpret silence as "they're done talking." Be patient. Wait for a clear end of thought.

Your opening line (deliver this naturally when the session starts):
"${activity.studentProfile.openingLine}"
`.trim();
}
```

---

## Agent Setup

### `src/lib/agent.ts`

```typescript
import { RealtimeAgent } from "@openai/agents/realtime";
import { tool } from "@openai/agents";
import { z } from "zod";
import { Activity } from "./activities";
import { buildSystemPrompt } from "./prompts";

export function createStudentAgent(
  activity: Activity,
  callbacks: {
    onEvaluation: (result: { met: boolean; feedback: string }) => void;
    onComplete: () => void;
  }
) {
  const evaluateObjective = tool({
    name: "evaluate_objective",
    description:
      "Evaluate whether the TA's latest response meets the objective criteria. Call this silently after each TA turn.",
    parameters: z.object({
      criteria_met: z
        .boolean()
        .describe("Whether ALL success criteria have been met so far"),
      feedback: z
        .string()
        .describe("Brief internal note on what the TA did well or still needs to do"),
    }),
    execute: async ({ criteria_met, feedback }) => {
      callbacks.onEvaluation({ met: criteria_met, feedback });
      return { acknowledged: true };
    },
  });

  const markComplete = tool({
    name: "mark_complete",
    description:
      "Call this when the TA has fully met all success criteria for the objective. This ends the activity.",
    parameters: z.object({
      summary: z
        .string()
        .describe("Brief summary of how the TA met the criteria"),
    }),
    execute: async ({ summary }) => {
      callbacks.onComplete();
      return { session_complete: true, summary };
    },
  });

  const agent = new RealtimeAgent({
    name: "student",
    instructions: buildSystemPrompt(activity),
    tools: [evaluateObjective, markComplete],
  });

  return agent;
}
```

---

## API Route: Ephemeral Key

### `src/app/api/session/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function POST() {
  const response = await fetch(
    "https://api.openai.com/v1/realtime/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        modalities: ["text", "audio"],
        input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
        turn_detection: {
          type: "semantic_vad",
          eagerness: "low",       // Patient — good for non-native speakers
          interrupt_response: true,
        },
      }),
    }
  );

  const data = await response.json();
  return NextResponse.json(data);
}
```

---

## Pages

### Home Page (`src/app/page.tsx`)

Content structure:

1. **Hero section** — "Interactional Competence Trainer" with a brief explanation:
   > Teaching isn't just about knowing your subject — it's about managing conversations with students in real time. This tool lets you practice the interactional skills that matter most: explaining clearly, checking for understanding, handling tough questions, and redirecting gracefully.
   > 
   > Based on research into the interactional demands of ITA teaching assessments.

2. **What is Interactional Competence?** — Short section (will be fleshed out later with rubric details). Key points:
   - Competence is co-constructed — it's not just what you say, it's how the conversation unfolds
   - Specific skills: encouraging questions, providing clear answers, checking comprehension, managing problematic responses
   - These skills are practiced, not just learned

3. **Activities grid** — Each activity renders as an `ActivityCard`:
   - **Collapsed state**: title, level badge, short description, estimated time
   - **Expanded state**: full description, objective title + description, example phrases (collapsible), "Start Practice" button linking to `/practice/[activityId]`

### Practice Page (`src/app/practice/[activityId]/page.tsx`)

A single, consistent layout for all activities:

```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Activities          Turn 3 / 12          ⏱ 2:34  │
├────────────────────┬─────────────────────┬───────────────────┤
│                    │                     │                   │
│   AUDIO            │   TRANSCRIPT        │   OBJECTIVE       │
│   VISUALIZER       │                     │                   │
│                    │   Student: Hi, um,  │   ┌─────────────┐ │
│   ┌──────────┐    │   I had a question  │   │ Explain and  │ │
│   │          │    │   about my grade... │   │ confirm      │ │
│   │  ◉ orb   │    │                     │   │ understanding│ │
│   │          │    │   You: Sure, I'd    │   │              │ │
│   └──────────┘    │   be happy to help  │   │ ○ Not yet    │ │
│                    │   with that...      │   │   complete   │ │
│  [ Click to Start ]│                     │   └─────────────┘ │
│                    │   💡 Coach: Try     │                   │
│                    │   giving a concrete │   Example phrases: │
│                    │   example...        │   ▸ "So the rubric│
│                    │                     │     is looking..." │
│                    │                     │                   │
├────────────────────┴─────────────────────┴───────────────────┤
│                    [ End Session ]                            │
└──────────────────────────────────────────────────────────────┘
```

**Three columns:**

1. **Left — Audio Visualizer**: Large circular orb or waveform that reacts to audio. Shows "Click to Start" before connection. After connected, pulses with voice activity. Inspired by ElevenLabs' orb visualizer or LiveKit's audio indicator.

2. **Center — Transcript Panel**: Scrolling chat log. Student messages in one color, TA (user) messages in another. Coach tips appear inline in a distinct accent color (amber/yellow) when triggered by turn count. This is where the "coach agent" feedback lives — no separate voice agent, just colored inline messages.

3. **Right — Objective Tracker**: Shows the current objective title and description. A status indicator (incomplete → complete). Below that, a collapsible list of example phrases the TA can peek at for help.

**Header bar**: Back link, turn counter (`Turn 3 / 12`), session timer.

**Bottom**: End Session button (also triggered automatically when objective is marked complete or max turns reached).

---

## Session Flow (Step by Step)

```
1. User clicks "Start Practice" on home page
2. Navigate to /practice/[activityId]
3. Page loads activity config from activities.ts
4. User sees visualizer with "Click to Start" button
5. On click:
   a. POST /api/session → get ephemeral key
   b. Create RealtimeAgent with activity-specific prompt + tools
   c. Create RealtimeSession(agent)
   d. session.connect({ apiKey: ephemeralKey })
   e. WebRTC auto-configures mic + speaker
6. Agent delivers opening line (student's first message)
7. User speaks → STT → LLM → TTS → user hears student response
8. After each exchange:
   - Transcript updates from session history events
   - Agent calls evaluate_objective tool silently
   - Callback updates objective tracker UI
   - Turn counter increments
   - If turn count triggers a coachTip, it appears in transcript
9. Session ends when:
   - Agent calls mark_complete (objective met) → show success state
   - Turn limit reached → show "time's up" state
   - User clicks "End Session" → show early exit state
10. End state: brief summary overlay with:
    - ✅ Objective met / ❌ Not met
    - Number of turns taken
    - Link back to activities
```

---

## Coach Feedback (No Voice Agent — Inline Text)

Instead of a separate coach voice agent, coach feedback appears as colored inline messages in the transcript panel. This is simpler and less disorienting than switching voices.

```typescript
// In the practice page component:
// After each turn, check if a coach tip should fire

const currentTurn = turnCount;
const tips = activity.coachTips.filter(
  (tip) => tip.afterTurn === currentTurn && !objectiveMet
);

tips.forEach((tip) => {
  addToTranscript({
    role: "coach",
    text: tip.message,
    timestamp: Date.now(),
  });
});
```

Coach messages render in the transcript with a distinct style: amber background, coach icon, slightly different font weight. Visually unmistakable from student/TA messages.

---

## Transcript Handling

The OpenAI Agents SDK emits history events that you subscribe to:

```typescript
// Listen for transcript updates
session.on("history_updated", () => {
  const history = session.history;
  // Map to your transcript format
  const entries = history.map((item) => ({
    role: item.role === "user" ? "ta" : "student",
    text: item.content?.[0]?.transcript || item.content?.[0]?.text || "",
    timestamp: Date.now(),
  }));
  setTranscript(entries);
});

// Also listen for partial transcripts for real-time display
session.on("history_added", (event) => {
  // Append new item as it arrives
});
```

---

## Turn Detection Settings (Important for ITA Population)

```typescript
turn_detection: {
  type: "semantic_vad",     // Context-aware, not just silence-based
  eagerness: "low",         // Don't jump in quickly — ITAs may pause to think
  interrupt_response: true, // Let the TA interrupt the student (natural in teaching)
}
```

Non-native speakers pause longer between phrases. `semantic_vad` with low eagerness is the right default. This can be tuned per-activity in the config if needed (add an optional `turnDetection` field to the Activity type).

---

## Session State Store

### `src/lib/session-store.ts`

```typescript
import { create } from "zustand";

interface TranscriptEntry {
  role: "student" | "ta" | "coach";
  text: string;
  timestamp: number;
}

interface SessionState {
  status: "idle" | "connecting" | "active" | "complete";
  turnCount: number;
  objectiveMet: boolean;
  transcript: TranscriptEntry[];
  elapsedSeconds: number;

  // Actions
  setStatus: (s: SessionState["status"]) => void;
  incrementTurn: () => void;
  setObjectiveMet: (met: boolean) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setTranscript: (entries: TranscriptEntry[]) => void;
  tick: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "idle",
  turnCount: 0,
  objectiveMet: false,
  transcript: [],
  elapsedSeconds: 0,

  setStatus: (status) => set({ status }),
  incrementTurn: () => set((s) => ({ turnCount: s.turnCount + 1 })),
  setObjectiveMet: (met) => set({ objectiveMet: met }),
  addTranscriptEntry: (entry) =>
    set((s) => ({ transcript: [...s.transcript, entry] })),
  setTranscript: (entries) => set({ transcript: entries }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  reset: () =>
    set({
      status: "idle",
      turnCount: 0,
      objectiveMet: false,
      transcript: [],
      elapsedSeconds: 0,
    }),
}));
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@openai/agents": "latest",
    "zod": "^4",
    "zustand": "^5",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "lucide-react": "latest"
  }
}
```

Plus shadcn/ui components installed via `npx shadcn@latest add button card badge collapsible` etc.

---

## Build Phases

### Phase 1: Skeleton + Voice Loop (2–3 days)
- `npx create-next-app@latest` with TypeScript + Tailwind + App Router
- Install shadcn/ui, set up base components
- Create `activities.ts` with 1 hardcoded activity
- Build `/api/session` route for ephemeral key
- Build practice page with basic `RealtimeSession` connection
- Get voice working: talk to the simulated student, hear a response
- **Milestone**: You can have a voice conversation with the simulated student

### Phase 2: Transcript + Tools (3–4 days)
- Wire up `history_updated` / `history_added` events to TranscriptPanel
- Implement `evaluate_objective` and `mark_complete` tools
- Build ObjectiveTracker component
- Add turn counter + turn limit logic
- Add coach tip injection based on turn count
- **Milestone**: Full activity loop — transcript appears, objective tracks, session ends

### Phase 3: Home Page + All Activities (2–3 days)
- Build home page with interactional competence explanation
- Build ActivityCard with expand/collapse
- Add all 3 starter activities to `activities.ts`
- Wire routing: click "Start Practice" → `/practice/[id]`
- **Milestone**: User can browse activities, pick one, and practice

### Phase 4: Polish (2–3 days)
- Audio visualizer (canvas-based orb that reacts to audio levels)
- Session end state / summary overlay
- Coach message styling
- Turn detection tuning
- Mobile responsiveness
- **Milestone**: Looks good, feels good, ready for user testing

---

## Key Simplifications vs. Original Plan

| Original plan had | This plan does instead |
|---|---|
| Supabase database | No database — activities in a `.ts` file |
| Coach voice agent with handoff | Coach tips as colored inline text in transcript |
| Server-side rubric scoring endpoint | Model self-evaluates via tools (good enough for MVP) |
| Session persistence + history page | No persistence — practice and done |
| Debrief generation | Simple end-of-session summary overlay |
| Multiple objectives per activity | One objective per activity — keeps it focused |
| SvelteKit | Next.js (for shadcn + ecosystem) |

---

## What to Build First (Right Now)

1. `npx create-next-app@latest ita-trainer --typescript --tailwind --app --src-dir`
2. `npx shadcn@latest init`
3. `npm install @openai/agents zod zustand`
4. Create `src/lib/activities.ts` — paste the config above
5. Create `src/app/api/session/route.ts` — ephemeral key endpoint
6. Create `src/app/practice/[activityId]/page.tsx` — minimal: a button that connects to the Realtime API and lets you talk
7. Talk to the student. See if it works.

Everything else layers on top of that working voice loop.

---

## Reference: OpenAI Realtime Agents Demo

The `openai/openai-realtime-agents` repo on GitHub is a Next.js app that demonstrates exactly the patterns you need. It shows:
- Ephemeral key generation in an API route
- `RealtimeAgent` configuration with tools and handoffs
- WebRTC connection in the browser
- Transcript rendering from data channel events
- Agent config files that define each scenario

You can clone that repo as a reference or even fork it as your starting point, replacing their agent configs with your `activities.ts` pattern.
