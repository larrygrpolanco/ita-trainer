import { NextResponse } from "next/server";

export async function POST() {
  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
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
        eagerness: "low",
        interrupt_response: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: "Failed to create session", details: error },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
