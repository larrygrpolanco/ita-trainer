"use client";

import { cn } from "@/lib/utils";

type SessionStatus = "idle" | "connecting" | "active" | "complete";

interface AudioVisualizerProps {
  status: SessionStatus;
  isSpeaking?: boolean;
  onStart: () => void;
}

export function AudioVisualizer({
  status,
  isSpeaking = false,
  onStart,
}: AudioVisualizerProps) {
  const isIdle = status === "idle";
  const isConnecting = status === "connecting";
  const isActive = status === "active";
  const isComplete = status === "complete";

  return (
    <div className="flex flex-col items-center justify-center gap-6 h-full min-h-[240px]">
      {/* Orb */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring — only when speaking */}
        {isActive && isSpeaking && (
          <div className="absolute rounded-full bg-primary/20 animate-ping w-32 h-32" />
        )}
        {/* Secondary ring — active state */}
        {isActive && (
          <div
            className={cn(
              "absolute rounded-full border-2 border-primary/30 w-28 h-28 transition-all duration-300",
              isSpeaking && "scale-110"
            )}
          />
        )}
        {/* Main orb */}
        <div
          className={cn(
            "relative rounded-full w-24 h-24 flex items-center justify-center transition-all duration-300 shadow-lg",
            isIdle &&
              "bg-muted border-2 border-border cursor-pointer hover:bg-muted/80 hover:scale-105",
            isConnecting && "bg-primary/20 border-2 border-primary/40 animate-pulse",
            isActive &&
              cn(
                "bg-primary/10 border-2 border-primary/50",
                isSpeaking && "bg-primary/20 scale-105"
              ),
            isComplete && "bg-green-100 border-2 border-green-400"
          )}
          onClick={isIdle ? onStart : undefined}
          role={isIdle ? "button" : undefined}
          tabIndex={isIdle ? 0 : undefined}
          onKeyDown={isIdle ? (e) => e.key === "Enter" && onStart() : undefined}
        >
          {isIdle && (
            <span className="text-xs font-medium text-muted-foreground text-center px-1 leading-tight">
              Click to Start
            </span>
          )}
          {isConnecting && (
            <span className="text-xs font-medium text-primary text-center px-1 leading-tight">
              Connecting...
            </span>
          )}
          {isActive && (
            <div className="flex gap-0.5 items-end h-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 bg-primary rounded-full transition-all duration-150",
                    isSpeaking
                      ? "animate-bounce"
                      : "h-1"
                  )}
                  style={
                    isSpeaking
                      ? {
                          height: `${8 + Math.sin(i * 1.2) * 8 + 8}px`,
                          animationDelay: `${i * 80}ms`,
                        }
                      : { height: "4px" }
                  }
                />
              ))}
            </div>
          )}
          {isComplete && (
            <span className="text-2xl">✓</span>
          )}
        </div>
      </div>

      {/* Status label */}
      <p className="text-sm text-muted-foreground text-center">
        {isIdle && "Click the orb to begin the session"}
        {isConnecting && "Connecting to session..."}
        {isActive && (isSpeaking ? "Student is speaking" : "Listening...")}
        {isComplete && "Session complete"}
      </p>
    </div>
  );
}
