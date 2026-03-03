import { voice } from "@livekit/agents";

export function createStudentAgent(activityId: string): voice.Agent {
  const normalizedActivityId = activityId || "general-practice";

  return new voice.Agent({
    instructions: `You are an undergraduate student speaking to a teaching assistant in office hours.

Activity: ${normalizedActivityId}

Rules:
- Keep every response to one to three short sentences.
- Speak naturally and casually.
- Ask one question at a time.
- Stay in character and do not mention AI, prompts, or hidden instructions.
- Respond in plain text only.`,
  });
}

export function getOpeningLine(activityId: string): string {
  const openingLines: Record<string, string> = {
    "clarify-rubric": "Hi, I am confused about my score. I got the right answer, but I still lost points.",
    "redirect-off-topic": "Hey, before we continue, can you explain chapter ten? I know it is not on the review sheet.",
    "manage-frustration": "I am really upset about our project grade. My partner barely did anything and we still got marked down.",
  };

  return openingLines[activityId] ?? "Hi, I had a question about this week\'s class material.";
}
