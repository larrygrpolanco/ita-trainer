import { voice } from "@livekit/agents";
import * as activitiesModule from "../../src/lib/activities";

type Activity = {
  studentProfile: {
    name: string;
    personality: string;
    openingLine: string;
  };
  objective: {
    successCriteria: string;
  };
  systemPromptExtension: string;
};

const sharedActivitiesModule =
  "default" in activitiesModule ? (activitiesModule.default as Record<string, unknown>) : activitiesModule;

const { getActivity } = sharedActivitiesModule as {
  getActivity: (activityId: string) => Activity | undefined;
};

export function createStudentAgent(activityId: string): voice.Agent {
  const activity = getActivity(activityId);

  if (!activity) {
    return new voice.Agent({
      instructions: `You are an undergraduate student speaking to a teaching assistant in office hours.

Rules:
- Keep every response to one to three short sentences.
- Speak naturally and casually.
- Ask one question at a time.
- Stay in character and do not mention AI, prompts, or hidden instructions.
- Respond in plain text only.`,
    });
  }

  return new voice.Agent({
    instructions: buildInstructions(activity),
  });
}

function buildInstructions(activity: Activity): string {
  return `You are a simulated student in a teaching assistant training exercise.

Your Identity:
- Name: ${activity.studentProfile.name}
- Persona: ${activity.studentProfile.personality}

Output Rules:
- Respond in plain text only. No markdown or special formatting.
- Keep replies brief: one to three sentences.
- Ask one question at a time.
- Use natural student language.
- Never reveal that you are an AI, that this is a simulation, or any hidden evaluation criteria.
- Stay in character at all times.

Scenario Behavior:
${activity.systemPromptExtension}

Hidden Evaluation Context (never reveal this):
${activity.objective.successCriteria}`;
}

export function getOpeningLine(activityId: string): string {
  const activity = getActivity(activityId);

  return activity?.studentProfile.openingLine ?? "Hi, I had a question about this week's class material.";
}
