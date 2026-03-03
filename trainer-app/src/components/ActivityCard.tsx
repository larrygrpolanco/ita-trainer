"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Activity } from "@/lib/activities";

const levelColors: Record<Activity["level"], string> = {
  beginner: "bg-green-100 text-green-800 border-green-200",
  intermediate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  advanced: "bg-red-100 text-red-800 border-red-200",
};

interface ActivityCardProps {
  activity: Activity;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phrasesOpen, setPhrasesOpen] = useState(false);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold text-base">{activity.title}</h3>
                  <Badge
                    variant="outline"
                    className={levelColors[activity.level]}
                  >
                    {activity.level}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.shortDescription}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>~{activity.estimatedMinutes} min</span>
                </div>
              </div>
              <div className="shrink-0 mt-1">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activity.fullDescription}
            </p>

            <div className="rounded-md border bg-muted/40 p-3 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Objective
              </p>
              <p className="text-sm font-medium">{activity.objective.title}</p>
              <p className="text-sm text-muted-foreground">
                {activity.objective.description}
              </p>
            </div>

            <Collapsible open={phrasesOpen} onOpenChange={setPhrasesOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {phrasesOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Example phrases
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1">
                  {activity.objective.examplePhrases.map((phrase, i) => (
                    <li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-muted">
                      &ldquo;{phrase}&rdquo;
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>

            <Link href={`/practice/${activity.id}`}>
              <Button className="w-full">Start Practice</Button>
            </Link>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
