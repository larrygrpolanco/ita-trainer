import { NextResponse } from "next/server";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { getActivity } from "@/lib/activities";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;

export const revalidate = 0;

const TOKEN_UNAVAILABLE_MESSAGE =
  "Practice is temporarily unavailable right now. This can happen when service usage limits are reached. Please try again soon or contact us at ChaoneLabs.com.";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isUsageLimitError(message: string): boolean {
  const normalized = message.toLowerCase();
  return ["quota", "limit", "billing", "insufficient", "resource exhausted", "too many requests"].some(
    (keyword) => normalized.includes(keyword)
  );
}

function toHttpLivekitUrl(url: string): string {
  if (url.startsWith("wss://")) {
    return `https://${url.slice(6)}`;
  }

  if (url.startsWith("ws://")) {
    return `http://${url.slice(5)}`;
  }

  return url;
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as { activityId?: string };
    const activityId = body.activityId;

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
    const internalMessage = toErrorMessage(error);
    console.error("Token route failure", { error: internalMessage });

    if (isUsageLimitError(internalMessage)) {
      return NextResponse.json(
        {
          error: TOKEN_UNAVAILABLE_MESSAGE,
          code: "SERVICE_LIMIT_REACHED",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: TOKEN_UNAVAILABLE_MESSAGE,
        code: "SERVICE_TEMPORARILY_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}
