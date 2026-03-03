# ITA Voice Training System — MVP with OpenAI Agents SDK

## Why This Approach for the MVP

The OpenAI Agents SDK (TypeScript) gives you the fastest path to a working voice prototype because the entire STT→LLM→TTS pipeline is handled by a single service — the Realtime API. You don't stitch together providers, you don't manage audio streams manually, and in the browser, WebRTC mic/speaker setup is automatic. For validating whether voice-based TA training actually works as a pedagogical tool, that's exactly what you need.

The tradeoff is vendor lock-in to OpenAI's models and pricing. But the plan below is designed so that every piece of *your* logic — scenarios, rubrics, tools, transcript storage — lives in your own code and data layer. When/if you migrate to LiveKit, you're swapping the transport and model layer, not rewriting your training system.

---

## What the MVP Does

A TA opens a scenario in the browser, has a voice conversation with a simulated student, receives per-turn feedback, and walks away with a transcript and a debrief report. That's it. No admin UI, no fancy analytics, no multi-provider switching. Just the core learning loop.

---

## Architecture (Simplified for MVP)

```
┌────────────────────────────────────────────────────┐
│                BROWSER (SvelteKit)                  │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Mic/Audio │  │ Transcript   │  │ Objectives   │  │
│  │ (auto     │  │ Panel        │  │ Checklist    │  │
│  │  WebRTC)  │  │ (chat log)   │  │              │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
│                       │                             │
│          OpenAI Agents SDK (JS)                     │
│       RealtimeSession + RealtimeAgent               │
│         ┌─────────────────────┐                     │
│         │  Function Tools     │                     │
│         │  (run in browser)   │                     │
│         │  • grade_turn()     │──── POST ──→ Server │
│         │  • advance_obj()    │──── POST ──→ Server │
│         │  • offer_hint()     │──── POST ──→ Server │
│         └─────────────────────┘                     │
│                                                     │
└─────────────────────┬───────────────────────────────┘
                      │ WebRTC (audio)
                      │ + data channel (events)
                      ▼
            OpenAI Realtime API
         (gpt-4o-realtime / gpt-realtime)
         STT + LLM + TTS in one service

┌────────────────────────────────────────────────────┐
│           SVELTEKIT SERVER                          │
│                                                     │
│  /api/token         → generates ephemeral key       │
│  /api/grade-turn    → rubric evaluation logic       │
│  /api/save-session  → persist transcript + scores   │
│  /api/debrief       → generate post-session report  │
│                                                     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────┐
│              SUPABASE                                │
│                                                      │
│  scenarios     │ scenario definitions + rubrics       │
│  sessions      │ per-practice session records         │
│  transcripts   │ full conversation logs               │
│  turn_scores   │ per-turn rubric evaluations          │
│  user_progress │ objective completion over time       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Key architectural decision: tools run in the browser

With the OpenAI Agents SDK, function tools execute wherever the `RealtimeSession` runs. Since your session runs in the browser (WebRTC mode), tools also run in the browser. This means your tool functions are client-side JavaScript that call your SvelteKit server endpoints for anything that needs server-side logic (rubric scoring, database writes). This is fine for an MVP — it keeps the agent setup simple and avoids a proxy server.

For production or the LiveKit migration, you'd move the agent to a server process where tools run server-side directly. But for now, browser-side is the right call.

---

## The Transcript / Chat Log

You mentioned liking LiveKit's chat log feature. Here's how you get the same thing with the Agents SDK:

The `RealtimeSession` emits `history_added` and `history_updated` events that contain conversation items (both user and agent messages, including transcriptions). You can also access `session.history()` for the full conversation state at any point.

In practice, you'll build a Svelte store that accumulates transcript segments from these events:

```
session.on('history_added') → append to transcript store
session.on('history_updated') → sync full history

