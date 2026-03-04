import { NextResponse } from "next/server";
import { getActivity } from "@/lib/activities";

type TranscriptLine = {
  speaker: "ita" | "student";
  text: string;
};

type DebriefPayload = {
  activityId?: string;
  transcript?: TranscriptLine[];
};

type DebriefResponse = {
  didWell: string;
  nextStep: string;
  skillStatus: "yes" | "partially" | "not yet";
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_DEBRIEF_MODEL = process.env.OPENAI_DEBRIEF_MODEL ?? "gpt-4.1-mini";

function isTranscriptLine(value: unknown): value is TranscriptLine {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    (record.speaker === "ita" || record.speaker === "student") &&
    typeof record.text === "string" &&
    record.text.trim().length > 0
  );
}

function buildGenericDebrief(skillTitle: string): DebriefResponse {
  return {
    didWell: "You kept the interaction moving and asked follow-up questions instead of ending quickly.",
    nextStep: `In your next attempt, focus on one clear move for '${skillTitle}' and make it explicit in one sentence.`,
    skillStatus: "partially",
  };
}

function toTranscriptBlock(lines: TranscriptLine[]): string {
  return lines
    .map((line, index) => {
      const speaker = line.speaker === "ita" ? "ITA" : "Student";
      return `${index + 1}. ${speaker}: ${line.text.trim()}`;
    })
    .join("\n");
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string" && record.output_text.trim().length > 0) {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const outputRecord = item as Record<string, unknown>;
    const content = Array.isArray(outputRecord.content) ? outputRecord.content : [];
    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const partRecord = part as Record<string, unknown>;
      if (typeof partRecord.text === "string" && partRecord.text.trim().length > 0) {
        return partRecord.text;
      }
    }
  }

  return null;
}

async function generateDebriefWithOpenAI(activityId: string, transcript: TranscriptLine[]): Promise<DebriefResponse | null> {
  if (!OPENAI_API_KEY) {
    return null;
  }

  const activity = getActivity(activityId);
  if (!activity) {
    return null;
  }

  const transcriptBlock = toTranscriptBlock(transcript);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_DEBRIEF_MODEL,
        input: [
          {
            role: "system",
            content:
              "You are a supportive mentor coaching international teaching assistants after short roleplay practice.",
          },
          {
            role: "user",
            content: `The ITA practiced this skill: ${activity.objective.title}\n\nWhat good use of this skill looks like:\n${activity.objective.successCriteria}\n\nTranscript:\n${transcriptBlock}\n\nReturn JSON only with keys: didWell, nextStep, skillStatus.\nRules:\n- Write like a friendly teacher giving quick, honest coaching in plain language.\n- didWell: one clear strength tied to a specific transcript moment.\n- nextStep: one clear improvement tied to a specific transcript moment.\n- nextStep should include what to say or do next time in one simple example phrase when possible.\n- skillStatus: exactly one of yes, partially, not yet.\n- Keep each text field to one to three short sentences.\n- Avoid technical/rubric language (for example: metacognition, competency, restate/apply, objective alignment).`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "ita_debrief",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                didWell: { type: "string" },
                nextStep: { type: "string" },
                skillStatus: {
                  type: "string",
                  enum: ["yes", "partially", "not yet"],
                },
              },
              required: ["didWell", "nextStep", "skillStatus"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const outputText = extractOutputText(payload);
    if (!outputText) {
      return null;
    }

    const parsed = JSON.parse(outputText) as Partial<DebriefResponse>;
    if (
      typeof parsed.didWell !== "string" ||
      typeof parsed.nextStep !== "string" ||
      (parsed.skillStatus !== "yes" && parsed.skillStatus !== "partially" && parsed.skillStatus !== "not yet")
    ) {
      return null;
    }

    return {
      didWell: parsed.didWell,
      nextStep: parsed.nextStep,
      skillStatus: parsed.skillStatus,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DebriefPayload;
    const activityId = body.activityId;
    const transcript = body.transcript;

    if (!activityId || !Array.isArray(transcript)) {
      return NextResponse.json({ error: "Missing activityId or transcript" }, { status: 400 });
    }

    const activity = getActivity(activityId);
    if (!activity) {
      return NextResponse.json({ error: "Invalid activityId" }, { status: 400 });
    }

    const validTranscript = transcript.filter(isTranscriptLine);
    if (validTranscript.length < 2) {
      return NextResponse.json({ error: "Transcript is too short for debrief" }, { status: 400 });
    }

    const openAiDebrief = await generateDebriefWithOpenAI(activityId, validTranscript);
    if (openAiDebrief) {
      return NextResponse.json(openAiDebrief);
    }

    return NextResponse.json(buildGenericDebrief(activity.objective.title));
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unknown debrief error" }, { status: 500 });
  }
}
