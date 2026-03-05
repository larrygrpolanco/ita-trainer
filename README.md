# ITA Interactional Competence Trainer

This repository contains a voice-based practice tool for international teaching assistants (ITAs). The goal is to help ITAs practice interactional competence in realistic classroom conversations, not just pronunciation or grammar.

The app simulates short TA-student interactions (for example: clarifying confusion, redirecting off-topic questions, handling frustration), then gives a brief post-session coaching debrief.

## What is in this repo

- `ita-trainer-app/`: the actual monorepo app (Next.js frontend + LiveKit agent worker)
- `Planning/`: project docs explaining pedagogy, architecture decisions, and implementation notes
- `README.md` (this file): quick project overview and setup pointers

## How the project is built

- Frontend: Next.js app where users choose an activity, join a practice session, and see live transcript/debrief UI
- Voice runtime: LiveKit Cloud handles WebRTC room/audio routing
- AI student: separate Node.js LiveKit agent worker that joins the room and roleplays the student
- Activity design: all activities are scenario-driven and intentionally narrow (one interactional skill per activity)
- Evaluation: coaching happens after the session from transcript review, instead of interrupting the live roleplay

This split (web app + separate agent worker) is intentional: it keeps real-time conversation quality stable while allowing a simple frontend flow.

## Project context (recommended reading)

- `Planning/design-philosophy.md`: why activities are scoped the way they are
- `Planning/doc1-project-plan.md`: product goals and user flow
- `Planning/doc2-technical-guide.md`: implementation architecture and LiveKit patterns
- `Planning/prompting-guide-doc.md`: LiveKit prompting guidance used for voice-agent behavior

## Run locally (quick version)

From `ita-trainer-app/`:

1. Install deps: `pnpm install`
2. Create `.env.local` with LiveKit + OpenAI keys (see `ita-trainer-app/README.md` for variable names)
3. Start web app: `pnpm dev`
4. In another terminal, start agent:
   - `pnpm --filter ita-trainer-agent download-files` (first run only)
   - `pnpm --filter ita-trainer-agent dev`
5. Open `http://localhost:3000`

## Current scope

This is an MVP/research-oriented project: no auth, no database, no analytics dashboard. The focus is high-quality, repeatable interaction practice with clear, actionable coaching.
