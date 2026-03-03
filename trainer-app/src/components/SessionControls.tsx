"use client";

import { Button } from "@/components/ui/button";

interface SessionControlsProps {
  turnCount: number;
  maxTurns: number;
  elapsedSeconds: number;
  status: "idle" | "connecting" | "active" | "complete";
  onEnd: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionControls({
  turnCount,
  maxTurns,
  elapsedSeconds,
  status,
  onEnd,
}: SessionControlsProps) {
  const isActive = status === "active";
  const isComplete = status === "complete";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Turn{" "}
          <span className="font-medium text-foreground">{turnCount}</span>
          {" / "}
          <span>{maxTurns}</span>
        </span>
        {(isActive || isComplete) && (
          <span className="font-mono">{formatTime(elapsedSeconds)}</span>
        )}
      </div>

      {(isActive || isConnecting(status)) && (
        <Button variant="outline" size="sm" onClick={onEnd}>
          End Session
        </Button>
      )}
    </div>
  );
}

function isConnecting(status: string) {
  return status === "connecting";
}
