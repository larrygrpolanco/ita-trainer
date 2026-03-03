# ITA Interactional Competence Trainer — Project Plan

## What This Is

A Next.js web application where international teaching assistants (ITAs) practice **interactional competence** through AI voice conversations. Each activity simulates a realistic classroom interaction — a confused student, an off-topic question, a request for clarification — and the ITA must use specific interactional strategies to handle it.

This is an MVP for a research project. No auth. No database. No admin panel. Activities are defined in a TypeScript config file.

---

## Why Interactional Competence

ITAs are often evaluated on fluency and pronunciation, but interactional competence — the ability to manage turn-taking, check understanding, redirect conversations, and repair misunderstandings — is arguably more important and rarely explicitly taught. This tool gives ITAs a safe, repeatable space to practice these skills with a simulated student who responds dynamically.

---

## Architecture Overview

This project has **two separate deployable pieces** that communicate through LiveKit Cloud:

1. **The Frontend (Next.js app)** — what the ITA sees in their browser. Handles UI, mic input, audio playback, transcript display.
2. **The Agent (Node.js worker)** — runs separately (either locally or deployed to LiveKit Cloud). Joins the same LiveKit room as the user, listens to their speech, and responds as a simulated student.

They never talk to each other directly. LiveKit Cloud is the middleman that routes audio between them via WebRTC.

```
┌─────────────┐          ┌─────────────────┐          ┌─────────────┐
│  Next.js    │  WebRTC  │   LiveKit Cloud  │  WebRTC  │  Node.js    │
│  Frontend   │ ◄──────► │   (Room)         │ ◄──────► │  Agent      │
│  (Browser)  │          │                  │          │  (Server)   │
└─────────────┘          └─────────────────┘          └─────────────┘
     User speaks              Routes audio              AI responds
     Sees transcript          Handles turn              as simulated
     Sees objective           detection                 student
```

---

## User Flow (Step by Step)

### Home Page (`/`)
- Simple hero section explaining interactional competence and what this tool does.
- Below: 3–5 activity cards. Each shows the title, short description, level, and estimated time.
- Clicking an activity card navigates to an activity detail/launch view.

### Activity Detail (could be a modal or a pre-practice page)
- Shows the full scenario description: who the student is, what the situation is.
- Shows the objective: what the ITA needs to accomplish.
- Shows example phrases the ITA could use.
- Shows the rubric criteria (what "success" looks like).
- A "Start Practice" button.

### Practice Page (`/practice/[activityId]`)
- Clicking "Start Practice" does the following:
  1. Frontend calls `/api/token?activityId=xxx` to get a LiveKit room token.
  2. Frontend connects to the LiveKit room (mic enabled).
  3. The agent (already running in dev mode or deployed to cloud) detects the new room and joins.
  4. The agent delivers the student's opening line (e.g., "Hi, um, I had a question about my grade...").
  5. The ITA responds by speaking into their microphone.
  6. Conversation continues naturally.

- **What the ITA sees during practice:**
  - **Left panel**: Audio visualizer showing when the "student" is speaking. Mic controls (mute/unmute, end session).
  - **Center panel**: Live transcript showing both sides of the conversation. Coach tips appear inline after certain turn counts.
  - **Right panel**: The objective, success criteria, and example phrases. An objective status indicator that updates when the agent determines the criteria have been met.

### Session End
- When the objective is met OR max turns are reached, the conversation ends.
- The objective panel shows success/completion status.
- User can click "Back to Activities" to try another scenario.

---

## Activities Config

All activities live in a single TypeScript file (`src/lib/activities.ts`). This file is imported by both the frontend (to render UI) and the agent (to configure the AI persona). Here is the interface and one complete example:

```typescript
export interface Activity {
  id: string;
  title: string;
  shortDescription: string;       // For the card on the home page
  fullDescription: string;         // For the detail view before starting
  level: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  maxTurns: number;                // Safety limit to end the conversation

  studentProfile: {
    name: string;
    personality: string;           // Detailed personality for the AI prompt
    openingLine: string;           // What the simulated student says first
  };

  objective: {
    title: string;
    description: string;           // Shown to the ITA
    successCriteria: string;       // Used by the AI to evaluate silently
    examplePhrases: string[];      // Suggestions shown to the ITA
  };

  systemPromptExtension: string;   // Extra behavior rules for this specific scenario

  coachTips: {
    afterTurn: number;
    message: string;
  }[];
}
```

### Example Activity: "Clarifying a Rubric"

