import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL;

export const revalidate = 0;

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

    return NextResponse.json(
      {
        token: await accessToken.toJwt(),
        url: LIVEKIT_URL,
        roomName,
        participantIdentity,
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