Transcript store shape:
[
  { role: 'user', text: 'So how does partial credit work...', timestamp },
  { role: 'agent', text: 'That is a great question! So for...', timestamp },
  ...
]
```

Your transcript panel renders this as a scrolling chat log, color-coded by speaker. For the TA learner, this serves multiple purposes:

**During the session:** They can glance at what they just said (self-monitoring is hard when you're also thinking about what to say next). They can see the simulated student's words written out, which helps if they missed something auditorily.

**After the session:** The full transcript is saved to Supabase. The debrief view annotates it with rubric scores per turn, highlights successful exchanges, and flags moments where the TA struggled. Over multiple sessions, this becomes a portfolio of improvement.

**Hybrid input mode:** The Realtime API supports both audio and text input. You could offer a "type your response" fallback for moments when the TA is really stuck — they can type, then switch back to voice. The transcript captures both modes seamlessly.

---

## Agent Design

### The RealtimeAgent Setup

The Agents SDK uses `RealtimeAgent` objects that define instructions, tools, and handoffs. Your primary agent is the student simulator:

```typescript
const studentAgent = new RealtimeAgent({
  name: 'student',
  instructions: buildStudentPrompt(scenario, currentObjective),
  tools: [gradeTurnTool, advanceObjectiveTool, offerHintTool, logEventTool],
  handoffs: [coachAgent],
});
```

### System Prompt Strategy

The key to making this work is a well-structured system prompt that tells the model exactly what role it's playing and when to call tools. The prompt is dynamically built from your scenario data:

```
You are simulating a student in a teaching assistant training exercise.

ROLE: {scenario.student_profile}
- Name: {profile.name}
- Personality: {profile.personality_description}
- Current emotional state: {profile.starting_emotion}
- Communication style: {profile.style_notes}

CURRENT OBJECTIVE: {objective.title}
The trainee (TA) needs to: {objective.success_criteria}

RULES:
1. Stay in character. Do not break the fourth wall.
2. Use natural student language — hesitations, filler words, simple vocabulary.
3. After each TA response, silently call grade_turn with your assessment.
4. If grade_turn returns success=true, call advance_objective.
5. If grade_turn returns success=false for 3+ consecutive attempts, call offer_hint.
6. Keep your responses concise (2-4 sentences). This is a voice conversation.
7. If the TA asks for coaching/feedback, use the handoff to coach agent.

ESCALATION: If the TA has not met criteria after 3 attempts:
- {objective.escalation_behavior}
```

### Handoffs for Coaching

The Agents SDK supports handoffs between RealtimeAgents. When the TA requests feedback or hits a struggle threshold, the student agent hands off to a coaching agent:

```typescript
const coachAgent = new RealtimeAgent({
  name: 'coach',
  handoffDescription: 'Provides brief coaching feedback to the TA',
  instructions: `You are a teaching coach. The TA just practiced a scenario 
    and needs brief, specific feedback. Reference the objective criteria. 
    Give 1 commendation and 1 concrete suggestion. Then ask if they want 
    to continue practicing.`,
  handoffs: [studentAgent], // can hand back
});
```

Important SDK constraint: handoffs in Realtime keep the same voice and model. So your "coach" and "student" will sound the same. For the MVP this is fine — the shift in persona is clear from what they say. For a future version on LiveKit, you could use different TTS voices.

### Tools

Tools are defined with Zod schemas and execute in the browser. Each one calls your SvelteKit server for the actual logic:

**grade_turn** — The most important tool. After each TA utterance, the model calls this with its assessment of whether the TA met the current objective criteria. Your server-side endpoint does the actual rubric scoring (you might even use a separate LLM call here for more rigorous evaluation).

**advance_objective** — Moves to the next objective in the scenario. Returns the new objective's details so the model can update its behavior.

**offer_hint** — Returns a scaffolding hint or exemplar phrase for the current objective. The model incorporates this into its next response naturally.

**log_event** — Catches significant moments (TA interrupted, TA asked for help, objective completed) for analytics.

The tool results are fed back to the model, which uses them to guide the conversation. This is the mechanism by which your rubric actually controls the simulation flow.

---

## Scenario Data Model

Store these in Supabase. Keep it simple for the MVP:

**scenarios**
```
id, title, level (A2-C1), topic, 
student_profile (jsonb: name, personality, style, starting_emotion),
description, estimated_minutes
```

**objectives**  
```
id, scenario_id, sort_order, title,
success_criteria (text — what the TA should demonstrate),
rubric_descriptors (jsonb — what constitutes 1-5 score),
hints (jsonb array — scaffolding phrases/tips),
escalation_behavior (text — how student reacts if TA struggles)
```

**exemplars**
```
id, objective_id, type (phrase/transcript_snippet/cultural_note),
content, language_notes
```

### Starter Scenarios

For the MVP, build 2-3 scenarios that cover common ITA pain points:

1. **Office Hours: Clarifying a Rubric** — Student is confused about partial credit. TA needs to explain grading criteria clearly and check for understanding. Tests: clear explanations, checking comprehension, using examples.

2. **Lab Section: Redirecting Off-Topic Questions** — Student keeps asking questions outside the scope of the lab. TA needs to acknowledge the question, redirect politely, and stay on task. Tests: diplomatic redirection, maintaining authority, offering alternatives.

3. **Email Response: Grade Dispute** — (Text-only variant) Student emails about a grade they disagree with. TA must respond professionally and empathetically. Tests: professional tone, acknowledging feelings, explaining next steps. This one uses the text input path of the Realtime API and validates that the system works for written communication practice too.

---

## SvelteKit Implementation Plan

### Server Routes

**`POST /api/token`** — Generates an ephemeral client key:
```
1. Receive { scenario_id } from client
2. Call OpenAI REST API for ephemeral key (client_secrets endpoint)
   - Include session config: model, voice, input transcription settings
