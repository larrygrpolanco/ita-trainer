"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useRoomContext,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { Mic, MicOff, RotateCcw, Square } from "lucide-react";
import { AgentAudioVisualizerGrid } from "@/components/agents-ui/agent-audio-visualizer-grid";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getActivity } from "@/lib/activities";

type ConnectionDetails = {
  token: string;
  url: string;
  roomName: string;
};

type TranscriptSpeaker = "user" | "student";

type TranscriptEntry = {
  id: string;
  text: string;
  speaker: TranscriptSpeaker;
  timestamp: number;
  isFinal: boolean;
};

type DebriefResponse = {
  didWell: string;
  nextStep: string;
  skillStatus: "yes" | "partially" | "not yet";
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
}

function getString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function getBoolean(record: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return null;
}

function getTimestamp(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function inferIdentity(record: Record<string, unknown>): string | null {
  const participantInfo = asRecord(record.participantInfo);
  if (participantInfo) {
    const fromParticipantInfo = getString(participantInfo, ["identity", "participantIdentity", "id"]);
    if (fromParticipantInfo) {
      return fromParticipantInfo;
    }
  }

  const participant = asRecord(record.participant);
  if (participant) {
    const fromParticipant = getString(participant, ["identity", "participantIdentity", "id"]);
    if (fromParticipant) {
      return fromParticipant;
    }
  }

  const direct = getString(record, ["participantIdentity", "identity", "participant_id"]);
  if (direct) {
    return direct;
  }

  const fromRecord = asRecord(record.from);
  if (!fromRecord) {
    return null;
  }

  return getString(fromRecord, ["identity", "participantIdentity", "id"]);
}

export default function PracticePage() {
  const params = useParams<{ activityId: string }>();
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [hasStoppedSession, setHasStoppedSession] = useState(false);
  const activityId = params.activityId ?? "";
  const activity = useMemo(() => getActivity(activityId), [activityId]);

  const fetchConnectionDetails = useCallback(async () => {
    if (!activityId) {
      return;
    }

    setError(null);

    const response = await fetch(`/api/token?activityId=${encodeURIComponent(activityId)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "Failed to fetch LiveKit token");
    }

    setConnectionDetails({ token: data.token, url: data.url, roomName: data.roomName });
  }, [activityId]);

  useEffect(() => {
    let active = true;

    const loadConnectionDetails = async () => {
      try {
        if (!active) {
          return;
        }

        await fetchConnectionDetails();
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
  }, [fetchConnectionDetails]);

  const handleResetSession = useCallback(async () => {
    setSessionStarted(false);
    setHasStoppedSession(false);

    try {
      await fetchConnectionDetails();
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : "Unknown reset error";
      setError(message);
    }
  }, [fetchConnectionDetails]);

  const statusText = useMemo(() => {
    if (error) {
      return `Connection failed: ${error}`;
    }

    if (!connectionDetails) {
      return "Initializing voice simulation...";
    }

    if (!sessionStarted) {
      return "Ready when you are: click the visualizer to start";
    }

    return `Connected to ${connectionDetails.roomName}`;
  }, [connectionDetails, error, sessionStarted]);

  if (activityId && !activity) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            {"<-"} Back to activities
          </Link>
          <h1 className="text-2xl font-semibold">Activity not found</h1>
          <p className="text-sm text-slate-600">
            The requested activity does not exist. Return to the activity list and choose another scenario.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
              {"<-"} Back to activities
            </Link>
            <h1 className="text-lg font-semibold tracking-tight md:text-xl">
              Practice: {activity?.title ?? activityId}
            </h1>
          </div>
          <p className="text-sm text-slate-500">{statusText}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl p-3 md:p-6 lg:h-[calc(100vh-81px)]">
        {!connectionDetails && !error && (
          <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 lg:h-full lg:min-h-0">
            Connecting to LiveKit...
          </div>
        )}

        {error && (
          <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 lg:h-full lg:min-h-0">
            {error}
          </div>
        )}

        {connectionDetails && activity && (
          <LiveKitRoom
            key={connectionDetails.roomName}
            serverUrl={connectionDetails.url}
            token={connectionDetails.token}
            connect={sessionStarted}
            audio={{
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              voiceIsolation: true,
            }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 md:p-6 lg:h-full"
          >
            <RoomAudioRenderer />
            <PracticeVoiceSession
              activity={activity}
              sessionStarted={sessionStarted}
              hasStoppedSession={hasStoppedSession}
              onStartSession={() => {
                setSessionStarted(true);
                setHasStoppedSession(false);
              }}
              onStopSession={() => {
                setSessionStarted(false);
                setHasStoppedSession(true);
              }}
              onResetSession={handleResetSession}
            />
          </LiveKitRoom>
        )}
      </div>
    </main>
  );
}

function PracticeVoiceSession({
  activity,
  sessionStarted,
  hasStoppedSession,
  onStartSession,
  onStopSession,
  onResetSession,
}: {
  activity: NonNullable<ReturnType<typeof getActivity>>;
  sessionStarted: boolean;
  hasStoppedSession: boolean;
  onStartSession: () => void;
  onStopSession: () => void;
  onResetSession: () => Promise<void>;
}) {
  const room = useRoomContext();
  const { state, audioTrack } = useVoiceAssistant();
  const livekitTranscriptions = useTranscriptions();
  const [isResetting, setIsResetting] = useState(false);
  const [startHover, setStartHover] = useState(false);
  const [frozenEntries, setFrozenEntries] = useState<TranscriptEntry[]>([]);
  const [sessionEndReason, setSessionEndReason] = useState<"manual" | "max_turns" | null>(null);
  const [debrief, setDebrief] = useState<DebriefResponse | null>(null);
  const [isDebriefLoading, setIsDebriefLoading] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);
  const endingSessionRef = useRef(false);
  const localIdentity = room.localParticipant?.identity ?? "";
  const micEnabled = Boolean(room.localParticipant?.isMicrophoneEnabled);

  const toggleMic = async () => {
    const nextEnabled = !micEnabled;
    await room.localParticipant.setMicrophoneEnabled(nextEnabled);
  };

  const liveEntries = useMemo(() => {
    return livekitTranscriptions
      .map((item, index) => {
        const record = asRecord(item);
        if (!record) {
          return null;
        }

        const text = getString(record, ["text", "message", "content"]);
        if (!text) {
          return null;
        }

        const identity = inferIdentity(record);
        const speaker: TranscriptSpeaker = identity && identity === localIdentity ? "user" : "student";
        const rawId = getString(record, ["id", "segment_id", "segmentId", "streamId", "track_sid"]);
        const timestamp = getTimestamp(record.timestamp ?? record.endTime ?? record.startTime ?? record.receivedAt, index);
        const isFinal =
          getBoolean(record, ["final", "isFinal", "lk.transcription_final", "transcriptionFinal"]) ?? true;

        return {
          id: `${speaker}-${rawId ?? `${timestamp}-${index}`}`,
          text,
          speaker,
          timestamp,
          isFinal,
        } satisfies TranscriptEntry;
      })
      .filter((entry): entry is TranscriptEntry => entry !== null);
  }, [livekitTranscriptions, localIdentity]);

  const generateDebrief = useCallback(
    async (entries: TranscriptEntry[]) => {
      const transcript = entries
        .filter((entry) => entry.isFinal && entry.text.trim().length > 0)
        .map((entry) => ({
          speaker: entry.speaker === "user" ? "ita" : "student",
          text: entry.text,
        }));

      if (transcript.length < 2) {
        setDebrief(null);
        setDebriefError("Not enough transcript yet for coaching feedback.");
        return;
      }

      setIsDebriefLoading(true);
      setDebrief(null);
      setDebriefError(null);

      try {
        const response = await fetch("/api/debrief", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activityId: activity.id,
            transcript,
          }),
        });

        const data = (await response.json()) as {
          didWell?: string;
          nextStep?: string;
          skillStatus?: DebriefResponse["skillStatus"];
          error?: string;
        };

        if (!response.ok || !data.didWell || !data.nextStep || !data.skillStatus) {
          throw new Error(data.error ?? "Unable to generate coaching feedback right now.");
        }

        setDebrief({
          didWell: data.didWell,
          nextStep: data.nextStep,
          skillStatus: data.skillStatus,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to generate coaching feedback right now.";
        setDebriefError(message);
      } finally {
        setIsDebriefLoading(false);
      }
    },
    [activity.id]
  );

  const endSession = useCallback(
    async (reason: "manual" | "max_turns" | null) => {
      if (endingSessionRef.current) {
        return;
      }

      endingSessionRef.current = true;
      setSessionEndReason(reason);
      setFrozenEntries(liveEntries);
      onStopSession();
      await room.disconnect();
      await generateDebrief(liveEntries);
      endingSessionRef.current = false;
    },
    [generateDebrief, liveEntries, onStopSession, room]
  );

  const stopSession = async () => {
    await endSession("manual");
  };

  const resetSession = async () => {
    setIsResetting(true);
    await room.disconnect();
    await onResetSession();
    setFrozenEntries([]);
    setSessionEndReason(null);
    setDebrief(null);
    setDebriefError(null);
    setIsDebriefLoading(false);
    endingSessionRef.current = false;
    setIsResetting(false);
  };

  const effectiveEntries = sessionStarted ? liveEntries : frozenEntries;

  const rows = useMemo(() => {
    const itaTurns = effectiveEntries.reduce((count, entry) => {
      return entry.speaker === "user" && entry.isFinal ? count + 1 : count;
    }, 0);

    return { items: effectiveEntries, itaTurns };
  }, [effectiveEntries]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [rows.items.length]);

  useEffect(() => {
    if (!sessionStarted) {
      return;
    }

    if (rows.itaTurns >= activity.maxTurns) {
      const timeoutId = window.setTimeout(() => {
        void endSession("max_turns");
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [activity.maxTurns, endSession, rows.itaTurns, sessionStarted]);

  const assistantVisualizerColor =
    state === "speaking" ? "#0284c7" : state === "thinking" ? "#0f766e" : "#64748b";

  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Session controls</p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={toggleMic} disabled={!sessionStarted}>
            {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {micEnabled ? "Mic on" : "Mic off"}
          </Button>
          {sessionStarted ? (
            <Button type="button" variant="outline" size="sm" onClick={stopSession}>
              <Square className="h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetSession}
              disabled={!hasStoppedSession || isResetting}
            >
              <RotateCcw className="h-4 w-4" />
              {isResetting ? "Resetting..." : "Reset"}
            </Button>
          )}
          <StartAudio label="Enable audio" className="h-8 rounded-md border border-slate-300 px-3 text-xs" />
        </div>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-12">
        <section className="flex min-h-[420px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-5 lg:min-h-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Live transcript</p>
            <p className="text-xs text-slate-500">Updates in real time</p>
          </div>

          <ScrollArea className="h-[320px] rounded-xl border border-slate-200 bg-slate-50/60 p-3 lg:min-h-0 lg:flex-1 lg:h-auto">
            <div className="space-y-2 pr-2">
              {rows.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  {!sessionStarted
                    ? "Start the session to begin the conversation."
                    : "Listening... transcript will appear here in real time."}
                </p>
              ) : (
                rows.items.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={
                        item.speaker === "user"
                          ? "ml-auto max-w-[92%] rounded-2xl border border-cyan-200 bg-cyan-100/80 px-4 py-3 text-sm text-slate-900"
                          : "mr-auto max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      }
                    >
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {item.speaker === "user" ? "You" : "Student"}
                      </p>
                      <p>{item.text}</p>
                    </div>
                  );
                })
              )}
              <div ref={transcriptBottomRef} />
            </div>
          </ScrollArea>
        </section>

        <section className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3 lg:min-h-0">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Scenario + status</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{activity.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{activity.shortDescription}</p>
          <Separator className="my-4 bg-slate-200" />

          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Voice activity</p>
          <div className="mt-3 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3">
            {!sessionStarted ? (
              <button
                type="button"
                onMouseEnter={() => setStartHover(true)}
                onMouseLeave={() => setStartHover(false)}
                onClick={() => {
                  setFrozenEntries([]);
                  setSessionEndReason(null);
                  setDebrief(null);
                  setDebriefError(null);
                  setIsDebriefLoading(false);
                  onStartSession();
                }}
                disabled={hasStoppedSession}
                className="relative flex h-[190px] w-[190px] items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50/70 transition-colors duration-250 hover:border-cyan-400 hover:bg-cyan-100/70 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
              >
                <AgentAudioVisualizerGrid
                  state="thinking"
                  size="md"
                  rowCount={8}
                  columnCount={8}
                  color={hasStoppedSession ? "#94a3b8" : startHover ? "#0284c7" : "#22d3ee"}
                  className="gap-2"
                />
                <span className="pointer-events-none absolute bottom-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  {hasStoppedSession ? "Reset to restart" : "Click to start"}
                </span>
              </button>
            ) : (
              <div className="flex h-[190px] w-[190px] items-center justify-center rounded-xl border border-cyan-200/50 bg-cyan-50/25">
                <AgentAudioVisualizerGrid
                  state={state}
                  size="md"
                  rowCount={8}
                  columnCount={8}
                  audioTrack={audioTrack}
                  color={assistantVisualizerColor}
                  className="gap-2"
                />
              </div>
            )}
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {sessionStarted
              ? "Practice is running. Use Stop when you want to end this attempt."
              : "Start when ready. The student speaks only after you begin."}
          </p>
        </section>

        <aside className="flex min-h-[420px] flex-col rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-4 lg:min-h-0">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Objective</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{activity.objective.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{activity.objective.description}</p>

          <ScrollArea className="mt-4 h-[320px] rounded-xl border border-slate-200 bg-slate-50/60 p-3 lg:min-h-0 lg:flex-1 lg:h-auto">
            <div className="space-y-4 pr-2 text-sm text-slate-700">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Session status</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {sessionStarted
                    ? "In progress"
                    : sessionEndReason === "max_turns"
                      ? "Max turns reached"
                      : sessionEndReason === "manual"
                        ? "Ended by you"
                        : "Not started"}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Success criteria</p>
                <p className="mt-2 leading-6">{activity.objective.successCriteria}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Session progress</p>
                <p className="mt-2">
                  Your turns: <span className="font-semibold text-cyan-700">{rows.itaTurns}</span>
                </p>
                <p>
                  Max turns: <span className="font-semibold text-slate-900">{activity.maxTurns}</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Post-session coaching</p>
                {sessionStarted ? (
                  <p className="mt-2 text-slate-600">Feedback appears after the session ends.</p>
                ) : isDebriefLoading ? (
                  <p className="mt-2 text-slate-600">Generating feedback...</p>
                ) : debriefError ? (
                  <p className="mt-2 text-red-700">{debriefError}</p>
                ) : debrief ? (
                  <div className="mt-2 space-y-2">
                    <p>
                      <span className="font-semibold text-slate-900">Skill status:</span>{" "}
                      <span className="capitalize">{debrief.skillStatus}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">You did well:</span> {debrief.didWell}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-900">Next step:</span> {debrief.nextStep}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-slate-600">Complete one round to receive coaching feedback.</p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Example phrases</p>
                <div className="mt-2 space-y-2">
                  {activity.objective.examplePhrases.map((phrase) => (
                    <p key={phrase} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      {phrase}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
