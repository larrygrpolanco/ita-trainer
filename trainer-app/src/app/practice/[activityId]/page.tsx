"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RealtimeSession } from "@openai/agents/realtime";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { ObjectiveTracker } from "@/components/ObjectiveTracker";
import { SessionControls } from "@/components/SessionControls";
import { Button } from "@/components/ui/button";
import { getActivity } from "@/lib/activities";
import { createStudentAgent } from "@/lib/agent";
import { useSessionStore, TranscriptEntry } from "@/lib/session-store";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ activityId: string }>;
}

export default function PracticePage({ params }: Props) {
  const { activityId } = use(params);
  const activity = getActivity(activityId);
  if (!activity) notFound();
  return <PracticeSession activityId={activityId} />;
}

function PracticeSession({ activityId }: { activityId: string }) {
  const activity = getActivity(activityId)!;

  const sessionRef = useRef<RealtimeSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Use a ref to track processed TA turn count inside event handlers (avoids stale closure)
  const processedTurnsRef = useRef(0);
  const objectiveMetRef = useRef(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [endReason, setEndReason] = useState<"complete" | "limit" | "manual" | null>(null);

  const {
    status,
    turnCount,
    objectiveMet,
    completionSummary,
    transcript,
    elapsedSeconds,
    setStatus,
    incrementTurn,
    setObjectiveMet,
    addTranscriptEntry,
    setTranscript,
    setLastFeedback,
    tick,
    reset,
  } = useSessionStore();

  // Keep ref in sync with store
  useEffect(() => {
    objectiveMetRef.current = objectiveMet;
  }, [objectiveMet]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      sessionRef.current?.close?.();
      if (timerRef.current) clearInterval(timerRef.current);
      reset();
    };
  }, [reset]);

  // Timer
  useEffect(() => {
    if (status === "active") {
      timerRef.current = setInterval(() => tick(), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, tick]);

  const endSession = useCallback(
    (reason: "complete" | "limit" | "manual") => {
      sessionRef.current?.close?.();
      sessionRef.current = null;
      setEndReason(reason);
      setStatus("complete");
    },
    [setStatus]
  );

  const handleStart = useCallback(async () => {
    setStatus("connecting");
    processedTurnsRef.current = 0;
    objectiveMetRef.current = false;

    try {
      // Get ephemeral key
      const res = await fetch("/api/session", { method: "POST" });
      if (!res.ok) throw new Error("Failed to get session key");
      const data = await res.json();
      const ephemeralKey: string = data.client_secret?.value ?? data.value;

      // Create agent
      const agent = createStudentAgent(activity, {
        onEvaluation: ({ met, feedback }) => {
          setLastFeedback(feedback);
          if (met) {
            setObjectiveMet(true);
            objectiveMetRef.current = true;
          }
        },
        onComplete: (summary) => {
          setObjectiveMet(true, summary);
          objectiveMetRef.current = true;
          endSession("complete");
        },
      });

      // Create and connect session
      const session = new RealtimeSession(agent, {
        model: "gpt-4o-realtime-preview",
      });
      sessionRef.current = session;

      // Transcript + turn tracking
      session.on("history_updated", (history) => {
        let userTurnCount = 0;
        const entries: Omit<TranscriptEntry, "id">[] = [];

        for (const item of history) {
          if (item.type !== "message") continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const content = (item as any).content;
          const text =
            content?.[0]?.transcript ?? content?.[0]?.text ?? "";
          if (!text) continue;

          const role: TranscriptEntry["role"] =
            item.role === "user" ? "ta" : "student";
          if (role === "ta") userTurnCount++;

          entries.push({ role, text, timestamp: Date.now() });
        }

        setTranscript(entries);

        // New TA turns since last check
        const newTurns = userTurnCount - processedTurnsRef.current;
        if (newTurns > 0) {
          processedTurnsRef.current = userTurnCount;

          for (let i = 0; i < newTurns; i++) incrementTurn();

          // Coach tips
          if (!objectiveMetRef.current) {
            activity.coachTips
              .filter((tip) => tip.afterTurn === userTurnCount)
              .forEach((tip) => {
                addTranscriptEntry({
                  role: "coach",
                  text: tip.message,
                  timestamp: Date.now(),
                });
              });
          }

          // Turn limit
          if (userTurnCount >= activity.maxTurns) {
            endSession("limit");
          }
        }
      });

      // Speaking indicator
      session.on("audio", () => {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 1500);
      });

      await session.connect({ apiKey: ephemeralKey });
      setStatus("active");
    } catch (err) {
      console.error("Session error:", err);
      setStatus("idle");
    }
  }, [
    activity,
    setStatus,
    setObjectiveMet,
    setTranscript,
    setLastFeedback,
    incrementTurn,
    addTranscriptEntry,
    endSession,
  ]);

  // End state overlay
  if (status === "complete" && endReason) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="text-5xl">
            {endReason === "complete" ? "🎉" : endReason === "limit" ? "⏱️" : "👋"}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {endReason === "complete"
                ? "Objective Complete!"
                : endReason === "limit"
                ? "Time's Up"
                : "Session Ended"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {endReason === "complete" && completionSummary
                ? completionSummary
                : endReason === "limit"
                ? `You reached the turn limit (${activity.maxTurns} turns).`
                : "You ended the session early."}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Objective</span>
              <span className={objectiveMet ? "text-green-600 font-medium" : "text-muted-foreground"}>
                {objectiveMet ? "✅ Met" : "❌ Not met"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Turns taken</span>
              <span>{turnCount} / {activity.maxTurns}</span>
            </div>
          </div>
          <Link href="/">
            <Button className="w-full">Back to Activities</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Activities
        </Link>
        <div className="flex-1 min-w-0 px-2">
          <p className="text-sm font-medium truncate">{activity.title}</p>
        </div>
        <SessionControls
          turnCount={turnCount}
          maxTurns={activity.maxTurns}
          elapsedSeconds={elapsedSeconds}
          status={status}
          onEnd={() => endSession("manual")}
        />
      </header>

      {/* Main 3-column layout */}
      <div className="flex-1 grid grid-cols-[260px_1fr_240px] divide-x overflow-hidden">
        {/* Left: Audio Visualizer */}
        <div className="p-6 flex flex-col">
          <AudioVisualizer
            status={status}
            isSpeaking={isSpeaking}
            onStart={handleStart}
          />
        </div>

        {/* Center: Transcript */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/20">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Transcript
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <TranscriptPanel entries={transcript} />
          </div>
        </div>

        {/* Right: Objective */}
        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b bg-muted/20">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Objective
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ObjectiveTracker
              objective={activity.objective}
              objectiveMet={objectiveMet}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
