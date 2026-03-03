"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TranscriptEntry } from "@/lib/session-store";

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

const roleStyles: Record<TranscriptEntry["role"], string> = {
  student: "bg-muted rounded-lg rounded-tl-none",
  ta: "bg-primary/10 rounded-lg rounded-tr-none ml-auto",
  coach: "bg-amber-50 border border-amber-200 rounded-lg text-amber-900",
};

const roleLabels: Record<TranscriptEntry["role"], string> = {
  student: "Student",
  ta: "You",
  coach: "Coach",
};

export function TranscriptPanel({ entries }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <p className="text-sm text-muted-foreground">
          Transcript will appear here once the session starts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto h-full pr-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={cn(
            "max-w-[85%] px-3 py-2 text-sm",
            entry.role === "ta" ? "self-end" : "self-start",
            entry.role === "coach" && "self-stretch max-w-full",
            roleStyles[entry.role]
          )}
        >
          <p className="text-xs font-semibold mb-0.5 opacity-60">
            {roleLabels[entry.role]}
          </p>
          <p className="leading-relaxed">{entry.text}</p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
