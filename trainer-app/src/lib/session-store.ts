import { create } from "zustand";

export interface TranscriptEntry {
  id: string;
  role: "student" | "ta" | "coach";
  text: string;
  timestamp: number;
}

interface SessionState {
  status: "idle" | "connecting" | "active" | "complete";
  turnCount: number;
  objectiveMet: boolean;
  completionSummary: string | null;
  transcript: TranscriptEntry[];
  elapsedSeconds: number;
  lastFeedback: string | null;

  setStatus: (s: SessionState["status"]) => void;
  incrementTurn: () => void;
  setObjectiveMet: (met: boolean, summary?: string) => void;
  addTranscriptEntry: (entry: Omit<TranscriptEntry, "id">) => void;
  setTranscript: (entries: Omit<TranscriptEntry, "id">[]) => void;
  setLastFeedback: (feedback: string) => void;
  tick: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "idle",
  turnCount: 0,
  objectiveMet: false,
  completionSummary: null,
  transcript: [],
  elapsedSeconds: 0,
  lastFeedback: null,

  setStatus: (status) => set({ status }),
  incrementTurn: () => set((s) => ({ turnCount: s.turnCount + 1 })),
  setObjectiveMet: (met, summary) =>
    set({ objectiveMet: met, completionSummary: summary ?? null }),
  addTranscriptEntry: (entry) =>
    set((s) => ({
      transcript: [
        ...s.transcript,
        { ...entry, id: `${Date.now()}-${Math.random()}` },
      ],
    })),
  setTranscript: (entries) =>
    set({
      transcript: entries.map((e) => ({
        ...e,
        id: `${Date.now()}-${Math.random()}`,
      })),
    }),
  setLastFeedback: (feedback) => set({ lastFeedback: feedback }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
  reset: () =>
    set({
      status: "idle",
      turnCount: 0,
      objectiveMet: false,
      completionSummary: null,
      transcript: [],
      elapsedSeconds: 0,
      lastFeedback: null,
    }),
}));
