import { RealtimeAgent } from "@openai/agents/realtime";
import { tool } from "@openai/agents";
import { z } from "zod";
import { Activity } from "./activities";
import { buildSystemPrompt } from "./prompts";

export function createStudentAgent(
  activity: Activity,
  callbacks: {
    onEvaluation: (result: { met: boolean; feedback: string }) => void;
    onComplete: (summary: string) => void;
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
        .describe(
          "Brief internal note on what the TA did well or still needs to do"
        ),
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
      callbacks.onComplete(summary);
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
