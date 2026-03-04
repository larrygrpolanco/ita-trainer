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

    return NextResponse.json(buildGenericDebrief(activity.objective.title));
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unknown debrief error" }, { status: 500 });
  }
}
