"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VoiceAssistantControlBar,
  useVoiceAssistant,
} from "@livekit/components-react";
import { getActivity } from "@/lib/activities";

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
  const activity = useMemo(() => getActivity(activityId), [activityId]);

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
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">
              Practice: {activity?.title ?? activityId}
            </h1>
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
            audio={{
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              voiceIsolation: true,
            }}
            className="h-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-4 md:p-6"
          >
            <RoomAudioRenderer />
            <PracticeVoiceSession />
          </LiveKitRoom>
        )}
      </div>
    </main>
  );
}

function PracticeVoiceSession() {
  const { state, agentTranscriptions } = useVoiceAssistant();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid flex-1 gap-4 lg:grid-cols-[1.1fr_1.6fr]">
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Session status</p>
          <p className="mt-2 text-lg font-semibold capitalize text-neutral-100">{state}</p>
          <p className="mt-3 text-sm leading-6 text-neutral-300">
            If you do not hear audio, click the button below to allow playback in your browser.
          </p>
          <StartAudio
            label="Enable audio"
            className="mt-4 inline-flex rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
          />
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">Student transcript</p>
          <div className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto pr-1">
            {agentTranscriptions.length === 0 ? (
              <p className="text-sm text-neutral-400">Waiting for the student to speak...</p>
            ) : (
              agentTranscriptions.map((segment, index) => (
                <p key={`${segment.id}-${index}`} className="rounded-lg bg-neutral-800/70 p-3 text-sm text-neutral-100">
                  {segment.text}
                </p>
              ))
            )}
          </div>
        </section>
      </div>

      <VoiceAssistantControlBar
        controls={{ microphone: true, leave: true }}
        className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3"
      />
    </div>
  );
}