3. Return { apiKey: "ek_...", scenario: scenarioData }
```

**`POST /api/grade-turn`** — Rubric scoring:
```
1. Receive { ta_utterance, objective_id, conversation_context }
2. Load objective rubric from Supabase
3. Score against criteria (could be rule-based or an LLM call)
4. Save turn_score to Supabase
5. Return { score, success, feedback, hint_available }
```

**`POST /api/save-session`** — Persist on session end:
```
1. Receive { session_id, scenario_id, transcript, turn_scores, duration }
2. Write to sessions + transcripts tables
3. Update user_progress
```

**`POST /api/debrief`** — Generate feedback report:
```
1. Receive { session_id }
2. Load transcript + turn_scores
3. Generate debrief (LLM call or template-based)
4. Return { commendations, improvements, overall_score }
```

### Client Pages

**`/scenarios`** — Grid of available scenarios with topic, level, and description. Click to start.

**`/practice/[scenario_id]`** — The main practice view:
- Left panel: Audio visualization + mic controls (the SDK handles mic/speaker automatically via WebRTC, so this is mostly visual feedback)
- Center panel: Scrolling transcript (the chat log you liked)
- Right panel: Objective progress checklist (updates as objectives complete)
- Bottom: "Request feedback" button (triggers handoff to coach), "End session" button

**`/history`** — List of past sessions with date, scenario, overall score. Click for debrief.

**`/debrief/[session_id]`** — Full transcript with per-turn annotations, commendations, and improvement suggestions.

### The Practice Page Flow

```
1. User clicks "Start" on scenario page
2. Client POSTs to /api/token with scenario_id
3. Server returns ephemeral key + scenario data
4. Client creates RealtimeAgent with scenario-specific instructions
5. Client creates RealtimeSession(agent) and connects with ephemeral key
6. WebRTC auto-configures mic + speaker
7. Agent speaks opening line ("Hi, I had a question about the rubric...")
8. User speaks → STT → LLM → TTS → User hears response
9. After each exchange, agent calls grade_turn tool
10. Tool function (in browser) POSTs to /api/grade-turn
11. Result flows back to model, guides next response
12. Objectives advance as criteria are met
13. Session ends → client POSTs full transcript to /api/save-session
14. Client navigates to /debrief/[session_id]
```

---

## Turn Detection & Interruption

This is especially important for your use case. Non-native speakers often:
- Pause longer between phrases (thinking in L1, translating to L2)
- Use filler words differently
- Have different prosodic patterns that VAD might misinterpret as "done talking"

The Realtime API offers two turn detection modes:

**`semantic_vad`** — Uses a model to understand context and predict end-of-turn. This is better for your population because it's less likely to cut off a TA who pauses to think.

**Standard VAD** — Silence-based detection with configurable thresholds. Simpler but may cause more premature interruptions.

Start with `semantic_vad` and tune from there. You can also adjust:
- `eagerness` — how quickly the model jumps in (lower = more patient)
- `silence_duration_ms` — minimum silence before considering turn complete
- `interrupt_response: true` — whether the TA can barge in while the student is talking (yes, they should be able to)

For your population, err on the side of patience. A TA thinking for 2-3 seconds is normal; the model shouldn't interpret that as "they're done."

---

## What You Lose vs. LiveKit (and Why It's Okay for MVP)

| Feature | OpenAI Agents SDK | LiveKit | MVP Impact |
|---------|------------------|---------|------------|
| Provider flexibility | OpenAI only | Any STT/LLM/TTS | Low — validate the concept first |
| Voice variety | OpenAI voices only | Any TTS provider | Low — one voice is fine |
| Different voices per agent | Not supported in handoffs | Yes | Low — persona shift via words is clear enough |
| Server-side agent | Possible via WebSocket, more setup | Native | Low — browser-side tools work for MVP |
| Turn detection | OpenAI semantic VAD | Custom multilingual model | Medium — test with your population |
| Transcript sync | Via events, some known issues | Built-in with UI components | Medium — you'll build your own panel |
| Self-hosting | No | Yes | Low — not needed for a pilot |
| Cost control | OpenAI pricing | Choose cheap providers | Low — pilot is small scale |

The things that matter most for validating the concept (voice interaction, rubric feedback, transcript review) are all fully achievable with the Agents SDK. The things you'd gain from LiveKit (provider choice, cost optimization, self-hosting) are scaling concerns.

---

## Migration Path to LiveKit

When you're ready, here's what changes and what stays:

### Stays the same (your code)
- Scenario data model in Supabase
- Rubric scoring logic in /api/grade-turn
- Transcript storage and debrief generation
- Frontend pages and UI components
- Scenario content and system prompts (mostly)

### Changes (transport + model layer)
- Replace `RealtimeSession` with LiveKit room connection
- Replace `RealtimeAgent` with LiveKit `Agent` class (Python or Node.js)
- Move tools from browser-side to agent server-side
- Replace OpenAI's built-in STT/TTS with your choice of plugins
- Add LiveKit's transcript stream handling instead of Agents SDK events
- Different voice per agent becomes possible

### Effort estimate
If you keep your tool endpoints as a clean API (which this plan does), the migration is roughly 1-2 weeks of work. The scenario logic, rubrics, UI, and data layer all carry over untouched.

---

## Phased Build Plan

### Phase 1: Voice Loop (3-5 days)
- SvelteKit project setup
- /api/token endpoint generating ephemeral keys
- Single hardcoded scenario (no database yet)
- RealtimeAgent with student instructions
- Basic transcript display from session events
- Goal: Talk to the simulated student, see the transcript appear

### Phase 2: Rubric Engine (1 week)
- Supabase schema + seed data for 2 scenarios
- grade_turn tool calling /api/grade-turn endpoint
- Objective progression (advance_objective tool)
- offer_hint tool
- Objective checklist UI updating in real time
- Goal: Complete a full scenario with scoring

### Phase 3: Transcript & Debrief (1 week)
- Save transcripts to Supabase on session end
- Debrief generation (template-based or LLM)
- History page and debrief page
- Annotated transcript view (highlight good/bad turns)
- Goal: TA finishes a session and reviews their performance

### Phase 4: Coach Agent + Polish (1 week)
- CoachAgent with handoff from StudentAgent
- "Request feedback" button
- Turn detection tuning for non-native speakers
- Session timer and pacing
- Goal: Full training loop with coaching support

### Phase 5: User Testing (ongoing)
- Test with actual ITAs
- Collect feedback on transcript usefulness
- Tune system prompts based on real conversations
- Iterate on rubric criteria
- Decide if LiveKit migration is warranted

---

## Cost Estimate for MVP Pilot

The Realtime API pricing is per-minute for audio:
- Audio input: ~$0.06/min (gpt-4o-realtime)
- Audio output: ~$0.24/min
- Text tokens (tools, system prompt): standard GPT-4o pricing

A 10-minute training session costs roughly $3.00 in Realtime API usage. For a pilot with 20 TAs doing 3 sessions each, that's about $180 total. Supabase free tier covers the database needs easily.

This is more expensive per-minute than a LiveKit pipeline with cheaper providers, but for a validation pilot the total spend is very manageable. If the concept works and you scale, that's exactly when the LiveKit migration (with Deepgram STT at $0.004/min + open-source LLM + Cartesia TTS at $0.005/min) starts saving real money.
