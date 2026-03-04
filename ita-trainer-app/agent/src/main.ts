import {
  type JobContext,
  ServerOptions,
  cli,
  defineAgent,
  voice,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import { BackgroundVoiceCancellation } from "@livekit/noise-cancellation-node";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createStudentAgent, getOpeningLine } from "./agent";

dotenv.config({ path: "../.env.local" });

type DispatchMetadata = {
  activityId?: string;
  roomName?: string;
};

function getActivityIdFromRoomName(roomName: string): string {
  const parts = roomName.split("-");
  const prefix = parts.at(0);

  if (parts.length < 3 || prefix !== "ita") {
    return "general-practice";
  }

  return parts.slice(1, -1).join("-");
}

function parseDispatchMetadata(rawMetadata: unknown): DispatchMetadata | null {
  if (typeof rawMetadata !== "string" || rawMetadata.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawMetadata) as Record<string, unknown>;
    const activityId = typeof parsed.activityId === "string" ? parsed.activityId : undefined;
    const roomName = typeof parsed.roomName === "string" ? parsed.roomName : undefined;

    return { activityId, roomName };
  } catch {
    return null;
  }
}

function resolveActivityId(ctx: JobContext): { activityId: string; roomName: string; source: string } {
  const metadata = parseDispatchMetadata(ctx.job.metadata);

  if (metadata?.activityId) {
    return {
      activityId: metadata.activityId,
      roomName: metadata.roomName ?? "",
      source: "dispatch-metadata",
    };
  }

  const roomName = ctx.room.name ?? "";
  return {
    activityId: getActivityIdFromRoomName(roomName),
    roomName,
    source: "room-name",
  };
}

async function waitForRemoteParticipant(ctx: JobContext, timeoutMs = 8000): Promise<boolean> {
  if (ctx.room.remoteParticipants.size > 0) {
    return true;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

    if (ctx.room.remoteParticipants.size > 0) {
      return true;
    }
  }

  return false;
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const resolved = resolveActivityId(ctx);
    console.info("Agent job received", {
      roomName: resolved.roomName,
      activityId: resolved.activityId,
      source: resolved.source,
      jobId: ctx.job.id,
    });

    const agent = createStudentAgent(resolved.activityId);

    const session = new voice.AgentSession({
      llm: new openai.realtime.RealtimeModel({
        voice: "alloy",
        turnDetection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1200,
        },
      }),
    });

    await session.start({
      agent,
      room: ctx.room,
      inputOptions: {
        noiseCancellation: BackgroundVoiceCancellation(),
      },
    });

    const hasRemoteParticipant = await waitForRemoteParticipant(ctx);
    if (!hasRemoteParticipant) {
      console.warn("Skipping opening line because no remote participant joined in time", {
        activityId: resolved.activityId,
        roomName: resolved.roomName,
        jobId: ctx.job.id,
      });
      return;
    }

    const openingLine = getOpeningLine(resolved.activityId);
    console.info("Sending opening line", {
      activityId: resolved.activityId,
      openingLine,
      roomName: resolved.roomName,
      jobId: ctx.job.id,
    });
    const reply = session.generateReply({
      instructions: `Start the conversation naturally with this exact opening line: "${openingLine}"`,
    });

    await reply.waitForPlayout();
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "ita-student-agent",
  })
);
