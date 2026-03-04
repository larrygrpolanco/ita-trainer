import { NextResponse } from "next/server";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { getActivity } from "@/lib/activities";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;

export const revalidate = 0;

function toHttpLivekitUrl(url: string): string {
  if (url.startsWith("wss://")) {
    return `https://${url.slice(6)}`;
  }

  if (url.startsWith("ws://")) {
    return `http://${url.slice(5)}`;
  }

  return url;
}

export async function GET(request: Request) {
  try {
    if (!LIVEKIT_URL) {
      throw new Error("LIVEKIT_URL is not defined");
    }

    if (!API_KEY) {
      throw new Error("LIVEKIT_API_KEY is not defined");
    }

    if (!API_SECRET) {
      throw new Error("LIVEKIT_API_SECRET is not defined");
    }

    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get("activityId");

    if (!activityId) {
      return NextResponse.json({ error: "Missing activityId" }, { status: 400 });
    }

    if (!getActivity(activityId)) {
      return NextResponse.json({ error: "Invalid activityId" }, { status: 400 });
    }

    const roomName = `ita-${activityId}-${crypto.randomUUID().slice(0, 8)}`;
    const participantIdentity = `user-${crypto.randomUUID().slice(0, 8)}`;

    const accessToken = new AccessToken(API_KEY, API_SECRET, {
      identity: participantIdentity,
      name: "TA Trainee",
      ttl: "15m",
    });

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const dispatchClient = new AgentDispatchClient(
      toHttpLivekitUrl(LIVEKIT_URL),
      API_KEY,
      API_SECRET
    );

    const dispatch = await dispatchClient.createDispatch(roomName, "ita-student-agent", {
      metadata: JSON.stringify({
        activityId,
        roomName,
      }),
    });
    console.info("Agent dispatch created", {
      roomName,
      dispatchId: dispatch.id,
      agentName: dispatch.agentName,
    });

    return NextResponse.json(
      {
        token: await accessToken.toJwt(),
        url: LIVEKIT_URL,
        roomName,
        participantIdentity,
        agentDispatchId: dispatch.id,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Unknown token error" }, { status: 500 });
  }
}
