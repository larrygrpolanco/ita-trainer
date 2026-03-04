
# ITA Interactional Competence Trainer

This app helps international teaching assistants practice interactional competence through voice conversations with an AI student powered by LiveKit.

## Build Plan (Chunked)

We are implementing this in phases so each chunk can be tested before moving on.

### Phase 1: Core scaffolding + voice handshake

Goal: connect browser to LiveKit and hear an AI student response.

Scope:
- Add monorepo workspace config for Next.js app + `agent/` worker.
- Add LiveKit Node agent package (`agent/`) with minimal student behavior.
- Update `/api/token` to issue room tokens using an `activityId` query param.
- Add `/practice/[activityId]` page that connects to a LiveKit room.

1. Terminal A: pnpm dev
2. Terminal B: pnpm --filter ita-trainer-agent dev
3. Open an activity and start practice.

Test checklist:
1. Start web app and agent in separate terminals.
2. Open home page and launch a practice session.
3. Confirm browser connects to LiveKit.
4. Confirm agent joins and speaks first.

### Phase 2: Activities config + dynamic personas

Goal: different activities produce different student behavior.

Scope:
- Add shared `src/lib/activities.ts` used by frontend and agent.
- Add all six core activities from project docs.
- Update home page with activity cards and detail/launch flow.
- Update agent to load persona using `activityId` from room name.

Test checklist:
1. Launch at least two different activities.
2. Confirm opening lines and behaviors differ by activity.
3. Confirm all six activities are visible from the home page.

### Phase 3: Practice UI (desktop first, mobile responsive)

Goal: Considerable changes were made here do not try to "fix" the UI.

Scope:
- Build desktop three-column layout (audio, transcript, objective panel).
- Add responsive mobile layout.
- Show live transcript in center panel.
- Show objective guidance and example phrases during practice.

Test checklist:
1. Desktop: all three panels visible and usable.
2. Mobile: panels stack cleanly and remain usable.
3. Transcript updates live while speaking.

### Phase 4: Objective evaluation + session state (superseded)

Goal: objective completion status updates during conversation.

Scope:
- Add Zustand session store for turn tracking and status.
- Add agent evaluation logic and data messages.
- Update frontend to reflect objective met / not met.
- End session when objective met or max turns reached.

Test checklist:
1. Objective status updates in real time.
2. Session ends correctly for completion and max-turn limits.

Status:
- This approach was replaced in Phase 4.5 with post-session debriefing.

### Phase 4.5: Pedagogy + behavior simplification (new)

Goal: tighten activity design and reduce realtime model load.

Scope:
- Refocus activities to one skill + one concrete content anchor.
- Remove mid-conversation coaching/evaluation behaviors.
- Keep realtime agent focused on student roleplay only.
- End sessions by user action or max-turn limit.
- Add post-session transcript coaching via a separate OpenAI API call.

Test checklist:
1. Activity opening lines are specific and anchored (no vague lecture questions).
2. Student stays in-role during conversation and does not output meta/system text.
3. End-of-session debrief returns: one strength, one next-step, and skill status (yes/partially/not yet).

### Phase 5: Polish + reliability

Goal: stabilize and clean up MVP UX.

Scope:
- Improve loading, error, and empty states.
- Final style pass and interaction polish.
- Run lint/build checks and fix issues.

Note:
- Reliability now prioritizes roleplay quality + post-session coaching flow over live objective scoring.

Test checklist:
1. Lint and build pass.
2. Happy path and failure states are both understandable.

## Local Development

### Prerequisites

- Node.js 20+
- pnpm
- LiveKit Cloud project
- OpenAI API key

### Environment

Create `.env.local` in repo root:

```env
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
OPENAI_API_KEY=your_openai_key
OPENAI_REALTIME_MODEL=gpt-realtime
```

### Run Phase 1

Terminal 1 (web app):

```bash
pnpm dev
```

Terminal 2 (agent worker):

```bash
pnpm --filter ita-trainer-agent install
pnpm --filter ita-trainer-agent download-files
pnpm --filter ita-trainer-agent dev
```

Then open `http://localhost:3000` and launch a practice route.
