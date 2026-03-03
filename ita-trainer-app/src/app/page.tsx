import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllActivities } from "@/lib/activities";

const levelStyles: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-800",
  intermediate: "bg-amber-100 text-amber-800",
  advanced: "bg-rose-100 text-rose-800",
};

export default function Home() {
  const activities = getAllActivities();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <header className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            ITA Trainer - Phase 2
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Practice interactional competence with scenario-based AI students
          </h1>
          <p className="text-base leading-7 text-slate-600 md:text-lg">
            Pick an activity to preview the situation, objective, and suggested phrases, then start
            a voice session with a matching student persona.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activities.map((activity) => (
            <Card key={activity.id} className="border-slate-200/80 bg-white/95">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${levelStyles[activity.level]}`}
                  >
                    {activity.level}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {activity.estimatedMinutes} min
                  </span>
                </div>
                <CardTitle>{activity.title}</CardTitle>
                <CardDescription>{activity.shortDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{activity.objective.title}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/activities/${activity.id}`}>View Activity</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
