"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Activity } from "@/lib/activities";

interface ObjectiveTrackerProps {
  objective: Activity["objective"];
  objectiveMet: boolean;
}

export function ObjectiveTracker({
  objective,
  objectiveMet,
}: ObjectiveTrackerProps) {
  const [phrasesOpen, setPhrasesOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Status card */}
      <div
        className={cn(
          "rounded-lg border p-3 transition-colors duration-500",
          objectiveMet
            ? "bg-green-50 border-green-300"
            : "bg-muted/50 border-border"
        )}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg leading-none mt-0.5">
            {objectiveMet ? "✅" : "○"}
          </span>
          <div>
            <p className="text-sm font-semibold">{objective.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {objective.description}
            </p>
          </div>
        </div>
        {objectiveMet && (
          <p className="text-xs text-green-700 font-medium mt-2 pl-7">
            Objective complete!
          </p>
        )}
        {!objectiveMet && (
          <p className="text-xs text-muted-foreground mt-2 pl-7">
            Not yet complete
          </p>
        )}
      </div>

      {/* Example phrases */}
      <Collapsible open={phrasesOpen} onOpenChange={setPhrasesOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            {phrasesOpen ? (
              <ChevronUp className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 shrink-0" />
            )}
            <span>Example phrases</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 space-y-1.5">
            {objective.examplePhrases.map((phrase, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground pl-3 border-l-2 border-muted leading-relaxed"
              >
                &ldquo;{phrase}&rdquo;
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