```typescript
{
  id: "clarify-rubric",
  title: "Clarifying a Rubric",
  shortDescription: "A student visits office hours confused about partial credit.",
  fullDescription: "A freshman in your intro course comes to office hours. They got the right answer on a problem set but lost points because they didn't show their work. They're confused and slightly frustrated. Your goal is to clearly explain how partial credit works, give a concrete example, and genuinely check that they understand — not just get a 'yeah I get it' response.",
  level: "beginner",
  estimatedMinutes: 5,
  maxTurns: 12,

  studentProfile: {
    name: "Alex",
    personality: "Confused but polite freshman. Uses simple language. Might say 'I think I get it' prematurely before actually understanding. Gets slightly defensive about having 'the right answer.'",
    openingLine: "Hi, um, I had a question about my grade on problem set 3? I got the right answer but I only got 6 out of 10 points...",
  },

  objective: {
    title: "Explain and Confirm Understanding",
    description: "Clearly explain how partial credit works, then verify the student genuinely understands.",
    successCriteria: "The TA has (1) explained that showing work matters for partial credit, (2) given a concrete example of what full-credit work looks like, AND (3) asked a genuine comprehension check question (not just 'does that make sense?').",
    examplePhrases: [
      "So the rubric is looking for...",
      "Let me give you an example of what a full-credit answer looks like...",
      "Can you walk me through what you'd do differently next time?",
    ],
  },

  systemPromptExtension: `
BEHAVIOR RULES:
- You start confused and slightly frustrated.
- If the TA just says "you need to show your work" without elaboration, respond: "But I did... I wrote the answer."
- If the TA asks a vague comprehension check like "does that make sense?" respond: "yeah I think so" even if the explanation was unclear.
- Only genuinely express understanding if the TA has (a) explained clearly with a concrete example AND (b) asked you to demonstrate understanding (e.g., "can you tell me what you'd do differently?").
- Do NOT volunteer understanding. The TA must earn it through good teaching.
`,

  coachTips: [
    { afterTurn: 4, message: "Tip: Try giving a concrete example of what full-credit work looks like." },
    { afterTurn: 8, message: "Tip: You've explained well — now ask them to restate or apply what you said." },
  ],
}
```

### Additional Activities to Include

**Activity 2: "Redirecting an Off-Topic Question"**
- Level: intermediate
- Scenario: During a review session, a student asks about material from a completely different chapter that isn't relevant to the upcoming exam.
- Objective: Acknowledge the question, explain why it's not relevant right now, and redirect back to the review topic — without making the student feel dismissed.

**Activity 3: "Managing a Frustrated Student"**
- Level: advanced
- Scenario: A student comes to office hours upset about a group project grade. Their partner didn't contribute, and they feel the grade is unfair.
- Objective: Acknowledge the student's frustration with empathy, explain what you can and can't control as a TA, and offer a concrete next step (e.g., speaking to the professor).

---

## Agent Prompt Design

The agent plays the role of a simulated student. The prompt follows LiveKit's recommended structure for voice agents:

### Identity
The agent is a simulated student in a teaching assistant training exercise. It has a name, personality, and specific behavioral rules defined by the activity config.

### Output Rules (Critical for Voice)
```
You are interacting via voice. Apply these rules:
- Respond in plain text only. No markdown, lists, emojis, or formatting.
- Keep replies brief: 1–3 sentences. Ask one question at a time.
- Use natural student language — hesitations like "um", "like", "I mean" are encouraged.
- Never reveal that you are an AI or that this is a simulation.
- Never reveal the success criteria or evaluation logic.
```

### Behavioral Rules
Injected from `activity.systemPromptExtension`. These control how the simulated student reacts to different TA strategies — this is what makes the practice meaningful.

### Evaluation (Tool Use)
The agent has a tool called `evaluate_objective` that it calls silently after each TA turn. This tool sends a data message back to the frontend indicating whether the success criteria have been met. The frontend uses this to update the objective status panel.

### Turn Detection
ITAs are non-native speakers who often pause mid-sentence. The voice activity detection (VAD) must have a generous silence threshold (1000–1200ms) to avoid cutting them off.

---

## What "Done" Looks Like for the MVP

1. Home page loads with activity cards.
2. Clicking an activity shows the scenario details and a "Start Practice" button.
3. Starting practice connects to a LiveKit room and the AI agent joins.
4. The student speaks first with the opening line.
5. The ITA can speak naturally and see a live transcript.
6. Coach tips appear at the right turn counts.
7. The objective panel updates when criteria are met.
8. The ITA can end the session and return to the activity list.

That's it. No login, no saving progress, no analytics dashboard. Just a working voice practice tool.
