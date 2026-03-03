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

function getActivityIdFromRoomName(roomName: string): string {
  const parts = roomName.split("-");
  const prefix = parts.at(0);

  if (parts.length < 3 || prefix !== "ita") {
    return "general-practice";
  }

  return parts.slice(1, -1).join("-");
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const roomName = ctx.room.name ?? "";
    const activityId = getActivityIdFromRoomName(roomName);
    console.info("Agent job received", { roomName, activityId });

    const agent = createStudentAgent(activityId);

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

    await ctx.connect();

    const openingLine = getOpeningLine(activityId);
    console.info("Sending opening line", { activityId, openingLine });
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
