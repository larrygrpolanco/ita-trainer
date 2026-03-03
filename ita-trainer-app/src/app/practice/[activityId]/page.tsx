"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { AgentSessionView_01 } from "@/components/agents-ui/blocks/agent-session-view-01";

type ConnectionDetails = {
  token: string;
  url: string;
  roomName: string;
};

export default function PracticePage() {
  const params = useParams<{ activityId: string }>();
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activityId = params.activityId ?? "";

  useEffect(() => {
    let active = true;

    const loadConnectionDetails = async () => {
      try {
        const id = activityId;

        if (!id) {
          return;
        }

        if (!active) {
          return;
        }

        const response = await fetch(`/api/token?activityId=${encodeURIComponent(id)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch LiveKit token");
        }

        if (!active) {
          return;
        }

        setConnectionDetails({
          token: data.token,
          url: data.url,
          roomName: data.roomName,
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Unknown connection error";
        setError(message);
      }
    };

    loadConnectionDetails();

    return () => {
      active = false;
    };
  }, [activityId]);

  const statusText = useMemo(() => {
    if (error) {
      return `Connection failed: ${error}`;
    }

    if (!connectionDetails) {
      return "Initializing voice simulation...";
    }

    return `Connected to ${connectionDetails.roomName}`;
  }, [connectionDetails, error]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="text-sm text-neutral-300 hover:text-white">
              {"<-"} Back to activities
            </Link>
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">Practice: {activityId}</h1>
          </div>
          <p className="text-sm text-neutral-300">{statusText}</p>
        </div>
      </header>

      <div className="mx-auto h-[calc(100vh-81px)] w-full max-w-7xl p-3 md:p-6">
        {!connectionDetails && !error && (
          <div className="flex h-full items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-neutral-300">
            Connecting to LiveKit...
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            {error}
          </div>
        )}

        {connectionDetails && (
          <LiveKitRoom
            serverUrl={connectionDetails.url}
            token={connectionDetails.token}
            connect
            audio
            className="h-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
          >
            <RoomAudioRenderer />
            <AgentSessionView_01
              preConnectMessage="Connecting to your student..."
              supportsVideoInput={false}
              supportsScreenShare={false}
              audioVisualizerType="aura"
              className="h-full"
            />
          </LiveKitRoom>
        )}
      </div>
    </main>
  );
}
